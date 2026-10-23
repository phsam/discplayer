// Image CMS routes for the dev server (never deployed: scripts/ is in .vercelignore).
// GET    /admin                         → scripts/admin.html
// GET    /admin/api/records             → [{ k, t, a, y, hole, images: { cover: mtime|null, … }, sources: { tray: { v, crop|null }|null } }]
// PUT    /admin/api/image/:slug/:kind   → body is the JPEG, written to records/<slug>-<kind>.jpg; ?crop=l,t,r,b records
//                                          the box cut from its source: its edges as fractions of the source's
//                                          width (l, r) and height (t, b)
// DELETE /admin/api/image/:slug/:kind   → removes it and its source (not allowed for the cover, which is required)
// GET    /admin/api/source/:slug/:kind  → the uncropped upload kept for re-cropping (tray only)
// PUT    /admin/api/source/:slug/:kind  → body is that JPEG, written to scripts/originals/<slug>-<kind>.jpg
// PUT    /admin/api/hole/:slug          → body { hole }: the disc's inner-circle radius as a fraction of the
//                                          disc's half-width, written to its RECORDS entry (null = default)
import { readFile, writeFile, stat, unlink, mkdir } from 'node:fs/promises';

const KINDS = ['cover', 'disc', 'back', 'tray'];
const SOURCED = ['tray']; // kinds whose uncropped upload is kept so the square can be moved later
const MAX = 5 * 1024 * 1024;
const ROOT = new URL('..', import.meta.url);
const PAGE = new URL('index.html', ROOT);
const SPECS = new URL('records/IMAGE-SPECS.md', ROOT);
const file = (k, kind) => new URL(`records/${k}-${kind}.jpg`, ROOT);
// originals live next to this script, so they're never deployed; crops.json maps <slug>-<kind> to its crop
const ORIG = new URL('originals/', import.meta.url);
const source = (k, kind) => new URL(`${k}-${kind}.jpg`, ORIG);
const CROPS = new URL('crops.json', ORIG);
const crops = () => readFile(CROPS, 'utf8').then(JSON.parse, () => ({}));
async function setCrop(id, crop) {
  const all = await crops();
  if (crop === null) delete all[id]; else all[id] = crop;
  await mkdir(ORIG, { recursive: true });
  await writeFile(CROPS, JSON.stringify(all, null, 1) + '\n');
}

const send = (res, status, body, type = 'application/json; charset=utf-8') =>
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }).end(type.startsWith('application/json') ? JSON.stringify(body) : body);

// RECORDS in index.html is the source of truth for which slugs exist
async function records() {
  const src = await readFile(PAGE, 'utf8');
  const re = /\{t:"((?:[^"\\]|\\.)*)",a:"((?:[^"\\]|\\.)*)",y:(\d+),k:"([a-z0-9-]+)"(,hole:([\d.]+))?/g;
  return [...src.matchAll(re)].map(([, t, a, y, k, , hole]) => ({ t: JSON.parse(`"${t}"`), a: JSON.parse(`"${a}"`), y: +y, k, hole: hole ? +hole : null }));
}

async function images(k) {
  const out = {};
  for (const kind of KINDS) out[kind] = await stat(file(k, kind)).then(s => s.mtimeMs, () => null);
  return out;
}

async function sources(k, all) {
  const out = {};
  for (const kind of SOURCED) {
    const c = all[`${k}-${kind}`];
    // null means no crop saved (or one from before the box had free edges); the page then uses its default
    out[kind] = await stat(source(k, kind)).then(s => ({ v: s.mtimeMs, crop: c && 'l' in c ? c : null }), () => null);
  }
  return out;
}

// keep the ✅ columns of the record list in IMAGE-SPECS.md in step with what's on disk
async function syncSpecs(list) {
  let md = await readFile(SPECS, 'utf8').catch(() => null);
  if (!md) return;
  for (const r of list) {
    const row = new RegExp(`^(\\|[^\\n]*\\| \`${r.k}\` \\|)[^\\n]*$`, 'm');
    md = md.replace(row, (_, head) => head + KINDS.map(kind => (r.images[kind] ? ' ✅ |' : ' |')).join(''));
  }
  await writeFile(SPECS, md);
}

async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    if ((size += c.length) > MAX) throw new Error('too large');
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

// returns true when it handled the request
export async function admin(req, res, url) {
  if (url.pathname !== '/admin' && !url.pathname.startsWith('/admin/')) return false;
  // the dev server listens on every interface; only this machine gets to write files
  if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)) return send(res, 403, { error: 'admin is local only' }), true;

  if (url.pathname === '/admin' || url.pathname === '/admin/') {
    return send(res, 200, await readFile(new URL('admin.html', import.meta.url)), 'text/html; charset=utf-8'), true;
  }
  if (url.pathname === '/admin/api/records' && req.method === 'GET') {
    const list = await records(), all = await crops();
    for (const r of list) { r.images = await images(r.k); r.sources = await sources(r.k, all); }
    return send(res, 200, list), true;
  }

  const h = url.pathname.match(/^\/admin\/api\/hole\/([a-z0-9-]+)$/);
  if (h && req.method === 'PUT') {
    let hole;
    try { ({ hole } = JSON.parse(await body(req))); } catch { return send(res, 400, { error: 'bad JSON' }), true; }
    if (hole !== null && !(hole >= 0.1 && hole <= 0.8)) return send(res, 400, { error: 'hole must be between 0.1 and 0.8' }), true;
    const src = await readFile(PAGE, 'utf8');
    const row = new RegExp(`(k:"${h[1]}")(,hole:[\\d.]+)?`);
    if (!row.test(src)) return send(res, 404, { error: 'unknown record' }), true;
    await writeFile(PAGE, src.replace(row, (_, k) => k + (hole === null ? '' : `,hole:${+hole.toFixed(3)}`)));
    return send(res, 200, { k: h[1], hole }), true;
  }

  const m = url.pathname.match(/^\/admin\/api\/(image|source)\/([a-z0-9-]+)\/([a-z]+)$/);
  if (!m) return send(res, 404, { error: 'not found' }), true;
  const [, route, k, kind] = m;
  const list = await records();
  const r = list.find(r => r.k === k);
  if (!r || !(route === 'image' ? KINDS : SOURCED).includes(kind)) return send(res, 404, { error: 'unknown record or image kind' }), true;
  const jpeg = async () => {
    let buf;
    try { buf = await body(req); } catch { return send(res, 413, { error: 'image over 5 MB' }), null; }
    if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return send(res, 415, { error: 'not a JPEG' }), null;
    return buf;
  };

  if (route === 'source') {
    if (req.method === 'GET') {
      const buf = await readFile(source(k, kind)).catch(() => null);
      return buf ? send(res, 200, buf, 'image/jpeg') : send(res, 404, { error: 'no source kept for this image' }), true;
    }
    if (req.method !== 'PUT') return send(res, 405, { error: 'method not allowed' }), true;
    const buf = await jpeg();
    if (!buf) return true;
    await mkdir(ORIG, { recursive: true });
    await writeFile(source(k, kind), buf);
    return send(res, 200, { k, sources: await sources(k, await crops()) }), true;
  }

  if (req.method === 'PUT') {
    const buf = await jpeg();
    if (!buf) return true;
    await writeFile(file(k, kind), buf);
    if (SOURCED.includes(kind)) {
      const [l, t, r, b] = (url.searchParams.get('crop') || '').split(',').map(Number);
      await setCrop(`${k}-${kind}`, [l, t, r, b].every(v => v >= 0 && v <= 1) && l < r && t < b ? { l, t, r, b } : null);
    }
  } else if (req.method === 'DELETE') {
    if (kind === 'cover') return send(res, 400, { error: 'the cover is required; replace it instead' }), true;
    await unlink(file(k, kind)).catch(e => { if (e.code !== 'ENOENT') throw e; });
    if (SOURCED.includes(kind)) {
      await unlink(source(k, kind)).catch(e => { if (e.code !== 'ENOENT') throw e; });
      await setCrop(`${k}-${kind}`, null);
    }
  } else {
    return send(res, 405, { error: 'method not allowed' }), true;
  }

  for (const x of list) x.images = await images(x.k);
  await syncSpecs(list);
  return send(res, 200, { k, images: list.find(x => x.k === k).images, sources: await sources(k, await crops()) }), true;
}

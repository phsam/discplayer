// Image CMS routes for the dev server (never deployed: scripts/ is in .vercelignore).
// GET    /admin                         → scripts/admin.html
// GET    /admin/api/records             → [{ k, t, a, y, images: { cover: mtime|null, … } }]
// PUT    /admin/api/image/:slug/:kind   → body is the JPEG, written to records/<slug>-<kind>.jpg
// DELETE /admin/api/image/:slug/:kind   → removes it (not allowed for the cover, which is required)
import { readFile, writeFile, stat, unlink } from 'node:fs/promises';

const KINDS = ['cover', 'disc', 'back', 'tray'];
const MAX = 5 * 1024 * 1024;
const ROOT = new URL('..', import.meta.url);
const PAGE = new URL('index.html', ROOT);
const SPECS = new URL('records/IMAGE-SPECS.md', ROOT);
const file = (k, kind) => new URL(`records/${k}-${kind}.jpg`, ROOT);

const send = (res, status, body, type = 'application/json; charset=utf-8') =>
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' }).end(type.startsWith('application/json') ? JSON.stringify(body) : body);

// RECORDS in index.html is the source of truth for which slugs exist
async function records() {
  const src = await readFile(PAGE, 'utf8');
  const re = /\{t:"((?:[^"\\]|\\.)*)",a:"((?:[^"\\]|\\.)*)",y:(\d+),k:"([a-z0-9-]+)"/g;
  return [...src.matchAll(re)].map(([, t, a, y, k]) => ({ t: JSON.parse(`"${t}"`), a: JSON.parse(`"${a}"`), y: +y, k }));
}

async function images(k) {
  const out = {};
  for (const kind of KINDS) out[kind] = await stat(file(k, kind)).then(s => s.mtimeMs, () => null);
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
    const list = await records();
    for (const r of list) r.images = await images(r.k);
    return send(res, 200, list), true;
  }

  const m = url.pathname.match(/^\/admin\/api\/image\/([a-z0-9-]+)\/([a-z]+)$/);
  if (!m) return send(res, 404, { error: 'not found' }), true;
  const [, k, kind] = m;
  const list = await records();
  const r = list.find(r => r.k === k);
  if (!r || !KINDS.includes(kind)) return send(res, 404, { error: 'unknown record or image kind' }), true;

  if (req.method === 'PUT') {
    let buf;
    try { buf = await body(req); } catch { return send(res, 413, { error: 'image over 5 MB' }), true; }
    if (buf[0] !== 0xff || buf[1] !== 0xd8 || buf[2] !== 0xff) return send(res, 415, { error: 'not a JPEG' }), true;
    await writeFile(file(k, kind), buf);
  } else if (req.method === 'DELETE') {
    if (kind === 'cover') return send(res, 400, { error: 'the cover is required; replace it instead' }), true;
    await unlink(file(k, kind)).catch(e => { if (e.code !== 'ENOENT') throw e; });
  } else {
    return send(res, 405, { error: 'method not allowed' }), true;
  }

  for (const x of list) x.images = await images(x.k);
  await syncSpecs(list);
  return send(res, 200, { k, images: list.find(x => x.k === k).images }), true;
}

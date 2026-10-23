// Local dev without the Vercel CLI: serves the static files and runs api/track/[id].js the way Vercel does.
// npm run dev → http://localhost:3000
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GET } from '../api/track/[id].js';

// re-import admin.mjs whenever it changes, so edits to the CMS routes apply without restarting
const ADMIN = new URL('./admin.mjs', import.meta.url);
let adminAt = 0, admin;
async function adminRoutes() {
  const t = (await stat(ADMIN)).mtimeMs;
  if (t !== adminAt) ({ admin } = await import(`${ADMIN}?v=${(adminAt = t)}`));
  return admin;
}

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = +process.env.PORT || 3000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' };

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (await (await adminRoutes())(req, res, url)) return;
  if (url.pathname.startsWith('/api/track/')) {
    const r = await GET(new Request(url));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    return res.end(await r.text());
  }
  const file = normalize(join(ROOT, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)));
  if (!file.startsWith(ROOT) || file.includes(`${sep}scripts${sep}`) || file.includes(`${sep}api${sep}`)) return res.writeHead(404).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
// another dev server often holds 3000: move up until a port is free
let port = PORT;
server.on('error', e => {
  if (e.code !== 'EADDRINUSE' || port > PORT + 20) throw e;
  console.log(`port ${port} is busy, trying ${port + 1}`);
  server.listen(++port);
});
server.on('listening', () => console.log(`http://localhost:${port}  ·  image CMS: http://localhost:${port}/admin`));
server.listen(port);

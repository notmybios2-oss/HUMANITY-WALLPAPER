/*
 * Dev harness for the wallpaper: serves ./wallpaper statically and proxies
 * /wsapi/* to Neal's Wiki Spy backend (which only sends CORS headers to
 * https://neal.fun, so browsers need this proxy; Wallpaper Engine does not).
 *
 * Usage: node dev/serve.mjs [port]   (default 8090)
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.argv[2]) || 8090;
const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'wallpaper');
const API_BASE = 'https://wiki-spy-uaew8.ondigitalocean.app';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

async function proxy(req, res, url) {
  const target = API_BASE + url.pathname.replace(/^\/wsapi/, '') + url.search;
  try {
    const upstream = await fetch(target, { headers: { accept: 'application/json' } });
    const body = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, {
      'content-type': upstream.headers.get('content-type') || 'application/json',
      'access-control-allow-origin': '*',
      'cache-control': 'no-store'
    });
    res.end(body);
  } catch (err) {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
}

async function serveStatic(req, res, url) {
  let path = decodeURIComponent(url.pathname);
  if (path === '/') path = '/index.html';
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403); res.end('forbidden'); return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404); res.end('not found');
  }
}

http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (url.pathname.startsWith('/wsapi/')) return proxy(req, res, url);
  return serveStatic(req, res, url);
}).listen(PORT, () => {
  console.log(`HUMANITY WALLPAPER dev server: http://localhost:${PORT}/?debug=1`);
  console.log(`Proxying /wsapi/* -> ${API_BASE}`);
});

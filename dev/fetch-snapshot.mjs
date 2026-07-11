/*
 * Builds wallpaper/snapshot.json: a shuffled slice of the Wiki Spy
 * catalogue used as a last-resort data source on platforms whose
 * browsers enforce CORS against the API (e.g. Plash on macOS, where the
 * wallpaper is served from GitHub Pages). Refreshed weekly by CI.
 *
 * Usage: node dev/fetch-snapshot.mjs [count]   (default 3000)
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const API = 'https://wiki-spy-uaew8.ondigitalocean.app';
const TARGET = Number(process.argv[2]) || 3000;
const OUT = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'wallpaper', 'snapshot.json');

const byId = new Map();
let cursor = Math.random();
let requests = 0;

while (byId.size < TARGET && requests < 40) {
  const res = await fetch(`${API}/objects?cursor=${cursor}&limit=150`, {
    headers: { accept: 'application/json' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  requests++;
  for (const o of data.objects || []) {
    if (!o || !o.url || !o.width || !o.height || byId.has(o.cutoutId)) continue;
    byId.set(o.cutoutId, {
      url: o.url,
      title: o.title,
      description: o.description || '',
      extract: (o.extract || '').slice(0, 360),
      artist: (o.artist || '').slice(0, 80),
      license: o.license || '',
      articleUrl: o.articleUrl || o.pageUrl || '',
      width: o.width,
      height: o.height,
      cutoutId: o.cutoutId,
      mask: o.mask
    });
  }
  cursor = data.wrap || data.nextCursor === undefined ? Math.random() : data.nextCursor;
  await new Promise(r => setTimeout(r, 400)); // polite spacing
}

const objects = [...byId.values()];
writeFileSync(OUT, JSON.stringify({ v: 1, savedAt: new Date().toISOString(), total: objects.length, objects }));
console.log(`snapshot: ${objects.length} objects, ${requests} requests, ${(JSON.stringify({ objects }).length / 1048576).toFixed(1)} MB`);

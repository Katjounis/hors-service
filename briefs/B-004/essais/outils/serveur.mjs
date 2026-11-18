// Petit serveur de fichiers pour tester une copie locale du site (lecture seule).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
const TYPES = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.js': 'text/javascript; charset=utf-8', '.webmanifest': 'application/manifest+json' };
export function servir(racine, port) {
  const R = resolve(racine);
  const server = createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
    const f = join(R, p);
    if (!f.startsWith(R) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(readFileSync(f));
  });
  return new Promise((r) => server.listen(port, () => r(server)));
}

// Le serveur des comptes en local, pour essayer l'appli sans Cloudflare : node --no-warnings test/local.mjs [port]
// Base en mémoire (SQLite au schéma de D1), MODE_ESSAI : utilise une adresse en @essai.test, le code s'affiche dans l'appli.
import { createServer } from 'node:http';
import serveur from '../src/index.js';
import { fausseBase } from './d1.mjs';
export function demarrer(port = 8787, extra = {}) {
  const env = { DB: fausseBase(), SEL: 'sel-local', ORIGINES: '*', MODE_ESSAI: '1', ...extra };
  const http = createServer(async (req, res) => {
    const morceaux = []; for await (const m of req) morceaux.push(m);
    const corps = morceaux.length ? Buffer.concat(morceaux) : undefined;
    const r = await serveur.fetch(new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers: { ...req.headers, 'cf-connecting-ip': req.socket.remoteAddress || 'local' }, body: req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS' ? undefined : corps }), env);
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
  });
  return new Promise((ok) => http.listen(port, () => ok({ http, env, fermer: () => http.close() })));
}
if (import.meta.url === `file://${process.argv[1]}`) { const p = Number(process.argv[2]) || 8787; await demarrer(p); console.log(`serveur des comptes : http://localhost:${p}`); }

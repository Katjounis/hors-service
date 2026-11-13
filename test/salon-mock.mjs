// Copie locale du protocole des salons (docs/PROTOCOLE.md), POUR LES TESTS UNIQUEMENT.
// Le vrai serveur tourne sur Cloudflare et n'est pas joignable depuis l'environnement de test :
// cette doublure suit le protocole écrit (routes, messages, rôles, verrou, codes de refus, 16 Ko, 16 connexions).
import { createServer } from 'node:http';
import { createRequire } from 'node:module';

const { WebSocketServer } = createRequire(import.meta.url)('ws');
const ORIGINS = new Set(['http://localhost:8080']);
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const MAX_BYTES = 16 * 1024;

export function startMock(port = 8787) {
  const rooms = new Map();
  const cors = (req, res) => {
    const o = req.headers.origin;
    if (o && ORIGINS.has(o)) { res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin'); }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
  };
  const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
  const server = createServer((req, res) => {
    cors(req, res);
    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
    if (req.headers.origin && !ORIGINS.has(req.headers.origin)) { json(res, 403, { erreur: 'origine non autorisée' }); return; }
    const url = new URL(req.url, 'http://x');
    if (req.method === 'POST' && url.pathname === '/new') {
      let code;
      do { code = Array.from({ length: 4 }, () => LETTERS[Math.floor(Math.random() * LETTERS.length)]).join(''); } while (rooms.has(code));
      rooms.set(code, { code, host: null, members: new Map(), state: null, privates: new Map(), locked: false });
      json(res, 200, { code });
      return;
    }
    let m = url.pathname.match(/^\/room\/([A-Z]{4})$/);
    if (req.method === 'GET' && m) {
      const r = rooms.get(m[1]);
      if (!r) { json(res, 200, { existe: false }); return; }
      json(res, 200, { existe: true, joueurs: [...r.members.values()].filter((x) => x.ws).length, verrouille: r.locked });
      return;
    }
    m = url.pathname.match(/^\/__debug\/drop\/([A-Z]{4})\/([0-9a-z]+)$/i);
    if (m) { // coupe brutalement la connexion d'un appareil (réseau perdu)
      const r = rooms.get(m[1]);
      const mem = r && r.members.get(m[2]);
      if (mem && mem.ws) mem.ws.terminate();
      json(res, 200, { ok: !!(mem && mem.ws) });
      return;
    }
    json(res, 404, { erreur: 'introuvable' });
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 1024 * 1024 });
  const refuse = (socket, code, text) => { socket.write(`HTTP/1.1 ${code} ${text}\r\nConnection: close\r\n\r\n`); socket.destroy(); };
  const list = (r) => [...r.members.entries()].filter(([, x]) => x.ws).map(([pid, x]) => ({ pid, name: x.name, role: x.role, avatar: x.avatar }));
  const send = (ws, obj) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj)); };
  const everyone = (r, obj, except = null) => { for (const [pid, x] of r.members) if (pid !== except) send(x.ws, obj); };
  const players = (r) => everyone(r, { t: 'players', players: list(r), host: r.host });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://x');
    const m = url.pathname.match(/^\/room\/([A-Z]{4})\/ws$/);
    if (!m) { refuse(socket, 404, 'Not Found'); return; }
    if (!ORIGINS.has(req.headers.origin)) { refuse(socket, 403, 'Forbidden'); return; }
    const r = rooms.get(m[1]);
    if (!r) { refuse(socket, 404, 'Not Found'); return; }
    const pid = url.searchParams.get('pid') || '';
    let role = url.searchParams.get('role') || 'player';
    const name = (url.searchParams.get('name') || '').slice(0, 24);
    const known = r.members.has(pid);
    if (r.locked && !known && role !== 'screen') { refuse(socket, 423, 'Locked'); return; }
    if (!known && list(r).length >= 16) { refuse(socket, 409, 'Conflict'); return; }
    wss.handleUpgrade(req, socket, head, (ws) => {
      if (role === 'host') { if (!r.host) r.host = pid; else if (r.host !== pid) role = 'player'; }
      if (pid === r.host && role !== 'screen') role = 'host';
      const prev = r.members.get(pid);
      if (prev && prev.ws && prev.ws !== ws) { try { prev.ws.close(4000); } catch (e) { /* ignoré */ } }
      r.members.set(pid, { name: name || (prev && prev.name) || 'Joueur', role, avatar: (prev && prev.avatar) || {}, ws });
      send(ws, { t: 'welcome', you: pid, host: r.host, players: list(r), state: r.state, private: r.privates.get(pid) ?? null, locked: r.locked });
      players(r);
      ws.on('message', (buf) => {
        if (buf.length > MAX_BYTES) { send(ws, { t: 'error', erreur: 'message trop gros (16 Ko maximum)' }); return; }
        let msg;
        try { msg = JSON.parse(buf.toString()); } catch (e) { return; }
        const me = r.members.get(pid);
        const isHost = r.host === pid;
        switch (msg.t) {
          case 'profile':
            if (typeof msg.name === 'string') me.name = msg.name.slice(0, 24);
            if (msg.avatar && JSON.stringify(msg.avatar).length < 2048) me.avatar = msg.avatar;
            players(r);
            break;
          case 'state': if (isHost) { r.state = msg.data; everyone(r, { t: 'state', data: msg.data }, pid); } break;
          case 'private':
            if (isHost && typeof msg.to === 'string') {
              r.privates.set(msg.to, msg.data);
              const to = r.members.get(msg.to);
              if (to) send(to.ws, { t: 'private', data: msg.data });
            }
            break;
          case 'lock': if (isHost) { r.locked = !!msg.value; everyone(r, { t: 'locked', value: r.locked }); } break;
          case 'host': if (isHost && r.members.has(msg.to)) { r.host = msg.to; players(r); } break;
          case 'action': {
            const out = { t: 'action', from: pid, at: Date.now(), data: msg.data };
            for (const [p2, x] of r.members) if (p2 === r.host || x.role === 'screen') send(x.ws, out);
            break;
          }
          case 'broadcast': everyone(r, { t: 'broadcast', from: pid, data: msg.data }, pid); break;
          case 'time': send(ws, { t: 'time', now: Date.now(), ref: msg.ref }); break;
          case 'ping': send(ws, { t: 'pong' }); break;
          default: send(ws, { t: 'error', erreur: 'message inconnu' });
        }
      });
      ws.on('close', () => {
        const me = r.members.get(pid);
        if (me && me.ws === ws) { me.ws = null; players(r); }
      });
    });
  });
  return new Promise((resolve) => server.listen(port, () => resolve({ server, rooms, close: () => { wss.close(); server.close(); } })));
}

if (process.argv[1] && process.argv[1].endsWith('salon-mock.mjs')) {
  startMock(Number(process.argv[2]) || 8787).then(() => console.log('salons (copie de test) sur', process.argv[2] || 8787));
}

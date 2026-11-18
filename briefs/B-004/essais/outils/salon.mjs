// Serveur de salons SIMULÉ pour les essais « chacun son téléphone ». Ce n'est pas le vrai serveur de Samuel :
// c'est un simple relais écrit d'après ce que l'app envoie et attend (messages welcome, players, state, private, action…).
// Il garde tel quel l'objet « avatar » envoyé avec le profil, sans le contrôler.
export const BASE = 'https://salons.essai';
export class Salons {
  constructor() { this.rooms = new Map(); this.journal = []; }
  liste(room) { return [...room.clients.values()].map((c) => ({ pid: c.pid, name: c.name, avatar: c.avatar, role: c.role, online: c.online, connected: c.online })); }
  envoyer(c, m) { if (c.online && c.ws) { try { c.ws.send(JSON.stringify(m)); } catch {} } }
  diffuser(room, m, sauf) { for (const c of room.clients.values()) if (c.pid !== sauf) this.envoyer(c, m); }
  async brancher(ctx) {
    await ctx.addInitScript((base) => { window.__HS_SALONS_URL = base; }, BASE);
    await ctx.route(BASE + '/**', async (route) => {
      const url = new URL(route.request().url()), h = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { ...h, 'access-control-allow-methods': 'GET,POST', 'access-control-allow-headers': '*' } });
      if (url.pathname === '/new') {
        const code = 'ESSA'; this.rooms.set(code, { code, host: null, clients: new Map(), state: null, priv: new Map(), locked: false });
        return route.fulfill({ status: 200, headers: h, body: JSON.stringify({ code }) });
      }
      const m = url.pathname.match(/^\/room\/([^/]+)$/);
      if (m) { const room = this.rooms.get(decodeURIComponent(m[1]).toUpperCase()); return route.fulfill({ status: 200, headers: h, body: JSON.stringify(room ? { existe: true, joueurs: room.clients.size } : { existe: false }) }); }
      return route.fulfill({ status: 404, headers: h, body: '{}' });
    });
    await ctx.routeWebSocket(/^wss:\/\/salons\.essai\//, (ws) => {
      const url = new URL(ws.url()), code = decodeURIComponent(url.pathname.split('/')[2]).toUpperCase(), room = this.rooms.get(code);
      if (!room) { ws.close({ code: 4001 }); return; }
      const pid = url.searchParams.get('pid'), role = url.searchParams.get('role');
      const ancien = room.clients.get(pid);
      const c = { pid, role, name: url.searchParams.get('name'), avatar: ancien ? ancien.avatar : {}, ws, online: true };
      room.clients.set(pid, c);
      if (role === 'host' && !room.host) room.host = pid;
      this.envoyer(c, { t: 'welcome', host: room.host, players: this.liste(room), locked: room.locked, state: room.state, private: room.priv.get(pid) || null });
      this.diffuser(room, { t: 'players', players: this.liste(room), host: room.host }, pid);
      ws.onMessage((brut) => {
        let m; try { m = JSON.parse(brut); } catch { return; }
        if (m.t !== 'ping' && m.t !== 'time' && m.t !== 'state') this.journal.push({ de: pid, m });
        if (m.t === 'profile') { c.name = m.name; c.avatar = m.avatar; this.diffuser(room, { t: 'players', players: this.liste(room), host: room.host }); }
        else if (m.t === 'time') this.envoyer(c, { t: 'time', now: Date.now(), ref: m.ref });
        else if (m.t === 'state') { room.state = m.data; this.diffuser(room, { t: 'state', data: m.data }, pid); }
        else if (m.t === 'private') { room.priv.set(m.to, m.data); const d = room.clients.get(m.to); if (d) this.envoyer(d, { t: 'private', data: m.data }); }
        else if (m.t === 'action') { const h = room.clients.get(room.host); if (h) this.envoyer(h, { t: 'action', from: pid, at: Date.now(), data: m.data }); }
        else if (m.t === 'lock') { room.locked = !!m.value; this.diffuser(room, { t: 'locked', value: room.locked }); }
        else if (m.t === 'broadcast') this.diffuser(room, { t: 'broadcast', from: pid, data: m.data }, pid);
        else if (m.t === 'host') { room.host = m.to; this.diffuser(room, { t: 'players', players: this.liste(room), host: room.host }); }
      });
      ws.onClose(() => { if (room.clients.get(pid) === c) { c.online = false; this.diffuser(room, { t: 'players', players: this.liste(room), host: room.host }); } });
    });
  }
}

// Un appareil branché sur un salon du serveur Cloudflare (mode « Chacun son téléphone »).
// Rôles : « host » (fait tourner la partie), « player » (manette), « screen » (affiche le plateau, ne joue pas).
// Après chaque (re)connexion, l'écran est reconstruit uniquement depuis « state » et « private » (welcome).
import { Device } from './device.js';
import { newState, DEFAULT_CFG } from './host.js';
import { parseJSON, clone } from '../lib/util.js';
import { SalonError } from '../net/salons.js';

const errText = (e) => (e && e.userMessage) || 'Connexion au salon impossible pour le moment. Vérifie le réseau et réessaie.';

export class SalonDevice extends Device {
  constructor(opts) {
    super({ ...opts, mode: 'online' });
    this.role = 'player';
    this.canTakeOver = false; // l'hôte revient tout seul : sa partie est gardée par le salon
    this.offs = [];
    this.screens = [];
  }

  async createParty(cfg) { return this.openSalon(null, { role: 'host', cfg }); }
  async joinParty(code) { return !!(await this.openSalon(code, { role: 'player' })); }
  // mode Écran : crée un salon (sans code) ou affiche un salon existant
  async openScreen(code = null) { return this.openSalon(code, { role: 'screen' }); }

  async openSalon(code, { role, cfg }) {
    if (this.busy) return null;
    this.busy = true;
    this.error = null;
    this.changed();
    try {
      const c = code || await this.backend.newRoom();
      const S = role === 'host' ? newState(c, this.uid, cfg || DEFAULT_CFG) : null;
      await this.enterParty(c, { role, initialS: S, fresh: !code });
      return c;
    } catch (e) {
      console.warn(e);
      this.error = errText(e);
      return null;
    } finally {
      this.busy = false;
      this.changed();
    }
  }

  async enterParty(code, opts = {}) {
    const b = this.backend;
    const saved = this.store.get('session', null);
    const role = opts.role || (opts.rejoin && saved && saved.role) || 'player';
    if (!opts.fresh) {
      let info = null;
      try { info = await b.roomInfo(code); } catch (e) { if (opts.rejoin) return false; throw e; }
      if (!info || !info.existe) {
        if (opts.rejoin) { this.store.del('session'); return false; }
        throw new SalonError('Aucun salon ne correspond à ce code.', 'absent');
      }
      if (!opts.rejoin && role !== 'screen' && info.joueurs >= 16) throw new SalonError('Ce salon est complet (16 appareils au plus).', 'full');
    }
    this.stopWatching();
    this.code = code;
    this.role = role;
    this.meta = { host: null, v: 1 };
    this.S = opts.initialS ? clone(opts.initialS) : null;
    this.secret = null;
    this.players = {};
    this.sent = {};
    this.store.set('session', { code, role });
    this.offs.push(b.on('welcome', () => this.onWelcome()));
    this.offs.push(b.on('state', (S) => { if (!this.engine) this.applyState(S); }));
    this.offs.push(b.on('private', (d) => this.applyPrivate(d)));
    this.offs.push(b.on('players', (list, host) => this.applyPlayers(list, host)));
    this.offs.push(b.on('expired', () => this.ended('Ce salon a expiré (6 h sans activité).')));
    try {
      await b.connect(code, role, role === 'screen' ? null : this.profile);
    } catch (e) {
      this.stopWatching();
      this.code = null;
      this.store.del('session');
      throw e;
    }
    this.view = role === 'screen' ? 'screen' : 'party';
    this.changed();
    return true;
  }

  onWelcome() {
    const b = this.backend;
    // d'abord l'état et le secret, puis les joueurs (qui peuvent faire repartir le moteur de l'hôte)
    if (b.state && !this.engine) this.applyState(b.state);
    this.applyPrivate(b.priv);
    this.applyPlayers(b.players, b.host);
    // salon créé depuis un écran : personne ne l'anime encore, le premier joueur devient l'hôte
    if (this.role === 'player' && !b.host && !this.claiming) {
      this.claiming = true;
      this.role = 'host';
      this.store.set('session', { code: this.code, role: 'host' });
      b.switchRole('host');
    }
  }

  applyState(S) {
    if (!S || typeof S !== 'object') return;
    if (S.fin) { this.ended('Soirée mise hors service. Merci d’avoir joué.'); return; }
    if (!this.S || S.code !== this.S.code || S.rev >= this.S.rev) {
      this.S = S;
      this.checkEvents();
      this.changed();
    }
  }

  applyPrivate(d) {
    const s = d && typeof d === 'object' ? d.s : null;
    this.secret = typeof s === 'string' ? parseJSON(s, null) : null;
    this.changed();
  }

  applyPlayers(list, host) {
    const map = {};
    for (const p of list || []) {
      if (!p || !p.pid || p.role === 'screen') continue;
      const a = p.avatar && typeof p.avatar === 'object' ? p.avatar : {};
      map[p.pid] = { nick: p.name, av: a.av, drink: a.drink !== false, sob: a.sob, lim: a.lim || 3, gn: a.gn === 'm' || a.gn === 'f' ? a.gn : 'x', online: p.online !== false && p.connected !== false };
    }
    this.screens = (list || []).filter((p) => p && p.role === 'screen');
    this.meta = { ...(this.meta || {}), host: host || null };
    if (host && host === this.uid && this.role !== 'screen' && !this.engine) this.becomeHost().catch((e) => console.error(e));
    if (host !== this.uid && this.engine) { this.engine.stop(); this.engine = null; }
    this.onPlayers(map);
  }

  async becomeHost() {
    if (this.role === 'screen') return;
    if (!this.S && this.backend.state && !this.backend.state.fin) this.S = clone(this.backend.state);
    if (!this.S) this.S = newState(this.code, this.uid, DEFAULT_CFG);
    this.claiming = false;
    await super.becomeHost();
  }

  takeOver() { this.toast('L’hôte va se reconnecter tout seul : sa partie est gardée par le salon.', 'info'); }

  stopWatching() {
    this.offs.forEach((u) => { try { u(); } catch (e) { /* ignoré */ } });
    this.offs = [];
    super.stopWatching();
    this.backend.disconnect();
  }

  ended(msg) {
    if (!this.code) return;
    this.stopWatching();
    this.code = null;
    this.S = null;
    this.meta = null;
    this.view = 'home';
    this.store.del('session');
    this.toast(msg, 'info');
    this.changed();
  }

  async leaveParty() {
    if (!this.code) return;
    this.stopWatching();
    this.code = null;
    this.S = null;
    this.meta = null;
    this.view = 'home';
    this.store.del('session');
    this.changed();
  }

  async endParty() {
    if (!this.code || !this.isHost) return;
    const S = clone(this.engine.S);
    S.fin = true;
    S.rev += 1;
    try { await this.backend.writeState(this.code, JSON.stringify(S)); } catch (e) { /* hors ligne : le salon s'efface seul après 6 h */ }
    this.stopWatching();
    this.code = null;
    this.S = null;
    this.meta = null;
    this.view = 'home';
    this.store.del('session');
    this.changed();
  }
}

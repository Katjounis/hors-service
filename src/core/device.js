// Un « appareil » = un téléphone qui participe à la soirée.
// Il garde le profil du joueur, suit l'état publié par l'hôte, son propre secret,
// envoie ses actions et, s'il est l'hôte, fait tourner le moteur d'arbitrage.

import { HostEngine, newState } from './host.js';
import { partyCode, parseJSON, emitter, rid, sanitizeNick, clone, avatarId } from '../lib/util.js';
import { loadGages, gagesOn } from '../lib/stats.js';

const errMsg = (e) => (e && e.userMessage) || 'Connexion impossible pour le moment. Vérifie le réseau et réessaie.';
const userError = (m) => Object.assign(new Error(m), { userMessage: m });

export class Device {
  constructor({ backend, store, mode = 'online', label = '' }) {
    this.backend = backend;
    this.store = store;
    this.mode = mode; // 'online' | 'local' | 'demo'
    this.label = label;
    this.uid = null;
    this.ready = false;
    this.conn = true;
    this.sync = true;
    this.profile = store.get('profile', null);
    this.code = null;
    this.meta = null;
    this.S = null;
    this.secret = null;
    this.players = {};
    this.view = 'home';
    this.busy = false;
    this.error = null;
    this.toasts = [];
    this.seenEv = null;
    this.seenCode = null;
    this.sent = {};
    this.engine = null;
    this.subs = emitter();
    this.unsub = [];
    this._q = false;
  }

  subscribe(fn) { return this.subs.on(fn); }

  // gages maison du groupe (écrits sur ce téléphone), mélangés aux gages de l'appli par le moteur
  gagesMaison() { return gagesOn() ? loadGages() : []; }

  changed() {
    if (this._q) return;
    this._q = true;
    queueMicrotask(() => { this._q = false; this.subs.emit(); });
  }

  async boot() {
    try {
      this.uid = await this.backend.init();
    } catch (e) {
      this.error = 'Impossible de se connecter au service de jeu.';
      this.ready = true;
      this.changed();
      return;
    }
    this.ready = true;
    this.backend.onConnection((ok) => { this.conn = ok; this.changed(); });
    const saved = this.store.get('session', null);
    if (saved && saved.code && this.profile) {
      try { await this.enterParty(saved.code, { rejoin: true }); } catch (e) { this.store.del('session'); }
    }
    this.changed();
  }

  // ---------- profil
  saveProfile(p) {
    const prof = {
      nick: sanitizeNick(p.nick) || 'Joueur',
      av: avatarId(p.av),
      drink: !!p.drink,
      // sans alcool : « gage » (un gage par pénalité) ou « points » (une gorgée = un point de pénalité)
      sob: p.sob === 'points' ? 'points' : 'gage',
      lim: [1, 2, 3].includes(p.lim) ? p.lim : 3,
    };
    this.profile = prof;
    this.store.set('profile', prof);
    if (this.code) this.backend.updateProfile(this.code, prof).catch(() => {});
    this.changed();
    return prof;
  }

  // ---------- soirée
  async createParty(cfg) {
    if (this.busy) return null;
    this.busy = true;
    this.error = null;
    this.changed();
    try {
      let code = null;
      for (let i = 0; i < 8 && !code; i++) {
        const c = partyCode();
        if (await this.backend.createParty(c, { host: this.uid, v: 1, created: this.backend.now() })) code = c;
      }
      if (!code) throw userError('Impossible de créer la soirée, réessaie dans un instant.');
      const S = newState(code, this.uid, cfg || {});
      await this.backend.writeState(code, JSON.stringify(S));
      await this.enterParty(code, { initialS: S });
      return code;
    } catch (e) {
      console.error(e);
      this.error = errMsg(e);
      return null;
    } finally {
      this.busy = false;
      this.changed();
    }
  }

  async joinParty(code) {
    if (this.busy) return false;
    this.busy = true;
    this.error = null;
    this.changed();
    try {
      return await this.enterParty(code, {});
    } catch (e) {
      this.error = errMsg(e);
      return false;
    } finally {
      this.busy = false;
      this.changed();
    }
  }

  async enterParty(code, opts = {}) {
    const meta = await this.backend.readMeta(code);
    if (!meta) {
      if (opts.rejoin) { this.store.del('session'); return false; }
      throw userError('Aucune soirée ne correspond à ce code.');
    }
    this.stopWatching();
    this.code = code;
    this.meta = meta;
    this.S = opts.initialS ? clone(opts.initialS) : null;
    this.secret = null;
    this.players = {};
    this.sent = {};
    this.store.set('session', { code });
    const bad = (what) => (e) => console.warn(what, e);
    this.unsub.push(this.backend.watchMeta(code, (m) => this.onMeta(m), bad('meta')));
    this.unsub.push(this.backend.watchState(code, (s) => this.onState(s), bad('état')));
    this.unsub.push(this.backend.watchPlayers(code, (p) => this.onPlayers(p), bad('joueurs')));
    this.unsub.push(this.backend.watchSecret(code, (s) => { this.secret = parseJSON(s, null); this.changed(); }, bad('secret')));
    await this.backend.join(code, this.profile);
    this.view = 'party';
    if (!this.S) {
      const str = await this.backend.readState(code).catch(() => null);
      const S = parseJSON(str, null);
      if (S && (!this.S || S.rev > this.S.rev)) this.S = S;
    }
    this.checkEvents();
    if (meta.host === this.uid) await this.becomeHost();
    this.changed();
    return true;
  }

  stopWatching() {
    this.unsub.forEach((u) => { try { u(); } catch (e) { /* ignoré */ } });
    this.unsub = [];
    if (this.engine) { this.engine.stop(); this.engine = null; }
  }

  onMeta(m) {
    if (!this.code) return;
    if (!m) {
      // la soirée a été terminée par l'hôte
      const was = this.code;
      this.stopWatching();
      this.code = null;
      this.S = null;
      this.meta = null;
      this.store.del('session');
      this.view = 'home';
      if (was) this.toast('Soirée mise hors service. Merci d’avoir joué.', 'info');
      this.changed();
      return;
    }
    this.meta = m;
    if (m.host === this.uid && !this.engine) this.becomeHost().catch((e) => console.error(e));
    if (m.host !== this.uid && this.engine) { this.engine.stop(); this.engine = null; }
    this.changed();
  }

  onState(str) {
    if (this.engine) return; // l'hôte a déjà l'état le plus récent
    const S = parseJSON(str, null);
    if (!S) return;
    if (!this.S || S.code !== this.S.code || S.rev >= this.S.rev) {
      this.S = S;
      this.checkEvents();
      this.changed();
    }
  }

  onPlayers(p) {
    this.players = p || {};
    if (this.engine) this.engine.syncPlayers();
    this.changed();
  }

  onHostState(S) {
    this.S = S;
    this.checkEvents();
    this.changed();
  }

  setSync(ok) { if (this.sync !== ok) { this.sync = ok; this.changed(); } }

  async becomeHost() {
    if (this.engine || this._becoming) return;
    this._becoming = true;
    try {
      let S = this.S;
      if (!S) S = parseJSON(await this.backend.readState(this.code).catch(() => null), null);
      if (!S) return;
      const engine = new HostEngine(this);
      this.engine = engine;
      await engine.start(S);
    } finally {
      this._becoming = false;
      this.changed();
    }
  }

  lostHost() {
    if (this.engine) { this.engine.stop(); this.engine = null; }
    this.toast('Un autre joueur anime maintenant la soirée.', 'info');
    this.changed();
  }

  get isHost() { return !!this.engine; }
  get hostOnline() {
    const h = this.meta && this.meta.host;
    return !!(h && this.players[h] && this.players[h].online);
  }

  retryConnection() { if (this.backend.retry) this.backend.retry(); }

  async takeOver() {
    if (!this.code || !this.meta || this.hostOnline || this.isHost) return;
    try {
      await this.backend.writeMeta(this.code, { ...this.meta, host: this.uid });
    } catch (e) {
      this.toast('Impossible de reprendre l’animation pour le moment.', 'warn');
    }
  }

  async leaveParty() {
    const code = this.code;
    if (!code) return;
    this.stopWatching();
    this.code = null;
    this.S = null;
    this.meta = null;
    this.view = 'home';
    this.store.del('session');
    this.changed();
    try { await this.backend.leave(code); } catch (e) { /* ignoré */ }
  }

  async endParty() {
    const code = this.code;
    if (!code || !this.isHost) return;
    this.stopWatching();
    this.code = null;
    this.S = null;
    this.meta = null;
    this.view = 'home';
    this.store.del('session');
    this.changed();
    try { await this.backend.deleteParty(code); } catch (e) { console.warn(e); }
  }

  // ---------- actions
  // mark: false pour une demande qui attend une nouvelle carte à l'écran (ex. « un gage à la place »)
  input(k, v, { mark = true } = {}) {
    if (!this.code) return;
    if (mark) this.sent[k] = Date.now();
    if (this.engine) {
      if (this.engine.input(this.uid, k, v)) this.engine.commit();
      this.changed();
      return;
    }
    this.backend.sendInput(this.code, JSON.stringify({ k, v })).catch(() => {
      delete this.sent[k];
      this.toast('Action non envoyée : vérifie ta connexion.', 'warn');
      this.changed();
    });
    this.changed();
  }

  gameInput(k, v) {
    if (!this.S || !this.S.game) return;
    this.input(`${this.S.game.seq}:${k}`, v);
  }

  // envois « en direct » (traits du dessin, propositions) : plusieurs envois sur la même demande, sans la marquer
  gamePost(k, v) {
    if (!this.S || !this.S.game) return;
    this.input(`${this.S.game.seq}:${k}`, v, { mark: false });
  }

  // vrai si l'action vient d'être envoyée (6 s) : au-delà, on peut la renvoyer
  recent(fullKey) {
    const t = this.sent[fullKey];
    return !!t && Date.now() - t < 6000;
  }

  isSent(k) {
    if (!this.S || !this.S.game) return false;
    return this.recent(`${this.S.game.seq}:${k}`);
  }

  host(name, arg) { if (this.engine) this.engine.act(name, arg); }

  // ---------- notifications
  toast(txt, k = 'info') {
    const t = { id: rid(6), txt, k };
    this.toasts = [...this.toasts.slice(-1), t];
    this.changed();
    setTimeout(() => {
      this.toasts = this.toasts.filter((x) => x.id !== t.id);
      this.changed();
    }, k === 'warn' ? 4000 : 2600);
  }

  checkEvents() {
    const S = this.S;
    if (!S) return;
    if (this.seenEv == null || this.seenCode !== S.code) {
      this.seenEv = S.evi;
      this.seenCode = S.code;
      return;
    }
    for (const e of S.ev) {
      if (e.i <= this.seenEv) continue;
      // les arrivées ne sont signalées qu'à l'hôte (en ligne), pour ne pas encombrer les écrans
      if (e.k === 'join' && (this.mode === 'local' || !this.engine)) continue;
      if (e.k === 'chambre') continue; // affiché en grand par <Chambre>
      if (e.to === '*' || e.to === this.uid || this.mode === 'local') this.toast(e.txt, e.k);
    }
    this.seenEv = Math.max(this.seenEv, S.evi);
  }

}

// Salons multi-téléphones : client du serveur de salons déjà déployé sur Cloudflare (Worker + Durable Objects).
// Protocole : docs/PROTOCOLE.md. Le serveur ne connaît aucune règle : il relaie. Le téléphone de l'hôte
// fait tourner la partie et publie l'état ; les joueurs envoient leurs actions ; l'écran affiche.
export const SALONS_URL = 'https://hors-service-salons.chaux-samuel.workers.dev';

import { emitter } from '../lib/util.js';

// adresse du serveur : constante ci-dessus, ou SALONS_URL défini en haut de index.html,
// ou __HS_SALONS_URL pour les tests automatiques (copie locale du protocole)
export function salonsBase() {
  if (typeof window !== 'undefined') {
    if (typeof window.__HS_SALONS_URL === 'string' && window.__HS_SALONS_URL) return window.__HS_SALONS_URL.replace(/\/$/, '');
    if (typeof window.SALONS_URL === 'string' && window.SALONS_URL) return window.SALONS_URL.replace(/\/$/, '');
  }
  return SALONS_URL;
}

const BACKOFF = [1000, 2000, 4000, 8000, 10000]; // reconnexion : 1 s, 2 s, 4 s… 10 s au plus
const PING_MS = 25000;
const BIG = 11000; // au-delà, on compresse (un message fait au plus 16 Ko)

export class SalonError extends Error {
  constructor(msg, kind) { super(msg); this.userMessage = msg; this.kind = kind; }
}

// ------------------------------------------------------------------ compression des gros messages
function b64(bytes) { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(str) { const s = atob(str); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; }
async function pack(value) {
  const s = JSON.stringify(value);
  if (s.length < BIG || typeof CompressionStream === 'undefined') return value;
  const stream = new Blob([new TextEncoder().encode(s)]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return { z: b64(new Uint8Array(await new Response(stream).arrayBuffer())) };
}
async function unpack(value) {
  if (!value || typeof value !== 'object' || typeof value.z !== 'string' || Object.keys(value).length !== 1) return value;
  const stream = new Blob([unb64(value.z)]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return JSON.parse(await new Response(stream).text());
}

function newPid() {
  try { if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, ''); } catch (e) { /* ancien navigateur */ }
  let s = '';
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

async function getJSON(url, init) {
  let res;
  try { res = await fetch(url, init); } catch (e) { throw new SalonError('Serveur de salons injoignable : vérifie ta connexion.', 'net'); }
  if (res.status === 403) throw new SalonError('Ce site n’est pas autorisé par le serveur de salons.', 'origin');
  if (!res.ok) throw new SalonError('Le serveur de salons ne répond pas correctement, réessaie dans un instant.', 'http');
  return res.json();
}

export class SalonBackend {
  constructor({ store }) {
    this.store = store;
    this.pid = null;
    this.ws = null;
    this.code = null;
    this.role = 'player';
    this.connected = false;
    this.conn = emitter();
    this.ev = emitter();
    this.offset = 0;
    this.host = null;
    this.players = [];
    this.locked = false;
    this.state = null;
    this.priv = null; // dernier message « private » reçu
    this.mine = { s: null, p: null }; // pour l'hôte : son propre secret + les données privées de la partie
    this.lockSent = null;
    this.tries = 0;
    this.closing = false;
    this.timers = { retry: 0, ping: 0 };
    this.outbox = []; // actions récentes, renvoyées après une coupure (l'hôte ignore les doublons)
    this.chainIn = Promise.resolve();
    this.chainOut = Promise.resolve();
    this.profile = null;
    this.welcomed = null;
    this.onVisible = () => { if (document.visibilityState === 'visible' && this.code && !this.connected) this.reconnectNow(); };
    this.onOnline = () => { if (this.code && !this.connected) this.reconnectNow(); };
  }

  kind() { return 'salons'; }
  now() { return Date.now() + this.offset; }

  async init() {
    let pid = this.store.get('pid', null);
    if (typeof pid !== 'string' || !/^[0-9a-z]{8,64}$/i.test(pid)) { pid = newPid(); this.store.set('pid', pid); }
    this.pid = pid;
    return pid;
  }

  onConnection(cb) { setTimeout(() => cb(this.connected), 0); return this.conn.on(cb); }
  on(name, cb) { return this.ev.on((n, ...a) => { if (n === name) cb(...a); }); }

  // ---------- routes HTTP
  async newRoom() {
    const r = await getJSON(`${salonsBase()}/new`, { method: 'POST' });
    if (!r || typeof r.code !== 'string') throw new SalonError('Impossible de créer le salon, réessaie.', 'http');
    return r.code.toUpperCase();
  }
  roomInfo(code) { return getJSON(`${salonsBase()}/room/${encodeURIComponent(code)}`); }

  // ---------- connexion
  connect(code, role, profile) {
    this.code = code;
    this.role = role;
    this.profile = profile;
    this.closing = false;
    this.tries = 0;
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.onVisible);
    if (typeof window !== 'undefined') window.addEventListener('online', this.onOnline);
    return new Promise((resolve, reject) => {
      this.welcomed = { resolve, reject };
      this.open();
    });
  }

  url() {
    const name = (this.profile && this.profile.nick) || 'Écran';
    const q = `pid=${encodeURIComponent(this.pid)}&name=${encodeURIComponent(name)}&role=${encodeURIComponent(this.role)}`;
    return `${salonsBase().replace(/^http/, 'ws')}/room/${encodeURIComponent(this.code)}/ws?${q}`;
  }

  open() {
    clearTimeout(this.timers.retry);
    if (!this.code || this.closing) return;
    let ws;
    try { ws = new WebSocket(this.url()); } catch (e) { this.scheduleRetry(); return; }
    this.ws = ws;
    let opened = false;
    ws.onopen = () => { opened = true; };
    ws.onmessage = (m) => { this.chainIn = this.chainIn.then(() => this.receive(m.data)).catch((e) => console.warn('salon', e)); };
    ws.onclose = (e) => {
      if (this.ws !== ws) return;
      this.ws = null;
      clearInterval(this.timers.ping);
      this.setConnected(false);
      if (this.closing) return;
      if (e.code === 4001) { this.fail(new SalonError('Ce salon a expiré (6 h sans activité).', 'expired'), true); return; }
      // refus à l'ouverture (salon plein, partie lancée, origine…) : on ne s'acharne pas avant le premier accueil
      if (!opened && this.welcomed && this.tries >= 2) {
        this.fail(new SalonError('Impossible d’entrer dans ce salon : il est complet, ou la partie a déjà commencé.', 'refused'));
        return;
      }
      this.scheduleRetry();
    };
  }

  scheduleRetry() {
    if (this.closing || !this.code) return;
    const ms = BACKOFF[Math.min(this.tries, BACKOFF.length - 1)];
    this.tries += 1;
    clearTimeout(this.timers.retry);
    this.timers.retry = setTimeout(() => this.open(), ms);
  }

  reconnectNow() {
    if (this.closing || !this.code) return;
    this.tries = 0;
    if (this.ws && (this.ws.readyState === 0 || this.ws.readyState === 1)) return;
    this.open();
  }

  retry() { this.reconnectNow(); }

  fail(err, expired = false) {
    if (this.welcomed) { const w = this.welcomed; this.welcomed = null; w.reject(err); this.disconnect(); return; }
    if (expired) { this.disconnect(); this.ev.emit('expired', err); }
  }

  setConnected(ok) {
    if (this.connected === ok) return;
    this.connected = ok;
    this.conn.emit(ok);
  }

  disconnect() {
    this.closing = true;
    clearTimeout(this.timers.retry);
    clearInterval(this.timers.ping);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.onVisible);
    if (typeof window !== 'undefined') window.removeEventListener('online', this.onOnline);
    const ws = this.ws;
    this.ws = null;
    if (ws) { try { ws.close(1000); } catch (e) { /* ignoré */ } }
    this.setConnected(false);
    this.code = null;
  }

  // changer de rôle (ex. personne n'anime encore le salon : le premier joueur devient l'hôte)
  switchRole(role) {
    this.role = role;
    const ws = this.ws;
    this.ws = null;
    if (ws) { try { ws.close(1000); } catch (e) { /* ignoré */ } }
    this.tries = 0;
    this.open();
  }

  rawSend(obj) {
    const ws = this.ws;
    if (!ws || ws.readyState !== 1) return false;
    try { ws.send(JSON.stringify(obj)); return true; } catch (e) { return false; }
  }

  // envois dans l'ordre, même quand un message doit d'abord être compressé
  send(obj, packField = null) {
    this.chainOut = this.chainOut.then(async () => {
      const msg = packField ? { ...obj, [packField]: await pack(obj[packField]) } : obj;
      if (!this.rawSend(msg)) throw new SalonError('Hors ligne', 'offline');
    });
    const p = this.chainOut;
    this.chainOut = this.chainOut.catch(() => {});
    return p;
  }

  async receive(raw) {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    switch (m.t) {
      case 'welcome': {
        this.tries = 0;
        this.host = m.host || null;
        this.players = Array.isArray(m.players) ? m.players : [];
        this.locked = !!m.locked;
        this.state = await unpack(m.state);
        this.priv = await unpack(m.private);
        if (this.host === this.pid && this.priv && typeof this.priv === 'object') this.mine = { s: this.priv.s ?? null, p: this.priv.p ?? null };
        this.setConnected(true);
        clearInterval(this.timers.ping);
        this.timers.ping = setInterval(() => this.rawSend({ t: 'ping' }), PING_MS);
        this.rawSend({ t: 'time', ref: Date.now() });
        if (this.profile) this.sendProfile(this.profile);
        // actions envoyées pendant la coupure : on les renvoie (l'hôte ignore celles déjà traitées)
        const fresh = this.outbox.filter((x) => Date.now() - x.at < 20000);
        this.outbox = fresh;
        for (const x of fresh) this.rawSend({ t: 'action', data: x.data });
        this.ev.emit('welcome', m);
        if (this.welcomed) { const w = this.welcomed; this.welcomed = null; w.resolve(m); }
        break;
      }
      case 'players': {
        this.players = Array.isArray(m.players) ? m.players : [];
        if ('host' in m) this.host = m.host || null;
        // l'hôte revient après une coupure : on lui renvoie les actions récentes (il ignore les doublons)
        const hostHere = !!this.host && this.players.some((p) => p && p.pid === this.host && p.online !== false && p.connected !== false);
        if (hostHere && this.hostHere === false && this.host !== this.pid) {
          this.outbox = this.outbox.filter((x) => Date.now() - x.at < 20000);
          for (const x of this.outbox) this.rawSend({ t: 'action', data: x.data });
        }
        this.hostHere = hostHere;
        this.ev.emit('players', this.players, this.host);
        break;
      }
      case 'state': this.state = await unpack(m.data); this.ev.emit('state', this.state); break;
      case 'private': this.priv = await unpack(m.data); this.ev.emit('private', this.priv); break;
      case 'action': this.ev.emit('action', m.from, m.at, m.data); break;
      case 'broadcast': this.ev.emit('broadcast', m.from, m.data); break;
      case 'locked': this.locked = !!m.value; this.ev.emit('locked', this.locked); break;
      case 'time':
        if (typeof m.now === 'number' && typeof m.ref === 'number') {
          const rtt = Math.max(0, Date.now() - m.ref);
          this.offset = m.now + rtt / 2 - Date.now();
        }
        break;
      case 'error': console.warn('salon :', m.erreur); this.ev.emit('error', m.erreur); break;
      default: break;
    }
  }

  // ---------- messages de l'app
  sendProfile(profile) {
    this.profile = profile;
    const avatar = { av: profile.av, drink: !!profile.drink, sob: profile.sob === 'points' ? 'points' : 'gage', lim: profile.lim || 3 };
    return this.rawSend({ t: 'profile', name: profile.nick, avatar });
  }
  updateProfile(code, profile) { this.sendProfile(profile); return Promise.resolve(); }

  // ---------- interface attendue par le moteur de l'hôte (HostEngine)
  async readPriv() { return this.mine.p || null; }
  watchInputs(code, cb) {
    return this.on('action', (from, at, data) => {
      if (!data || typeof data.id !== 'string' || typeof data.str !== 'string') return;
      cb([{ uid: from, id: data.id, str: data.str, at }]);
    });
  }
  ackInput() { return Promise.resolve(); }
  writeState(code, str) {
    const S = JSON.parse(str);
    const lock = S.status === 'game';
    if (lock !== this.lockSent) { this.lockSent = lock; this.rawSend({ t: 'lock', value: lock }); }
    return this.send({ t: 'state', data: S }, 'data');
  }
  writeSecret(code, uid, s) {
    if (uid === this.pid) { this.mine.s = s; return this.send({ t: 'private', to: this.pid, data: { ...this.mine } }, 'data'); }
    return this.send({ t: 'private', to: uid, data: { s } }, 'data');
  }
  writePriv(code, p) {
    this.mine.p = p;
    return this.send({ t: 'private', to: this.pid, data: { ...this.mine } }, 'data');
  }
  removePlayer() { return Promise.resolve(); } // le serveur ne retire personne : l'hôte écarte le joueur de la partie
  passHost(to) { return this.rawSend({ t: 'host', to }); }
  sendInput(code, str) {
    const data = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, str };
    this.outbox.push({ at: Date.now(), data });
    if (this.outbox.length > 30) this.outbox.shift();
    return this.rawSend({ t: 'action', data }) ? Promise.resolve() : Promise.reject(new SalonError('Hors ligne', 'offline'));
  }
  broadcast(data) { return this.rawSend({ t: 'broadcast', data }); }
}

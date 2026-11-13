// Serveur simulé en mémoire (démo à 4 téléphones simulés et tests) : même interface que pour un vrai serveur.
// Sert au mode « un seul téléphone », à la démo avec téléphones simulés et aux tests.
// Il applique des règles d'accès proches de celles d'un vrai serveur
// (seul l'hôte écrit l'état, chacun ne lit que son propre secret…),
// avec une latence réseau simulée et des coupures de connexion.

import { rid, emitter, sleep } from '../lib/util.js';

const splitPath = (p) => p.split('/').filter(Boolean);

class Denied extends Error {
  constructor(msg) { super('PERMISSION_DENIED: ' + msg); this.code = 'PERMISSION_DENIED'; }
}

export class MemoryHub {
  constructor({ latency = [12, 45], seed = null } = {}) {
    this.tree = seed ? JSON.parse(JSON.stringify(seed)) : {};
    this.latency = latency;
    this.watchers = new Set();
    this.clients = new Set();
    this.changes = emitter(); // pour la persistance du mode local
  }

  delay() {
    const [a, b] = this.latency;
    return a + Math.random() * (b - a);
  }

  // ---- arbre JSON
  get(path) {
    let node = this.tree;
    for (const k of splitPath(path)) {
      if (node == null || typeof node !== 'object') return null;
      node = node[k];
    }
    return node === undefined ? null : JSON.parse(JSON.stringify(node));
  }

  set(path, value) {
    const keys = splitPath(path);
    if (!keys.length) throw new Error('chemin vide');
    let node = this.tree;
    const stack = [];
    for (let i = 0; i < keys.length - 1; i++) {
      if (node[keys[i]] == null || typeof node[keys[i]] !== 'object') {
        if (value == null) return this.notify(path);
        node[keys[i]] = {};
      }
      stack.push([node, keys[i]]);
      node = node[keys[i]];
    }
    const last = keys[keys.length - 1];
    if (value == null) delete node[last];
    else node[last] = JSON.parse(JSON.stringify(value));
    // supprime les objets vides
    for (let i = stack.length - 1; i >= 0; i--) {
      const [parent, k] = stack[i];
      if (parent[k] && typeof parent[k] === 'object' && !Object.keys(parent[k]).length) delete parent[k];
    }
    this.notify(path);
    this.changes.emit(path);
  }

  notify(path) {
    for (const w of this.watchers) {
      if (w.path === path || w.path.startsWith(path + '/') || path.startsWith(w.path + '/')) this.schedule(w);
    }
  }

  schedule(w) {
    if (w.dead || w.pending || !w.client.connected) return;
    w.pending = true;
    setTimeout(() => {
      w.pending = false;
      if (w.dead || !w.client.connected) return;
      const v = this.get(w.path);
      const s = JSON.stringify(v);
      if (s === w.last) return;
      w.last = s;
      try { w.cb(v); } catch (e) { console.error(e); }
    }, this.delay());
  }

  watch(client, path, cb, onErr) {
    const deny = this.checkRead(client, path);
    if (deny) {
      setTimeout(() => onErr && onErr(new Denied(deny)), this.delay());
      return () => {};
    }
    const w = { client, path, cb, last: undefined, pending: false, dead: false };
    this.watchers.add(w);
    this.schedule(w);
    return () => { w.dead = true; this.watchers.delete(w); };
  }

  resync(client) {
    for (const w of this.watchers) if (w.client === client) { w.last = undefined; this.schedule(w); }
  }

  // ---- règles d'accès
  hostOf(code) { return this.get(`parties/${code}/meta/host`); }

  checkRead(client, path) {
    const k = splitPath(path);
    if (k[0] !== 'parties' || !k[1]) return 'lecture hors des soirées';
    const code = k[1];
    const area = k[2];
    if (area === 'secret') return k[3] === client.uid ? null : 'secret d’un autre joueur';
    if (area === 'inputs' || area === 'hpriv') return this.hostOf(code) === client.uid ? null : 'réservé à l’hôte';
    if (['meta', 'state', 'players'].includes(area)) return null;
    return 'zone inconnue';
  }

  checkWrite(client, path, value) {
    const k = splitPath(path);
    if (k[0] !== 'parties' || !k[1]) return 'écriture hors des soirées';
    const code = k[1];
    const area = k[2];
    const host = this.hostOf(code);
    const isHost = host === client.uid;
    if (!area) return isHost ? null : 'suppression réservée à l’hôte';
    if (area === 'meta') {
      if (!host) return value && value.host === client.uid ? null : 'création invalide';
      if (isHost) return null;
      const hostOnline = this.get(`parties/${code}/players/${host}/online`);
      const amPlayer = this.get(`parties/${code}/players/${client.uid}`);
      if (hostOnline === false && amPlayer && value && value.host === client.uid) return null;
      return 'meta réservée à l’hôte';
    }
    if (area === 'state' || area === 'secret' || area === 'hpriv') {
      if (typeof value === 'string' && value.length > 400000) return 'trop volumineux';
      return isHost ? null : 'réservé à l’hôte';
    }
    if (area === 'players') return k[3] === client.uid || isHost ? null : 'profil d’un autre joueur';
    if (area === 'inputs') {
      if (typeof value === 'string' && value.length > 6000) return 'action trop volumineuse';
      return k[3] === client.uid || isHost ? null : 'action d’un autre joueur';
    }
    return 'zone inconnue';
  }

  write(client, path, value) {
    const deny = this.checkWrite(client, path, value);
    if (deny) throw new Denied(deny);
    this.set(path, value);
  }

  // ---- connexions simulées
  register(client) { this.clients.add(client); }

  disconnect(client) {
    if (!client.connected) return;
    client.connected = false;
    for (const [path, value] of client.onDisconnectOps.values()) {
      try { this.set(path, value); } catch (e) { /* ignoré */ }
    }
    client.onDisconnectOps.clear();
    client.conn.emit(false);
  }

  reconnect(client) {
    if (client.connected) return;
    client.connected = true;
    client.conn.emit(true);
    client.flush();
    this.resync(client);
  }

  snapshot() { return JSON.parse(JSON.stringify(this.tree)); }
}

export class MemoryBackend {
  constructor(hub, { uid = null } = {}) {
    this.hub = hub;
    this.uid = uid || rid(14);
    this.connected = true;
    this.conn = emitter();
    this.queue = Promise.resolve();
    this.offline = []; // opérations en attente pendant une coupure
    this.onDisconnectOps = new Map();
    this.presence = null; // { code, profile }
    hub.register(this);
    this.conn.on((ok) => { if (ok && this.presence) this._presence(); });
  }

  async init() { await sleep(this.hub.delay()); return this.uid; }
  kind() { return 'memory'; }
  now() { return Date.now(); }
  onConnection(cb) { setTimeout(() => cb(this.connected), 0); return this.conn.on(cb); }

  // opérations séquentielles (l'ordre des écritures d'un même appareil est conservé)
  _op(fn) {
    const run = () => new Promise((resolve, reject) => {
      const exec = () => setTimeout(() => {
        try { resolve(fn()); } catch (e) { reject(e); }
      }, this.hub.delay());
      if (this.connected) exec();
      else this.offline.push(exec);
    });
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => {});
    return p;
  }

  flush() {
    const ops = this.offline.splice(0);
    ops.forEach((f) => f());
  }

  _w(path, value) { return this._op(() => this.hub.write(this, path, value)); }

  // ---- soirée
  async createParty(code, meta) {
    return this._op(() => {
      if (this.hub.get(`parties/${code}/meta`)) return false;
      this.hub.write(this, `parties/${code}/meta`, meta);
      return true;
    });
  }
  readMeta(code) { return this._op(() => this.hub.get(`parties/${code}/meta`)); }
  watchMeta(code, cb, err) { return this.hub.watch(this, `parties/${code}/meta`, cb, err); }
  writeMeta(code, meta) { return this._w(`parties/${code}/meta`, meta); }

  watchState(code, cb, err) { return this.hub.watch(this, `parties/${code}/state`, cb, err); }
  readState(code) { return this._op(() => this.hub.get(`parties/${code}/state`)); }
  writeState(code, str) { return this._w(`parties/${code}/state`, str); }

  watchPlayers(code, cb, err) { return this.hub.watch(this, `parties/${code}/players`, (v) => cb(v || {}), err); }

  join(code, profile) {
    this.presence = { code, profile: { ...profile } };
    return this._presence();
  }
  _presence() {
    const { code, profile } = this.presence;
    const path = `parties/${code}/players/${this.uid}`;
    this.onDisconnectOps.set('online', [`${path}/online`, false]);
    return this._w(path, { ...profile, online: true, t: Date.now() });
  }
  updateProfile(code, profile) {
    if (this.presence && this.presence.code === code) this.presence.profile = { ...profile };
    return this._w(`parties/${code}/players/${this.uid}`, { ...profile, online: true, t: Date.now() });
  }
  leave(code) {
    this.presence = null;
    this.onDisconnectOps.clear();
    return this._w(`parties/${code}/players/${this.uid}`, null);
  }
  removePlayer(code, uid) { return this._w(`parties/${code}/players/${uid}`, null); }

  sendInput(code, str) { return this._w(`parties/${code}/inputs/${this.uid}/${Date.now().toString(36)}${rid(5)}`, str); }
  watchInputs(code, cb, err) {
    return this.hub.watch(this, `parties/${code}/inputs`, (v) => {
      const list = [];
      for (const [uid, items] of Object.entries(v || {})) {
        for (const [id, str] of Object.entries(items || {})) list.push({ uid, id, str });
      }
      list.sort((a, b) => (a.id < b.id ? -1 : 1));
      cb(list);
    }, err);
  }
  ackInput(code, uid, id) { return this._w(`parties/${code}/inputs/${uid}/${id}`, null); }

  writeSecret(code, uid, str) { return this._w(`parties/${code}/secret/${uid}`, str); }
  watchSecret(code, cb, err) { return this.hub.watch(this, `parties/${code}/secret/${this.uid}`, cb, err); }
  writePriv(code, str) { return this._w(`parties/${code}/hpriv`, str); }
  readPriv(code) {
    return this._op(() => {
      if (this.hub.hostOf(code) !== this.uid) throw new Denied('réservé à l’hôte');
      return this.hub.get(`parties/${code}/hpriv`);
    });
  }


  deleteParty(code) { return this._w(`parties/${code}`, null); }

  // simulation (démo / tests)
  simulateDisconnect() { this.hub.disconnect(this); }
  simulateReconnect() { this.hub.reconnect(this); }
  retry() { this.simulateReconnect(); }
}

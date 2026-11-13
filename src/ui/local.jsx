// Mode « un seul téléphone » : tous les joueurs partagent le même appareil.
// Techniquement, chaque joueur a son propre appareil virtuel relié à un serveur en mémoire :
// les règles et l'arbitrage sont exactement les mêmes qu'en multi-téléphones.
// Les informations secrètes ne s'affichent qu'après « Passe le téléphone à… ».

import { useState } from 'preact/hooks';
import { MemoryHub, MemoryBackend } from '../net/memory.js';
import { Device } from '../core/device.js';
import { emitter, sanitizeNick } from '../lib/util.js';
import { Party, Toasts } from './party.jsx';
import { ProfileFields, defaultProfile, TopBack, penMode } from './screens.jsx';
import { profiles } from '../lib/stats.js';
import { DEFAULT_CFG } from '../core/host.js';
import { Av } from './common.jsx';
import { Icon } from './icons.jsx';

const KEY = 'hs:local';

export function memStore() {
  const m = new Map();
  return { get: (k, d = null) => (m.has(k) ? m.get(k) : d), set: (k, v) => m.set(k, v), del: (k) => m.delete(k) };
}

function readSaved() {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
}

export class LocalSession {
  constructor() {
    this.hub = null;
    this.host = null;
    this.devs = new Map();
    this.subs = emitter();
    this.timer = null;
  }

  static hasSaved() { const s = readSaved(); return !!(s && s.code && s.tree); }

  deviceOf(uid) { return this.devs.get(uid) || null; }

  _newDevice(uid) {
    const d = new Device({ backend: new MemoryBackend(this.hub, { uid }), store: memStore(), mode: 'local' });
    return d;
  }

  _watch() {
    this.hub.changes.on(() => {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.save(), 300);
    });
  }

  save() {
    if (!this.host || !this.host.code) return;
    const data = {
      tree: this.hub.snapshot(),
      code: this.host.code,
      host: this.host.uid,
      devices: [...this.devs.values()].map((d) => ({ uid: d.uid, profile: d.profile })),
    };
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* stockage plein ou bloqué */ }
  }

  async start(players, cfg) {
    this.hub = new MemoryHub({ latency: [0, 4] });
    const host = this._newDevice();
    host.saveProfile(players[0]);
    await host.boot();
    await host.createParty(cfg);
    this.host = host;
    this.devs.set(host.uid, host);
    for (const p of players.slice(1)) await this.addPlayer(p);
    this._watch();
    this.save();
  }

  async restore() {
    const s = readSaved();
    if (!s) return false;
    this.hub = new MemoryHub({ latency: [0, 4], seed: s.tree });
    const order = [s.host, ...s.devices.map((d) => d.uid).filter((u) => u !== s.host)];
    for (const uid of order) {
      const info = s.devices.find((d) => d.uid === uid);
      if (!info) continue;
      const d = this._newDevice(uid);
      d.saveProfile(info.profile);
      await d.boot();
      const ok = await d.enterParty(s.code, { rejoin: true }).catch(() => false);
      if (!ok) { if (uid === s.host) return false; continue; }
      this.devs.set(uid, d);
      if (uid === s.host) this.host = d;
    }
    this._watch();
    return !!this.host;
  }

  async addPlayer(profile) {
    const d = this._newDevice();
    d.saveProfile(profile);
    await d.boot();
    await d.joinParty(this.host.code);
    this.devs.set(d.uid, d);
    return d;
  }

  removePlayer(uid) {
    const d = this.devs.get(uid);
    if (!d || d === this.host) return;
    this.devs.delete(uid);
    d.leaveParty();
  }

  async end() {
    for (const d of this.devs.values()) if (d !== this.host) d.stopWatching();
    if (this.host) await this.host.endParty();
    try { localStorage.removeItem(KEY); } catch (e) { /* ignoré */ }
    this.subs.emit('end');
  }
}

export function LocalSetup({ onStart, onBack }) {
  const [players, setPlayers] = useState([]);
  const [prof, setProf] = useState(defaultProfile(null));
  const cfg = DEFAULT_CFG; // les réglages de la soirée sont dans le menu, une fois la partie lancée
  const [busy, setBusy] = useState(false);
  const add = () => {
    const nick = sanitizeNick(prof.nick);
    if (!nick || players.length >= 16) return;
    setPlayers([...players, { ...prof, nick }]);
    setProf(defaultProfile(null));
  };
  const go = async () => {
    if (players.length < 2 || busy) return;
    setBusy(true);
    await onStart(players, cfg);
  };
  return (
    <div class="screen">
      <TopBack title="Un seul téléphone" onBack={onBack} />
      <p class="muted">Ajoute les joueurs dans l’ordre où vous êtes assis. Le téléphone passera de main en main pour les informations secrètes.</p>
      {players.length ? (
        <ul class="players">
          {players.map((p, i) => (
            <li class="player" key={i}>
              <span class="player-n">{String(i + 1).padStart(2, '0')}</span>
              <Av p={p} />
              <span class="player-name">{p.nick}</span>
              <span class="player-meta">{penMode(p)}</span>
              <button type="button" class="icon-btn" aria-label={`Retirer ${p.nick}`} onClick={() => setPlayers(players.filter((_, j) => j !== i))}><Icon name="close" /></button>
            </li>
          ))}
        </ul>
      ) : null}
      {(() => {
        const taken = new Set(players.map((x) => x.nick.toLowerCase()));
        const habitues = profiles().filter((p) => !taken.has(p.nick.toLowerCase())).slice(0, 12);
        return habitues.length && players.length < 16 ? (
          <div class="habitues">
            <span class="field-l">Joueurs habituels</span>
            <div class="chips">
              {habitues.map((p) => (
                <button type="button" key={p.nick} class="chip-btn" onClick={() => setPlayers([...players, { nick: p.nick, av: p.av, drink: p.drink !== false, sob: p.sob === 'points' ? 'points' : 'gage', lim: p.lim || 3 }])}>
                  <Av p={p} size="s" /> {p.nick}
                </button>
              ))}
            </div>
          </div>
        ) : null;
      })()}
      <div class="panel">
        <h3>{players.length ? 'Ajouter un autre joueur' : 'Premier joueur'}</h3>
        <ProfileFields value={prof} onChange={setProf} idp="local" />
        <button type="button" class="btn btn-wide" disabled={!sanitizeNick(prof.nick)} onClick={add}>Ajouter {sanitizeNick(prof.nick) || 'ce joueur'}</button>
      </div>
      <p class="hint">Ambiance, valeur du cul sec et plafond : réglés par défaut, modifiables à tout moment dans le menu (en haut à droite).</p>
      <button type="button" class="btn btn-main btn-big btn-wide" disabled={players.length < 2 || busy} onClick={go}>
        {players.length < 2 ? 'Ajoute au moins 2 joueurs' : busy ? 'Mise en service…' : `Mettre en service à ${players.length}`}
      </button>
    </div>
  );
}

export function LocalParty({ local }) {
  return (
    <>
      <Party dev={local.host} local={local} />
      <Toasts dev={local.host} />
    </>
  );
}

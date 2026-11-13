// Démo : plusieurs téléphones simulés sur le même écran, pour essayer les jeux seul.
// Les autres joueurs peuvent jouer automatiquement (choix au hasard, mais légaux).
import { useEffect, useState } from 'preact/hooks';
import { MemoryHub, MemoryBackend } from '../net/memory.js';
import { Device } from '../core/device.js';
import { GAMES } from '../games/index.js';
import { memStore } from './local.jsx';

export class Bot {
  constructor(dev, enabled) {
    this.dev = dev;
    this.enabled = enabled;
    this.key = null;
    this.timer = null;
    this.mem = {};
    this.skip = new Set(); // demandes facultatives auxquelles le joueur automatique a choisi de ne pas répondre
    dev.subscribe(() => this.check());
  }

  plan(key, fn) {
    if (this.key === key) return;
    this.key = key;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.key = null;
      try { fn(); } catch (e) { console.error(e); }
    }, 600 + Math.random() * 1400);
  }

  check() {
    const d = this.dev;
    const S = d.S;
    if (!S || !d.code) return;
    // le joueur automatique « écoute » chaque coup, même quand il ne joue pas
    if (S.status === 'game' && S.game && GAMES[S.game.id] && GAMES[S.game.id].observe) GAMES[S.game.id].observe(this.mem, S.game.g, d.secret);
    if (!this.enabled() || !d.conn) return;
    const gift = S.gifts.find((x) => x.uid === d.uid && !d.sent[`gift:${x.id}`]);
    if (gift) {
      this.plan(`gift:${gift.id}`, () => {
        const others = S.order.filter((u) => u !== d.uid && S.roster[u]);
        const alloc = {};
        for (let i = 0; i < gift.n; i++) {
          const u = others[Math.floor(Math.random() * others.length)];
          alloc[u] = (alloc[u] || 0) + 1;
        }
        d.input(`gift:${gift.id}`, alloc);
      });
      return;
    }
    const pen = S.pen.find((x) => x.uid === d.uid && !d.sent[`pen:${x.id}`]);
    if (pen) {
      this.plan(`pen:${pen.id}`, () => {
        const v = Math.random() < 0.85 ? 'done' : 'pass';
        d.sent[`pen:${pen.id}`] = Date.now();
        d.input(`pen:${pen.id}`, v);
      });
      return;
    }
    if (S.status === 'game' && S.game) {
      const G = GAMES[S.game.id];
      const req = G && G.request({ S, g: S.game.g, secret: d.secret, uid: d.uid, now: d.backend.now(), local: false });
      if (req && !d.isSent(req.k) && G.bot && !this.skip.has(`${S.game.seq}:${req.k}`)) {
        this.plan(`${S.game.seq}:${req.k}`, () => {
          const S2 = d.S;
          if (!S2 || !S2.game) return;
          const r2 = G.request({ S: S2, g: S2.game.g, secret: d.secret, uid: d.uid, now: d.backend.now(), local: false });
          if (!r2 || r2.k !== req.k || d.isSent(r2.k)) return;
          const v = G.bot({ S: S2, g: S2.game.g, secret: d.secret, uid: d.uid, req: r2, mem: this.mem, dev: d });
          if (v && typeof v.then === 'function') {
            // réponse asynchrone
            d.sent[`${S2.game.seq}:${r2.k}`] = Date.now() + 60000;
            v.then((val) => { delete d.sent[`${S2.game.seq}:${r2.k}`]; if (val !== undefined) d.gameInput(r2.k, val); }).catch(() => { delete d.sent[`${S2.game.seq}:${r2.k}`]; });
          } else if (v !== undefined) {
            // demandes « en direct » (dessin, propositions) : on peut envoyer plusieurs fois de suite
            if (r2.live) d.input(`${S2.game.seq}:${r2.k}`, v, { mark: false }); else d.gameInput(r2.k, v);
          }
          else if (r2.optional) this.skip.add(`${S2.game.seq}:${r2.k}`);
        });
      }
    }
  }
}

const BOTS = [
  { nick: 'Camille', av: 'verre', drink: true, lim: 3 },
  { nick: 'Hugo', av: 'cone', drink: false, lim: 3 },
  { nick: 'Inès', av: 'ampoule', drink: true, lim: 3 },
];

export class DemoSim {
  constructor() {
    this.hub = new MemoryHub({ latency: [25, 110] });
    this.auto = true;
    this.phones = [];
    this.ready = false;
  }

  async start(profile) {
    const host = new Device({ backend: new MemoryBackend(this.hub), store: memStore(), mode: 'demo', label: 'Toi' });
    host.saveProfile(profile);
    await host.boot();
    await host.createParty({});
    this.phones.push({ dev: host, label: 'Toi (hôte)' });
    for (const p of BOTS) {
      const d = new Device({ backend: new MemoryBackend(this.hub), store: memStore(), mode: 'demo', label: p.nick });
      d.saveProfile(p);
      await d.boot();
      await d.joinParty(host.code);
      d.bot = new Bot(d, () => this.auto);
      this.phones.push({ dev: d, label: p.nick });
    }
    this.ready = true;
  }
}

export function DemoApp({ profile, onExit, DeviceApp }) {
  const [sim] = useState(() => new DemoSim());
  const [, force] = useState(0);
  const [tab, setTab] = useState(0);
  const [wide, setWide] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1100 : false));
  useEffect(() => {
    sim.start(profile).then(() => force((x) => x + 1));
    const r = () => setWide(window.innerWidth >= 1100);
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);
  const toggleNet = (dev) => {
    if (dev.backend.connected) dev.backend.simulateDisconnect(); else dev.backend.simulateReconnect();
    force((x) => x + 1);
  };
  return (
    <div class="demo">
      <div class="demo-bar">
        <span class="demo-title">Démo · 4 téléphones simulés</span>
        <label class="switch">
          <input type="checkbox" checked={sim.auto} onChange={(e) => { sim.auto = e.currentTarget.checked; sim.phones.forEach((p) => p.dev.bot && p.dev.bot.check()); force((x) => x + 1); }} />
          <span>Les autres jouent tout seuls</span>
        </label>
        <button type="button" class="btn btn-small" onClick={onExit}>Quitter la démo</button>
      </div>
      {!sim.ready ? <p class="waiting">Redémarrage des téléphones…</p> : (
        <>
          {!wide ? (
            <div class="demo-tabs" role="tablist">
              {sim.phones.map((p, i) => (
                <button type="button" role="tab" key={i} aria-selected={tab === i ? 'true' : 'false'} class={`demo-tab${tab === i ? ' is-on' : ''}`} onClick={() => setTab(i)}>{p.label}</button>
              ))}
            </div>
          ) : null}
          <div class={`phones${wide ? ' is-wide' : ''}`}>
            {sim.phones.map((p, i) => (wide || tab === i) ? (
              <div class="phone-wrap" key={i}>
                <div class="phone-label">
                  {wide ? <span>{p.label}</span> : null}
                  {i > 0 ? (
                    <button type="button" class={`btn btn-small${p.dev.backend.connected ? '' : ' btn-danger'}`} onClick={() => toggleNet(p.dev)}>
                      {p.dev.backend.connected ? 'Couper le réseau' : 'Rétablir le réseau'}
                    </button>
                  ) : null}
                </div>
                <div class="phone"><div class="phone-scroll"><DeviceApp dev={p.dev} embedded /></div></div>
              </div>
            ) : null)}
          </div>
        </>
      )}
    </div>
  );
}

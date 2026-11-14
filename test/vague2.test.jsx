// Jeux de la vague 2 (Président, Cercle de feu, Menteur aux dés, Paranoïa, Action ou vérité, Tu préfères) : parties complètes par des joueurs automatiques.
import { MemoryHub, MemoryBackend } from '../src/net/memory.js';
import { Device } from '../src/core/device.js';
import { GAMES } from '../src/games/index.js';
import { Bot } from '../src/ui/demo.jsx';
import { validPlay, moves, titlesFor, pv } from '../src/games/president.jsx';
import { countFace, higher } from '../src/games/perudo.jsx';
import { roleCounts } from '../src/games/pipoteur.jsx';

let passed = 0;
let failed = 0;
const fails = [];
const ok = (cond, msg) => { if (cond) passed++; else { failed++; fails.push(msg); console.log('  ✗', msg); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 4000, msg = 'condition') {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (fn()) return true; } catch (e) { /* attendre */ } await sleep(8); }
  ok(false, `délai dépassé : ${msg}`);
  return false;
}
const mem = () => { const m = new Map(); return { get: (k, d = null) => (m.has(k) ? m.get(k) : d), set: (k, v) => m.set(k, v), del: (k) => m.delete(k) }; };

async function party(n, { level = 3, cap = 0, mode = 'demo' } = {}) {
  const hub = new MemoryHub({ latency: [1, 6] });
  const devs = [];
  for (let i = 0; i < n; i++) {
    const d = new Device({ backend: new MemoryBackend(hub), store: mem(), mode });
    d.saveProfile({ nick: `J${i}`, av: '🦊', drink: i !== 2, lim: 3 });
    await d.boot();
    if (i === 0) await d.createParty({ level, cap }); else await d.joinParty(devs[0].code);
    devs.push(d);
  }
  await until(() => devs.every((d) => d.S && Object.keys(d.S.roster).length === n), 4000, `${n} joueurs`);
  return { hub, host: devs[0], devs };
}
const G = (d) => d.S.game.g;
const P = (host) => host.engine.priv.games[host.S.game.seq];
const byUid = (devs, u) => devs.find((d) => d.uid === u);
async function start(host, devs, id, opts = {}) {
  host.host('start', { id, opts });
  await until(() => devs.every((d) => d.S && d.S.status === 'game' && d.S.game && d.S.game.id === id), 3000, `lancement ${id}`);
}
// Attend que l'hôte ait tout publié (état + secrets) et que chaque téléphone l'ait reçu.
async function sync(host, devs) {
  await sleep(10);
  const e = host.engine;
  await until(() => !e.dirty && !e.writing, 3000, 'hôte au repos');
  const rev = host.S.rev;
  const same = (d) => JSON.stringify(d.secret ?? null) === JSON.stringify(e.secrets[d.uid] ?? null);
  await until(() => devs.every((d) => d.S && d.S.rev >= rev && same(d)), 3000, 'synchronisation');
}
async function botRun(id, opts, n, finishWhen, maxMs = 30000) {
  const { host, devs } = await party(n);
  const bots = devs.map((d) => new Bot(d, () => true));
  bots.forEach((b) => { b.plan = function (key, fn) { if (this.key === key) return; this.key = key; clearTimeout(this.timer); this.timer = setTimeout(() => { this.key = null; fn(); }, 4); }; });
  await start(host, devs, id, opts);
  const t0 = Date.now();
  let lastRev = -1;
  let stall = 0;
  let hostActs = 0;
  while (Date.now() - t0 < maxMs) {
    await sleep(60);
    bots.forEach((b) => b.check());
    const g = G(host);
    if (finishWhen(g)) break;
    // l'hôte fait avancer la partie quand c'est à lui
    const acts = GAMES[id].actions({ S: host.S, g, online: (u) => !!(host.players[u] && host.players[u].online) });
    const main = acts.find((a) => a.primary && !a.disabled) || acts.find((a) => a.id === 'skip');
    if (main && stall > 3) { host.host('game', { id: main.id }); hostActs++; stall = 0; }
    if (host.S.rev === lastRev) stall++; else { stall = 0; lastRev = host.S.rev; }
    if (stall > 120) break;
  }
  const g = G(host);
  bots.forEach((b) => clearTimeout(b.timer));
  const done = finishWhen(g);
  await host.endParty();
  return { done, g, hostActs };
}



async function logic() {
  console.log('Règles');
  const h = ['3C', '3D', '5H', 'KS', '2C', '2D'];
  ok(validPlay(h, ['3C', '3D'], null), 'Président : paire en ouverture');
  ok(!validPlay(h, ['3C', '5H'], null), 'Président : valeurs différentes refusées');
  ok(!validPlay(h, ['5H'], { n: 1, v: pv('KS') }), 'Président : plus faible refusé');
  ok(validPlay(h, ['2C'], { n: 1, v: pv('AS') }), 'Président : le 2 bat l’as');
  ok(!validPlay(h, ['KS'], { n: 2, v: 0 }), 'Président : mauvais nombre de cartes');
  ok(moves(h, { n: 2, v: pv('3H') }).length === 1, 'Président : une seule paire jouable au-dessus des 3');
  const t = titlesFor(['a', 'b', 'c', 'd', 'e']);
  ok(t.a === 'president' && t.b === 'vice' && t.c === 'neutre' && t.d === 'vicetrou' && t.e === 'trouduc', 'Président : titres à 5');
  ok(countFace([1, 4, 4, 2, 6], 4) === 3, 'Menteur : les 1 sont jokers');
  ok(higher({ q: 3, f: 5 }, { q: 3, f: 4 }) && higher({ q: 4, f: 2 }, { q: 3, f: 6 }) && !higher({ q: 3, f: 3 }, { q: 3, f: 4 }), 'Menteur : surenchère');
}

async function runAll() {
  // Pipoteur : rôles réglables, toujours au moins deux civils et un infiltré
  const rc = (...a) => JSON.stringify(roleCounts(...a));
  ok(rc(4, 'auto', 'auto') === '{"nPipo":1,"nBb":0}', 'pipoteur auto à 4 : 1 pipoteur, pas de Blanc-Bec');
  ok(rc(4, 'auto', 1) === '{"nPipo":1,"nBb":1}', 'pipoteur à 4 : on peut demander un Blanc-Bec');
  ok(rc(3, 2, 1) === '{"nPipo":1,"nBb":0}', 'pipoteur à 3 : réglage trop gourmand ramené à 1 infiltré');
  ok(rc(8, 'auto', 'auto') === '{"nPipo":2,"nBb":1}', 'pipoteur auto à 8 : 2 pipoteurs et 1 Blanc-Bec');
  const end = (g) => g.phase === 'end';
  const cases = [
    ['president', { rounds: 3 }, 5, end, 40000],
    ['cercle', {}, 4, end, 40000],
    ['perudo', { dice: 3 }, 4, end, 40000],
    ['paranoia', { turns: 2 }, 4, end, 20000],
    ['actionverite', { turns: 2 }, 3, end, 20000],
    ['tupref', { cards: 15 }, 4, end, 20000],
  ];
  for (const [id, opts, n, fin, ms] of cases) {
    const r = await botRun(id, opts, n, fin, ms);
    ok(r.done, `${GAMES[id].name} : partie complète par les joueurs automatiques (${r.g.phase})`);
    console.log(`  ${GAMES[id].name} : ${r.done ? 'terminé' : 'bloqué en ' + r.g.phase}, ${r.hostActs} actions hôte`);
  }
}

async function secrets() {
  console.log('Secrets');
  // Paranoïa : la question n'est pas publique tant que le désigné n'a pas bu
  const { host, devs } = await party(4);
  await start(host, devs, 'paranoia', { turns: 2 });
  await sleep(60);
  const e = host.engine;
  const seq = host.S.game.seq;
  let g = G(host);
  const q = e.secrets[g.cur].q;
  ok(q && !JSON.stringify(g).includes(q), 'Paranoïa : question absente de l’état public');
  const other = g.pl.find((u) => u !== g.cur);
  e.input(g.cur, `${seq}:p${g.n}`, other);
  g = G(host);
  ok(g.phase === 'named' && g.named === other, 'Paranoïa : désignation');
  e.input(other, `${seq}:b${g.n}`, true);
  ok(G(host).q === q && host.S.pen.some((p) => p.uid === other), 'Paranoïa : il boit, la question s’affiche');
  await host.endParty();
  // Président : les mains restent secrètes
  const p2 = await party(4);
  await start(p2.host, p2.devs, 'president', { rounds: 3 });
  await sleep(60);
  const e2 = p2.host.engine;
  const g2 = G(p2.host);
  const tot = Object.values(e2.secrets).reduce((n, s) => n + s.hand.length, 0);
  ok(tot === 52 && !/"[2-9TJQKA][SHDC]"/.test(JSON.stringify(g2.cnt)), 'Président : 52 cartes réparties, mains hors de l’état public');
  ok(e2.secrets[g2.cur].hand.includes('3C'), 'Président : le 3 de trèfle commence');
  await p2.host.endParty();
}

(async () => {
  try {
    const only = process.argv[2];
    if (!only || only === 'logic') await logic();
    if (!only || only === 'secrets') await secrets();
    if (!only || only === 'all') await runAll();
  } catch (e) { console.error(e); failed++; }
  console.log(`\n${passed} vérifications réussies, ${failed} échec(s)`);
  process.exit(failed ? 1 : 0);
})();

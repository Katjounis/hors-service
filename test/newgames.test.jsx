// Nouveaux jeux (GlouGlou Garou, Coinche, Quiz buzzer, Dessine et devine) : parties complètes par des joueurs automatiques.
import { MemoryHub, MemoryBackend } from '../src/net/memory.js';
import { Device } from '../src/core/device.js';
import { GAMES } from '../src/games/index.js';
import { Bot } from '../src/ui/demo.jsx';
import { deal, ROLES } from '../src/games/garou.jsx';
import { legal, winnerOf, deck32, points } from '../src/games/coinche.jsx';

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


async function testGarou() {
  console.log('GlouGlou Garou');
  for (const n of [5, 6, 8, 12]) {
    for (const v of ['classique', 'remaster']) {
      const r = deal(n, v);
      ok(r.length === n && r.filter((x) => x === 'loup').length >= 1 && r.every((x) => ROLES[x]), `distribution ${v} à ${n} : ${r.join(',')}`);
      ok(r.filter((x) => x === 'loup').length < r.length / 2, `${v} à ${n} : les loups sont minoritaires`);
    }
  }
  for (const [v, n] of [['classique', 6], ['remaster', 8], ['classique', 9], ['remaster', 5]]) {
    const r = await botRun('garou', { version: v, sips: 3 }, n, (g) => g.phase === 'end', 60000);
    ok(r.done, `GlouGlou Garou ${v} à ${n} : partie terminée (${r.g.phase}, nuit ${r.g.night}, vainqueur ${r.g.winner})`);
    console.log(`   ${v} à ${n} : ${r.g.night} nuits, vainqueur ${r.g.winner}, morts ${Object.keys(r.g.dead).length}, actions hôte ${r.hostActs}`);
  }
}

async function testCoinche() {
  console.log('Coinche');
  const d = deck32();
  ok(d.length === 32 && new Set(d).size === 32, '32 cartes');
  for (const t of ['S', 'H', 'D', 'C']) ok(d.reduce((a, c) => a + points(c, t), 0) === 152, `152 points à ${t}`);
  // fournir
  ok(legal(['7H', 'AS', 'KS'], [{ seat: 1, c: '9S' }], 'H', 2).join() === 'AS,KS', 'on fournit la couleur demandée');
  // couper si l'adversaire est maître
  ok(legal(['7H', 'AD'], [{ seat: 1, c: '9S' }], 'H', 2).join() === '7H', 'pas de pique : on coupe');
  // partenaire maître : défausse libre
  ok(legal(['7H', 'AD'], [{ seat: 0, c: 'AS' }, { seat: 1, c: '7S' }], 'H', 2).join() === '7H,AD', 'partenaire maître : défausse libre');
  // monter à l'atout
  ok(legal(['7H', 'JH', 'QH'], [{ seat: 1, c: '9H' }], 'H', 2).join() === 'JH', 'atout demandé : on monte si possible');
  ok(legal(['7H', 'QH'], [{ seat: 1, c: '9H' }], 'H', 2).join() === '7H,QH', 'impossible de monter : n’importe quel atout');
  // surcouper
  ok(legal(['7H', 'JH', 'AD'], [{ seat: 0, c: 'AS' }, { seat: 1, c: 'TH' }], 'H', 2).join() === 'JH', 'adversaire a coupé : on surcoupe');
  ok(winnerOf([{ seat: 0, c: 'AS' }, { seat: 1, c: '7H' }, { seat: 2, c: 'TS' }, { seat: 3, c: 'KS' }], 'H') === 1, 'le petit atout prend l’As');
  ok(winnerOf([{ seat: 0, c: '9H' }, { seat: 1, c: 'AH' }, { seat: 2, c: 'JH' }], 'H') === 2, 'le Valet d’atout est maître');
  for (const target of [0, 500]) {
    const r = await botRun('coinche', { target, sips: 3 }, 4, (g) => g.phase === 'end' || (target === 0 && g.phase === 'score'), 60000);
    ok(r.done, `Coinche en ${target || 'une donne'} : partie terminée (${r.g.phase}, donnes ${r.g.dealN}, score ${r.g.score})`);
    console.log(`   ${target || 'une donne'} : ${r.g.dealN} donnes, score ${r.g.score.join(' – ')}`);
  }
}

async function testBuzzer() {
  console.log('Quiz buzzer');
  const { QUIZ } = await import('../src/content/buzzer.js');
  ok(QUIZ.length >= 100 && QUIZ.every((q) => q.length === 6 && new Set(q.slice(2)).size === 4), `${QUIZ.length} questions à 4 réponses distinctes`);
  const r = await botRun('buzzer', { rounds: 10, gorg: 1, sips: 3 }, 4, (g) => g.phase === 'end' || (g.phase === 'reveal' && g.r >= 10), 90000);
  ok(r.done, `Quiz buzzer : 10 questions sans blocage (${r.g.phase}, ${r.g.r})`);
  // équité : le buzz le plus tôt gagne, même reçu en second
  const { host, devs } = await party(3);
  await start(host, devs, 'buzzer', { rounds: 10 });
  await sleep(50);
  const e = host.engine;
  const g = G(host);
  const now = host.backend.now();
  e.input(devs[1].uid, `${host.S.game.seq}:z${g.r}.${g.tries}`, now - 10);
  e.input(devs[2].uid, `${host.S.game.seq}:z${g.r}.${g.tries}`, now - 120);
  await sleep(400);
  ok(G(host).buzz === devs[2].uid, 'le buzz le plus rapide (heure du téléphone) obtient la main');
  await host.endParty();
}

async function testDessin() {
  console.log('Dessine et devine');
  const r = await botRun('dessin', { time: 60, tours: 1 }, 4, (g) => g.phase === 'reveal' || g.phase === 'end', 75000);
  ok(r.done && r.g.strokes.length > 0, `Dessine et devine : un dessin complet par les joueurs automatiques (${r.g.phase}, ${r.g.strokes.length} traits)`);
  const { host, devs } = await party(3);
  await start(host, devs, 'dessin', { time: 60, tours: 1 });
  await sleep(80);
  const e = host.engine;
  const seq = host.S.game.seq;
  let g = G(host);
  const dr = g.drawer;
  const word = e.secrets[dr].choices[1];
  e.input(dr, `${seq}:c${g.r}`, word);
  e.input(dr, `${seq}:d${g.r}`, { id: 1, p: [10, 10, 200, 200] });
  e.input(dr, `${seq}:d${g.r}`, { id: 1, p: [300, 250] });
  g = G(host);
  ok(g.phase === 'draw' && g.strokes.length === 1 && g.strokes[0].p.length === 6, 'le trait arrive par morceaux dans le dessin public');
  ok(!JSON.stringify(g).includes(word), 'le mot n’apparaît pas dans l’état public pendant le dessin');
  const others = devs.map((d) => d.uid).filter((u) => u !== dr);
  e.input(others[0], `${seq}:g${g.r}`, 'n’importe quoi');
  e.input(others[0], `${seq}:g${g.r}`, word.toUpperCase());
  ok(G(host).found[0] === others[0] && G(host).score[others[0]] === 3 && G(host).score[dr] === 1, 'bonne réponse (sans tenir compte des majuscules) : 3 points, 1 au dessinateur');
  e.input(others[1], `${seq}:g${g.r}`, word);
  ok(G(host).phase === 'reveal' && G(host).word === word, 'tout le monde a trouvé : le mot est révélé');
  await host.endParty();
}

(async () => {
  try {
    const only = process.argv[2];
    if (!only || only === 'garou') await testGarou();
    if ((!only || only === 'coinche') && GAMES.coinche) await testCoinche();
    if ((!only || only === 'buzzer') && GAMES.buzzer) await testBuzzer();
    if ((!only || only === 'dessin') && GAMES.dessin) await testDessin();
  } catch (e) { console.error(e); failed++; }
  console.log(`\n${passed} vérifications réussies, ${failed} échec(s)`);
  process.exit(failed ? 1 : 0);
})();

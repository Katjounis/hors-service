// Tests d'endurance : chaque jeu tourne longtemps avec des joueurs automatiques, des coupures réseau
// au hasard, des joueurs qui partent et reviennent, et en mode « un seul téléphone ».
// But : aucune erreur, aucun blocage, des états toujours cohérents.
import { MemoryHub, MemoryBackend } from '../src/net/memory.js';
import { Device } from '../src/core/device.js';
import { GAMES, GAME_LIST } from '../src/games/index.js';
import { Bot } from '../src/ui/demo.jsx';
import { MICRO } from '../src/games/ware.jsx';

const errors = [];
const origError = console.error;
console.error = (...a) => { errors.push(a.map((x) => (x && x.stack) || String(x)).join(' ')); };
console.warn = () => {};

let passed = 0;
let failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('  ✗', msg); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mem = () => { const m = new Map(); return { get: (k, d = null) => (m.has(k) ? m.get(k) : d), set: (k, v) => m.set(k, v), del: (k) => m.delete(k) }; };
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

async function until(fn, ms = 4000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { if (fn()) return true; } catch (e) { /* attendre */ } await sleep(10); }
  return false;
}

async function party(n, mode = 'demo') {
  const hub = new MemoryHub({ latency: mode === 'local' ? [0, 3] : [1, 12] });
  const devs = [];
  for (let i = 0; i < n; i++) {
    const d = new Device({ backend: new MemoryBackend(hub), store: mem(), mode });
    d.saveProfile({ nick: `J${i}`, av: 'verre', drink: i % 3 !== 2, lim: 3 });
    await d.boot();
    if (i === 0) await d.createParty({ level: 3, cap: 0, cs: 10 }); else await d.joinParty(devs[0].code);
    devs.push(d);
  }
  await until(() => devs.every((d) => d.S && Object.keys(d.S.roster).length === n), 5000);
  return { hub, host: devs[0], devs };
}

// l'hôte fait avancer la partie quand plus rien ne bouge (comme un vrai hôte qui attend un peu)
const UNSTICK = ['next', 'again', 'go', 'flip', 'recall', 'vote', 'clues', 'play', 'skip', 'abandon', 'skipguess', 'resolve', 'reveal', 'finish'];
function hostMove(host, G, stall) {
  const S = host.S;
  const g = S.game.g;
  const acts = (G.actions({ S, g, online: (u) => !!(host.players[u] && host.players[u].online) }) || []).filter((a) => !a.disabled);
  if (!acts.length) return false;
  const primary = acts.find((a) => a.primary);
  if (primary && stall > 4) { host.host('game', { id: primary.id }); return true; }
  if (stall > 12) {
    const a = UNSTICK.map((id) => acts.find((x) => x.id === id)).find(Boolean);
    if (a) { host.host('game', { id: a.id }); return true; }
  }
  return false;
}

// invariants valables pour tous les jeux
function checkState(S, where) {
  const bad = [];
  for (const x of S.pen) if (!S.roster[x.uid] || !(x.cs || x.sober || x.n > 0)) bad.push('pénalité orpheline ou vide');
  for (const x of S.gifts) if (!S.roster[x.uid] || !(x.n > 0)) bad.push('distribution orpheline ou vide');
  const str = JSON.stringify(S);
  if (str.includes('NaN') || str.includes('null,null,null')) bad.push('valeur invalide dans l’état');
  if (bad.length) ok(false, `${where} : ${bad[0]}`);
  return !bad.length;
}

// ------------------------------------------------------------------ multi-téléphones avec pannes
async function stressOnline(G, n, ms) {
  const { host, devs } = await party(n);
  const bots = devs.map((d) => new Bot(d, () => true));
  bots.forEach((b) => { b.plan = function (key, fn) { if (this.key === key) return; this.key = key; clearTimeout(this.timer); this.timer = setTimeout(() => { this.key = null; try { fn(); } catch (e) { console.error(e); } }, 5 + Math.random() * 40); }; });
  const opts = Object.fromEntries((G.options || []).map((o) => [o.id, o.multi ? o.choices.map((ch) => ch[0]).filter(() => Math.random() < 0.7) : rnd(o.choices)[0]]));
  if (G.id === 'autres') opts.time = 60;
  if (G.id === 'jamais') host.host('settings', { adult: true });
  host.host('start', { id: G.id, opts });
  await until(() => host.S.game && host.S.game.id === G.id, 3000);
  const t0 = Date.now();
  let lastRev = -1;
  let stall = 0;
  let maxStall = 0;
  let ends = 0;
  let revs = 0;
  let nextChaos = Date.now() + 800;
  const down = new Map();
  const extra = [];
  while (Date.now() - t0 < ms) {
    await sleep(50);
    bots.forEach((b) => b.check());
    const S = host.S;
    if (!S.game || S.status !== 'game') { host.host('start', { id: G.id, opts }); continue; }
    if (S.game.g.phase === 'end') { ends++; await sleep(80); host.host('replay'); stall = 0; continue; }
    // pannes : un joueur perd le réseau un moment ; parfois un joueur part puis un nouveau arrive
    if (Date.now() > nextChaos) {
      nextChaos = Date.now() + 700 + Math.random() * 1500;
      const others = devs.slice(1).filter((d) => d.code);
      const r = Math.random();
      if (r < 0.55 && others.length) {
        const d = rnd(others);
        if (!down.has(d)) { d.backend.simulateDisconnect(); down.set(d, Date.now() + 300 + Math.random() * 2500); }
      } else if (r < 0.62 && others.length > n - 2) {
        const d = rnd(others.filter((x) => !down.has(x)));
        if (d) await d.leaveParty();
      } else if (r < 0.7 && extra.length < 2) {
        const d = new Device({ backend: new MemoryBackend(host.backend.hub), store: mem(), mode: 'demo' });
        d.saveProfile({ nick: `Nouveau${extra.length}`, av: 'cone', drink: true, lim: 2 });
        await d.boot();
        await d.joinParty(host.code);
        extra.push(d);
        devs.push(d);
        const b = new Bot(d, () => true);
        b.plan = bots[0].plan;
        bots.push(b);
      }
    }
    for (const [d, at] of down) if (Date.now() > at) { d.backend.simulateReconnect(); down.delete(d); }
    if (S.rev === lastRev) stall++; else { stall = 0; lastRev = S.rev; revs++; }
    maxStall = Math.max(maxStall, stall);
    if (hostMove(host, GAMES[S.game.id], stall)) stall = 0;
    checkState(S, G.name);
  }
  for (const [d] of down) d.backend.simulateReconnect();
  bots.forEach((b) => clearTimeout(b.timer));
  const S = host.S;
  const res = { ends, revs, maxStall: maxStall * 50, phase: S.game && S.game.g.phase };
  await host.endParty();
  return res;
}

// ------------------------------------------------------------------ jeux arcade
function arcadeMove(host, G, g) {
  const step = Math.random() < 0.1 ? g.step - 1 : g.step;
  if (G.id === 'degaine') {
    const [a, b] = g.duel;
    const winner = Math.random() < 0.05 ? 'inconnu' : rnd([a, b]);
    host.host('game', { id: 'duel', arg: { step, winner, early: Math.random() < 0.2, ms: Math.round(120 + Math.random() * 500), other: Math.random() < 0.5 ? Math.round(300 + Math.random() * 600) : undefined } });
  } else if (G.id === 'bombe') {
    host.host('game', { id: 'boom', arg: { step, holder: Math.random() < 0.05 ? 'inconnu' : rnd(g.pl), passes: Math.floor(Math.random() * 14) } });
  } else if (G.id === 'ware') {
    const ids = [...MICRO.map((m) => m.id), 'inconnu'];
    host.host('game', { id: 'run', arg: { step, score: Math.floor(Math.random() * 16), lost: Array.from({ length: Math.floor(Math.random() * 5) }, () => rnd(ids)) } });
  }
}

// en salon (chacun son téléphone), un jeu arcade ne doit même pas démarrer
async function soloRefused(G) {
  const { host } = await party(3);
  host.host('start', { id: G.id, opts: {} });
  await sleep(150);
  const refused = !host.S.game && host.S.status === 'lobby';
  await host.endParty();
  return refused;
}

// ------------------------------------------------------------------ un seul téléphone (comme l'écran « Passe le téléphone »)
async function stressLocal(G, n, ms) {
  const { host, devs } = await party(n, 'local');
  const mems = new Map(devs.map((d) => [d.uid, {}]));
  if (G.id === 'jamais') host.host('settings', { adult: true });
  host.host('start', { id: G.id, opts: Object.fromEntries((G.options || []).map((o) => [o.id, o.multi ? o.choices.map((ch) => ch[0]) : o.def])) });
  await until(() => host.S.game && host.S.game.id === G.id, 3000);
  const t0 = Date.now();
  let lastRev = -1;
  let stall = 0;
  let ends = 0;
  let answers = 0;
  while (Date.now() - t0 < ms) {
    await sleep(30);
    const S = host.S;
    if (!S.game) continue;
    const g = S.game.g;
    if (g.phase === 'end') { ends++; host.host('replay'); await sleep(60); continue; }
    // pénalités et distributions réglées sur le même téléphone
    for (const d of devs) {
      for (const x of S.pen.filter((p) => p.uid === d.uid && !d.recent(`pen:${p.id}`))) { d.sent[`pen:${x.id}`] = Date.now(); d.input(`pen:${x.id}`, rnd(['done', 'done', 'pass'])); }
      for (const x of S.gifts.filter((p) => p.uid === d.uid && !d.recent(`gift:${p.id}`))) {
        const others = S.order.filter((u) => u !== d.uid && S.roster[u]);
        const alloc = {};
        for (let i = 0; i < x.n; i++) { const u = rnd(others); alloc[u] = (alloc[u] || 0) + 1; }
        d.input(`gift:${x.id}`, alloc);
      }
    }
    // une demande à la fois, dans l'ordre des places
    for (const d of devs) {
      const mm = mems.get(d.uid);
      if (G.observe) G.observe(mm, g, d.secret);
      const r = G.request({ S, g, secret: d.secret, uid: d.uid, now: d.backend.now(), local: true });
      if (!r || (d.isSent(r.k) && !r.live)) continue;
      const v = G.bot({ S, g, secret: d.secret, uid: d.uid, req: r, mem: mm, dev: d });
      if (v !== undefined && !(v && typeof v.then === 'function')) { if (r.live) d.input(`${S.game.seq}:${r.k}`, v, { mark: false }); else d.gameInput(r.k, v); answers++; }
      break;
    }
    // jeux arcade : la mini-partie tourne dans l'interface ; ici on envoie des résultats au hasard,
    // parfois périmés (ancienne manche) ou incohérents, qui doivent être ignorés sans casser la partie
    if (G.solo && g.phase === 'ready' && Math.random() < 0.5) { arcadeMove(host, G, g); answers++; }
    // Je n'ai jamais sur un seul téléphone : on touche les avatars (parfois une ancienne carte, ou un inconnu)
    if ((G.id === 'jamais' || G.id === 'tupref') && g.phase === 'ask' && Math.random() < 0.5) {
      host.host('game', { id: 'who', arg: { step: Math.random() < 0.1 ? g.n - 1 : g.n, uids: [...g.pl.filter(() => Math.random() < 0.4), ...(Math.random() < 0.05 ? ['inconnu'] : [])] } });
      answers++;
    }
    if (G.solo && g.phase === 'result' && Math.random() < 0.02) host.host('game', { id: 'end' });
    // Toutankhamon sur un seul téléphone : les annonces passent par l'écran commun
    if (G.id === 'toutankhamon' && g.phase === 'play' && g.flip && Math.random() < 0.3) {
      const free = g.pl.filter((u) => S.roster[u] && !g.claimed[u]);
      if (free.length) {
        const from = rnd(free);
        devs.find((d) => d.uid === from).gameInput(`c${g.flip.idx}`, { to: rnd(g.pl.filter((u) => u !== from)), n: 1 });
      }
    }
    if (S.rev === lastRev) stall++; else { stall = 0; lastRev = S.rev; }
    if (hostMove(host, G, stall)) stall = 0;
    checkState(S, `${G.name} (un seul téléphone)`);
  }
  const res = { ends, answers, phase: host.S.game && host.S.game.g.phase };
  await host.endParty();
  return res;
}

(async () => {
  const MS = Number(process.argv[2] || 14000);
  try {
    const only = process.argv[3] ? process.argv[3].split(',') : null;
    for (const G of GAME_LIST.filter((x) => !only || only.includes(x.id))) {
      const n = G.id === 'pipoteur' ? 7 : Math.max(5, (G.min || 0) + 2);
      const e0 = errors.length;
      if (G.solo) {
        ok(await soloRefused(G), `${G.name} : refusé quand chacun a son téléphone`);
        ok(errors.length === e0, `${G.name} : aucune erreur au refus (${errors.slice(e0, e0 + 1).join(' ').slice(0, 300)})`);
        console.log(`${G.name} en ligne : refusé (se joue sur un seul téléphone)`);
      } else {
        const r = await stressOnline(G, n, MS);
        ok(errors.length === e0, `${G.name} : aucune erreur avec pannes réseau et départs (${errors.slice(e0, e0 + 1).join(' ').slice(0, 300)})`);
        ok(r.revs > 20, `${G.name} : la partie avance (${r.revs} mises à jour, ${r.ends} fins, attente max ${r.maxStall} ms)`);
        console.log(`${G.name} en ligne : ${r.revs} mises à jour, ${r.ends} parties terminées, plus longue attente ${r.maxStall} ms`);
      }
      if (G.local !== false) {
        const e1 = errors.length;
        const l = await stressLocal(G, Math.max(4, G.min || 0), Math.round(MS * 0.6));
        ok(errors.length === e1, `${G.name} (un seul téléphone) : aucune erreur (${errors.slice(e1, e1 + 1).join(' ').slice(0, 300)})`);
        ok(l.answers > 8, `${G.name} (un seul téléphone) : la partie avance (${l.answers} réponses, ${l.ends} fins)`);
        console.log(`${G.name} sur un téléphone : ${l.answers} réponses, ${l.ends} parties terminées`);
      }
    }
  } catch (e) {
    failed++;
    origError('ERREUR', e);
  }
  console.log(`\n${passed} vérifications réussies, ${failed} échec(s)`);
  if (errors.length) origError(errors.slice(0, 5).join('\n---\n'));
  process.exit(failed ? 1 : 0);
})();

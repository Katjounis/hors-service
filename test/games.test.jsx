// Tests de règles des nouveaux jeux, avec plusieurs téléphones simulés.
import { MemoryHub, MemoryBackend } from '../src/net/memory.js';
import { Device } from '../src/core/device.js';
import { GAMES } from '../src/games/index.js';
import { judgePurple, available } from '../src/games/purple.jsx';
import { simulateRace, raceAt } from '../src/games/hippodrome.jsx';
import { countErrors } from '../src/games/toutankhamon.jsx';
import { Bot } from '../src/ui/demo.jsx';
import { shuffle } from '../src/lib/util.js';
import { sipsOf } from '../src/core/host.js';
import { judgeTrouve } from '../src/games/trouve.jsx';
import { MICRO, microMs } from '../src/games/ware.jsx';
import { summarize, titles, mvp, saveGages, loadGages, gagesLink, readGagesLink } from '../src/lib/stats.js';
import { ALCOOL, CUL, HARD } from '../src/content/oserait-paquets.js';
import { SOFT as SOFT_J, HARD as HARD_J, CUL as CUL_J } from '../src/content/jamais.js';
import { forme } from '../src/games/jamais.jsx';

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
const req = (d) => GAMES[d.S.game.id].request({ S: d.S, g: G(d), secret: d.secret, uid: d.uid, local: false });

// ------------------------------------------------------------------ Pipoteur
async function testPipoteur() {
  console.log('Pipoteur');
  const { host, devs } = await party(5);
  await start(host, devs, 'pipoteur', { sips: 3 });
  await until(() => devs.every((d) => d.secret && d.secret.game === 'pipo'), 2000, 'mots distribués');
  const R = P(host).roles;
  const W = P(host).words;
  const roles = Object.values(R);
  ok(roles.filter((r) => r === 'pipo').length === 1 && roles.filter((r) => r === 'bb').length === 1 && roles.filter((r) => r === 'civil').length === 3, '5 joueurs : 1 pipoteur, 1 Blanc-Bec, 3 civils');
  ok(devs.every((d) => (R[d.uid] === 'bb' ? d.secret.bb && d.secret.word === null : d.secret.word === (R[d.uid] === 'pipo' ? W.pipo : W.civil))), 'chacun reçoit le bon mot (aucun pour Blanc-Bec)');
  const pub = JSON.stringify(devs[1].S);
  ok(!pub.includes(W.civil) && !pub.includes(W.pipo) && !pub.includes('"roles"'), 'ni les mots ni les rôles ne sont dans l’état public');
  ok(devs.every((d) => !('role' in d.secret)), 'le pipoteur ne sait pas qu’il est pipoteur');
  for (const d of devs) d.gameInput(req(d).k, true);
  await until(() => G(host).phase === 'clues', 2000, 'phase indices');
  ok(R[G(host).order[0]] !== 'bb', 'Blanc-Bec ne commence jamais');
  // éliminer le pipoteur
  const pipo = Object.keys(R).find((u) => R[u] === 'pipo');
  const bb = Object.keys(R).find((u) => R[u] === 'bb');
  host.host('game', { id: 'vote' });
  await until(() => G(host).phase === 'vote', 2000, 'vote');
  await sync(host, devs);
  for (const d of devs) { const r = req(d); d.gameInput(r.k, d.uid === pipo ? bb : pipo); }
  await until(() => G(host).phase === 'elim', 2000, 'élimination');
  ok(G(host).last.uid === pipo && G(host).last.role === 'pipo', 'le plus désigné est éliminé, son rôle est révélé');
  host.host('game', { id: 'next' });
  await until(() => G(host).phase === 'clues' && G(host).r === 2, 2000, 'tour 2');
  // égalité au premier vote puis au second : personne n'est éliminé
  host.host('game', { id: 'vote' });
  await until(() => G(host).phase === 'vote', 2000, 'vote 2');
  await sync(host, devs);
  const alive = G(host).alive.slice();
  const [a, b] = alive.filter((u) => u !== bb).slice(0, 2);
  const rest = alive.filter((u) => u !== a && u !== b);
  for (const u of alive) {
    const d = byUid(devs, u);
    d.gameInput(req(d).k, u === a ? b : u === b ? a : (rest.indexOf(u) % 2 ? a : b));
  }
  await until(() => G(host).revote === true && G(host).phase === 'vote', 2000, 'second vote');
  await sync(host, devs);
  ok(G(host).cand.length === 2, 'égalité : second vote entre les ex æquo');
  for (const u of alive) {
    const d = byUid(devs, u);
    const r = req(d);
    d.gameInput(r.k, u === a ? b : u === b ? a : (rest.indexOf(u) % 2 ? a : b));
  }
  await until(() => G(host).phase === 'elim', 2000, 'fin du second vote');
  ok(G(host).last.none === true && G(host).alive.length === 4, 'nouvelle égalité : personne n’est éliminé');
  // Blanc-Bec éliminé puis devine le mot des civils : il gagne seul
  host.host('game', { id: 'next' });
  await until(() => G(host).phase === 'clues', 2000, 'tour 3');
  host.host('game', { id: 'vote' });
  await until(() => G(host).phase === 'vote', 2000, 'vote 3');
  await sync(host, devs);
  for (const u of G(host).alive) { const d = byUid(devs, u); d.gameInput(req(d).k, u === bb ? G(host).alive.find((x) => x !== bb) : bb); }
  await until(() => G(host).phase === 'guess', 2000, 'Blanc-Bec devine');
  const wd = byUid(devs, bb);
  await until(() => req(wd) && req(wd).kind === 'guess', 2000, 'demande de devinette');
  wd.gameInput(req(wd).k, ` ${W.civil.toUpperCase()} `);
  await until(() => G(host).phase === 'end', 2000, 'fin');
  ok(G(host).winner === 'bb' && G(host).points[bb] === 6, 'Blanc-Bec trouve le mot (casse et espaces ignorés) : il gagne seul, 6 points');
  ok(host.S.pen.filter((p) => p.n === 3 || p.sober).length >= 4, 'l’équipe perdante boit 3 gorgées');
  await sync(host, devs);
  ok(G(devs[1]).reveal.words.civil === W.civil, 'les mots sont révélés à la fin');
  await host.endParty();

  // 3 joueurs : un civil éliminé → le pipoteur gagne
  const p3 = await party(3);
  await start(p3.host, p3.devs, 'pipoteur', { sips: 0 });
  const R3 = P(p3.host).roles;
  ok(Object.values(R3).filter((r) => r === 'bb').length === 0, '3 joueurs : pas de Blanc-Bec');
  await sync(p3.host, p3.devs);
  for (const d of p3.devs) d.gameInput(req(d).k, true);
  await until(() => G(p3.host).phase === 'clues', 2000, 'indices');
  p3.host.host('game', { id: 'vote' });
  const civ = Object.keys(R3).find((u) => R3[u] === 'civil');
  await until(() => G(p3.host).phase === 'vote', 2000, 'vote');
  await sync(p3.host, p3.devs);
  for (const d of p3.devs) { const opts = G(d).cand.filter((x) => x !== d.uid); d.gameInput(req(d).k, d.uid === civ ? opts[0] : civ); }
  await until(() => G(p3.host).phase === 'end', 2000, 'fin à 3');
  ok(G(p3.host).winner === 'pipoteurs', 'il ne reste qu’un civil : le pipoteur gagne');
  await p3.host.endParty();
}

// ------------------------------------------------------------------ Purple
async function testPurple() {
  console.log('Purple');
  ok(judgePurple('rouge', [], ['7H']) && !judgePurple('rouge', [], ['7S']), 'rouge / noir');
  ok(judgePurple('purple', [], ['7H', '2C']) && !judgePurple('purple', [], ['7H', '2D']), 'purple = une rouge et une noire');
  ok(judgePurple('plus', ['5H'], ['9S'], 'high') && !judgePurple('plus', ['5H'], ['5S'], 'high'), 'plus, égalité = raté');
  ok(judgePurple('int', ['3H', '9C'], ['6S'], 'high') && !judgePurple('int', ['3H', '9C'], ['9S'], 'high') && judgePurple('ext', ['3H', '9C'], ['KS'], 'high'), 'intérieur / extérieur, borne = raté');
  ok(judgePurple('plus', ['KH'], ['AS'], 'high') && judgePurple('moins', ['KH'], ['AS'], 'low'), 'As fort ou faible selon l’option');
  ok(available([]).join() === 'rouge,noir,purple' && available(['2H']).includes('plus') && !available(['2H']).includes('int') && available(['2H', '3H']).includes('ext'), 'choix proposés selon la pile');

  const { host, devs } = await party(3);
  await start(host, devs, 'purple', { ace: 'high' });
  const pr = P(host);
  const force = (...cards) => { pr.deck.push(...cards.reverse()); };
  const turnDev = () => byUid(devs, G(host).pl[G(host).turn]);
  const say = async (call) => {
    const d = turnDev();
    const step = G(host).step;
    await until(() => G(d).step === step, 2000, 'tour visible');
    d.gameInput(`p${step}`, call);
    await until(() => G(host).step === step + 1, 2000, `annonce ${call}`);
  };
  const A = turnDev().uid;
  force('7H');
  await say('rouge');
  ok(G(host).pile.length === 1 && G(host).streak === 1 && turnDev().uid === A, 'bonne réponse : la carte rejoint la pile, on continue');
  ok(!req(turnDev()).canPass, 'une seule carte réussie : impossible de passer la main');
  force('9S');
  await say('plus');
  ok(G(host).pile.length === 2 && turnDev().uid === A, '2 cartes réussies d’affilée : la main ne passe pas toute seule');
  await until(() => req(byUid(devs, A)) && req(byUid(devs, A)).canPass, 2000, 'proposition de passer');
  ok(req(byUid(devs, A)).canPass === true, 'après 2 cartes réussies, le joueur peut passer la main');
  force('3D');
  await say('moins');
  ok(G(host).streak === 3 && turnDev().uid === A && G(host).pile.length === 3, 'il peut aussi continuer à jouer : série de 3, pile de 3');
  await say('pass');
  const B = turnDev().uid;
  ok(B !== A && G(host).pile.length === 3 && G(host).streak === 0 && G(host).last.call === 'pass', 'il passe la main : le joueur suivant reprend la pile de 3');
  const pb = host.S.pen.filter((p) => p.uid === B).length;
  force('2H');
  await say('noir');
  ok(host.S.pen.filter((p) => p.uid === B).length === pb + 1 && G(host).last.sips === 4, 'raté : on boit la pile (4 cartes)');
  ok(G(host).pile.length === 0 && turnDev().uid === B, 'raté : la pile repart de zéro et le même joueur rejoue');
  const before = G(host).step;
  byUid(devs, B).gameInput(`p${G(host).step}`, 'pass');
  await sleep(80);
  ok(G(host).step === before && turnDev().uid === B, 'passer sans série de 2 est refusé');
  force('4H', '8C');
  await say('purple');
  ok(G(host).pile.length === 2 && turnDev().uid === B && G(host).streak === 2, 'un Purple réussi compte pour 2 cartes : la main peut passer');
  await say('pass');
  ok(turnDev().uid !== B, 'passe la main après le Purple');
  host.host('game', { id: 'end' });
  await until(() => G(devs[1]).phase === 'end', 2000, 'bilan');
  ok(G(devs[1]).summary.rows.length === 3, 'bilan Purple');
  await host.endParty();
}

// ------------------------------------------------------------------ Hippodrome
async function testHippodrome() {
  console.log('Hippodrome');
  let maxEv = 0;
  let sumEv = 0;
  let bad = '';
  for (let t = 0; t < 300 && !bad; t++) {
    const race = simulateRace(shuffle);
    sumEv += race.ev.length;
    maxEv = Math.max(maxEv, race.ev.length);
    if (new Set(race.rank).size !== 4) bad = 'les 4 chevaux sont classés';
    const fins = race.ev.filter((e) => e.fin).map((e) => e.fin.s);
    if (fins.length !== 3 || fins.join() !== race.rank.slice(0, 3).join()) bad = 'les 3 premiers sont classés dans l’ordre d’arrivée, le 4e est le dernier en course';
    const pos = { H: 0, S: 0, D: 0, C: 0 };
    const arrived = new Set();
    for (const e of race.ev) {
      // avance, puis chaque niveau retourné (dans l'ordre) avec son éventuel recul
      for (const [h, d] of e.mv) if (d > 0) pos[h] += d;
      if (e.fin) arrived.add(e.fin.s);
      const backs = e.mv.filter(([, d]) => d < 0);
      for (const f of e.fl) {
        if (Math.min(pos.H, pos.S, pos.D, pos.C) < f.L) bad = 'une carte de niveau se retourne quand tous les chevaux l’ont dépassée';
        const k = backs.findIndex(([h]) => h === f.c[1]);
        if (k >= 0) {
          const [h] = backs.splice(k, 1)[0];
          if (arrived.has(h)) bad = 'un cheval arrivé ne recule plus';
          pos[h] -= 1;
        }
      }
      if (backs.length) bad = 'chaque recul vient d’une carte de niveau';
      if (e.c[0] === 'A') bad = 'les As ne sont pas dans la pioche';
    }
    if (race.rank.slice(0, 3).some((h) => pos[h] !== 7) || pos[race.rank[3]] > 6) bad = 'positions finales cohérentes';
    const end = raceAt(race, race.ev.length);
    if (end.arrived.join() !== race.rank.join()) bad = 'l’état final montre le classement complet';
  }
  ok(!bad, `300 courses simulées conformes (${bad || `moyenne ${Math.round(sumEv / 300)} cartes, max ${maxEv}`})`);
  const { host, devs } = await party(4);
  await start(host, devs, 'hippodrome');
  devs[1].gameInput('b1', { h: 'X', n: 3 });
  devs[1].gameInput('b1', { h: 'H', n: 9 });
  await sleep(80);
  ok(!G(host).bets[devs[1].uid], 'pari invalide refusé (cheval inconnu, mise > 5)');
  const bets = [['H', 3], ['S', 2], ['D', 5], ['C', 1]];
  devs.forEach((d, i) => d.gameInput('b1', { h: bets[i][0], n: bets[i][1] }));
  await until(() => Object.keys(G(host).bets).length === 4, 2000, 'paris');
  host.host('game', { id: 'go' });
  await until(() => G(devs[2]).phase === 'race' && G(devs[2]).race, 2000, 'course lancée partout');
  ok(G(devs[2]).race.ev.length === G(host).race.ev.length && G(devs[2]).race.rank.join() === G(host).race.rank.join(), 'la même course est rejouée sur chaque téléphone');
  const gifts0 = host.S.gifts.length;
  const pens0 = host.S.pen.length;
  G(host).race.t0 = Date.now() - 1e6; // course déjà « jouée » : l'hôte doit conclure tout seul
  await until(() => G(host).phase === 'result', 3000, 'arrivée détectée par l’hôte');
  ok(G(host).phase === 'result', 'l’arrivée est conclue automatiquement à la fin de l’animation');
  const rank = G(host).race.rank;
  const expect = { gifts: [], pens: [] };
  devs.forEach((d, i) => {
    const place = rank.indexOf(bets[i][0]) + 1;
    const n = bets[i][1];
    if (place === 1) expect.gifts.push([d.uid, n * 2]);
    if (place === 2) expect.gifts.push([d.uid, n]);
    if (place === 3) expect.pens.push([d.uid, n]);
    if (place === 4) expect.pens.push([d.uid, n * 2]);
  });
  const newGifts = host.S.gifts.slice(gifts0).map((x) => [x.uid, x.n]);
  const newPens = host.S.pen.slice(pens0).map((x) => [x.uid, x.sober ? -1 : x.n]);
  ok(JSON.stringify(newGifts.sort()) === JSON.stringify(expect.gifts.sort()), '1er : distribue le double, 2e : distribue sa mise');
  ok(expect.pens.every(([u, n]) => newPens.some(([v, m]) => v === u && (m === n || m === -1))) && newPens.length === 2, '3e : boit sa mise, 4e : boit le double');
  ok(G(host).res.map((r) => r.place).join() === '1,2,3,4', 'résultat trié par place');
  host.host('game', { id: 'again' });
  await until(() => G(host).phase === 'bets' && G(host).n === 2, 2000, 'nouvelle course');
  ok(Object.keys(G(host).bets).length === 0, 'nouvelle course : paris remis à zéro');
  host.host('game', { id: 'end' });
  await until(() => G(host).phase === 'end', 2000, 'fin Hippodrome');
  const winnerDev = devs[bets.findIndex((b) => b[0] === rank[0])];
  ok(G(host).totals[winnerDev.uid].won === bets.find((b) => b[0] === rank[0])[1] * 2, 'bilan des courses');
  ok(G(host).summary.races === 1, 'une course sans départ ne compte pas dans le bilan');
  await host.endParty();
}

// ------------------------------------------------------------------ Toutankhamon
async function testToutankhamon() {
  console.log('Toutankhamon');
  ok(countErrors(['7H', '7S', 'KD', '2C'], ['7', 'K', '2', '7']) === 0 && countErrors(['7H', '7S', 'KD', '2C'], ['7', 'K', '3', '3']) === 2, 'test de mémoire : comptage des erreurs');
  const { host, devs } = await party(4);
  await start(host, devs, 'toutankhamon', { rows: 4 });
  await until(() => devs.every((d) => d.secret && d.secret.hand && d.secret.hand.length === 4), 2000, 'mains');
  ok(G(host).tomb.length === 10 && G(host).tomb.every((p) => p.c === null), 'tombeau de 4 rangées (10 cartes) face cachée');
  ok(!JSON.stringify(devs[1].S).includes(JSON.stringify(P(host).hands[devs[2].uid])), 'les mains restent secrètes');
  // changer l'ordre de ses cartes pendant la mémorisation
  const gid = G(host).gid;
  devs[1].gameInput(`o${gid}`, [3, 2, 1, 0]);
  devs[2].gameInput(`o${gid}`, [0, 0, 1, 2]);
  await until(() => devs[1].secret && devs[1].secret.perm && devs[1].secret.perm.join() === '3,2,1,0', 2000, 'nouvel ordre reçu');
  ok(P(host).view[devs[1].uid].join() === '3,2,1,0' && !P(host).view[devs[2].uid], 'l’ordre choisi est enregistré (et un ordre invalide est refusé)');
  for (const d of devs) d.gameInput(req(d).k, true);
  await until(() => G(host).phase === 'play', 2000, 'jeu');
  await until(() => devs.every((d) => d.secret && d.secret.hand === null), 2000, 'cartes cachées');
  ok(devs.every((d) => d.secret.hand === null), 'après la mémorisation, les cartes disparaissent des téléphones');
  // forcer : 1re carte = un 7, J1 a un 7, J2 n'en a pas
  P(host).tomb[0] = '7C';
  P(host).hands[devs[1].uid] = ['7H', '2S', '3D', '4C'];
  P(host).hands[devs[2].uid] = ['KH', 'KS', 'QD', 'JC'];
  host.host('game', { id: 'flip' });
  await until(() => G(host).flip && devs.every((d) => G(d).flip), 2000, 'carte retournée');
  ok(G(host).flip.mult === 1 && G(host).flip.rank === '7', 'base du tombeau : ×1');
  devs[1].gameInput('c0', { to: devs[3].uid, n: 1 });
  devs[2].gameInput('c0', { to: devs[3].uid, n: 1 });
  await until(() => G(host).claims.length === 2, 2000, 'annonces');
  const c1 = G(host).claims.find((x) => x.from === devs[1].uid);
  const c2 = G(host).claims.find((x) => x.from === devs[2].uid);
  const j3 = devs[3];
  await until(() => G(j3).claims.length === 2, 2000, 'annonces vues');
  j3.gameInput(`j${c2.id}`, 'liar');
  await until(() => G(host).claims.find((x) => x.id === c2.id).status === 'liar', 2000, 'menteur');
  ok(host.S.pen.some((p) => p.uid === devs[2].uid && (p.n === 2 || p.sober)), 'menteur démasqué : il boit le double');
  j3.gameInput(`j${c1.id}`, 'liar');
  await until(() => G(host).claims.find((x) => x.id === c1.id).status === 'true', 2000, 'accusation à tort');
  ok(host.S.pen.some((p) => p.uid === j3.uid && p.n === 2), 'accusation à tort : l’accusateur boit le double');
  ok(G(host).known[devs[1].uid].includes(0) && G(host).shown[devs[1].uid][0] === '7H', 'la carte prouvée est révélée');
  // retourner jusqu'à la 2e rangée
  for (let i = 0; i < 4; i++) host.host('game', { id: 'flip' });
  await until(() => G(host).idx === 4, 2000, 'rangée 2');
  ok(G(host).flip.mult === 2, '2e rangée : ×2');
  for (let i = 0; i < 5; i++) host.host('game', { id: 'flip' });
  await until(() => G(host).idx === 9, 2000, 'sommet');
  ok(G(host).flip.mult === 4, 'sommet du tombeau (4 rangées) : ×4');
  host.host('game', { id: 'recall' });
  await until(() => devs.every((d) => G(d).phase === 'recall'), 2000, 'test de mémoire');
  // J1 a une carte révélée : 3 cartes à redire
  ok(req(devs[1]).kind === 'recall', 'demande de test de mémoire');
  devs[1].gameInput(req(devs[1]).k, ['2', '3', '4']);
  devs[2].gameInput(req(devs[2]).k, ['K', 'K', 'Q', '5']);
  devs[0].gameInput(req(devs[0]).k, P(host).hands[devs[0].uid].map((c) => c[0]));
  devs[3].gameInput(req(devs[3]).k, ['A', 'A', 'A', 'A']);
  await until(() => G(host).phase === 'end', 2000, 'fin Toutankhamon');
  await sync(host, devs);
  ok(G(host).results[devs[1].uid].errors === 0 && G(host).results[devs[2].uid].errors === 1 && G(host).results[devs[0].uid].errors === 0, 'erreurs du test de mémoire comptées');
  ok(G(devs[1]).hands && G(devs[1]).hands[devs[2].uid].length === 4, 'toutes les mains sont révélées à la fin');
  ok(G(host).hands[devs[1].uid].join() === '4C,3D,2S,7H', 'à la fin, la main est montrée dans l’ordre choisi par le joueur');
  await host.endParty();
  // 6 rangées à 8 joueurs : deux paquets
  const big = await party(8);
  await start(big.host, big.devs, 'toutankhamon', { rows: 6 });
  ok(G(big.host).decks === 2 && G(big.host).tomb.length === 21, '6 rangées à 8 joueurs : deux paquets');
  await big.host.endParty();
}

// ------------------------------------------------------------------ Quiz sur les autres
async function testAutres() {
  console.log('Quiz sur les autres');
  const { host, devs } = await party(4);
  await start(host, devs, 'autres', { rounds: 5, time: 0 });
  const target = G(host).target;
  ok(G(host).q.includes(host.S.roster[target].nick), 'la question vise un joueur par son pseudo');
  ok(req(byUid(devs, target)) === null, 'le joueur visé n’écrit pas');
  const writers = devs.filter((d) => d.uid !== target);
  writers.forEach((d, i) => d.gameInput(req(d).k, `Réponse ${i}`));
  await until(() => G(host).phase === 'vote' && devs.every((d) => G(d).phase === 'vote'), 2000, 'vote');
  ok(!JSON.stringify(G(devs[1]).list).includes(writers[0].uid), 'les réponses sont anonymes pendant le vote');
  await until(() => devs.every((d) => d.secret && d.secret.game === 'qo'), 2000, 'secrets de vote');
  const mineOf = (d) => d.secret.mine;
  const w0 = writers[0];
  w0.gameInput(req(w0).k, mineOf(w0));
  await sleep(60);
  ok(!G(host).voted[w0.uid], 'voter pour sa propre réponse est refusé');
  // tout le monde vote pour la réponse de writers[1] (sauf lui, qui vote pour writers[0])
  const best = G(host).list.find((a) => a.txt === 'Réponse 1').id;
  for (const d of devs) d.gameInput(req(d).k, d === writers[1] ? G(host).list.find((a) => a.txt === 'Réponse 0').id : best);
  await until(() => G(host).phase === 'reveal', 2000, 'révélation');
  ok(G(host).res.rows[0].by === writers[1].uid && G(host).score[writers[1].uid] === 3, '3 votes = 3 points');
  ok(host.S.gifts.some((x) => x.uid === writers[1].uid && x.n === 2), 'la meilleure réponse distribue 2 gorgées');
  ok(host.S.pen.some((p) => p.uid === writers[2].uid), 'réponse sans vote : 1 gorgée');
  host.host('game', { id: 'next' });
  await until(() => G(host).r === 2, 2000, 'manche 2');
  ok(G(host).target !== target, 'le joueur visé change à chaque manche');
  host.host('game', { id: 'end' });
  await until(() => G(host).phase === 'end', 2000, 'fin');
  await host.endParty();
}

// ------------------------------------------------------------------ Trouve la carte
async function testTrouve() {
  console.log('Trouve la carte');
  ok(judgeTrouve('KS', 'K').found === 1 && judgeTrouve('KS', 'K').sips === 5 && judgeTrouve('KS', 'K').drinker === 'dealer', 'trouvé du premier coup : le croupier boit 5');
  const r = judgeTrouve('KS', '8', 'J');
  ok(r.hint === 'plus' && r.drinker === 'guesser' && r.sips === 2, 'Roi, on dit 8 (plus) puis Valet : 2 gorgées pour le joueur');
  ok(judgeTrouve('AH', 'K', 'A').found === 2 && judgeTrouve('AH', 'K', 'A').sips === 3, 'l’As est la plus forte : Roi → plus ; trouvé au 2e essai, le croupier boit 3');
  ok(judgeTrouve('2D', '5', null).hint === 'moins' && judgeTrouve('AD', '2', '3').sips === 11, 'moins ; As contre 3 : 11 gorgées');
  const { host, devs } = await party(3);
  await start(host, devs, 'trouve');
  const dealer = G(host).dealer;
  await sync(host, devs);
  const dd = byUid(devs, dealer);
  ok(dd.secret && dd.secret.card === P(host).card && devs.filter((d) => d.uid !== dealer).every((d) => !d.secret), 'seul le croupier voit sa carte');
  ok(!JSON.stringify(G(devs[1])).includes(P(host).card), 'la carte n’est pas dans l’état public');
  const play = async (card, a, b) => {
    P(host).card = card;
    const gu = byUid(devs, G(host).guesser);
    const step = G(host).step;
    await until(() => G(gu).step === step, 2000, 'manche visible');
    gu.gameInput(`a${step}`, a);
    if (b) {
      await until(() => G(host).phase === 'guess2', 2000, '2e essai');
      await until(() => G(gu).phase === 'guess2', 2000, '2e essai visible');
      gu.gameInput(`b${step}`, b);
    }
    await until(() => G(host).phase === 'result', 2000, 'résultat');
    return gu.uid;
  };
  const g1 = await play('KS', '8', 'J');
  ok(G(host).hint === 'plus' && G(host).res.drinker === g1 && G(host).res.sips === 2 && G(host).wins === 1, 'raté : le joueur boit l’écart, le croupier compte 1 victoire');
  ok(!req(dd), 'une seule victoire : le croupier ne peut pas encore passer le jeu');
  dd.gameInput(`d${G(host).step}`, 'passe');
  await sleep(80);
  ok(G(host).dealer === dealer, 'passer le jeu avant 2 victoires est refusé');
  host.host('game', { id: 'next' });
  await until(() => G(host).phase === 'guess1' && G(host).step === 2, 2000, 'manche 2');
  ok(G(host).guesser !== g1 && G(host).guesser !== dealer, 'le joueur suivant devine à son tour');
  await play('5H', '5');
  ok(G(host).res.found === 1 && G(host).res.drinker === dealer && G(host).wins === 0, 'trouvé du premier coup : le croupier boit, sa série repart à zéro');
  host.host('game', { id: 'next' });
  await until(() => G(host).step === 3, 2000, 'manche 3');
  await play('AS', '2', '3');
  host.host('game', { id: 'next' });
  await until(() => G(host).step === 4, 2000, 'manche 4');
  await play('AS', '2', '3');
  ok(G(host).wins === 2 && !G(host).nextAt, '2 victoires d’affilée : la manche attend le choix du croupier');
  await sync(host, devs);
  ok(req(dd) && req(dd).kind === 'dealer', 'le croupier peut passer le jeu ou le garder');
  dd.gameInput(`d${G(host).step}`, 'garde');
  await until(() => G(host).step === 5, 2000, 'il garde le jeu');
  ok(G(host).dealer === dealer && G(host).wins === 2, 'il garde le jeu : même croupier, la série continue');
  await play('AS', '2', '4');
  await sync(host, devs);
  dd.gameInput(`d${G(host).step}`, 'passe');
  await until(() => G(host).dealer !== dealer, 2000, 'nouveau croupier');
  const next = G(host).pl[(G(host).pl.indexOf(dealer) + 1) % 3];
  ok(G(host).dealer === next && G(host).wins === 0 && G(host).guesser !== next, 'il passe le jeu : le joueur suivant devient croupier');
  host.host('game', { id: 'end' });
  await until(() => G(host).phase === 'end', 2000, 'fin');
  ok(G(host).summary.rows.length === 3, 'bilan de Trouve la carte');
  await host.endParty();
}

// ------------------------------------------------------------------ Trouve la carte : tour de table
async function testTrouveTour() {
  console.log('Trouve la carte : un joueur à la fois, sens des aiguilles d’une montre');
  const { host, devs } = await party(4);
  await start(host, devs, 'trouve');
  const order = host.S.order.slice();
  const dealer = G(host).dealer;
  ok(dealer === order[0], 'la place 1 commence croupier');
  const seen = [];
  for (let i = 0; i < 6; i++) {
    await sync(host, devs);
    const step = G(host).step;
    const withReq = devs.filter((d) => req(d));
    ok(withReq.length === 1 && withReq[0].uid === G(host).guesser, `manche ${i + 1} : un seul joueur face au croupier`);
    seen.push(G(host).guesser);
    P(host).card = '5H';
    byUid(devs, G(host).guesser).gameInput(`a${step}`, '5');
    await until(() => G(host).phase === 'result', 2000, 'résultat');
    host.host('game', { id: 'next' });
    await until(() => G(host).step === step + 1, 2000, 'manche suivante');
  }
  const ring = order.filter((u) => u !== dealer);
  ok(seen.join() === [...ring, ...ring].join(), 'les joueurs passent dans l’ordre des places (sens des aiguilles d’une montre), croupier exclu');
  await host.endParty();
}

// ------------------------------------------------------------------ paquets de « Qui oserait… ? »
async function testPaquets() {
  console.log('Qui oserait : paquets');
  const uniq = (a) => new Set(a).size === a.length;
  ok(ALCOOL.length >= 40 && CUL.length >= 40 && HARD.length >= 40 && uniq(ALCOOL) && uniq(CUL) && uniq(HARD), `au moins 40 questions par paquet, sans doublon (${ALCOOL.length}, ${CUL.length}, ${HARD.length})`);
  // bloc 6 : plus aucune carte HARD où le joueur commet une infraction (28 reformulations)
  const norm = (s) => s.toLowerCase().replace(/[’']/g, "'");
  const OLD = ['ramener un panneau', 'frauder dans le métro', 'braquer une boulangerie', 'trafic de fromages', 'se faire passer pour un médecin',
    'évasion de prison', 'vendre un faux tableau', "stop sur l'autoroute", 'pirater le wifi', 'escalader une statue', 'maquiller sa note de frais',
    'avec les couverts', 'casse de la machine', 'cacher de la police', 'tout nu dans une fontaine', "déclencher l'alarme incendie",
    'vendre des contrefaçons', 'faux nom ridicule', 'squatter le jacuzzi', 'soudoyer un videur', 'partir sans payer', 'bar clandestin',
    'mur de sa cellule', 'libérer les homards', 'bouteilles cachées', 'main dans le sac', 'sans y être client', 'organiser une course de trottinettes'];
  const hard = HARD.map(norm).join('\n');
  const left = OLD.filter((o) => hard.includes(norm(o)));
  ok(left.length === 0, `paquet HARD relu : aucune ancienne formulation d’infraction (${left.join(', ')})`);
  const { host, devs } = await party(3);
  ok(host.S.cfg.adult === false, 'paquets Cul et HARD désactivés par défaut dans les réglages');
  await start(host, devs, 'oserait', { pack: 'cul', rounds: 25 });
  ok(G(host).pack === 'classique', 'Cul demandé sans activation : retour au paquet Classique');
  host.host('lobby');
  host.host('settings', { adult: true });
  await until(() => devs.every((d) => d.S && d.S.status === 'lobby' && d.S.cfg.adult === true), 2000, 'paquets Cul et HARD activés, retour au salon');
  await start(host, devs, 'oserait', { pack: 'cul', rounds: 25 });
  await sync(host, devs);
  ok(G(host).pack === 'cul' && CUL.includes(G(host).q), 'tout le monde en « Piquant » : le paquet Cul est joué');
  const seen = new Set([G(host).q]);
  for (let i = 0; i < 24; i++) {
    for (const d of devs) d.gameInput(req(d) ? req(d).k : 'x', devs.find((x) => x !== d).uid);
    await until(() => G(host).phase === 'reveal', 2000, 'révélation');
    host.host('game', { id: 'next' });
    await until(() => G(host).phase === 'vote' && G(host).r === i + 2, 2000, 'question suivante');
    await sync(host, devs);
    seen.add(G(host).q);
  }
  ok(seen.size === 25, `25 questions sans répétition (${seen.size})`);
  host.host('lobby');
  devs[2].saveProfile({ nick: 'J2', av: '1.1.0.0.0', drink: false, lim: 1 });
  await until(() => host.S.roster[devs[2].uid].lim === 1, 2000, 'limite changée');
  await start(host, devs, 'oserait', { pack: 'hard' });
  ok(G(host).pack === 'classique', 'un joueur limité à « Tranquille » : HARD retombe sur Classique');
  host.host('lobby');
  await start(host, devs, 'oserait', { pack: 'alcool' });
  ok(G(host).pack === 'classique', 'Alcool demande au moins « Drôle »');
  await host.endParty();
}

// ------------------------------------------------------------------ compteur de la soirée et valeur du cul sec
async function testCompteur() {
  console.log('Compteur de la soirée');
  const { host, devs } = await party(3);
  const e = host.engine;
  ok(e.S.cfg.cs === 10 && !('max' in e.S.cfg), 'pas de limite sur la soirée ; un cul sec vaut 10 gorgées par défaut');
  const u = devs[1].uid;
  for (let i = 0; i < 6; i++) e.pen(u, 8, 'test');
  const mine = e.S.pen.filter((p) => p.uid === u);
  ok(mine.length === 6 && mine.every((p) => !p.sober && p.n === 8), 'aucune limite de soirée : 48 gorgées restent des gorgées');
  for (const p of mine) e.ackPen(u, p.id, 'done');
  e.penCS(u, 'test');
  const cs = e.S.pen.find((p) => p.uid === u && p.cs);
  ok(cs && !cs.sober, 'le cul sec reste un cul sec');
  e.ackPen(u, cs.id, 'done');
  ok(e.S.tally[u].d === 48 && e.S.tally[u].cs === 1 && sipsOf(e.S, u) === 58, 'compteur : 48 gorgées + 1 cul sec (10) = 58');
  host.host('settings', { cs: 15 });
  await until(() => e.S.cfg.cs === 15, 2000, 'réglage du cul sec');
  ok(sipsOf(e.S, u) === 63, 'l’hôte règle le cul sec à 15 gorgées : le compteur passe à 63');
  host.host('settings', { cs: 7 });
  await sleep(60);
  ok(e.S.cfg.cs === 15, 'valeur de cul sec non prévue : refusée');
  host.host('settings', { cap: 5 });
  await until(() => e.S.cfg.cap === 5, 2000, 'plafond par pénalité');
  e.penCS(devs[0].uid, 'test');
  const capped = e.S.pen.filter((p) => p.uid === devs[0].uid).pop();
  ok(!capped.cs && capped.n === 5, 'avec un plafond par pénalité de 5, le cul sec devient 5 gorgées');
  await host.endParty();
}

// ------------------------------------------------------------------ sans alcool par joueur : gages ou points
async function testSansAlcool() {
  console.log('Sans alcool par joueur : gages ou points, buveurs et non-buveurs ensemble');
  const { host, devs } = await party(3);
  const e = host.engine;
  const [a, b, c] = devs;
  b.saveProfile({ ...b.profile, drink: false, sob: 'gage' });
  c.saveProfile({ ...c.profile, drink: false, sob: 'points' });
  await until(() => e.S.roster[c.uid].sob === 'points' && e.S.roster[c.uid].drink === false && e.S.roster[b.uid].drink === false, 2000, 'profils sans alcool');
  ok(e.S.roster[a.uid].drink === true && e.S.roster[b.uid].sob === 'gage', 'un buveur et deux joueurs sans alcool dans la même soirée');
  e.pen(a.uid, 3, 'test'); e.pen(b.uid, 3, 'test'); e.pen(c.uid, 3, 'test'); e.penCS(c.uid, 'test');
  const pa = e.S.pen.find((x) => x.uid === a.uid);
  const pb = e.S.pen.find((x) => x.uid === b.uid);
  const pc = e.S.pen.filter((x) => x.uid === c.uid);
  ok(pa.n === 3 && !pa.sober && !pa.pts, 'buveur : 3 gorgées');
  ok(pb.sober && typeof pb.def === 'string' && pb.def.length > 3, 'sans alcool (gages) : un gage à la place des gorgées');
  ok(pc[0].pts === 3 && !pc[0].sober && pc[1].cs && pc[1].pts === 10, 'sans alcool (points) : 3 gorgées = 3 points, un cul sec = 10 points');
  for (const x of [pa, pb, ...pc]) e.ackPen(x.uid, x.id, 'done');
  const t = (d) => e.S.tally[d.uid];
  ok(t(a).d === 3 && t(b).c === 1 && t(c).p === 13 && !t(c).d, 'compteur : gorgées, gages et points comptés à part');
  e.pen(c.uid, 2, 'test');
  const pc2 = e.S.pen.find((x) => x.uid === c.uid);
  e.ackPen(c.uid, pc2.id, 'swap');
  ok(pc2.sober && pc2.def && !pc2.pts, 'des points peuvent être échangés contre un gage');
  host.host('settings', { cap: 3 });
  await until(() => e.S.cfg.cap === 3, 2000, 'plafond');
  e.pen(c.uid, 8, 'test');
  ok(e.S.pen.filter((x) => x.uid === c.uid).pop().pts === 3, 'le plafond par pénalité vaut aussi pour les points');
  c.saveProfile({ ...c.profile, drink: true });
  await until(() => e.S.roster[c.uid].drink === true, 2000, 'retour aux gorgées');
  e.pen(c.uid, 2, 'test');
  const back = e.S.pen.filter((x) => x.uid === c.uid).pop();
  ok(back.n === 2 && !back.pts && !back.sober, 'le mode se change en cours de soirée');
  await host.endParty();
}

// ------------------------------------------------------------------ jeux arcade (un seul téléphone)
async function testArcade() {
  console.log('Jeux arcade : Dégaine, Bombe, Hors Service Ware');
  ok(GAMES.degaine.solo && GAMES.bombe.solo && GAMES.ware.solo, 'les trois jeux arcade se jouent sur un seul téléphone');
  ok(MICRO.length >= 16 && MICRO.filter((m) => m.sensor).length === 3, `Ware : ${MICRO.length} micro-jeux, dont 3 avec capteurs`);
  ok(microMs(0) === 3400 && microMs(5) < 3400 && microMs(40) === 1400, 'Ware : de 3,4 s à 1,4 s par micro-jeu, de plus en plus vite');
  {
    // chacun son téléphone : le moteur refuse les jeux arcade (et pas seulement l'interface)
    const { host: h2 } = await party(3);
    for (const id of ['degaine', 'bombe', 'ware']) h2.host('start', { id, opts: {} });
    await sleep(80);
    ok(!h2.S.game && h2.S.status === 'lobby', 'jeux arcade refusés quand chacun a son téléphone');
    await h2.endParty();
  }
  const { host, devs } = await party(3, { mode: 'local' });
  const e = host.engine;
  const pl = host.S.order.slice();
  // Dégaine
  await start(host, devs, 'degaine', { sips: 2 });
  ok(G(host).duel.join() === [pl[0], pl[1]].join(), 'Dégaine : premier duel, places 1 et 2');
  host.host('game', { id: 'duel', arg: { step: 99, winner: pl[0], ms: 200 } });
  await sleep(40);
  ok(G(host).phase === 'ready', 'résultat d’un ancien duel ignoré');
  host.host('game', { id: 'duel', arg: { step: 1, winner: pl[1], ms: 231, other: 305 } });
  await until(() => G(host).phase === 'result', 2000, 'résultat du duel');
  const p0 = e.S.pen.filter((x) => x.uid === pl[0]).pop();
  ok(G(host).res.winner === pl[1] && p0 && p0.n === 2 && G(host).stats[pl[1]].best === 231, 'le plus rapide gagne, le perdant prend 2 gorgées, record noté');
  ok(e.S.rec.degaine && e.S.rec.degaine.v === 231 && e.S.rec.degaine.uid === pl[1], 'record de la soirée : meilleur temps de réaction');
  host.host('game', { id: 'next' });
  await until(() => G(host).phase === 'ready' && G(host).step === 2, 2000, 'duel suivant');
  ok(G(host).duel.join() === [pl[1], pl[2]].join(), 'les duels tournent dans l’ordre des places');
  host.host('game', { id: 'duel', arg: { step: 2, winner: pl[2], early: true } });
  await until(() => G(host).phase === 'result', 2000, 'faux départ');
  ok(G(host).res.early && G(host).res.loser === pl[1] && G(host).stats[pl[1]].early === 1, 'taper trop tôt fait perdre direct');
  host.host('game', { id: 'end' });
  await until(() => G(host).phase === 'end', 2000, 'fin Dégaine');
  host.host('lobby');
  await until(() => devs.every((d) => d.S.status === 'lobby'), 2000, 'salon');
  // Bombe
  await start(host, devs, 'bombe', { sips: 3 });
  await sync(host, devs);
  ok(G(host).first === pl[0], 'Bombe : la place 1 allume la première mèche');
  host.host('game', { id: 'boom', arg: { step: 1, holder: pl[2], passes: 2 } });
  await until(() => G(host).phase === 'result', 2000, 'explosion');
  const p2 = e.S.pen.filter((x) => x.uid === pl[2]).pop();
  ok(p2 && p2.n === 3 && G(host).stats[pl[0]].passes === 1 && G(host).stats[pl[1]].passes === 1 && G(host).stats[pl[2]].booms === 1, 'celui qui tient le téléphone à l’explosion prend la pénalité');
  ok(G(host).first === pl[2], 'le perdant rallume la mèche');
  host.host('game', { id: 'boom', arg: { step: 1, holder: pl[0], passes: 0 } });
  await sleep(40);
  ok(G(host).res.holder === pl[2], 'une deuxième explosion de la même mèche est ignorée');
  host.host('lobby');
  await until(() => devs.every((d) => d.S.status === 'lobby'), 2000, 'salon');
  // Hors Service Ware
  await start(host, devs, 'ware', { lives: 3, sips: 1 });
  await sync(host, devs);
  const before = e.S.pen.filter((x) => x.uid === pl[0]).length;
  host.host('game', { id: 'run', arg: { step: 1, score: 7, lost: ['tap', 'swipe', 'inconnu', 'hold'] } });
  await until(() => G(host).phase === 'result', 2000, 'fin de la rafale');
  const mine = e.S.pen.filter((x) => x.uid === pl[0]);
  ok(mine.length - before === 3 && mine.slice(-3).every((x) => x.n === 1), 'une vie perdue = une pénalité (3 vies, 3 gorgées)');
  ok(G(host).stats[pl[0]].best === 7 && e.S.prec[pl[0]].ware === 7, 'score de la rafale gardé comme record');
  host.host('game', { id: 'next' });
  await until(() => G(host).cur === pl[1], 2000, 'joueur suivant');
  ok(true, 'Ware : on passe au joueur suivant dans le sens des aiguilles d’une montre');
  await host.endParty();
}

// ------------------------------------------------------------------ Je n'ai jamais
async function testJamais() {
  console.log('Je n’ai jamais : paquets, niveaux, réponses, un seul téléphone');
  const all = [...SOFT_J, ...HARD_J, ...CUL_J];
  ok(SOFT_J.length >= 80 && HARD_J.length >= 80 && CUL_J.length >= 80 && new Set(all).size === all.length, `au moins 80 cartes par niveau, sans doublon (${SOFT_J.length}, ${HARD_J.length}, ${CUL_J.length})`);
  ok(all.every((t) => /^Je (n’ai jamais|pourrais|l’ai déjà fait) /.test(t)), 'chaque carte commence par « Je n’ai jamais… », « Je pourrais… » ou « Je l’ai déjà fait pour… »');
  ok(CUL_J.some((t) => t.startsWith('Je pourrais')) && CUL_J.some((t) => t.startsWith('Je l’ai déjà fait')) && forme(CUL_J[0]) === 'jamais' && forme('Je pourrais tout plaquer.') === 'oui', 'Cul mélange les trois formes ; « Moi si ! » ou « Moi aussi ! » selon la carte');
  const interdit = /(lycée|collège|école|mineur|\bado\b|adolescen|\b1[0-7] ans|enfant|bébé|cousin|frère|sœur|endormi|inconscient|sans (son|leur) accord|drogu|\bjoint\b|cocaïne|ecstasy|au volant|conduit|conduire)/i;
  ok(!CUL_J.some((t) => interdit.test(t)), 'Cul : rien sur des mineurs, la famille, le non-consentement ou la drogue');
  ok(!HARD_J.some((t) => /(au volant|conduit|conduire|drogu|\bjoint\b|cocaïne|ecstasy)/i.test(t)), 'HARD : ni alcool au volant ni drogue');

  const { host, devs } = await party(3);
  const e = host.engine;
  const pl = host.S.order.slice();
  await start(host, devs, 'jamais', { levels: ['soft', 'hard', 'cul'], sips: 2, cards: 20 });
  ok(G(host).lv.join() === 'soft' && G(host).dropped.join() === 'hard,cul' && G(host).card.lv === 'soft', 'HARD et Cul refusés tant que les paquets adultes sont désactivés');
  host.host('lobby');
  host.host('settings', { adult: true });
  await until(() => devs.every((d) => d.S && d.S.status === 'lobby' && d.S.cfg.adult === true), 2000, 'paquets adultes activés');
  await start(host, devs, 'jamais', { levels: ['soft', 'hard', 'cul'], sips: 2, cards: 0 });
  await sync(host, devs);
  ok(G(host).lv.join() === 'soft,hard,cul' && !JSON.stringify(host.S).includes('"deck"'), 'trois niveaux cochés ensemble, le paquet reste chez l’hôte');
  ok(G(host).reader === pl[0] && GAMES.jamais.tintOf(G(host)) === `jamais-${G(host).card.lv}`, 'la place 1 lit la première carte ; le décor prend la teinte du niveau');
  host.host('game', { id: 'who', arg: { step: G(host).n, uids: [pl[1]] } });
  await sleep(40);
  ok(G(host).phase === 'ask', 'chacun son téléphone : l’hôte ne répond pas à la place des autres');
  devs[0].gameInput(req(devs[0]).k, true);
  devs[1].gameInput(req(devs[1]).k, false);
  await sleep(80);
  ok(G(host).phase === 'ask' && G(host).yes === null, 'réponses secrètes : on attend que tout le monde ait répondu');
  devs[2].gameInput(req(devs[2]).k, true);
  await until(() => G(host).phase === 'reveal', 2000, 'révélation');
  ok(G(host).yes.join() === [devs[0].uid, devs[2].uid].join(), 'ceux qui ont répondu oui sont révélés');
  const p0 = e.S.pen.filter((x) => x.uid === devs[0].uid).pop();
  const p2 = e.S.pen.filter((x) => x.uid === devs[2].uid).pop();
  ok(p0 && p0.n === 2 && !p0.sober && p2 && p2.sober && p2.def && !e.S.pen.some((x) => x.uid === devs[1].uid), 'buveur : 2 gorgées ; sans alcool : un gage ; « Moi non plus » : rien');
  host.host('game', { id: 'next' });
  await until(() => G(host).phase === 'ask' && G(host).n === 2, 2000, 'carte suivante');
  ok(G(host).reader === pl[1], 'la lecture tourne dans l’ordre des places');
  const before = e.S.pen.length;
  const seen = new Set();
  const texts = new Set();
  for (let i = 0; i < 60; i++) {
    seen.add(G(host).card.lv);
    texts.add(G(host).card.t);
    host.host('game', { id: 'skip' });
    await until(() => G(host).n === 3 + i, 2000, 'carte passée');
  }
  ok(e.S.pen.length === before, 'passer une carte ne donne aucune pénalité');
  ok(seen.size === 3 && texts.size === 60, `les trois niveaux se mélangent, sans carte répétée (${[...seen].join(', ')} ; ${texts.size} cartes)`);
  host.host('lobby');
  devs[1].saveProfile({ nick: 'J1', av: '1.1.0.0.0', drink: true, lim: 1 });
  await until(() => host.S.roster[devs[1].uid].lim === 1, 2000, 'limite changée');
  await start(host, devs, 'jamais', { levels: ['hard', 'cul'] });
  ok(G(host).lv.join() === 'soft', 'un joueur en « Tranquille » : HARD et Cul retombent sur Soft');
  host.host('lobby');
  await until(() => devs.every((d) => d.S.status === 'lobby'), 2000, 'salon');
  await start(host, devs, 'jamais', { levels: 'cul' });
  ok(host.S.game.opts.levels.join() === 'soft', 'option de niveaux invalide : Soft par défaut');
  await host.endParty();

  // un seul téléphone : rien à se passer, on touche les avatars de ceux qui ont répondu oui
  const L = await party(3, { mode: 'local' });
  L.host.host('settings', { adult: true });
  await until(() => L.host.S.cfg.adult === true, 2000, 'paquets adultes activés');
  await start(L.host, L.devs, 'jamais', { levels: ['cul'], sips: 1, cards: 20 });
  const lp = L.host.S.order.slice();
  ok(G(L.host).card.lv === 'cul' && GAMES.jamais.request({ S: L.host.S, g: G(L.host), uid: lp[0], local: true }) === null, 'Cul seul ; sur un seul téléphone, pas de « passe le téléphone »');
  L.host.host('game', { id: 'who', arg: { step: 99, uids: [lp[1]] } });
  await sleep(40);
  ok(G(L.host).phase === 'ask', 'une sélection pour une ancienne carte est ignorée');
  L.host.host('game', { id: 'who', arg: { step: G(L.host).n, uids: [lp[1], lp[0], 'intrus'] } });
  await until(() => G(L.host).phase === 'reveal', 2000, 'révélation');
  ok(G(L.host).yes.join() === [lp[0], lp[1]].join() && L.host.engine.S.cnt[lp[0]].aveux === 1, 'avatars touchés révélés dans l’ordre des places ; les aveux comptent pour le récap');
  while (G(L.host).n < 20) {
    const n = G(L.host).n;
    L.host.host('game', { id: G(L.host).phase === 'reveal' ? 'next' : 'skip' });
    await until(() => G(L.host).n === n + 1, 2000, 'carte suivante');
  }
  L.host.host('game', { id: 'who', arg: { step: 20, uids: [] } });
  await until(() => G(L.host).phase === 'reveal', 2000, 'dernière carte');
  const acts = GAMES.jamais.actions({ S: L.host.S, g: G(L.host) });
  ok(acts.length === 1 && acts[0].id === 'end' && acts[0].primary, 'après la 20e carte : rapport d’incident');
  L.host.host('game', { id: 'end' });
  await until(() => G(L.host).phase === 'end', 2000, 'fin');
  ok(G(L.host).summary.rows[0].u === lp[0] || G(L.host).summary.rows[0].u === lp[1], 'bilan : le plus d’aveux en tête');
  await L.host.endParty();
}

// ------------------------------------------------------------------ stats, titres du récap, gages maison
async function testStats() {
  console.log('Stats de soirée, titres du récap, gages maison');
  const { host, devs } = await party(3);
  const e = host.engine;
  const [a, b, c] = devs.map((d) => d.uid);
  e.pen(a, 6, 'test'); e.ackPen(a, e.S.pen.find((x) => x.uid === a).id, 'done');
  e.S.tally[b].g = 9;
  e.record(c, 'purple', 7); e.record(b, 'degaine', 240, true); e.record(a, 'degaine', 300, true);
  e.count(a, 'early', 2); e.count(b, 'duelWon', 3);
  e.S.played = ['purple', 'degaine'];
  const sum = summarize(e.S);
  ok(sum.players.length === 3 && sum.players.find((p) => p.uid === a).sips === 6 && sum.rec.degaine.v === 240, 'résumé : gorgées, records de la soirée');
  const t = titles(sum);
  const byTitle = Object.fromEntries(t.map((x) => [x.title, x.p.uid]));
  ok(byTitle['Ministre de la soif'] === a && byTitle['Radar à couleurs'] === c && byTitle['Gâchette d’or'] === b, `titres absurdes calculés (${t.map((x) => x.title).join(', ')})`);
  ok(mvp(sum).p.uid === b, 'MVP : distribue le plus et tient un record');
  saveGages(['Chante une chanson de Noël', 'Fais dix pompes']);
  devs[1].saveProfile({ ...devs[1].profile, drink: false, sob: 'gage' });
  await until(() => e.S.roster[b].drink === false, 2000, 'sans alcool');
  const seen = new Set();
  for (let i = 0; i < 40; i++) { e.pen(b, 1, 'test'); const it = e.S.pen.filter((x) => x.uid === b).pop(); seen.add(it.def); e.ackPen(b, it.id, 'done'); }
  ok(seen.has('Chante une chanson de Noël') || seen.has('Fais dix pompes'), 'les gages maison sortent pendant la soirée');
  const link = await gagesLink(loadGages());
  const back = await readGagesLink(link);
  ok(Array.isArray(back) && back.join('|') === loadGages().join('|'), 'lien d’export : les gages voyagent dans l’adresse et reviennent à l’identique');
  saveGages([]);
  await host.endParty();
}

// ------------------------------------------------------------------ parties complètes jouées par des joueurs automatiques
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

async function testBots() {
  console.log('Parties complètes jouées par des joueurs automatiques');
  let r = await botRun('pipoteur', { sips: 2 }, 6, (g) => g.phase === 'end');
  ok(r.done, `Pipoteur à 6 : partie terminée sans blocage (${r.g.phase}, vainqueur ${r.g.winner})`);
  r = await botRun('purple', {}, 4, (g) => g.step >= 40);
  ok(r.done, `Purple : 40 annonces sans blocage (${r.g.step})`);
  r = await botRun('hippodrome', {}, 4, (g) => g.n >= 3);
  ok(r.done, `Hippodrome : 3 courses enchaînées (${r.g.n})`);
  r = await botRun('toutankhamon', { rows: 3 }, 4, (g) => g.phase === 'end');
  ok(r.done, `Toutankhamon : partie complète jusqu’au test de mémoire (${r.g.phase})`);
  r = await botRun('autres', { rounds: 5, time: 0 }, 5, (g) => g.phase === 'end');
  ok(r.done, `Quiz sur les autres : 5 manches (${r.g.phase}, ${r.g.r})`);
  r = await botRun('oserait', { rounds: 10 }, 5, (g) => g.phase === 'reveal' && g.r >= 10);
  ok(r.done, `Qui oserait : 10 questions (${r.g.r})`);
  r = await botRun('trouve', {}, 4, (g) => g.step >= 12);
  ok(r.done, `Trouve la carte : 12 manches sans blocage (${r.g.step})`);
}

(async () => {
  try {
    await testPipoteur();
    await testPurple();
    await testHippodrome();
    await testToutankhamon();
    await testAutres();
    await testCompteur();
    await testTrouve();
    await testTrouveTour();
    await testSansAlcool();
    await testArcade();
    await testStats();
    await testJamais();
    await testPaquets();
    await testBots();
  } catch (e) {
    failed++;
    console.error('ERREUR', e);
  }
  console.log(`\n${passed} vérifications réussies, ${failed} échec(s)`);
  if (fails.length) console.log(fails.map((f) => ' - ' + f).join('\n'));
  process.exit(failed ? 1 : 0);
})();

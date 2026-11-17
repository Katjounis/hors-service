// Tests de logique : parties complètes avec plusieurs téléphones simulés (serveur en mémoire).
import { MemoryHub, MemoryBackend } from '../src/net/memory.js';
import { Device } from '../src/core/device.js';
import { GAMES } from '../src/games/index.js';
import { judgeBus, value96, after96 } from '../src/games/g96.jsx';
import { Bot } from '../src/ui/demo.jsx';

let passed = 0;
let failed = 0;
const fails = [];
function ok(cond, msg) {
  if (cond) passed++;
  else { failed++; fails.push(msg); console.log('  ✗', msg); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 4000, msg = 'condition') {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { if (fn()) return true; } catch (e) { /* attendre */ }
    await sleep(8);
  }
  ok(false, `délai dépassé : ${msg}`);
  return false;
}
const mem = () => { const m = new Map(); return { get: (k, d = null) => (m.has(k) ? m.get(k) : d), set: (k, v) => m.set(k, v), del: (k) => m.delete(k) }; };

async function party(n, { level = 3, cap = 0, profiles = [] } = {}) {
  const hub = new MemoryHub({ latency: [1, 6] });
  const devs = [];
  const mk = async (i) => {
    const d = new Device({ backend: new MemoryBackend(hub), store: mem(), mode: 'demo' });
    d.saveProfile(profiles[i] || { nick: `J${i}`, av: '🦊', drink: i % 3 !== 2, lim: 3 });
    await d.boot();
    return d;
  };
  const host = await mk(0);
  await host.createParty({ level, cap });
  devs.push(host);
  for (let i = 1; i < n; i++) {
    const d = await mk(i);
    await d.joinParty(host.code);
    devs.push(d);
  }
  await until(() => host.S && Object.keys(host.S.roster).length === n && devs.every((d) => d.S && Object.keys(d.S.roster).length === n), 4000, `${n} joueurs dans le salon`);
  return { hub, host, devs };
}

const G = (d) => d.S.game.g;

// ------------------------------------------------------------------ plateforme
async function testPlatform() {
  console.log('Socle : salon, sécurité, déconnexion, reprise');
  const { hub, host, devs } = await party(4);
  ok(host.isHost, 'le créateur est l’hôte');
  ok(devs.slice(1).every((d) => !d.isHost), 'les autres ne sont pas hôtes');
  ok(host.S.order.length === 4, 'ordre des places à 4');
  // sécurité : un joueur ne peut pas écrire l'état ni lire un secret qui n'est pas le sien
  let denied = false;
  try { await devs[1].backend.writeState(host.code, '{}'); } catch (e) { denied = e.code === 'PERMISSION_DENIED'; }
  ok(denied, 'un joueur ne peut pas modifier l’état de la partie');
  let secretErr = null;
  hub.watch(devs[1].backend, `parties/${host.code}/secret/${devs[2].uid}`, () => {}, (e) => { secretErr = e; });
  await until(() => secretErr, 1000, 'refus de lecture du secret d’un autre');
  ok(secretErr && secretErr.code === 'PERMISSION_DENIED', 'un joueur ne peut pas lire le secret d’un autre');
  // déconnexion d'un joueur
  devs[3].backend.simulateDisconnect();
  await until(() => host.players[devs[3].uid] && host.players[devs[3].uid].online === false, 2000, 'joueur vu hors ligne');
  ok(host.engine.activeUids().length === 3, 'le joueur déconnecté n’est plus actif');
  devs[3].backend.simulateReconnect();
  await until(() => host.players[devs[3].uid] && host.players[devs[3].uid].online === true, 2000, 'joueur reconnecté');
  ok(host.engine.activeUids().length === 4, 'reconnexion : le joueur redevient actif');
  // pénalité + « un défi à la place » + « je passe » (gorgées : Version Adulte)
  host.host('settings', { adult: true });
  await until(() => host.S.cfg.adult === true, 2000, 'Version Adulte activée');
  host.engine.pen(devs[1].uid, 3, 'test');
  host.engine.commit();
  await until(() => devs[1].S.pen.some((p) => p.uid === devs[1].uid), 2000, 'pénalité reçue');
  const p1 = devs[1].S.pen.find((p) => p.uid === devs[1].uid);
  ok(p1.n === 3 && !p1.sober, 'pénalité de 3 gorgées pour un joueur qui boit');
  devs[1].input(`pen:${p1.id}`, 'swap');
  await until(() => devs[1].S.pen.find((p) => p.id === p1.id && p.sober), 2000, 'défi à la place');
  ok(!!devs[1].S.pen.find((p) => p.id === p1.id).def, 'un défi remplace les gorgées');
  devs[1].input(`pen:${p1.id}`, 'pass');
  await until(() => !devs[1].S.pen.some((p) => p.id === p1.id), 2000, 'passer la pénalité');
  ok(devs[1].S.tally[devs[1].uid].x === 1 && devs[1].S.tally[devs[1].uid].d === 0, 'passer ne compte aucune gorgée');
  // joueur sans alcool : défi direct
  host.engine.pen(devs[2].uid, 2, 'test');
  host.engine.commit();
  await until(() => devs[2].S.pen.some((p) => p.uid === devs[2].uid), 2000, 'pénalité sans alcool');
  ok(devs[2].S.pen.find((p) => p.uid === devs[2].uid).sober, 'joueur sans alcool : défi au lieu des gorgées');
  // distribution
  host.engine.gift(devs[1].uid, 3, 'test');
  host.engine.commit();
  await until(() => devs[1].S.gifts.length === 1, 2000, 'distribution reçue');
  const gf = devs[1].S.gifts[0];
  devs[1].input(`gift:${gf.id}`, { [devs[0].uid]: 2, [devs[3].uid]: 1 });
  await until(() => devs[1].S.gifts.length === 0, 2000, 'distribution faite');
  ok(devs[1].S.pen.filter((p) => p.uid === devs[0].uid).length === 1 && devs[1].S.pen.find((p) => p.uid === devs[3].uid).n === 1, 'distribution répartie (2 + 1)');
  // reprise de l'animation quand l'hôte disparaît
  host.backend.simulateDisconnect();
  await until(() => devs[1].players[host.uid] && devs[1].players[host.uid].online === false, 2000, 'hôte vu hors ligne');
  await devs[1].takeOver();
  await until(() => devs[1].isHost, 3000, 'reprise par un joueur');
  ok(devs[1].isHost, 'un joueur peut reprendre l’animation si l’hôte est parti');
  host.backend.simulateReconnect();
  await until(() => !host.isHost, 3000, 'l’ancien hôte redevient joueur');
  ok(!host.isHost, 'l’ancien hôte devient simple joueur à son retour');
  // terminer la soirée
  await devs[1].endParty();
  await until(() => devs[2].code === null && devs[2].view === 'home', 3000, 'fin de soirée propagée');
  ok(devs[2].view === 'home', 'fin de soirée : tout le monde revient à l’accueil');
}

// ------------------------------------------------------------------ Qui oserait…
async function testQui() {
  console.log('Qui oserait… ? : votes, révélation, gorgées, déconnexion, fin');
  const { host, devs } = await party(4);
  host.host('start', { id: 'oserait', opts: { rounds: 10, reveal: 'open' } });
  await until(() => devs.every((d) => d.S.status === 'game' && d.S.game.id === 'oserait'), 2000, 'jeu lancé partout');
  const seq = host.S.game.seq;
  // round 1 : 3 votes pour J1, J1 vote pour J2
  const t = devs[1].uid;
  const g = G(host);
  g.dbl = false;
  const k = `v${g.r}`;
  for (const d of devs) {
    const req = GAMES.oserait.request({ S: d.S, g: G(d), secret: d.secret, uid: d.uid });
    ok(req && req.k === k, `${d.profile.nick} doit voter`);
  }
  devs[0].gameInput(k, t);
  devs[1].gameInput(k, t); // vote pour soi : refusé
  devs[2].gameInput(k, t);
  await until(() => Object.keys(G(host).voted).length === 2, 2000, '2 votes valides');
  ok(!JSON.stringify(devs[3].S).includes(`"votes"`), 'les votes ne sont pas visibles avant la révélation');
  ok(!G(host).voted[devs[1].uid], 'voter pour soi-même est refusé');
  devs[1].gameInput(k, devs[2].uid);
  devs[3].gameInput(k, t);
  await until(() => G(devs[2]).phase === 'reveal', 2000, 'révélation automatique');
  const r = G(devs[2]).res;
  ok(r.top.length === 1 && r.top[0] === t && r.max === 3 && r.n === 3, 'le plus désigné : 3 votes, 3 gorgées');
  ok(devs[2].S.pen.some((p) => p.uid === t && p.n === 3), 'pénalité de 3 gorgées envoyée au plus désigné');
  ok(r.who && r.who[devs[0].uid] === t, 'votes révélés (option)');
  // tour suivant avec égalité et tour double
  host.host('game', { id: 'next' });
  await until(() => G(host).phase === 'vote' && G(host).r === 2, 2000, 'question 2');
  G(host).dbl = true;
  const k2 = `v${G(host).r}`;
  devs[0].gameInput(k2, devs[1].uid);
  devs[1].gameInput(k2, devs[0].uid);
  devs[2].gameInput(k2, devs[1].uid);
  devs[3].gameInput(k2, devs[0].uid);
  await until(() => G(host).phase === 'reveal', 2000, 'révélation 2');
  const r2 = G(host).res;
  ok(r2.top.length === 2 && r2.n === 4, 'égalité : les deux boivent, tour double = 2 × 2');
  // déconnexion pendant le vote : la révélation se fait sans l'absent
  host.host('game', { id: 'next' });
  await until(() => G(host).phase === 'vote' && G(host).r === 3, 2000, 'question 3');
  devs[3].backend.simulateDisconnect();
  await until(() => host.players[devs[3].uid].online === false, 2000, 'absent');
  const k3 = `v${G(host).r}`;
  devs[0].gameInput(k3, devs[1].uid);
  devs[1].gameInput(k3, devs[2].uid);
  devs[2].gameInput(k3, devs[1].uid);
  await until(() => G(host).phase === 'reveal', 3000, 'révélation sans l’absent');
  ok(G(host).res.total === 3, 'la partie ne bloque pas sur un joueur déconnecté');
  devs[3].backend.simulateReconnect();
  // fin de partie
  host.host('game', { id: 'end' });
  await until(() => G(devs[1]).phase === 'end', 2000, 'bilan');
  ok(G(devs[1]).summary.rows.length === 4 && G(devs[1]).summary.rounds === 3, 'bilan avec 3 questions');
  // rejouer puis changer de jeu
  host.host('replay');
  await until(() => host.S.game.seq === seq + 1 && G(host).phase === 'vote', 2000, 'rejouer');
  ok(G(host).r === 1, 'rejouer relance une partie neuve');
  host.host('lobby');
  await until(() => devs[2].S.status === 'lobby', 2000, 'retour au salon');
  ok(devs[2].S.status === 'lobby' && devs[2].S.hist.length >= 1, 'changer de jeu sans recréer la soirée, historique conservé');
  // niveau d'ambiance : un joueur limité à « tranquille »
  devs[2].saveProfile({ ...devs[2].profile, lim: 1 });
  await until(() => host.S.roster[devs[2].uid].lim === 1, 2000, 'limite mise à jour');
  host.host('start', { id: 'oserait', opts: {} });
  await until(() => host.S.status === 'game', 2000, 'relance');
  const { QUESTIONS } = await import('../src/content/oserait.js');
  const lvl = QUESTIONS.find((q) => q[1] === G(host).q)[0];
  ok(lvl === 1, 'les limites du joueur le plus prudent sont respectées');
  await host.endParty();
}

// ------------------------------------------------------------------ Le 96
function unitBus() {
  console.log('96 : règles du bus et valeurs');
  ok(value96('AS') === 1 && value96('JS') === 0 && value96('QH') === -10 && value96('TC') === 10 && value96('7H') === 7, 'valeurs : As 1, Valet 0, Dame −10');
  ok(after96(0, 'KD') === 70 && after96(20, 'KS') === 70 && after96(85, 'KH') === 70 && after96(70, 'KC') === 70, 'le Roi met le total à 70, quel qu’il soit avant (il ne s’ajoute pas)');
  ok(after96(5, 'QS') === 0, 'le total ne descend pas sous 0');
  ok(judgeBus('plus', '5H', '9S').ok && !judgeBus('moins', '5H', '9S').ok, 'plus / moins classique');
  ok(judgeBus('moins', 'JH', 'QS').ok === false, 'exemple de Thierry : « moins » sur un Valet, une Dame sort → raté');
  ok(judgeBus('plus', 'KH', 'AS').ok && judgeBus('moins', 'KH', 'AS').ok, 'As tiré : plus et moins sont justes');
  ok(judgeBus('plus', 'AH', '3S').ok && judgeBus('moins', 'AH', '3S').ok, 'As sur la ligne : plus et moins sont justes');
  const e1 = judgeBus('plus', '8H', '8S');
  ok(!e1.ok && e1.eqPenalty, 'égalité non annoncée : raté avec +5');
  const e2 = judgeBus('egal', '8H', '8S');
  ok(e2.ok, 'égalité annoncée et juste');
  ok(!judgeBus('egal', '8H', '9S').ok && !judgeBus('egal', '8H', '9S').eqPenalty, 'égalité annoncée mais fausse : raté sans +5');
}

async function test96() {
  console.log('96 : partie complète à 4 (total caché, annonces)');
  const { host, devs } = await party(4);
  host.host('start', { id: '96', opts: {} });
  await until(() => devs.every((d) => d.S.status === 'game' && d.secret && d.secret.hand && d.secret.hand.length === 4), 3000, 'cartes distribuées');
  const g = G(host);
  const P = host.engine.priv.games[host.S.game.seq];
  ok(devs.every((d) => JSON.stringify(d.secret.hand) === JSON.stringify(P.hands[d.uid])), 'chaque joueur reçoit sa propre main (secrète)');
  ok(!JSON.stringify(devs[1].S).includes(JSON.stringify(P.hands[devs[2].uid])), 'les mains ne sont pas dans l’état public');
  const firstTen = g.pl.findIndex((u) => P.hands[u].some((c) => c[0] === 'T'));
  ok(firstTen >= 0 ? g.turn === firstTen && g.mustTen : g.turn === 0 && !g.mustTen, 'le premier qui a un 10 commence (sinon le premier joueur)');

  const set = (uidx, hand) => { P.hands[g.pl[uidx]] = hand.slice(); };
  const dev = (u) => devs.find((d) => d.uid === u);
  const turnDev = () => dev(G(host).pl[G(host).turn]);
  // joue une carte en annonçant le bon total (ou un total donné)
  const playCard = async (card, said) => {
    const d = turnDev();
    const gg = G(host);
    const i = P.hands[d.uid].indexOf(card);
    const a = said == null ? after96(P.total, card) : said;
    const n0 = gg.n;
    await until(() => d.S.game && d.S.game.g.turnId === gg.turnId, 2000, 'le joueur voit son tour');
    d.gameInput(`t${gg.turnId}`, { i, c: card, a });
    await until(() => G(host).n !== n0 || G(host).phase !== 'play', 2000, `jouer ${card}`);
  };
  g.mustTen = false;
  P.total = 27;
  set(g.turn, ['3H', 'JS', 'QD', '9C']);
  host.engine.commit();
  const giftsBefore = host.S.gifts.length;
  await playCard('3H');
  ok(P.total === 30 && host.S.gifts.length === giftsBefore + 1 && host.S.gifts.at(-1).n === 3, '27 + 3 = 30 : dizaine, 3 gorgées à distribuer');
  ok(G(host).last.ok === true && G(host).last.reveal == null, 'annonce juste : le total reste caché');
  ok(!JSON.stringify(devs[2].S.game.g).includes('"total"'), 'le total n’apparaît nulle part dans l’état public');
  ok(P.hands[G(host).pl[(G(host).turn + 3) % 4]].length === 4, 'le joueur repioche pour garder 4 cartes');
  // Valet posé sur une dizaine : on redistribue
  set(G(host).turn, ['JS', '2H', '2D', '2C']);
  const gb = host.S.gifts.length;
  await playCard('JS');
  ok(P.total === 30 && host.S.gifts.length === gb + 1, 'Valet sur 30 : on redistribue 3');
  // Dame qui descend sur une dizaine
  P.total = 50;
  set(G(host).turn, ['QS', '2H', '2D', '2C']);
  const gb2 = host.S.gifts.length;
  await playCard('QS');
  ok(P.total === 40 && host.S.gifts.length === gb2 + 1 && host.S.gifts.at(-1).n === 4, '50 + Dame = 40 : 4 gorgées à distribuer');
  // mauvaise annonce : cul sec et total révélé
  const before = G(host).turn;
  const fool = G(host).pl[before];
  set(before, ['2H', '3D', '4C', '5S']);
  const pen0 = host.S.pen.filter((p) => p.uid === fool).length;
  await playCard('2H', 45);
  const L = G(host).last;
  ok(L.ok === false && L.reveal === 42 && L.said === 45, 'annonce fausse (45 au lieu de 42) : le bon total est révélé');
  const cs = host.S.pen.filter((p) => p.uid === fool);
  ok(cs.length === pen0 + 1 && (cs.at(-1).cs || cs.at(-1).sober), 'annonce fausse : cul sec (ou défi en mode sans alcool)');
  ok(G(host).turn === (before + 1) % 4, 'le tour passe au joueur suivant dans l’ordre des places');
  // dizaine avec annonce fausse : on distribue quand même, et cul sec
  P.total = 17;
  set(G(host).turn, ['3H', '9D', '9C', '9S']);
  const gb3 = host.S.gifts.length;
  await playCard('3H', 21);
  ok(G(host).last.ok === false && host.S.gifts.length === gb3 + 1, 'dizaine mal annoncée : cul sec mais la distribution reste');
  // 96 pile autorisé
  P.total = 90;
  set(G(host).turn, ['6H', '9D', '9C', '9S']);
  await playCard('6H');
  ok(P.total === 96 && G(host).phase === 'play', '96 pile est autorisé');
  // Roi : le total passe à 70, même depuis 85 (il ne s'ajoute pas, donc pas de bus)
  P.total = 85;
  set(G(host).turn, ['KH', '9D', '9C', '9S']);
  const gbK = host.S.gifts.length;
  await playCard('KH');
  ok(P.total === 70 && G(host).phase === 'play' && host.S.gifts.length === gbK + 1 && host.S.gifts.at(-1).n === 7, 'Roi posé sur 85 : le total passe à 70 (dizaine : 7 à distribuer), pas de bus');
  // pile 100 : bus avec passager, total révélé
  P.total = 96;
  const loserIdx = G(host).turn;
  const loser = G(host).pl[loserIdx];
  set(loserIdx, ['4H', '9D', '9C', '9S']);
  await playCard('4H', 99);
  ok(G(host).phase === 'mate' && G(host).bus.who === loser && G(host).bus.hundred && G(host).last.reveal === 100, 'pile 100 : choix d’un passager, total révélé');
  const mate = G(host).pl.find((u) => u !== loser);
  dev(loser).gameInput(`m${G(host).round}`, mate);
  await until(() => G(host).phase === 'bus', 2000, 'bus avec passager');
  ok(G(host).bus.mate === mate, 'le passager est enregistré');
  const busDeck = P.busDeck;
  const b = G(host).bus;
  b.line = ['8H', '5D', 'KC', '2S', '9H'];
  host.engine.commit();
  const guess = async (call, drawn) => {
    busDeck.push(drawn);
    const step = G(host).bus.step;
    await until(() => dev(loser).S.game.g.bus && dev(loser).S.game.g.bus.step === step, 2000, 'le perdant voit le bus');
    dev(loser).gameInput(`b${G(host).round}.${step}`, call);
    await until(() => G(host).bus.step === step + 1, 2000, `bus ${call}`);
  };
  const penBefore = host.S.pen.filter((p) => p.uid === loser).length;
  await guess('plus', 'TH');
  ok(G(host).bus.pos === 1 && G(host).bus.line[0] === 'TH', 'bus : juste → carte suivante, la carte tirée recouvre');
  await guess('moins', '5S');
  ok(G(host).bus.pos === 0 && G(host).bus.last.sips === 7 && G(host).bus.line[1] === '5S', 'égalité non annoncée sur la 2e carte : 2 + 5 = 7 gorgées, retour au début');
  const lp = host.S.pen.filter((p) => p.uid === loser);
  const mp = host.S.pen.filter((p) => p.uid === mate);
  ok(lp.length === penBefore + 1 && (lp.at(-1).n === 7 || lp.at(-1).sober) && (mp.at(-1).n === 7 || mp.at(-1).sober), 'le passager boit la même chose que le perdant');
  await guess('egal', 'TS');
  ok(G(host).bus.pos === 1 && host.S.gifts.some((x) => x.uid === loser && x.n === 5), 'égalité annoncée juste : 5 gorgées à donner');
  await guess('plus', '9C');
  await guess('moins', 'QH');
  await guess('plus', '3H');
  await guess('plus', 'AH');
  ok(G(host).phase === 'busdone', 'les 5 cartes réussies : descente du bus');
  await until(() => G(host).phase === 'play' && G(host).round === 2, 6000, 'nouvelle partie automatique');
  ok(P.total === 0 && Object.values(P.hands).every((h) => h.length === 4), 'nouvelle partie : total à 0, 4 cartes chacun');
  G(host).mustTen = false;
  P.total = 95;
  set(G(host).turn, ['7H', '8D', '9C', '6S']);
  await playCard('7H', 102);
  ok(G(host).phase === 'bus' && !G(host).bus.mate && G(host).last.reveal === 102, '102 : bus seul, sans passager');
  host.host('game', { id: 'finish' });
  await until(() => G(devs[1]).phase === 'end', 2000, 'bilan 96');
  ok(G(devs[1]).summary.rows.length === 4 && G(devs[1]).summary.rows.reduce((a, r) => a + r.err, 0) >= 2, 'bilan du 96 : erreurs d’annonce comptées');
  await until(() => !devs[1].secret, 2000, 'les mains sont effacées à la fin');
  ok(!devs[1].secret, 'les mains sont effacées à la fin');
  await host.endParty();
}

async function test96Reshuffle() {
  console.log('96 : paquet vide, 2 paquets, joueur absent');
  const { host, devs } = await party(9);
  host.host('start', { id: '96', opts: {} });
  await until(() => devs.every((x) => x.S && x.S.status === 'game' && x.S.game), 3000, 'lancé à 9');
  ok(G(host).decks === 2, 'au-delà de 8 joueurs : deux paquets');
  const P = host.engine.priv.games[host.S.game.seq];
  P.discard = P.deck.splice(0);
  G(host).mustTen = false;
  P.total = 0;
  const d = devs.find((x) => x.uid === G(host).pl[G(host).turn]);
  P.hands[d.uid] = ['2H', '3D', '4C', '5S'];
  const rs = G(host).reshuffles;
  d.gameInput(`t${G(host).turnId}`, { i: 0, c: '2H', a: 2 });
  await until(() => P.total === 2, 2000, 'jouer avec pioche vide');
  ok(G(host).reshuffles === rs + 1 && P.hands[d.uid].length === 4, 'pioche vide : les cartes posées sont remélangées');
  const cur = devs.find((x) => x.uid === G(host).pl[G(host).turn]);
  if (cur !== host) {
    cur.backend.simulateDisconnect();
    await until(() => host.players[cur.uid].online === false, 2000, 'absent');
    const acts = GAMES['96'].actions({ S: host.S, g: G(host), online: (u) => !!(host.players[u] && host.players[u].online) });
    ok(acts.some((a) => a.id === 'skip'), 'l’hôte peut passer le tour d’un joueur absent');
    const t = G(host).turn;
    host.host('game', { id: 'skip' });
    await until(() => G(host).turn !== t, 2000, 'tour passé');
    ok(G(host).turn === (t + 1) % 9, 'tour passé au suivant');
  }
  await host.endParty();
}

async function testBots96() {
  console.log('96 : 300 coups joués par des joueurs automatiques (aucun blocage)');
  const { host, devs } = await party(5);
  const bots = devs.map((d) => new Bot(d, () => true));
  bots.forEach((b) => { b.plan = function (key, fn) { if (this.key === key) return; this.key = key; clearTimeout(this.timer); this.timer = setTimeout(() => { this.key = null; fn(); }, 5); }; });
  host.host('start', { id: '96', opts: { rounds: 3 } });
  let lastRev = -1;
  let stall = 0;
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) {
    await sleep(100);
    bots.forEach((b) => b.check());
    const g = G(host);
    if (g.phase === 'end') break;
    if (host.S.rev === lastRev) stall++; else { stall = 0; lastRev = host.S.rev; }
    if (g.phase === 'busdone') { g.nextAt = 1; }
    if (stall > 40) break;
  }
  const g = G(host);
  ok(g.phase === 'end', `3 bus joués jusqu’au bilan sans blocage (phase : ${g.phase}, partie ${g.round})`);
  ok(Object.values(g.stats).reduce((a, s) => a + s.bus, 0) === 3, '3 bus comptés dans le bilan');
  bots.forEach((b) => clearTimeout(b.timer));
  await host.endParty();
}

(async () => {
  try {
    await testPlatform();
    await testQui();
    unitBus();
    await test96();
    await test96Reshuffle();
    await testBots96();
  } catch (e) {
    failed++;
    console.error('ERREUR', e);
  }
  console.log(`\n${passed} vérifications réussies, ${failed} échec(s)`);
  if (fails.length) console.log(fails.map((f) => ' - ' + f).join('\n'));
  process.exit(failed ? 1 : 0);
})();

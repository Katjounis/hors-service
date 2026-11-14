// Poker des gorgées (Texas hold'em sans limite) : chacun commence avec un tapis de gorgées (10 par défaut).
// • Petite et grosse blinde, deux cartes cachées par joueur, flop, tournante, rivière, enchères à chaque tour.
// • Se coucher, parler, suivre, relancer (au moins la dernière relance), tapis. Pots annexes quand quelqu'un est à tapis.
// • Le tapis ne se regagne jamais : le gagnant du pot ne récupère pas les gorgées, il les DISTRIBUE à la table.
//   Plus de gorgées dans le tapis : éliminé. La partie s'arrête quand il ne reste qu'un joueur (ou sur décision de l'hôte).
import { useState } from 'preact/hooks';
import { newDeck, order } from '../lib/cards.js';
import { PlayingCard, Who, nickOf, Av, Stamp, Waiting } from '../ui/common.jsx';
import { plural } from '../lib/util.js';

// ---------------------------------------------------------------- évaluation des mains (meilleures 5 cartes sur 7)
export const HAND_NAME = ['Carte haute', 'Paire', 'Double paire', 'Brelan', 'Quinte', 'Couleur', 'Full', 'Carré', 'Quinte flush'];
function straightHigh(vals) {
  const u = [...new Set(vals)].sort((a, b) => b - a);
  if (u.includes(14)) u.push(1);
  let run = 1;
  for (let i = 1; i < u.length; i++) {
    run = u[i] === u[i - 1] - 1 ? run + 1 : 1;
    if (run >= 5) return u[i] + 4;
  }
  return 0;
}
// renvoie un tableau comparable : [catégorie, départages…]
export function evalHand(cards) {
  const vals = cards.map(order);
  const bySuit = {};
  for (const c of cards) (bySuit[c[1]] = bySuit[c[1]] || []).push(order(c));
  const flushVals = Object.values(bySuit).find((v) => v.length >= 5);
  if (flushVals) { const sf = straightHigh(flushVals); if (sf) return [8, sf]; }
  const cnt = {};
  for (const v of vals) cnt[v] = (cnt[v] || 0) + 1;
  const groups = Object.entries(cnt).map(([v, n]) => [n, Number(v)]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const kick = (excl, n) => vals.filter((v) => !excl.includes(v)).sort((a, b) => b - a).filter((v, i, a) => a.indexOf(v) === i).slice(0, n);
  if (groups[0][0] === 4) return [7, groups[0][1], ...kick([groups[0][1]], 1)];
  if (groups[0][0] === 3 && groups[1] && groups[1][0] >= 2) return [6, groups[0][1], groups[1][1]];
  if (flushVals) return [5, ...flushVals.sort((a, b) => b - a).slice(0, 5)];
  const st = straightHigh(vals);
  if (st) return [4, st];
  if (groups[0][0] === 3) return [3, groups[0][1], ...kick([groups[0][1]], 2)];
  if (groups[0][0] === 2 && groups[1] && groups[1][0] === 2) return [2, groups[0][1], groups[1][1], ...kick([groups[0][1], groups[1][1]], 1)];
  if (groups[0][0] === 2) return [1, groups[0][1], ...kick([groups[0][1]], 3)];
  return [0, ...kick([], 5)];
}
export function cmpHand(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; }
  return 0;
}

// pots principal et annexes à partir des mises totales de la main
export function buildPots(total, folded) {
  const levels = [...new Set(Object.values(total).filter((v) => v > 0))].sort((a, b) => a - b);
  const pots = [];
  let prev = 0;
  for (const lv of levels) {
    let amount = 0;
    for (const v of Object.values(total)) amount += Math.max(0, Math.min(v, lv) - prev);
    const elig = Object.keys(total).filter((u) => total[u] >= lv && !folded[u]);
    if (amount > 0) {
      // une tranche où personne n'est éligible (tous couchés) rejoint la précédente
      if (!elig.length && pots.length) pots[pots.length - 1].amount += amount;
      else pots.push({ amount, elig });
    }
    prev = lv;
  }
  return pots;
}

// ---------------------------------------------------------------- moteur
const live = (c, g) => g.pl.filter((u) => c.roster[u] && !g.out[u]);
const inHand = (g) => g.seat.filter((u) => !g.folded[u]);
const canAct = (g) => g.seat.filter((u) => !g.folded[u] && !g.allin[u]);
const potOf = (g) => Object.values(g.total).reduce((a, b) => a + b, 0);
function nextIn(list, from, all) {
  const i = all.indexOf(from);
  for (let k = 1; k <= all.length; k++) { const u = all[(i + k) % all.length]; if (list.includes(u)) return u; }
  return null;
}

function put(g, u, n) {
  const m = Math.max(0, Math.min(n, g.stack[u]));
  g.stack[u] -= m;
  g.bet[u] += m;
  g.total[u] += m;
  if (g.stack[u] === 0) g.allin[u] = true;
  return m;
}

function newHand(c) {
  const g = c.g;
  const pl = live(c, g);
  if (pl.length < 2) { finish(c); return; }
  g.hand += 1;
  g.seat = pl;
  g.button = g.button && pl.includes(g.button) ? nextIn(pl, g.button, g.pl) : nextIn(pl, g.button || pl[pl.length - 1], g.pl) || pl[0];
  const deck = newDeck(1);
  c.priv.deck = deck;
  c.priv.hole = {};
  for (const u of pl) c.priv.hole[u] = [deck.pop(), deck.pop()];
  for (const u of g.pl) c.setSecret(u, c.priv.hole[u] ? { game: 'poker', gid: g.gid, hand: g.hand, hole: c.priv.hole[u] } : null);
  g.board = [];
  g.street = 0;
  g.bet = {}; g.total = {}; g.folded = {}; g.allin = {}; g.acted = {};
  for (const u of pl) { g.bet[u] = 0; g.total[u] = 0; }
  g.res = null;
  g.last = null;
  g.phase = 'bet';
  // blindes (à deux joueurs, le bouton paie la petite et parle en premier avant le flop)
  const sb = pl.length === 2 ? g.button : nextIn(pl, g.button, g.pl);
  const bb = nextIn(pl, sb, g.pl);
  g.sb = sb; g.bb = bb;
  put(g, sb, g.blinds[0]);
  put(g, bb, g.blinds[1]);
  g.max = Math.max(g.bet[sb], g.bet[bb]);
  g.minRaise = g.blinds[1];
  g.cur = nextIn(canAct(g), bb, g.pl);
  g.mv += 1;
  if (!g.cur || canAct(g).length === 0 || (canAct(g).length === 1 && g.bet[canAct(g)[0]] >= g.max)) runOut(c);
}

function streetDone(g) {
  const ca = canAct(g);
  return ca.every((u) => g.acted[u] && g.bet[u] === g.max);
}

function nextStreet(c) {
  const g = c.g;
  const deck = c.priv.deck;
  for (const u of g.seat) g.bet[u] = 0;
  g.max = 0;
  g.minRaise = g.blinds[1];
  g.acted = {};
  g.street += 1;
  if (g.street === 1) g.board.push(deck.pop(), deck.pop(), deck.pop());
  else if (g.street <= 3) g.board.push(deck.pop());
  if (g.street > 3) { showdown(c); return; }
  const ca = canAct(g);
  if (ca.length <= 1) { runOut(c); return; }
  g.cur = nextIn(ca, g.button, g.pl);
  g.mv += 1;
}

// plus personne ne peut miser : on tire le reste du tableau et on abat
function runOut(c) {
  const g = c.g;
  const deck = c.priv.deck;
  while (g.board.length < 5) g.board.push(deck.pop());
  g.street = 4;
  showdown(c);
}

function award(c, winners, amount, why) {
  const g = c.g;
  const share = Math.floor(amount / winners.length);
  let rest = amount - share * winners.length;
  for (const u of winners) {
    const n = share + (rest > 0 ? 1 : 0);
    if (rest > 0) rest -= 1;
    g.gave[u] = (g.gave[u] || 0) + n;
    g.won[u] = (g.won[u] || 0) + 1;
    c.gift(u, n, why);
  }
}

function showdown(c) {
  const g = c.g;
  const hold = inHand(g);
  const best = {};
  for (const u of hold) best[u] = evalHand([...c.priv.hole[u], ...g.board]);
  const pots = buildPots(g.total, g.folded);
  const res = [];
  for (const p of pots) {
    const elig = p.elig.filter((u) => best[u]);
    if (!elig.length) continue;
    let top = [elig[0]];
    for (const u of elig.slice(1)) { const d = cmpHand(best[u], best[top[0]]); if (d > 0) top = [u]; else if (d === 0) top.push(u); }
    award(c, top, p.amount, 'Poker : pot gagné, tu distribues');
    res.push({ amount: p.amount, win: top, name: HAND_NAME[best[top[0]][0]] });
  }
  g.res = { show: true, pots: res, hands: Object.fromEntries(hold.map((u) => [u, { hole: c.priv.hole[u], name: HAND_NAME[best[u][0]] }])) };
  endHand(c);
}

function endHand(c) {
  const g = c.g;
  g.phase = 'result';
  g.cur = null;
  g.mv += 1;
  for (const u of g.seat) if (g.stack[u] <= 0 && !g.out[u]) { g.out[u] = g.hand; c.ev(`Poker : ${c.name(u)} n’a plus de gorgées dans son tapis`, '*', 'game'); }
  for (const u of g.pl) c.setSecret(u, null);
  g.hist.push({ hand: g.hand, pot: potOf(g), res: g.res });
  if (live(c, g).length < 2) finish(c);
}

function act(c, u, v) {
  const g = c.g;
  if (!v || typeof v !== 'object') return false;
  const toCall = g.max - g.bet[u];
  if (v.a === 'fold') { g.folded[u] = true; g.last = { u, a: 'fold' }; }
  else if (v.a === 'check') { if (toCall > 0) return false; g.last = { u, a: 'check' }; }
  else if (v.a === 'call') { if (toCall <= 0) return false; const m = put(g, u, toCall); g.last = { u, a: g.allin[u] ? 'allin' : 'call', n: m }; }
  else if (v.a === 'raise' || v.a === 'allin') {
    const target = v.a === 'allin' ? g.bet[u] + g.stack[u] : Math.floor(Number(v.n));
    const maxT = g.bet[u] + g.stack[u];
    if (!(target > g.max) || target > maxT) return false;
    if (target < g.max + g.minRaise && target !== maxT) return false;
    const raise = target - g.max;
    put(g, u, target - g.bet[u]);
    if (raise >= g.minRaise) { g.minRaise = raise; g.acted = {}; }
    g.max = target;
    g.last = { u, a: g.allin[u] ? 'allin' : 'raise', n: target };
  } else return false;
  g.acted[u] = true;
  g.mv += 1;
  const still = inHand(g);
  if (still.length === 1) {
    award(c, still, potOf(g), 'Poker : tout le monde s’est couché, tu distribues le pot');
    g.res = { show: false, pots: [{ amount: potOf(g), win: still, name: null }], hands: {} };
    endHand(c);
    return true;
  }
  if (streetDone(g)) { nextStreet(c); return true; }
  g.cur = nextIn(canAct(g), u, g.pl);
  if (!g.cur) nextStreet(c);
  return true;
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  g.cur = null;
  for (const u of g.pl) c.setSecret(u, null);
  const rows = g.pl.filter((u) => c.roster[u]).map((u) => ({ u, stack: g.stack[u] || 0, won: g.won[u] || 0, gave: g.gave[u] || 0 }))
    .sort((a, b) => b.stack - a.stack || b.won - a.won);
  g.summary = { hands: g.hand, rows };
  const sips = c.opts.last || 0;
  if (sips && rows.length > 1) c.pen(rows[rows.length - 1].u, sips, 'Poker : dernier de la table');
}

// joueur automatique : force de la main (cartes cachées + tableau), un peu de bluff
function botAct(g, hole) {
  const toCall = g.max - g.bet.me;
  const cards = [...hole, ...g.board];
  let s;
  if (g.board.length === 0) {
    const [a, b] = hole.map(order).sort((x, y) => y - x);
    s = (a === b ? 0.55 + a / 40 : 0) + (a >= 12 ? 0.2 : 0) + (b >= 10 ? 0.15 : 0) + (hole[0][1] === hole[1][1] ? 0.05 : 0);
  } else s = evalHand(cards)[0] / 4 + 0.1;
  const r = Math.random();
  if (toCall <= 0) {
    if (s > 0.6 && r < 0.6 && g.stackMe > 0) return { a: 'raise', n: Math.min(g.max + g.minRaise + (s > 0.9 ? g.minRaise : 0), g.bet.me + g.stackMe) };
    return { a: 'check' };
  }
  if (s < 0.25 && toCall > 1 && r < 0.75) return { a: 'fold' };
  if (s > 0.85 && r < 0.4) return { a: 'allin' };
  return { a: 'call' };
}

const POKER = {
  id: 'poker',
  name: 'Poker des gorgées',
  tagline: 'Texas hold’em avec un tapis de gorgées. Celui qui rafle le pot ne garde rien : il distribue tout à la table.',
  min: 2,
  max: 8,
  local: true,
  rules: [
    'Chacun commence avec un tapis de gorgées (10 par défaut). Ce sont tes jetons : chaque mise sort de ton tapis.',
    'Petite blinde et grosse blinde avant la donne, puis deux cartes cachées chacun. Quatre tours d’enchères : avant le flop, après le flop (3 cartes communes), la tournante (4e) et la rivière (5e).',
    'À ton tour : te coucher, parler (si personne n’a misé), suivre, relancer (au moins autant que la dernière relance) ou faire tapis.',
    'Abattage : la meilleure combinaison de 5 cartes parmi tes 2 cartes et les 5 du tableau gagne. Carte haute, paire, double paire, brelan, quinte, couleur, full, carré, quinte flush.',
    'Le gagnant ne récupère pas les gorgées du pot : il les distribue à qui il veut. Égalité : le pot est partagé. Si quelqu’un est à tapis, il ne joue que la part du pot qu’il a pu suivre.',
    'Tapis vide : tu es éliminé. La partie s’arrête quand il ne reste qu’un joueur, ou quand l’hôte le décide. Option : le dernier boit en plus.',
    'Sur un seul téléphone : on passe le téléphone à chaque tour, les autres ne regardent pas les cartes.',
  ],
  options: [
    { id: 'stack', label: 'Tapis de départ', choices: [[10, '10 gorgées'], [15, '15 gorgées'], [20, '20 gorgées']], def: 10 },
    { id: 'blinds', label: 'Blindes', choices: [[1, '1 et 2'], [0, '1 et 1']], def: 1 },
    { id: 'last', label: 'Le dernier boit en plus', choices: [[0, 'Rien'], [3, '3 gorgées'], [5, '5 gorgées']], def: 0 },
  ],

  start(c) {
    const pl = c.activeUids().slice(0, 8);
    const stack0 = Number(c.opts.stack) || 10;
    const g = {
      gid: c.rid(5), pl, stack: Object.fromEntries(pl.map((u) => [u, stack0])), stack0, out: {}, hand: 0, button: null, seat: [], board: [], street: 0,
      bet: {}, total: {}, folded: {}, allin: {}, acted: {}, max: 0, minRaise: 2, cur: null, mv: 0, res: null, last: null, phase: 'bet',
      blinds: c.opts.blinds === 0 ? [1, 1] : [1, 2], won: {}, gave: {}, hist: [], local: !!c.isLocal,
    };
    c.g = g;
    c.S.game.g = g;
    newHand(c);
    return g;
  },

  request({ g, uid }) {
    if (g.phase === 'bet' && uid === g.cur) return { k: `a${g.gid}.${g.mv}`, kind: 'act', secret: true };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (g.phase !== 'bet' || uid !== g.cur || k !== `a${g.gid}.${g.mv}`) return false;
    return act(c, uid, v);
  },

  actions({ g }) {
    if (g.phase === 'result') return [{ id: 'next', label: 'Donne suivante', primary: true }, { id: 'end', label: 'Arrêter la partie', confirm: 'Arrêter et voir le classement ?' }];
    if (g.phase === 'bet') return [{ id: 'end', label: 'Arrêter la partie', confirm: 'Arrêter et voir le classement ?' }];
    return [];
  },

  act(c, id) {
    const g = c.g;
    if (id === 'next' && g.phase === 'result') { newHand(c); return true; }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  // le joueur qui doit parler a quitté la soirée : il se couche
  tick(c) {
    const g = c.g;
    if (g.phase !== 'bet' || !g.cur || c.roster[g.cur]) return false;
    return act(c, g.cur, { a: 'fold' });
  },

  turnOf(g) { return g.phase === 'bet' ? g.cur : null; },
  tintOf() { return 'poker'; },
  cleanup(c) { for (const u of (c.g && c.g.pl) || []) c.setSecret(u, null); },
  bot({ g, uid, secret, req }) {
    if (!req || req.kind !== 'act' || !secret || !secret.hole) return undefined;
    const view = { ...g, bet: { ...g.bet, me: g.bet[uid] || 0 }, stackMe: g.stack[uid] || 0 };
    return botAct(view, secret.hole);
  },

  Table,
  Act,
};
export default POKER;

// ---------------------------------------------------------------- affichage

// une gorgée = un petit verre à shot ; au-delà de 10 on écrit le nombre
export function Shots({ n, max = 10, tone = '' }) {
  const k = Math.max(0, Math.min(n, max));
  return (
    <span class={`shots${tone ? ` shots-${tone}` : ''}`} role="img" aria-label={plural(n, 'gorgée', 'gorgées')}>
      {Array.from({ length: k }).map((_, i) => <i key={i} />)}
      {n > max ? <b>+{n - max}</b> : null}
    </span>
  );
}

const ACT_TXT = { fold: 'se couche', check: 'parle', call: 'suit', raise: 'relance à', allin: 'fait tapis' };
const STREET = ['Avant le flop', 'Flop', 'Tournante', 'Rivière', 'Abattage'];

function Board({ g }) {
  return (
    <div class="pk-board">
      {[0, 1, 2, 3, 4].map((i) => (g.board[i] ? <PlayingCard key={g.board[i]} c={g.board[i]} size="l" posee /> : <span key={i} class="pk-slot" />))}
    </div>
  );
}

function Table({ S, g, uid, secret }) {
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const mine = !g.local && secret && secret.game === 'poker' && secret.gid === g.gid && secret.hand === g.hand ? secret.hole : null;
  const pot = potOf(g);
  return (
    <div class="pk">
      <div class="ose-top">
        <span class="chip">Donne {g.hand}</span>
        <span class="chip">{STREET[Math.min(g.street, 4)]}</span>
        <span class="chip">Blindes {g.blinds[0]} et {g.blinds[1]}</span>
      </div>
      <div class="pk-felt">
        <span class="pk-print" aria-hidden="true">Le gagnant distribue · le tapis ne revient jamais</span>
        <Board g={g} />
        <p class="pk-pot"><span class="pk-pot-l">Pot</span> <b>{pot}</b> <Shots n={pot} max={12} tone="pot" /></p>
        {g.last && g.phase === 'bet' ? <p class="pk-last">{nickOf(S, g.last.u)} {ACT_TXT[g.last.a]}{g.last.a === 'raise' ? ` ${g.last.n}` : ''}</p> : null}
      </div>
      <ul class="pk-seats">
        {g.pl.filter((u) => S.roster[u]).map((u) => {
          const inH = g.seat.includes(u);
          return (
            <li key={u} class={`pk-seat${u === g.cur ? ' is-turn' : ''}${g.folded[u] ? ' is-fold' : ''}${g.out[u] ? ' is-out' : ''}`}>
              <Av p={S.roster[u]} size="s" />
              <span class="pk-name">{nickOf(S, u)}
                {u === g.button && inH ? <i class="pk-tag">D</i> : null}
                {u === g.sb && inH && g.phase !== 'end' ? <i class="pk-tag is-b">PB</i> : null}
                {u === g.bb && inH && g.phase !== 'end' ? <i class="pk-tag is-b">GB</i> : null}
              </span>
              <span class="pk-stack">{g.out[u] ? 'éliminé' : <><Shots n={g.stack[u]} /> <b>{g.stack[u]}</b></>}</span>
              <span class="pk-bet">{g.folded[u] ? 'couché' : g.allin[u] ? `tapis (${g.total[u]})` : g.bet[u] ? `mise ${g.bet[u]}` : ''}</span>
            </li>
          );
        })}
      </ul>
      {mine && g.phase === 'bet' && g.cur !== uid && !g.folded[uid] ? (
        <div class="pk-mine"><span class="muted small">Tes cartes</span><div class="pk-hole">{mine.map((x) => <PlayingCard key={x} c={x} size="m" />)}</div></div>
      ) : null}
      {g.phase === 'result' && g.res ? <Result S={S} g={g} uid={uid} /> : null}
    </div>
  );
}

function Result({ S, g, uid }) {
  const r = g.res;
  return (
    <div class="verdict paper tape pk-res">
      {r.pots.map((p, i) => (
        <p key={i} class="pk-res-l">
          <span class="ose-lead">{i === 0 ? (r.pots.length > 1 ? 'Pot principal' : 'Pot') : 'Pot annexe'} · {plural(p.amount, 'gorgée', 'gorgées')}</span>
          {p.win.map((u) => <Who key={u} S={S} uid={u} you={uid} />)}
          {p.name ? <> avec <b>{p.name}</b></> : <> : tout le monde s’est couché</>}
          <Stamp tone="give">{p.win.length > 1 ? `Chacun distribue ${Math.floor(p.amount / p.win.length)}` : `Distribue ${p.amount}`}</Stamp>
        </p>
      ))}
      {r.show ? (
        <>
          <div class="pk-board pk-board-s">{g.board.map((x) => <PlayingCard key={x} c={x} size="s" />)}</div>
          <ul class="pk-show">
            {Object.entries(r.hands).map(([u, h]) => (
              <li key={u}><Who S={S} uid={u} you={uid} /> <span class="pk-hole">{h.hole.map((x) => <PlayingCard key={x} c={x} size="s" />)}</span> <span class="muted">{h.name}</span></li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}

function End({ S, g, uid }) {
  const s = g.summary || { rows: [], hands: 0 };
  return (
    <div class="end">
      <h3 class="end-title">Fin du poker · {plural(s.hands, 'donne', 'donnes')}</h3>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Joueur</th><th>Tapis</th><th>Pots</th><th>Distribuées</th></tr></thead>
        <tbody>{s.rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.stack}</td><td>{r.won}</td><td>{r.gave}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}

function Act({ g, uid, secret, req, send, sent }) {
  const toCall = Math.max(0, g.max - (g.bet[uid] || 0));
  const stack = g.stack[uid] || 0;
  const maxT = (g.bet[uid] || 0) + stack;
  const minT = Math.min(maxT, g.max + g.minRaise);
  const [t, setT] = useState(minT);
  if (req.kind !== 'act') return null;
  const hole = (secret && secret.hole) || [];
  const tt = Math.max(minT, Math.min(t, maxT));
  return (
    <div class="act pk-act">
      <h3>{toCall > 0 ? `${plural(toCall, 'gorgée', 'gorgées')} pour suivre` : 'À toi de parler'}</h3>
      <div class="pk-hole pk-hole-big">{hole.map((x) => <PlayingCard key={x} c={x} size="l" />)}</div>
      {g.board.length ? <div class="pk-board pk-board-s">{g.board.map((x) => <PlayingCard key={x} c={x} size="s" />)}</div> : null}
      <p class="muted small center">Ton tapis : <b>{stack}</b> · déjà misé ce tour : {g.bet[uid] || 0} · pot : {potOf(g)}</p>
      <div class="pk-btns">
        <button type="button" class="btn" disabled={sent} onClick={() => send(req.k, { a: 'fold' })}>Se coucher</button>
        {toCall > 0
          ? <button type="button" class="btn btn-main" disabled={sent} onClick={() => send(req.k, { a: 'call' })}>{toCall >= stack ? `Suivre à tapis (${stack})` : `Suivre ${toCall}`}</button>
          : <button type="button" class="btn btn-main" disabled={sent} onClick={() => send(req.k, { a: 'check' })}>Parler</button>}
      </div>
      {maxT > g.max ? (
        <div class="pk-raise">
          <span class="muted small">{g.max ? 'Relancer à' : 'Miser'}</span>
          <div class="pe-q">
            <button type="button" class="btn" disabled={sent || tt <= minT} onClick={() => setT(tt - 1)} aria-label="Une gorgée de moins">−</button>
            <span class="pe-big">{tt}</span>
            <button type="button" class="btn" disabled={sent || tt >= maxT} onClick={() => setT(tt + 1)} aria-label="Une gorgée de plus">+</button>
          </div>
          <div class="pk-btns">
            <button type="button" class="btn" disabled={sent} onClick={() => send(req.k, tt >= maxT ? { a: 'allin' } : { a: 'raise', n: tt })}>{tt >= maxT ? 'Tapis !' : g.max ? `Relancer à ${tt}` : `Miser ${tt}`}</button>
            {tt < maxT ? <button type="button" class="btn" disabled={sent} onClick={() => send(req.k, { a: 'allin' })}>Tapis ({maxT})</button> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

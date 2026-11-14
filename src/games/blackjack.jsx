// Blackjack des gorgées : tout le monde contre la banque (l'appli).
// • Chacun mise 1 à 5 gorgées, puis deux cartes chacun ; la banque a une carte visible et une cachée.
// • Tirer, rester, doubler (sur les deux premières cartes : mise x2, une seule carte de plus). Plus de 21 : tu sautes.
// • La banque tire jusqu'à 16 et reste à partir de 17. Gagné : tu distribues ta mise. Blackjack (21 en deux cartes) :
//   tu distribues une fois et demie ta mise. Égalité : rien. Perdu ou sauté : tu bois ta mise.
import { useState } from 'preact/hooks';
import { newDeck } from '../lib/cards.js';
import { PlayingCard, Who, nickOf, Av, Stamp, Waiting } from '../ui/common.jsx';
import { plural } from '../lib/util.js';
import { Shots } from './poker.jsx';

const VAL = { A: 11, K: 10, Q: 10, J: 10, T: 10 };
export function handValue(cards) {
  let v = 0;
  let aces = 0;
  for (const c of cards) { const r = c[0]; v += VAL[r] || Number(r); if (r === 'A') aces += 1; }
  while (v > 21 && aces) { v -= 10; aces -= 1; }
  return { v, soft: aces > 0 && v <= 21 };
}
export const isBJ = (cards) => cards.length === 2 && handValue(cards).v === 21;

const seated = (c, g) => g.pl.filter((u) => c.roster[u]);
function draw(c) {
  if (!c.priv.shoe || c.priv.shoe.length < 15) c.priv.shoe = newDeck(4);
  return c.priv.shoe.pop();
}

function newRound(c) {
  const g = c.g;
  g.pl = seated(c, g);
  if (!g.pl.length || (g.max && g.r >= g.max)) { finish(c); return; }
  g.r += 1;
  g.phase = 'bet';
  g.bets = {};
  g.hands = {};
  g.dealer = [];
  g.hole = false;
  g.res = null;
  g.cur = null;
  g.mv += 1;
}

function deal(c) {
  const g = c.g;
  g.pl = g.pl.filter((u) => c.roster[u] && g.bets[u]);
  if (!g.pl.length) { newRound(c); return; }
  for (const u of g.pl) g.hands[u] = { cards: [draw(c), draw(c)], done: false, doubled: false };
  g.dealer = [draw(c)];
  c.priv.hole = draw(c);
  g.hole = true;
  g.phase = 'play';
  g.mv += 1;
  // blackjack de la banque : on retourne tout de suite
  if (isBJ([g.dealer[0], c.priv.hole])) { dealerPlay(c); return; }
  for (const u of g.pl) if (isBJ(g.hands[u].cards)) g.hands[u].done = true;
  g.cur = g.pl.find((u) => !g.hands[u].done) || null;
  if (!g.cur) dealerPlay(c);
}

function nextPlayer(c) {
  const g = c.g;
  const i = g.pl.indexOf(g.cur);
  g.cur = g.pl.slice(i + 1).find((u) => c.roster[u] && !g.hands[u].done) || null;
  g.mv += 1;
  if (!g.cur) dealerPlay(c);
}

function dealerPlay(c) {
  const g = c.g;
  g.dealer.push(c.priv.hole);
  g.hole = false;
  g.cur = null;
  // la banque ne tire que si quelqu'un est encore en jeu
  const alive = g.pl.some((u) => handValue(g.hands[u].cards).v <= 21 && !isBJ(g.hands[u].cards));
  if (alive) while (handValue(g.dealer).v < 17) g.dealer.push(draw(c));
  settle(c);
}

function settle(c) {
  const g = c.g;
  const d = handValue(g.dealer).v;
  const dBJ = isBJ(g.dealer);
  g.res = {};
  for (const u of g.pl) {
    const h = g.hands[u];
    const bet = g.bets[u] * (h.doubled ? 2 : 1);
    const v = handValue(h.cards).v;
    let out;
    let n = bet;
    if (v > 21) out = 'bust';
    else if (isBJ(h.cards) && !dBJ) { out = 'bj'; n = Math.ceil(bet * 1.5); }
    else if (dBJ && !isBJ(h.cards)) out = 'lose';
    else if (d > 21 || v > d) out = 'win';
    else if (v === d) { out = 'push'; n = 0; }
    else out = 'lose';
    g.res[u] = { out, n };
    const t = (g.tally[u] = g.tally[u] || { win: 0, lose: 0, gave: 0, drank: 0 });
    if (out === 'win' || out === 'bj') { c.gift(u, n, out === 'bj' ? 'Blackjack ! Tu distribues' : 'Blackjack : main gagnée, tu distribues'); t.win += 1; t.gave += n; }
    else if (out === 'lose' || out === 'bust') { c.pen(u, n, out === 'bust' ? 'Blackjack : tu as sauté' : 'Blackjack : la banque gagne'); t.lose += 1; t.drank += n; }
  }
  g.phase = 'result';
  g.mv += 1;
  g.hist.push({ r: g.r, dealer: g.dealer.slice(), res: { ...g.res } });
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  g.cur = null;
  const rows = Object.entries(g.tally).filter(([u]) => c.roster[u]).map(([u, t]) => ({ u, ...t })).sort((a, b) => (b.gave - b.drank) - (a.gave - a.drank));
  g.summary = { rounds: g.r, rows };
}

function play(c, u, v) {
  const g = c.g;
  const h = g.hands[u];
  if (!h || h.done) return false;
  if (v === 'hit') {
    h.cards.push(draw(c));
    const x = handValue(h.cards).v;
    if (x >= 21) { h.done = true; nextPlayer(c); } else g.mv += 1;
    return true;
  }
  if (v === 'stand') { h.done = true; nextPlayer(c); return true; }
  if (v === 'double') {
    if (h.cards.length !== 2) return false;
    h.doubled = true;
    h.cards.push(draw(c));
    h.done = true;
    nextPlayer(c);
    return true;
  }
  return false;
}

const BLACKJACK = {
  id: 'blackjack',
  name: 'Blackjack des gorgées',
  tagline: 'Toute la table contre la banque. Tu mises des gorgées : gagné, tu les distribues ; perdu, tu les bois.',
  min: 1,
  max: 7,
  local: true,
  rules: [
    'Toute la table joue contre la banque (l’appli). Chacun mise de 1 à 5 gorgées avant la donne.',
    'Deux cartes chacun, la banque a une carte visible et une cachée. Les figures valent 10, l’As vaut 1 ou 11.',
    'À ton tour : tirer une carte, rester, ou doubler sur tes deux premières cartes (mise doublée, une seule carte de plus). Au-delà de 21, tu sautes.',
    'La banque retourne sa carte cachée, tire jusqu’à 16 et reste à partir de 17.',
    'Gagné : tu distribues ta mise. Blackjack (21 avec deux cartes) : tu distribues une fois et demie ta mise. Égalité : rien ne bouge. Perdu ou sauté : tu bois ta mise.',
    'On joue avec quatre jeux mélangés, rebattus quand le sabot s’épuise.',
  ],
  options: [
    { id: 'rounds', label: 'Nombre de mains', choices: [[5, '5'], [10, '10'], [0, 'Sans fin']], def: 10 },
    { id: 'maxbet', label: 'Mise maximale', choices: [[3, '3 gorgées'], [5, '5 gorgées']], def: 5 },
  ],

  start(c) {
    const g = { gid: c.rid(5), pl: c.activeUids().slice(0, 7), r: 0, max: c.opts.rounds == null ? 10 : Number(c.opts.rounds), maxBet: Number(c.opts.maxbet) || 5, phase: 'bet', bets: {}, hands: {}, dealer: [], hole: false, cur: null, res: null, mv: 0, tally: {}, hist: [] };
    c.g = g;
    c.S.game.g = g;
    newRound(c);
    return g;
  },

  request({ g, uid }) {
    if (g.phase === 'bet' && g.pl.includes(uid) && !g.bets[uid]) return { k: `b${g.gid}.${g.r}`, kind: 'bet' };
    if (g.phase === 'play' && uid === g.cur) return { k: `p${g.gid}.${g.mv}`, kind: 'play' };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (g.phase === 'bet' && k === `b${g.gid}.${g.r}` && g.pl.includes(uid) && !g.bets[uid]) {
      const n = Math.floor(Number(v));
      if (!(n >= 1 && n <= g.maxBet)) return false;
      g.bets[uid] = n;
      if (g.pl.filter((u) => c.roster[u] && c.online(u)).every((u) => g.bets[u])) deal(c);
      return true;
    }
    if (g.phase === 'play' && uid === g.cur && k === `p${g.gid}.${g.mv}`) return play(c, uid, v);
    return false;
  },

  actions({ g }) {
    if (g.phase === 'result') {
      if (g.max && g.r >= g.max) return [{ id: 'end', label: 'Voir le bilan', primary: true }];
      return [{ id: 'next', label: 'Main suivante', primary: true }, { id: 'end', label: 'Arrêter la partie', confirm: 'Arrêter et voir le bilan ?' }];
    }
    if (g.phase === 'bet' && Object.keys(g.bets).length) return [{ id: 'deal', label: 'Distribuer sans les retardataires', confirm: 'Ceux qui n’ont pas misé passent cette main. Continuer ?' }];
    if (g.phase !== 'end') return [{ id: 'end', label: 'Arrêter la partie', confirm: 'Arrêter et voir le bilan ?' }];
    return [];
  },

  act(c, id) {
    const g = c.g;
    if (id === 'next' && g.phase === 'result') { newRound(c); return true; }
    if (id === 'deal' && g.phase === 'bet' && Object.keys(g.bets).length) { deal(c); return true; }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  tick(c) {
    const g = c.g;
    if (g.phase === 'play' && g.cur && !c.roster[g.cur]) { g.hands[g.cur].done = true; nextPlayer(c); return true; }
    if (g.phase === 'bet') {
      const need = g.pl.filter((u) => c.roster[u] && c.online(u));
      if (need.length && need.every((u) => g.bets[u])) { deal(c); return true; }
    }
    return false;
  },

  turnOf(g) { return g.phase === 'play' ? g.cur : null; },
  tintOf() { return 'blackjack'; },
  bot({ g, uid, req }) {
    if (!req) return undefined;
    if (req.kind === 'bet') return 1 + Math.floor(Math.random() * Math.min(3, g.maxBet));
    if (req.kind === 'play') {
      const h = g.hands[uid];
      const { v, soft } = handValue(h.cards);
      const up = handValue([g.dealer[0]]).v;
      if (h.cards.length === 2 && (v === 10 || v === 11) && up < 10) return 'double';
      if (v <= 11) return 'hit';
      if (soft && v <= 17) return 'hit';
      if (v >= 17) return 'stand';
      return up >= 7 ? 'hit' : 'stand';
    }
    return undefined;
  },

  Table,
  Act,
};
export default BLACKJACK;

// ---------------------------------------------------------------- affichage
const OUT = { win: 'Gagné', bj: 'Blackjack !', push: 'Égalité', lose: 'Perdu', bust: 'Sauté' };

function Total({ cards }) {
  const { v, soft } = handValue(cards);
  return <span class={`bj-tot${v > 21 ? ' is-bust' : v === 21 ? ' is-21' : ''}`}>{soft && v < 21 ? `${v - 10} / ${v}` : v}</span>;
}

function Table({ S, g, uid }) {
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const shownDealer = g.hole ? [...g.dealer, null] : g.dealer;
  return (
    <div class="bj">
      <div class="ose-top">
        <span class="chip">Main {g.r}{g.max ? ` / ${g.max}` : ''}</span>
        <span class="chip">Mise de 1 à {g.maxBet}</span>
      </div>
      <div class="bj-felt">
        <div class="bj-dealer">
          <span class="bj-who">La banque {g.dealer.length && !g.hole ? <Total cards={g.dealer} /> : null}</span>
          <div class="bj-cards">
            {shownDealer.length ? shownDealer.map((x, i) => (x ? <PlayingCard key={`${x}${i}`} c={x} size="m" posee /> : <PlayingCard key="hole" c="AS" size="m" back />)) : <span class="pk-slot" />}
          </div>
        </div>
        <p class="bj-print" aria-hidden="true">La banque tire à 16 et reste à 17 · Blackjack paie 3 pour 2</p>
        <ul class="bj-seats">
          {g.pl.filter((u) => S.roster[u]).map((u) => {
            const h = g.hands[u];
            const r = g.res && g.res[u];
            return (
              <li key={u} class={`bj-seat${u === g.cur ? ' is-turn' : ''}${r ? ` is-${r.out}` : ''}`}>
                <span class="bj-head"><Av p={S.roster[u]} size="s" /> <span class="pk-name">{nickOf(S, u)}</span></span>
                <span class="bj-bet">{g.bets[u] ? <><Shots n={g.bets[u] * (h && h.doubled ? 2 : 1)} /> {h && h.doubled ? 'doublé' : ''}</> : g.phase === 'bet' ? <span class="muted small">mise…</span> : null}</span>
                {h ? <span class="bj-cards bj-cards-s">{h.cards.map((x, i) => <PlayingCard key={`${x}${i}`} c={x} size="s" posee />)}</span> : null}
                {h ? <Total cards={h.cards} /> : null}
                {r ? <Stamp size="s" tone={r.out === 'win' || r.out === 'bj' ? 'give' : ''}>{OUT[r.out]}{r.n && r.out !== 'push' ? ` · ${r.out === 'win' || r.out === 'bj' ? 'distribue' : 'boit'} ${r.n}` : ''}</Stamp> : null}
              </li>
            );
          })}
        </ul>
      </div>
      {g.phase === 'bet' ? <Waiting>Chacun choisit sa mise.</Waiting> : null}
    </div>
  );
}

function End({ S, g, uid }) {
  const s = g.summary || { rows: [], rounds: 0 };
  return (
    <div class="end">
      <h3 class="end-title">Fin du blackjack · {plural(s.rounds, 'main', 'mains')}</h3>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Joueur</th><th>Gagnées</th><th>Distribuées</th><th>Bues</th></tr></thead>
        <tbody>{s.rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.win}</td><td>{r.gave}</td><td>{r.drank}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}

function Act({ g, uid, req, send, sent }) {
  const [n, setN] = useState(2);
  if (req.kind === 'bet') {
    const v = Math.max(1, Math.min(n, g.maxBet));
    return (
      <div class="act">
        <h3>Ta mise</h3>
        <div class="bj-chips" role="group" aria-label="Mise">
          {Array.from({ length: g.maxBet }).map((_, i) => (
            <button type="button" key={i} class={`pe-face bj-chip${v === i + 1 ? ' is-picked' : ''}`} aria-pressed={v === i + 1 ? 'true' : 'false'} disabled={sent} onClick={() => setN(i + 1)}>
              <b>{i + 1}</b><Shots n={i + 1} />
            </button>
          ))}
        </div>
        <button type="button" class="btn btn-main btn-big btn-wide" disabled={sent} onClick={() => send(req.k, v)}>Miser {plural(v, 'gorgée', 'gorgées')}</button>
      </div>
    );
  }
  if (req.kind !== 'play') return null;
  const h = g.hands[uid];
  if (!h) return null;
  return (
    <div class="act">
      <h3>À toi · <Total cards={h.cards} /></h3>
      <div class="bj-cards">{h.cards.map((x, i) => <PlayingCard key={`${x}${i}`} c={x} size="l" />)}</div>
      <p class="muted small center">La banque montre {handValue([g.dealer[0]]).v === 11 ? 'un As' : handValue([g.dealer[0]]).v}. Ta mise : {plural(g.bets[uid], 'gorgée', 'gorgées')}.</p>
      <div class="pk-btns pk-btns-3">
        <button type="button" class="btn btn-main" disabled={sent} onClick={() => send(req.k, 'hit')}>Tirer</button>
        <button type="button" class="btn" disabled={sent} onClick={() => send(req.k, 'stand')}>Rester</button>
        {h.cards.length === 2 ? <button type="button" class="btn" disabled={sent} onClick={() => send(req.k, 'double')}>Doubler</button> : null}
      </div>
    </div>
  );
}

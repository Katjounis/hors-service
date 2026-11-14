// Coinche (belote coinchée) : 4 joueurs, deux équipes (places 1 et 3 contre 2 et 4), jeu de 32 cartes.
// Règles suivies : enchères de 80 à 160 (par 10) ou capot (250) dans une couleur ; coinche (x2) par la défense,
// surcoinche (x4) par l'attaque ; obligation de fournir, de couper si l'adversaire est maître, de monter à l'atout ;
// on peut se défausser si le partenaire est maître. Belote-rebelote (+20), dix de der (+10), total 162.
// Marque : contrat réussi (au moins le contrat et plus que la défense) = contrat x coinche + points faits ;
// chute = la défense marque 160 + contrat, le tout x coinche. Alcool : l'équipe qui chute boit, une coinche réussie
// fait boire l'équipe adverse, un capot vaut un cul sec, la belote fait distribuer 2 gorgées.
// Mains secrètes : un téléphone par joueur. En mode Écran, la télé affiche le tapis.

import { useState, useEffect } from 'preact/hooks';
import { PlayingCard, Who, nickOf, Waiting, Av, Stamp } from '../ui/common.jsx';
import { shuffle as shuf, plural } from '../lib/util.js';

export const SUITS = ['S', 'H', 'D', 'C'];
const SUIT_SYM = { S: '♠︎', H: '♥︎', D: '♦︎', C: '♣︎' };
const SUIT_NAME = { S: 'Pique', H: 'Cœur', D: 'Carreau', C: 'Trèfle' };
const RANKS = ['7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const TRUMP_ORDER = ['7', '8', 'Q', 'K', 'T', 'A', '9', 'J'];
const PLAIN_ORDER = ['7', '8', '9', 'J', 'Q', 'K', 'T', 'A'];
const TRUMP_PTS = { J: 20, 9: 14, A: 11, T: 10, K: 4, Q: 3, 8: 0, 7: 0 };
const PLAIN_PTS = { A: 11, T: 10, K: 4, Q: 3, J: 2, 9: 0, 8: 0, 7: 0 };
export const BIDS = [80, 90, 100, 110, 120, 130, 140, 150, 160, 250];
const red = (s) => s === 'H' || s === 'D';

export const rk = (c) => c[0];
export const st = (c) => c[1];
export const points = (c, trump) => (st(c) === trump ? TRUMP_PTS[rk(c)] : PLAIN_PTS[rk(c)]);
const power = (c, trump, led) => (st(c) === trump ? 100 + TRUMP_ORDER.indexOf(rk(c)) : st(c) === led ? PLAIN_ORDER.indexOf(rk(c)) : -1);

export function deck32() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push(r + s);
  return d;
}

// index (dans le pli) de la carte maîtresse
export function winnerOf(trick, trump) {
  const led = st(trick[0].c);
  let best = 0;
  for (let i = 1; i < trick.length; i++) if (power(trick[i].c, trump, led) > power(trick[best].c, trump, led)) best = i;
  return best;
}

// cartes jouables (règles de la belote)
export function legal(hand, trick, trump, seat) {
  if (!trick.length) return hand.slice();
  const led = st(trick[0].c);
  const follow = hand.filter((c) => st(c) === led);
  const trumpsInTrick = trick.filter((t) => st(t.c) === trump).map((t) => TRUMP_ORDER.indexOf(rk(t.c)));
  const best = trumpsInTrick.length ? Math.max(...trumpsInTrick) : -1;
  if (led === trump) {
    if (!follow.length) return hand.slice();
    const over = follow.filter((c) => TRUMP_ORDER.indexOf(rk(c)) > best);
    return over.length ? over : follow;
  }
  if (follow.length) return follow;
  const w = trick[winnerOf(trick, trump)];
  if (w.seat % 2 === seat % 2) return hand.slice(); // partenaire maître : on peut se défausser
  const trumps = hand.filter((c) => st(c) === trump);
  if (!trumps.length) return hand.slice();
  const over = trumps.filter((c) => TRUMP_ORDER.indexOf(rk(c)) > best);
  return over.length ? over : trumps;
}

const sortHand = (h, trump) => h.slice().sort((a, b) => {
  const sa = SUITS.indexOf(st(a)) + (st(a) === trump ? 10 : 0);
  const sb = SUITS.indexOf(st(b)) + (st(b) === trump ? 10 : 0);
  if (sa !== sb) return sa - sb;
  const ord = st(a) === trump ? TRUMP_ORDER : PLAIN_ORDER;
  return ord.indexOf(rk(a)) - ord.indexOf(rk(b));
});
const r10 = (n) => Math.round(n / 10) * 10;

// ---------------------------------------------------------------- logique (hôte)

function publish(c) {
  const g = c.g;
  for (let s = 0; s < 4; s++) {
    const u = g.pl[s];
    c.setSecret(u, { game: 'coinche', gid: g.gid, deal: g.dealN, seat: s, hand: sortHand(c.priv.hands[s], g.contract ? g.contract.suit : null) });
  }
}

function newDeal(c) {
  const g = c.g;
  const d = shuf(deck32());
  c.priv.hands = [0, 1, 2, 3].map((i) => d.slice(i * 8, i * 8 + 8));
  c.priv.belote = [0, 1, 2, 3].map(() => 0);
  g.dealN += 1;
  g.dealer = (g.dealer + 1) % 4;
  g.turn = (g.dealer + 1) % 4;
  g.phase = 'bid';
  g.bids = [];
  g.contract = null;
  g.coinche = 1;
  g.passes = 0;
  g.trick = [];
  g.last = null;
  g.won = [0, 0];
  g.tricks = [0, 0];
  g.n = 0;
  g.beloteSeat = null;
  g.announce = null;
  g.result = null;
  publish(c);
}

function endBidding(c) {
  const g = c.g;
  g.phase = 'play';
  g.turn = (g.dealer + 1) % 4;
  g.lead = g.turn;
  // belote : celui qui a le Roi et la Dame d'atout
  const t = g.contract.suit;
  const hs = c.priv.hands;
  g.beloteSeat = [0, 1, 2, 3].find((s) => hs[s].includes(`K${t}`) && hs[s].includes(`Q${t}`));
  if (g.beloteSeat === undefined) g.beloteSeat = null;
  publish(c);
}

function bidInput(c, seat, v) {
  const g = c.g;
  if (!v || typeof v !== 'object') return false;
  const cur = g.contract;
  if (v.type === 'pass') {
    g.bids.push({ seat, type: 'pass' });
    g.passes += 1;
    if (!cur && g.passes >= 4) { g.bids.push({ type: 'redeal' }); c.ev('Tout le monde passe : on redistribue.', '*', 'game'); newDeal(c); return true; }
    if (cur && (g.coinche > 1 || g.passes >= 3)) { endBidding(c); return true; }
    g.turn = (g.turn + 1) % 4;
    return true;
  }
  if (v.type === 'bid') {
    if (g.coinche > 1) return false;
    const val = Number(v.val);
    if (!BIDS.includes(val) || !SUITS.includes(v.suit)) return false;
    if (cur && val <= cur.val) return false;
    g.contract = { seat, val, suit: v.suit };
    g.bids.push({ seat, type: 'bid', val, suit: v.suit });
    g.passes = 0;
    g.turn = (g.turn + 1) % 4;
    return true;
  }
  if (v.type === 'coinche') {
    if (!cur || g.coinche !== 1 || cur.seat % 2 === seat % 2) return false;
    g.coinche = 2;
    g.bids.push({ seat, type: 'coinche' });
    c.ev(`${c.name(g.pl[seat])} coinche !`, '*', 'game');
    // l'attaque peut encore surcoincher (le joueur suivant est forcément de l'équipe qui attaque)
    g.turn = (seat + 1) % 4;
    g.passes = 0;
    return true;
  }
  if (v.type === 'surcoinche') {
    if (!cur || g.coinche !== 2 || cur.seat % 2 !== seat % 2) return false;
    g.coinche = 4;
    g.bids.push({ seat, type: 'surcoinche' });
    c.ev(`${c.name(g.pl[seat])} surcoinche !`, '*', 'game');
    endBidding(c);
    return true;
  }
  return false;
}

function playInput(c, seat, card) {
  const g = c.g;
  const P = c.priv;
  const hand = P.hands[seat];
  if (typeof card !== 'string' || !hand.includes(card)) return false;
  const trump = g.contract.suit;
  if (!legal(hand, g.trick, trump, seat).includes(card)) return false;
  hand.splice(hand.indexOf(card), 1);
  g.trick.push({ seat, c: card });
  // belote / rebelote
  if (g.beloteSeat === seat && st(card) === trump && (rk(card) === 'K' || rk(card) === 'Q')) {
    P.belote[seat] += 1;
    g.announce = { seat, txt: P.belote[seat] === 1 ? 'Belote !' : 'Rebelote !', n: g.n };
    if (P.belote[seat] === 2) c.gift(g.pl[seat], 2, 'Coinche : belote-rebelote');
  }
  if (g.trick.length < 4) { g.turn = (seat + 1) % 4; publish(c); return true; }
  // pli complet
  const w = g.trick[winnerOf(g.trick, trump)].seat;
  const pts = g.trick.reduce((a, t) => a + points(t.c, trump), 0);
  g.won[w % 2] += pts;
  g.tricks[w % 2] += 1;
  g.n += 1;
  g.last = { cards: g.trick.slice(), w, pts, at: c.now() };
  g.trick = [];
  g.turn = w;
  if (g.n === 8) { g.won[w % 2] += 10; scoreDeal(c); return true; }
  publish(c);
  return true;
}

function scoreDeal(c) {
  const g = c.g;
  const K = g.contract;
  const att = K.seat % 2;
  const def = 1 - att;
  const bel = [0, 0];
  if (g.beloteSeat !== null) bel[g.beloteSeat % 2] = 20;
  const capot = g.tricks[att] === 8;
  const attPts = g.won[att] + bel[att];
  const defPts = g.won[def] + bel[def];
  const made = K.val === 250 ? capot : attPts >= K.val && attPts > defPts;
  const add = [0, 0];
  if (made) {
    add[att] = K.val * g.coinche + (capot ? 250 : r10(attPts));
    if (g.coinche === 1) add[def] = r10(defPts);
  } else {
    add[def] = (160 + K.val) * g.coinche + bel[def];
    add[att] = bel[att];
  }
  g.score[0] += add[0];
  g.score[1] += add[1];
  const team = (t) => [0, 1, 2, 3].filter((s) => s % 2 === t).map((s) => g.pl[s]);
  // alcool
  if (!made) for (const u of team(att)) c.pen(u, 2 * g.coinche, `Coinche : chute à ${K.val === 250 ? 'capot' : K.val}`);
  else if (g.coinche > 1) for (const u of team(def)) c.pen(u, 2 * g.coinche, 'Coinche : la coinche était de trop');
  if (capot) for (const u of team(def)) c.penCS(u, 'Coinche : capot');
  g.result = { made, capot, att, attPts, defPts, add, bel };
  g.history.push({ n: g.dealN, contract: { ...K }, coinche: g.coinche, made, add });
  g.phase = 'score';
  for (let s = 0; s < 4; s++) c.setSecret(g.pl[s], { game: 'coinche', gid: g.gid, deal: g.dealN, seat: s, hand: [] });
  // fin de partie ?
  const target = c.opts.target || 0;
  if (!target || g.score[0] >= target || g.score[1] >= target) {
    if (target && g.score[0] === g.score[1]) return; // égalité : on rejoue une donne
    finish(c);
  }
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  const win = g.score[0] >= g.score[1] ? 0 : 1;
  g.winner = win;
  for (let s = 0; s < 4; s++) if (s % 2 !== win && c.opts.sips > 0) c.pen(g.pl[s], c.opts.sips, 'Coinche : équipe perdante');
  g.summary = { score: g.score.slice(), winner: win };
}

const COINCHE = {
  id: 'coinche',
  name: 'Coinche',
  tagline: 'La belote coinchée à quatre, en deux équipes : enchères, coinche et surcoinche. L’équipe qui chute boit.',
  min: 4,
  local: false,
  rules: [
    'Quatre joueurs en deux équipes. Par défaut, le premier joueur choisit son partenaire (il s’assoit en face) ; on peut aussi garder l’ordre des places ou tirer au hasard. Jeu de 32 cartes, 8 cartes chacun.',
    'Bouton « Valeur des cartes » pendant la partie : les points et l’ordre de force à l’atout et hors atout, pour ceux qui débutent.',
    'Enchères : de 80 à 160 (par 10) ou capot, en choisissant l’atout. On parle à son tour : annoncer plus haut ou passer. Trois passes après une annonce : le contrat est fixé. Quatre passes d’entrée : on redistribue.',
    'La défense peut coincher (contrat x2) ; l’attaque peut alors surcoincher (x4).',
    'Jeu : on fournit la couleur demandée. Sinon on coupe si l’adversaire est maître (en montant si possible) ; si le partenaire est maître, on se défausse librement. À l’atout, on monte si on peut.',
    'Atout : Valet 20, 9 14, As 11, 10 10, Roi 4, Dame 3. Hors atout : As 11, 10 10, Roi 4, Dame 3, Valet 2. Dix de der +10, belote-rebelote +20.',
    'Contrat réussi (au moins le contrat et plus que la défense) : contrat x coinche + points faits. Chute : la défense marque 160 + contrat, x coinche.',
    'Alcool : l’équipe qui chute boit 2 gorgées chacun (x coinche), une coinche réussie fait boire l’équipe adverse, un capot vaut un cul sec aux perdants, la belote fait distribuer 2 gorgées. À la fin, l’équipe perdante boit.',
  ],
  options: [
    { id: 'teams', label: 'Équipes', choices: [['choix', 'On choisit'], ['places', 'Ordre des places'], ['hasard', 'Au hasard']], def: 'choix' },
    { id: 'target', label: 'Partie en', choices: [[0, 'Une donne'], [500, '500 points'], [1000, '1 000 points'], [2000, '2 000 points']], def: 1000 },
    { id: 'sips', label: 'L’équipe perdante boit', choices: [[0, 'Rien'], [3, '3 gorgées'], [5, '5 gorgées']], def: 3 },
  ],

  start(c) {
    let pl = c.activeUids().slice(0, 4);
    if (c.opts.teams === 'hasard') pl = c.shuffle(pl);
    const g = { gid: c.rid(5), pl, dealer: Math.floor(Math.random() * 4) - 1, dealN: 0, score: [0, 0], history: [], phase: 'bid' };
    c.g = g;
    c.S.game.g = g;
    // « On choisit » : le premier joueur désigne son partenaire avant la première donne
    if (c.opts.teams === 'choix' || c.opts.teams == null) { g.phase = 'team'; g.turn = 0; } else newDeal(c);
    return g;
  },

  request({ g, uid, secret }) {
    if (g.phase === 'team') return uid === g.pl[0] ? { k: `t${g.gid}`, kind: 'team' } : null;
    const seat = g.pl.indexOf(uid);
    if (seat < 0 || !secret || secret.game !== 'coinche' || secret.gid !== g.gid) return null;
    if (g.turn !== seat) return null;
    if (g.phase === 'bid') return { k: `b${g.dealN}.${g.bids.length}`, kind: 'bid' };
    if (g.phase === 'play') return { k: `p${g.dealN}.${g.n}.${g.trick.length}`, kind: 'play' };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (g.phase === 'team') {
      if (k !== `t${g.gid}` || uid !== g.pl[0] || v === uid || !g.pl.includes(v)) return false;
      // le partenaire s'assoit en face (place 3), les deux autres en 2 et 4
      const others = g.pl.filter((u) => u !== uid && u !== v);
      g.pl = [uid, others[0], v, others[1]];
      c.ev(`Coinche : ${c.name(uid)} fait équipe avec ${c.name(v)}`, '*', 'game');
      newDeal(c);
      return true;
    }
    const seat = g.pl.indexOf(uid);
    if (seat < 0 || g.turn !== seat) return false;
    if (g.phase === 'bid' && k === `b${g.dealN}.${g.bids.length}`) return bidInput(c, seat, v);
    if (g.phase === 'play' && k === `p${g.dealN}.${g.n}.${g.trick.length}`) return playInput(c, seat, v);
    return false;
  },

  actions({ g }) {
    if (g.phase === 'score') return [{ id: 'next', label: 'Donne suivante', primary: true }, { id: 'end', label: 'Arrêter la partie', confirm: 'Arrêter et voir le résultat ?' }];
    if (g.phase === 'end') return [];
    return [{ id: 'end', label: 'Arrêter la partie', confirm: 'Arrêter et voir le résultat ?' }];
  },

  act(c, id) {
    const g = c.g;
    if (id === 'next' && g.phase === 'score') { newDeal(c); return true; }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  turnOf(g) { return g.phase === 'team' ? g.pl[0] : g.phase === 'bid' || g.phase === 'play' ? g.pl[g.turn] : null; },
  cleanup(c) { for (const u of (c.g && c.g.pl) || []) c.setSecret(u, null); },

  // joueur automatique : annonce s'il a du jeu à l'atout, joue une carte permise au hasard (la plus forte s'il peut prendre)
  bot({ g, req, secret }) {
    if (req && req.kind === 'team') { const o = g.pl.slice(1); return o[Math.floor(Math.random() * o.length)]; }
    if (!secret || !req) return undefined;
    const hand = secret.hand || [];
    if (req.kind === 'bid') {
      const cur = g.contract;
      const seat = secret.seat;
      if (cur && g.coinche === 2 && cur.seat % 2 === seat % 2) return Math.random() < 0.3 ? { type: 'surcoinche' } : { type: 'pass' };
      if (cur && g.coinche === 1 && cur.seat % 2 !== seat % 2 && cur.val >= 120 && Math.random() < 0.25) return { type: 'coinche' };
      let best = null;
      for (const s of SUITS) {
        const tr = hand.filter((c) => st(c) === s);
        const v = tr.reduce((a, c) => a + TRUMP_PTS[rk(c)], 0) + hand.filter((c) => rk(c) === 'A' && st(c) !== s).length * 10;
        if (!best || v > best.v) best = { s, v };
      }
      const val = best.v >= 60 ? 100 : best.v >= 40 ? 80 : 0;
      if (!val || (cur && cur.val >= val) || (cur && cur.seat % 2 === seat % 2)) return { type: 'pass' };
      return { type: 'bid', val: cur ? cur.val + 10 : val, suit: best.s };
    }
    if (req.kind === 'play') {
      const ok = legal(hand, g.trick, g.contract.suit, secret.seat);
      return ok[Math.floor(Math.random() * ok.length)];
    }
    return undefined;
  },

  Table,
  Act,
};

export default COINCHE;

// ---------------------------------------------------------------- affichage

const teamName = (S, g, t) => [0, 1, 2, 3].filter((s) => s % 2 === t).map((s) => nickOf(S, g.pl[s])).join(' et ');
const SuitTxt = ({ s }) => <span class={red(s) ? 'suit-r' : 'suit-n'}>{SUIT_SYM[s]}</span>;
const bidTxt = (b) => (b.type === 'pass' ? 'passe' : b.type === 'coinche' ? 'coinche !' : b.type === 'surcoinche' ? 'surcoinche !' : b.type === 'redeal' ? 'redistribution' : `${b.val === 250 ? 'capot' : b.val}`);

// aide-mémoire pour les débutants : points et ordre de force, atout et hors atout
const BAREME = [['J', 'Valet', 20, 2], ['9', '9', 14, 0], ['A', 'As', 11, 11], ['T', '10', 10, 10], ['K', 'Roi', 4, 4], ['Q', 'Dame', 3, 3], ['8', '8', 0, 0], ['7', '7', 0, 0]];
function Bareme({ trump }) {
  return (
    <details class="co-bareme">
      <summary>Valeur des cartes</summary>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Carte</th><th>À l’atout{trump ? <> (<SuitTxt s={trump} />)</> : null}</th><th>Hors atout</th></tr></thead>
          <tbody>{BAREME.map(([r, n, a, h]) => <tr key={r}><td>{n}</td><td><b>{a}</b></td><td>{h}</td></tr>)}</tbody>
        </table>
      </div>
      <p class="small">Ordre de force à l’atout : Valet, 9, As, 10, Roi, Dame, 8, 7. Hors atout : As, 10, Roi, Dame, Valet, 9, 8, 7.</p>
      <p class="small">Une donne vaut 162 points (152 dans les cartes, plus 10 pour le dernier pli). Roi et Dame d’atout dans la même main : belote-rebelote, +20.</p>
      <p class="small">Pour annoncer : compte tes points à l’atout et tes As. Valet et 9 d’atout avec un As à côté, c’est souvent un 80 ou un 90.</p>
    </details>
  );
}

function Contract({ S, g }) {
  const K = g.contract;
  if (!K) return null;
  return (
    <p class="co-contract">
      Contrat : <b>{K.val === 250 ? 'Capot' : K.val}</b> à <SuitTxt s={K.suit} /> {SUIT_NAME[K.suit]} par <b>{nickOf(S, g.pl[K.seat])}</b>
      {g.coinche > 1 ? <Stamp size="s">{g.coinche === 2 ? 'Coinché' : 'Surcoinché'}</Stamp> : null}
    </p>
  );
}

function Tapis({ S, g, me }) {
  // le joueur en bas, puis dans le sens des aiguilles d'une montre
  const base = me >= 0 ? me : 0;
  const pos = ['bas', 'gauche', 'haut', 'droite'];
  // pli terminé : les quatre cartes restent visibles une seconde, puis le tapis se vide tout seul
  const SHOW = 1100;
  const [, redraw] = useState(0);
  const left = g.last ? SHOW - (Date.now() - g.last.at) : 0;
  useEffect(() => {
    if (!(g.trick.length === 0 && left > 0)) return undefined;
    const t = setTimeout(() => redraw((x) => x + 1), left + 20);
    return () => clearTimeout(t);
  }, [g.last && g.last.at, g.trick.length]);
  const cardOf = (s) => (g.trick.find((t) => t.seat === s) || (g.trick.length === 0 && g.last && left > 0 ? g.last.cards.find((t) => t.seat === s) : null));
  return (
    <div class="co-tapis">
      {[0, 1, 2, 3].map((i) => {
        const s = (base + i) % 4;
        const t = cardOf(s);
        return (
          <div key={s} class={`co-seat co-${pos[i]}${g.turn === s && (g.phase === 'play' || g.phase === 'bid') ? ' is-turn' : ''}`}>
            <span class="co-name"><Av p={S.roster[g.pl[s]]} size="s" /> {nickOf(S, g.pl[s])}{s % 2 === base % 2 ? '' : ''}</span>
            {t ? <span class="co-card"><PlayingCard c={t.c} size="m" posee /></span> : <span class="co-card is-empty" />}
          </div>
        );
      })}
      {g.announce && g.announce.n === g.n ? <span class="co-announce">{nickOf(S, g.pl[g.announce.seat])} : {g.announce.txt}</span> : null}
    </div>
  );
}

function Table({ S, g, uid, secret, screen }) {
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  if (g.phase === 'team') {
    return (
      <div class={`co${screen ? ' is-screen' : ''}`}>
        <p class="lead">{uid === g.pl[0] ? 'Choisis ton partenaire : il s’assoit en face de toi.' : `${nickOf(S, g.pl[0])} choisit son partenaire.`}</p>
        <Bareme />
      </div>
    );
  }
  const me = g.pl.indexOf(uid);
  const myHand = secret && secret.game === 'coinche' && secret.gid === g.gid ? secret.hand : null;
  return (
    <div class={`co${screen ? ' is-screen' : ''}`}>
      <div class="co-score">
        <span class={me >= 0 && me % 2 === 0 ? 'is-me' : ''}><b>{g.score[0]}</b> {teamName(S, g, 0)}</span>
        <span class={me >= 0 && me % 2 === 1 ? 'is-me' : ''}><b>{g.score[1]}</b> {teamName(S, g, 1)}</span>
      </div>
      <div class="pipo-top">
        <span class="chip">Donne {g.dealN}</span>
        {g.phase === 'play' ? <span class="chip">Pli {Math.min(8, g.n + 1)} / 8</span> : null}
        {g.phase === 'play' ? <span class="chip">Plis {g.tricks[0]} – {g.tricks[1]}</span> : null}
      </div>
      <Contract S={S} g={g} />
      <Bareme trump={g.contract && g.contract.suit} />
      {g.phase === 'bid' ? (
        <div class="co-bids">
          {g.bids.length ? g.bids.slice(-8).map((b, i) => (
            <span key={i} class="co-bid">{b.seat != null ? <b>{nickOf(S, g.pl[b.seat])}</b> : null} {bidTxt(b)}{b.suit ? <> <SuitTxt s={b.suit} /></> : null}</span>
          )) : <span class="muted">Enchères : {nickOf(S, g.pl[g.turn])} parle en premier.</span>}
        </div>
      ) : null}
      {g.phase === 'play' || g.phase === 'score' ? <Tapis S={S} g={g} me={me} /> : null}
      {g.phase === 'score' && g.result ? <DealResult S={S} g={g} /> : null}
      {myHand && myHand.length && g.turn !== me ? (
        <div class="co-hand is-wait">{myHand.map((c, i) => <span class="co-slot" key={c} style={{ '--i': i - (myHand.length - 1) / 2 }}><PlayingCard c={c} size="m" /></span>)}</div>
      ) : null}
    </div>
  );
}

function DealResult({ S, g }) {
  const r = g.result;
  const K = g.contract;
  return (
    <div class="co-result">
      <p class="co-result-t">{r.made ? (r.capot ? 'Capot !' : 'Contrat réussi') : 'Dedans : contrat chuté'}</p>
      <p>Attaque ({teamName(S, g, r.att)}) : <b>{r.attPts}</b> points pour un contrat de {K.val === 250 ? 'capot' : K.val}. Défense : <b>{r.defPts}</b>.</p>
      <p>Marque de la donne : {teamName(S, g, 0)} +{r.add[0]}, {teamName(S, g, 1)} +{r.add[1]}.</p>
    </div>
  );
}

function End({ S, g, uid }) {
  const w = g.winner;
  return (
    <div class="end">
      <h3 class="end-title">{teamName(S, g, w)} gagnent {g.score[w]} à {g.score[1 - w]}</h3>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Donne</th><th>Contrat</th><th>Résultat</th><th>Marque</th></tr></thead>
          <tbody>{g.history.map((h) => (
            <tr key={h.n}><td>{h.n}</td><td>{h.contract.val === 250 ? 'Capot' : h.contract.val} {SUIT_SYM[h.contract.suit]}{h.coinche > 1 ? ` x${h.coinche}` : ''}</td><td>{h.made ? 'réussi' : 'chuté'}</td><td>{h.add[0]} – {h.add[1]}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- actions du joueur

function Act({ S, g, uid, req, send, sent, secret }) {
  const [val, setVal] = useState(null);
  const seat = g.pl.indexOf(uid);
  const hand = secret && secret.hand ? secret.hand : [];
  if (req.kind === 'team') {
    return (
      <div class="act">
        <h3>Avec qui tu joues ?</h3>
        <div class="co-team">
          {g.pl.slice(1).map((u) => (
            <button type="button" key={u} class="btn co-pick" disabled={sent} onClick={() => send(req.k, u)}>
              <Av p={S.roster[u]} size="m" /> {nickOf(S, u)}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (req.kind === 'play') {
    const ok = legal(hand, g.trick, g.contract.suit, seat);
    return (
      <div class="act act-hand">
        <h3>À toi de jouer</h3>
        <div class="co-hand">
          {hand.map((c, i) => <span class="co-slot" key={c} style={{ '--i': i - (hand.length - 1) / 2 }}><PlayingCard c={c} size="m" disabled={sent || !ok.includes(c)} onClick={() => send(req.k, c)} /></span>)}
        </div>
        <p class="hint">Les cartes grisées ne sont pas jouables (il faut fournir, couper ou monter).</p>
      </div>
    );
  }
  if (req.kind === 'bid') {
    const cur = g.contract;
    const canCoinche = cur && g.coinche === 1 && cur.seat % 2 !== seat % 2;
    const canSur = cur && g.coinche === 2 && cur.seat % 2 === seat % 2;
    const options = BIDS.filter((b) => !cur || b > cur.val);
    const v = val && options.includes(val) ? val : options[0];
    return (
      <div class="act">
        <h3>À toi d’annoncer</h3>
        <div class="co-hand is-wait">{hand.map((c, i) => <span class="co-slot" key={c} style={{ '--i': i - (hand.length - 1) / 2 }}><PlayingCard c={c} size="m" /></span>)}</div>
        {g.coinche === 1 && options.length ? (
          <>
            <div class="co-vals" role="group" aria-label="Valeur du contrat">
              {options.map((b) => <button type="button" key={b} class={`key${b === v ? ' is-on' : ''}`} disabled={sent} onClick={() => setVal(b)}>{b === 250 ? 'Capot' : b}</button>)}
            </div>
            <div class="co-suits">
              {SUITS.map((s) => <button type="button" key={s} class="btn btn-big" disabled={sent} onClick={() => send(req.k, { type: 'bid', val: v, suit: s })}><SuitTxt s={s} /> {v === 250 ? 'Capot' : v}</button>)}
            </div>
          </>
        ) : null}
        <div class="bus-btns two">
          <button type="button" class="btn" disabled={sent} onClick={() => send(req.k, { type: 'pass' })}>Passer</button>
          {canCoinche ? <button type="button" class="btn btn-main" disabled={sent} onClick={() => send(req.k, { type: 'coinche' })}>Coincher</button> : null}
          {canSur ? <button type="button" class="btn btn-main" disabled={sent} onClick={() => send(req.k, { type: 'surcoinche' })}>Surcoincher</button> : null}
        </div>
      </div>
    );
  }
  return null;
}

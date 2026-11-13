// Le Président (Trouduc) : jeu de 52 cartes, le 2 est la plus forte, le 3 la plus faible.
// • On pose 1 à 4 cartes de même valeur ; les suivants posent le même nombre de cartes, strictement plus fortes, ou passent.
//   Qui a passé ne revient pas dans le pli. Un 2 ferme le pli : celui qui l'a posé rejoue.
// • Le premier à vider sa main est Président, le dernier Trouduc. Manche suivante : échange automatique des cartes
//   (le Trouduc donne ses 2 meilleures, le Président ses 2 plus faibles ; 1 carte entre vices à partir de 4 joueurs).
// • À boire : le Trouduc boit, le Vice-trouduc boit moitié, le Président distribue.
import { useState } from 'preact/hooks';
import { newDeck, shortName } from '../lib/cards.js';
import { PlayingCard, Who, nickOf, Av, Stamp } from '../ui/common.jsx';
import { plural } from '../lib/util.js';

export const PV = { 3: 0, 4: 1, 5: 2, 6: 3, 7: 4, 8: 5, 9: 6, T: 7, J: 8, Q: 9, K: 10, A: 11, 2: 12 };
const SUIT_O = { C: 0, D: 1, H: 2, S: 3 };
export const pv = (c) => PV[c[0]];
export const sortHand = (h) => h.slice().sort((a, b) => pv(a) - pv(b) || SUIT_O[a[1]] - SUIT_O[b[1]]);

// coup valide ? cards : tableau de cartes de la main ; trick : { n, v } ou null
export function validPlay(hand, cards, trick) {
  if (!Array.isArray(cards) || !cards.length || cards.length > 4) return false;
  if (new Set(cards).size !== cards.length || !cards.every((x) => hand.includes(x))) return false;
  const v = pv(cards[0]);
  if (!cards.every((x) => pv(x) === v)) return false;
  if (!trick) return true;
  return cards.length === trick.n && v > trick.v;
}

// coups possibles (groupes de même valeur), du plus faible au plus fort
export function moves(hand, trick) {
  const by = {};
  for (const c of hand) (by[pv(c)] = by[pv(c)] || []).push(c);
  const out = [];
  for (const v of Object.keys(by).map(Number).sort((a, b) => a - b)) {
    const grp = by[v];
    if (trick) { if (grp.length >= trick.n && v > trick.v) out.push(grp.slice(0, trick.n)); }
    else out.push(grp.slice());
  }
  return out;
}

export function titlesFor(out) {
  const n = out.length;
  const t = {};
  out.forEach((u, i) => { t[u] = 'neutre'; });
  if (n >= 2) { t[out[0]] = 'president'; t[out[n - 1]] = 'trouduc'; }
  if (n >= 4) { t[out[1]] = 'vice'; t[out[n - 2]] = 'vicetrou'; }
  return t;
}
export const TITLE = { president: 'Président', vice: 'Vice-président', neutre: 'Neutre', vicetrou: 'Vice-trouduc', trouduc: 'Trouduc' };

const seatsOf = (c, g) => g.pl.filter((u) => c.roster[u]);
const hands = (c) => c.priv.hands;
const syncSecrets = (c) => { for (const u of c.g.pl) c.setSecret(u, { hand: hands(c)[u] || [] }); };
const counts = (c) => { const g = c.g; for (const u of g.pl) g.cnt[u] = (hands(c)[u] || []).length; };

function deal(c) {
  const g = c.g;
  const pl = seatsOf(c, g);
  g.pl = pl;
  const d = newDeck(1);
  const h = {};
  pl.forEach((u) => { h[u] = []; });
  d.forEach((card, i) => h[pl[i % pl.length]].push(card));
  for (const u of pl) h[u] = sortHand(h[u]);
  c.priv.hands = h;
  g.r += 1;
  g.out = [];
  g.trick = null;
  g.passed = {};
  g.swap = [];
  // échange de cartes selon les titres de la manche précédente
  const t = g.titles || {};
  const find = (title) => pl.find((u) => t[u] === title);
  const give = (from, to, k, best) => {
    if (!from || !to) return;
    const src = sortHand(h[from]);
    const cards = best ? src.slice(-k) : src.slice(0, k);
    h[from] = h[from].filter((x) => !cards.includes(x));
    h[to] = sortHand([...h[to], ...cards]);
    g.swap.push({ from, to, n: k, best, cards: best ? cards : null });
  };
  const P = find('president');
  const T = find('trouduc');
  if (P && T) { give(T, P, 2, true); give(P, T, 2, false); }
  const V = find('vice');
  const VT = find('vicetrou');
  if (V && VT) { give(VT, V, 1, true); give(V, VT, 1, false); }
  // premier joueur : le Trouduc, ou celui qui a le 3 de trèfle
  g.cur = T || pl.find((u) => h[u].includes('3C')) || pl[0];
  g.lead = g.cur;
  g.phase = 'play';
  g.mv += 1;
  counts(c);
  syncSecrets(c);
}

const hasCards = (c, u) => !!c.roster[u] && (hands(c)[u] || []).length > 0;

function nextPlayer(c, from) {
  const g = c.g;
  const pl = g.pl;
  const i = pl.indexOf(from);
  for (let k = 1; k <= pl.length; k++) {
    const u = pl[(i + k) % pl.length];
    if (hasCards(c, u) && !g.passed[u] && c.roster[u]) return u;
  }
  return null;
}

function clearTrick(c, leader) {
  const g = c.g;
  g.trick = null;
  g.passed = {};
  let u = leader;
  if (!hasCards(c, u)) {
    const pl = g.pl;
    const i = pl.indexOf(u);
    u = null;
    for (let k = 1; k <= pl.length; k++) { const x = pl[(i + k) % pl.length]; if (hasCards(c, x)) { u = x; break; } }
  }
  g.cur = u;
  g.lead = u;
}

function checkRoundEnd(c) {
  const g = c.g;
  const left = g.pl.filter((u) => hasCards(c, u));
  if (left.length > 1) return false;
  if (left.length === 1) g.out.push(left[0]);
  endRound(c);
  return true;
}

function endRound(c) {
  const g = c.g;
  g.phase = 'roundEnd';
  g.titles = titlesFor(g.out);
  const n = c.opts.sips || 3;
  for (const u of g.out) {
    const t = g.titles[u];
    g.tally[u] = g.tally[u] || { president: 0, trouduc: 0 };
    if (t === 'trouduc') { c.pen(u, n, 'Président : Trouduc'); g.tally[u].trouduc += 1; if (c.count) c.count(u, 'trouduc'); }
    if (t === 'vicetrou') c.pen(u, Math.ceil(n / 2), 'Président : Vice-trouduc');
    if (t === 'president') { c.gift(u, n, 'Président : il distribue'); g.tally[u].president += 1; }
  }
  g.hist.push(g.out.slice());
  for (const u of g.pl) c.setSecret(u, { hand: [] });
}

function play(c, uid, v) {
  const g = c.g;
  const h = hands(c);
  if (v === 'pass') {
    if (!g.trick) return false;
    g.passed[uid] = true;
    g.last = { u: uid, pass: true };
  } else {
    if (!validPlay(h[uid], v, g.trick)) return false;
    h[uid] = h[uid].filter((x) => !v.includes(x));
    g.trick = { n: v.length, v: pv(v[0]), cards: v.slice(), by: uid };
    g.last = { u: uid, cards: v.slice() };
    if (!h[uid].length) g.out.push(uid);
  }
  g.mv += 1;
  counts(c);
  c.setSecret(uid, { hand: h[uid] });
  if (checkRoundEnd(c)) return true;
  // un 2 ferme le pli : le poseur rejoue (ou le suivant s'il n'a plus de cartes)
  if (g.trick && g.trick.v === PV[2] && v !== 'pass') { clearTrick(c, uid); return true; }
  const nx = nextPlayer(c, uid);
  if (!nx || (g.trick && nx === g.trick.by)) { clearTrick(c, g.trick ? g.trick.by : uid); return true; }
  // tout le monde a passé sauf le dernier poseur, sorti entre-temps
  g.cur = nx;
  return true;
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  for (const u of g.pl) c.setSecret(u, null);
  const rows = g.pl.filter((u) => c.roster[u]).map((u) => ({ u, p: (g.tally[u] || {}).president || 0, t: (g.tally[u] || {}).trouduc || 0 })).sort((a, b) => b.p - a.p || a.t - b.t);
  g.summary = { rounds: g.hist.length, rows };
}

function botMove(hand, trick) {
  const m = moves(hand, trick);
  if (!m.length) return 'pass';
  if (trick && Math.random() < 0.15) return 'pass';
  return trick ? m[0] : m[0];
}

const PRESIDENT = {
  id: 'president',
  name: 'Le Président',
  tagline: 'Le Trouduc, version app : vide ta main le premier, sinon tu bois et tu donnes tes meilleures cartes.',
  min: 3,
  max: 8,
  local: true,
  rules: [
    'Tout le paquet est distribué. Du plus faible au plus fort : 3, 4, … 10, valet, dame, roi, as, et le 2 au-dessus de tout.',
    'Le premier joueur pose 1 à 4 cartes de même valeur. Les suivants posent le même nombre de cartes, plus fortes, ou passent. Qui a passé ne revient pas dans le pli.',
    'Quand tout le monde a passé, le dernier à avoir posé ramasse et relance. Un 2 ferme le pli tout de suite : celui qui l’a posé relance.',
    'Le premier à vider sa main est Président, le dernier Trouduc (à partir de 4 joueurs : Vice-président et Vice-trouduc).',
    'À boire : le Trouduc boit, le Vice-trouduc boit la moitié, le Président distribue.',
    'Manche suivante : le Trouduc donne ses 2 meilleures cartes au Président, qui lui rend ses 2 plus faibles (1 carte entre vices). L’échange est automatique et le Trouduc commence.',
    'Sur un seul téléphone : on passe le téléphone à chaque tour, les autres ne regardent pas la main.',
  ],
  options: [
    { id: 'rounds', label: 'Nombre de manches', choices: [[3, '3'], [5, '5'], [8, '8']], def: 5 },
    { id: 'sips', label: 'Le Trouduc boit', choices: [[2, '2 gorgées'], [3, '3 gorgées'], [5, '5 gorgées']], def: 3 },
  ],

  start(c) {
    const g = { pl: c.activeUids().slice(0, 8), r: 0, max: c.opts.rounds || 5, phase: 'play', cur: null, lead: null, trick: null, passed: {}, out: [], titles: null, cnt: {}, mv: 0, last: null, swap: [], tally: {}, hist: [] };
    c.g = g;
    c.S.game.g = g;
    deal(c);
    return g;
  },

  request({ g, uid }) {
    if (g.phase === 'play' && uid === g.cur) return { k: `p${g.mv}`, kind: 'play', secret: true };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (g.phase !== 'play' || uid !== g.cur || k !== `p${g.mv}`) return false;
    return play(c, uid, v);
  },

  actions({ g, S }) {
    if (g.phase === 'roundEnd') {
      if (g.r >= g.max) return [{ id: 'end', label: 'Classement final', primary: true }];
      return [{ id: 'next', label: 'Manche suivante', primary: true }, { id: 'end', label: 'Arrêter là', confirm: 'Arrêter et voir le classement ?' }];
    }
    if (g.phase === 'play') return [{ id: 'auto', label: `Jouer à la place de ${S && S.roster[g.cur] ? S.roster[g.cur].nick : 'ce joueur'}`, confirm: 'Le téléphone joue le coup le plus faible possible. Continuer ?' }];
    return [];
  },

  act(c, id) {
    const g = c.g;
    if (id === 'next' && g.phase === 'roundEnd') { deal(c); return true; }
    if (id === 'auto' && g.phase === 'play') return play(c, g.cur, botMove(hands(c)[g.cur], g.trick));
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  // le joueur du tour a quitté la soirée : ses cartes sortent du jeu, on passe au suivant
  tick(c) {
    const g = c.g;
    if (g.phase !== 'play' || (g.cur && c.roster[g.cur])) return false;
    g.mv += 1;
    if (checkRoundEnd(c)) return true;
    const by = g.trick && g.trick.by;
    const nx = nextPlayer(c, g.cur);
    if (!nx || nx === by) clearTrick(c, by || nx); else g.cur = nx;
    return true;
  },

  turnOf(g) { return g.phase === 'play' ? g.cur : null; },
  tintOf() { return 'president'; },
  bot({ g, secret, req }) {
    if (req.kind !== 'play' || !secret || !secret.hand) return undefined;
    return botMove(secret.hand, g.trick);
  },

  Table,
  Act,
};
export default PRESIDENT;

// ---------------------------------------------------------------- affichage

function Table({ S, g, uid }) {
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  return (
    <div class="pr">
      <div class="ose-top">
        <span class="chip">Manche {g.r} / {g.max}</span>
        {g.trick ? <span class="chip">Pli : {plural(g.trick.n, 'carte', 'cartes')}</span> : null}
      </div>
      <ul class="pr-seats">
        {g.pl.filter((u) => S.roster[u]).map((u) => (
          <li key={u} class={`pr-seat${u === g.cur && g.phase === 'play' ? ' is-turn' : ''}${g.passed[u] ? ' is-pass' : ''}${!g.cnt[u] ? ' is-out' : ''}`}>
            <Av p={S.roster[u]} size="s" />
            <span class="pr-name">{nickOf(S, u)}</span>
            <span class="pr-n">{g.cnt[u] ? plural(g.cnt[u], 'carte', 'cartes') : g.out.includes(u) ? `${g.out.indexOf(u) + 1}e` : ''}</span>
            {g.titles && g.titles[u] && g.titles[u] !== 'neutre' ? <span class={`pr-title t-${g.titles[u]}`}>{TITLE[g.titles[u]]}</span> : null}
          </li>
        ))}
      </ul>
      <div class="pr-pile">
        {g.trick ? (
          <>
            <div class="pr-cards">{g.trick.cards.map((x) => <PlayingCard key={x} c={x} size="l" />)}</div>
            <p class="muted small center">Posé par {nickOf(S, g.trick.by)}</p>
          </>
        ) : g.phase === 'play' ? <p class="center muted">{nickOf(S, g.cur)} relance : pli vide.</p> : null}
      </div>
      {g.last && g.last.pass && g.phase === 'play' ? <p class="center small muted">{nickOf(S, g.last.u)} passe.</p> : null}
      {g.phase === 'play' && g.swap.length && g.mv <= 2 ? (
        <p class="small muted center">{g.swap.filter((s) => s.best).map((s) => `${nickOf(S, s.from)} donne ${s.cards.map(shortName).join(' ')} à ${nickOf(S, s.to)}`).join(' · ')}</p>
      ) : null}
      {g.phase === 'roundEnd' ? <RoundEnd S={S} g={g} uid={uid} /> : null}
    </div>
  );
}

function RoundEnd({ S, g, uid }) {
  const sips = (S.game && S.game.opts && S.game.opts.sips) || 3;
  const t = g.titles || {};
  return (
    <div class="verdict paper tape">
      <span class="ose-lead">Fin de la manche {g.r}</span>
      <ol class="pr-rank">
        {g.out.map((u) => (
          <li key={u}><Who S={S} uid={u} you={uid} /> <span class={`pr-title t-${t[u]}`}>{TITLE[t[u]]}</span>
            {t[u] === 'trouduc' ? <Stamp>{plural(sips, 'gorgée', 'gorgées')}</Stamp> : null}
            {t[u] === 'vicetrou' ? <Stamp>{plural(Math.ceil(sips / 2), 'gorgée', 'gorgées')}</Stamp> : null}
            {t[u] === 'president' ? <Stamp tone="give">Distribue {sips}</Stamp> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function End({ S, g, uid }) {
  const s = g.summary || { rows: [], rounds: 0 };
  return (
    <div class="end">
      <h3 class="end-title">Classement · {plural(s.rounds, 'manche', 'manches')}</h3>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Joueur</th><th>Président</th><th>Trouduc</th></tr></thead>
        <tbody>{s.rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.p}</td><td>{r.t}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}

function Act({ g, secret, req, send, sent }) {
  const [sel, setSel] = useState([]);
  const hand = (secret && secret.hand) || [];
  if (req.kind !== 'play') return null;
  const ok = validPlay(hand, sel, g.trick);
  const toggle = (x) => setSel((s) => {
    if (s.includes(x)) return s.filter((y) => y !== x);
    const keep = s.filter((y) => pv(y) === pv(x));
    return [...keep, x];
  });
  const go = (v) => { send(req.k, v); setSel([]); };
  return (
    <div class="act">
      <h3>{g.trick ? `Pose ${plural(g.trick.n, 'carte plus forte', 'cartes plus fortes')}, ou passe` : 'Tu relances : 1 à 4 cartes de même valeur'}</h3>
      <div class="pr-hand">
        {hand.map((x) => {
          const playable = g.trick ? hand.filter((y) => pv(y) === pv(x)).length >= g.trick.n && pv(x) > g.trick.v : true;
          return <PlayingCard key={x} c={x} size="m" sel={sel.includes(x)} disabled={sent || !playable} onClick={() => toggle(x)} />;
        })}
      </div>
      <div class="tp-answer">
        <button type="button" class="btn btn-main btn-big" disabled={sent || !ok} onClick={() => go(sel)}>{sel.length ? `Poser ${sel.map(shortName).join(' ')}` : 'Choisis tes cartes'}</button>
        {g.trick ? <button type="button" class="btn btn-big" disabled={sent} onClick={() => go('pass')}>Passer</button> : null}
      </div>
    </div>
  );
}

// Hippodrome — règles validées par Thierry :
// • Les 4 As sont les chevaux. 6 cartes face cachée sur le côté forment les niveaux de la piste.
// • Chaque joueur parie sur un seul cheval, de 1 à 5 gorgées.
// • On retourne les cartes une à une : le cheval de la couleur tirée avance d'une case.
// • Quand tous les chevaux ont dépassé un niveau, on retourne la carte de ce niveau :
//   le cheval de sa couleur recule d'une case.
// • La course ne s'arrête pas au premier arrivé : on continue jusqu'à ce que les 4 chevaux soient classés
//   (précision de Thierry). Parieurs du 1er : distribuent le double de leur mise ; du 2e : distribuent
//   leur mise ; du 3e : boivent leur mise ; du 4e : boivent le double.
// • Pioche épuisée avant la fin : on remélange les cartes déjà tirées (choix technique, sans effet sur l'issue).
// • Un cheval arrivé ne recule plus quand une carte de niveau de sa couleur est retournée.

import { useState } from 'preact/hooks';
import { RANKS, SUITS, SUIT_SYMBOL } from '../lib/cards.js';
import { PlayingCard, Who, nickOf, Waiting, Av, useTicker, Stamp } from '../ui/common.jsx';
import { plural } from '../lib/util.js';

const STEPS = 6;
const RACE_DT = 700; // une carte retournée toutes les 0,7 s (l'hôte peut passer à l'arrivée)
export const HORSES = {
  H: 'Cœur d’Artichaut',
  S: 'Pique-Assiette',
  D: 'Carreau Express',
  C: 'Trèfle à Quatre',
};
const ORDER = ['H', 'S', 'D', 'C'];

// effet du classement : [distribue ou boit, multiplicateur de la mise]
export const PLACE_FX = { 1: ['give', 2], 2: ['give', 1], 3: ['drink', 1], 4: ['drink', 2] };
export const PLACE_LABEL = { 1: '1er', 2: '2e', 3: '3e', 4: '4e' };
const PLACE_FX_TXT = { 1: 'ses parieurs distribuent le double', 2: 'ses parieurs distribuent leur mise', 3: 'ses parieurs boivent leur mise', 4: 'ses parieurs boivent le double' };

// course calculée d'avance par l'hôte, rejouée à l'identique sur chaque téléphone
export function simulateRace(shuffle) {
  let deck = shuffle(SUITS.flatMap((s) => RANKS.filter((r) => r !== 'A').map((r) => r + s)));
  const side = deck.splice(0, STEPS);
  const used = [];
  const pos = { H: 0, S: 0, D: 0, C: 0 };
  const flipped = new Set();
  const ev = [];
  const rank = [];
  const running = (s) => pos[s] <= STEPS;
  while (rank.length < 3 && ev.length < 800) {
    const e = { c: null, mv: [], fl: [] };
    if (!deck.length) { deck = shuffle(used.splice(0)); e.mix = true; }
    const card = deck.shift();
    used.push(card);
    e.c = card;
    const s = card[1];
    if (running(s)) {
      pos[s] += 1;
      e.mv.push([s, 1]);
      if (pos[s] > STEPS) { rank.push(s); e.fin = { s, place: rank.length }; }
    } else e.idle = true; // ce cheval est déjà arrivé
    for (let L = 1; L <= STEPS; L++) {
      if (!flipped.has(L) && Math.min(pos.H, pos.S, pos.D, pos.C) >= L) {
        flipped.add(L);
        const sc = side[L - 1];
        e.fl.push({ L, c: sc });
        if (running(sc[1]) && pos[sc[1]] > 0) { pos[sc[1]] -= 1; e.mv.push([sc[1], -1]); }
      }
    }
    ev.push(e);
  }
  // le dernier cheval encore en course est 4e (sécurité : si la limite était atteinte, on classe par position)
  const rest = ['H', 'S', 'D', 'C'].filter((x) => !rank.includes(x)).sort((a, b) => pos[b] - pos[a]);
  rank.push(...rest);
  return { side, ev, rank, winner: rank[0] };
}

// état de la course après n événements
export function raceAt(race, n) {
  const pos = { H: 0, S: 0, D: 0, C: 0 };
  const flipped = {};
  const arrived = [];
  const k = Math.min(n, race.ev.length);
  for (let i = 0; i < k; i++) {
    for (const [s, d] of race.ev[i].mv) pos[s] += d;
    for (const f of race.ev[i].fl) flipped[f.L] = f.c;
    if (race.ev[i].fin) arrived.push(race.ev[i].fin.s);
  }
  const done = n >= race.ev.length;
  return { pos, flipped, arrived: done ? race.rank.slice() : arrived, last: k > 0 ? race.ev[k - 1] : null, done };
}

function settle(c) {
  const g = c.g;
  const rank = g.race.rank;
  const w = rank[0];
  g.phase = 'result';
  const res = [];
  for (const [u, b] of Object.entries(g.bets)) {
    if (!c.roster[u]) continue;
    const t = g.totals[u] || (g.totals[u] = { won: 0, lost: 0, races: 0 });
    t.races += 1;
    const place = rank.indexOf(b.h) + 1;
    const [kind, mult] = PLACE_FX[place];
    const n = b.n * mult;
    if (kind === 'give') {
      c.gift(u, n, `Hippodrome : ${HORSES[b.h]} ${PLACE_LABEL[place]}`);
      t.won += n;
    } else {
      c.pen(u, n, `Hippodrome : ${HORSES[b.h]} ${PLACE_LABEL[place]}`);
      t.lost += n;
    }
    res.push({ u, h: b.h, place, give: kind === 'give', n, win: kind === 'give' });
  }
  res.sort((a, b) => a.place - b.place);
  g.res = res;
  g.wins[w] = (g.wins[w] || 0) + 1;
  c.ev(`${HORSES[w]} remporte la course.`, '*', 'game');
}

function newRace(c) {
  const g = c.g;
  g.n += 1;
  g.phase = 'bets';
  g.bets = {};
  g.race = null;
  g.res = null;
  for (const u of c.S.order) if (c.roster[u] && c.online(u) && !g.pl.includes(u)) g.pl.push(u);
}

const HIPPODROME = {
  id: 'hippodrome',
  name: 'Hippodrome',
  tagline: 'Quatre As en course. Tu paries des gorgées sur l’un d’eux : le classement décide qui distribue et qui boit.',
  min: 2,
  local: true,
  rules: [
    'Les quatre As sont les chevaux : Cœur d’Artichaut, Pique-Assiette, Carreau Express et Trèfle à Quatre.',
    'Chaque joueur parie sur un seul cheval, de 1 à 5 gorgées.',
    'Les cartes sont retournées une à une : le cheval de la couleur tirée avance d’une case.',
    'Six cartes cachées marquent les niveaux de la piste. Quand tous les chevaux ont dépassé un niveau, sa carte est retournée et le cheval de cette couleur recule d’une case.',
    'La course ne s’arrête pas au premier arrivé : elle continue jusqu’à ce que les quatre chevaux soient classés. Un cheval arrivé ne recule plus.',
    'Cheval 1er : ses parieurs distribuent le double de leur mise. 2e : ils distribuent leur mise. 3e : ils boivent leur mise. 4e : ils boivent le double.',
  ],
  options: [],

  start(c) {
    const g = { n: 0, pl: c.activeUids(), phase: 'bets', bets: {}, race: null, res: null, totals: {}, wins: {} };
    c.g = g;
    c.S.game.g = g;
    newRace(c);
    return g;
  },

  request({ g, uid }) {
    if (g.phase === 'bets' && g.pl.includes(uid) && !g.bets[uid]) return { k: `b${g.n}`, kind: 'bet' };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (g.phase !== 'bets' || k !== `b${g.n}` || !g.pl.includes(uid) || g.bets[uid]) return false;
    if (!v || !SUITS.includes(v.h) || !Number.isInteger(v.n) || v.n < 1 || v.n > 5) return false;
    g.bets[uid] = { h: v.h, n: v.n };
    return true;
  },

  actions({ g }) {
    const n = Object.keys(g.bets).length;
    if (g.phase === 'bets') return [{ id: 'go', label: n ? `Lancer la course (${n} pari${n > 1 ? 's' : ''})` : 'En attente des paris…', disabled: !n, primary: true }];
    if (g.phase === 'race') return [{ id: 'skip', label: 'Voir l’arrivée tout de suite' }];
    if (g.phase === 'result') return [{ id: 'again', label: 'Nouvelle course', primary: true }, { id: 'end', label: 'Terminer', confirm: 'Terminer les courses et voir le rapport ?' }];
    return [];
  },

  act(c, id) {
    const g = c.g;
    if (id === 'go' && g.phase === 'bets' && Object.keys(g.bets).length) {
      const r = simulateRace(c.shuffle);
      g.race = { ...r, t0: c.now() + 2500, dt: RACE_DT };
      g.phase = 'race';
      return true;
    }
    if (id === 'skip' && g.phase === 'race') { settle(c); return true; }
    if (id === 'again' && g.phase === 'result') { newRace(c); return true; }
    if (id === 'end' && g.phase !== 'end') {
      if (g.phase === 'race') settle(c); // une course lancée va jusqu'au bout
      const races = g.phase === 'result' ? g.n : g.n - 1; // une course sans départ ne compte pas
      g.phase = 'end';
      g.summary = { races: Math.max(0, races) };
      return true;
    }
    return false;
  },

  tick(c) {
    const g = c.g;
    if (g.phase === 'race' && c.now() >= g.race.t0 + g.race.dt * g.race.ev.length + 1800) { settle(c); return true; }
    return false;
  },

  bot() {
    return { h: SUITS[Math.floor(Math.random() * 4)], n: 1 + Math.floor(Math.random() * 5) };
  },

  Table,
  Act,
};

export default HIPPODROME;

// ---------------------------------------------------------------- affichage

function Track({ race, clock, bets, S }) {
  const live = race && clock;
  const now = live ? clock() : 0;
  const n = !race ? 0 : now < race.t0 ? 0 : Math.floor((now - race.t0) / race.dt) + 1;
  const st = race ? raceAt(race, n) : { pos: { H: 0, S: 0, D: 0, C: 0 }, flipped: {}, arrived: [], last: null, done: false };
  useTicker(!!race && !st.done, 120);
  const countdown = race && now < race.t0 ? Math.ceil((race.t0 - now) / 1000) : 0;
  let comment = 'Les chevaux sont dans les starting-blocks.';
  if (countdown) comment = `Départ dans ${countdown}…`;
  else if (st.done) comment = `Arrivée : ${race.rank.map((h, i) => `${PLACE_LABEL[i + 1]} ${HORSES[h]}`).join(', ')}.`;
  else if (st.last) {
    const L = st.last;
    const s = L.c[1];
    const parts = [];
    if (L.mix) parts.push('Pioche remélangée.');
    if (L.fin) parts.push(`${HORSES[s]} franchit la ligne : ${PLACE_LABEL[L.fin.place]}.`);
    else if (L.idle) parts.push(`${HORSES[s]} est déjà arrivé.`);
    else parts.push(`${HORSES[s]} avance.`);
    for (const f of L.fl) {
      const back = L.mv.some(([h, d]) => h === f.c[1] && d < 0);
      parts.push(`Niveau ${f.L} retourné : ${HORSES[f.c[1]]} ${back ? 'recule' : 'ne bouge pas'}.`);
    }
    comment = parts.join(' ');
  }
  return (
    <div class="hippo-track paper kraft tape">
      <div class="hippo-levels">
        <span class="hippo-lane-name" />
        {Array.from({ length: STEPS }, (_, i) => (
          <span key={i} class="hippo-level">
            {st.flipped[i + 1] ? <PlayingCard c={st.flipped[i + 1]} size="xs" flip /> : <PlayingCard c="2S" back size="xs" />}
          </span>
        ))}
        <span class="hippo-finish" role="img" aria-label="Arrivée" />
      </div>
      {ORDER.map((s) => (
        <div class={`hippo-lane${st.arrived.includes(s) ? ' is-in' : ''}${race && st.done && race.winner === s ? ' is-win' : ''}`} key={s}>
          <span class={`hippo-lane-name suit-${s}`}>
            <b>{SUIT_SYMBOL[s]}{'\uFE0E'}</b> {HORSES[s]}
            {st.arrived.includes(s) ? <span class="hippo-place">{PLACE_LABEL[st.arrived.indexOf(s) + 1]}</span> : null}
          </span>
          <div class="hippo-run">
            <span class="hippo-horse posee" key={`${s}${st.pos[s]}`} style={{ left: `${(Math.min(st.pos[s], STEPS + 1) / (STEPS + 1)) * 100}%` }}>
              <PlayingCard c={`A${s}`} size="xs" />
            </span>
          </div>
          {bets ? (
            <span class="hippo-bets">
              {Object.entries(bets).filter(([, b]) => b.h === s).map(([u, b]) => <span key={u} class="hippo-bet" title={`${nickOf(S, u)} : ${b.n}`}><Av p={S.roster[u]} size="s" />{b.n}</span>)}
            </span>
          ) : null}
        </div>
      ))}
      {race ? (
        <div class="hippo-now">
          {st.last && !countdown ? <PlayingCard c={st.last.c} size="s" key={n} flip /> : <span class="hippo-count">{countdown || ''}</span>}
          <p class="hippo-comment">{comment}</p>
        </div>
      ) : null}
    </div>
  );
}

function Table({ S, g, uid, clock }) {
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const nb = Object.keys(g.bets).length;
  return (
    <div class="hippo">
      <div class="g96-top"><span class="chip">Course {g.n}</span>{g.phase === 'bets' ? <span class="chip">{nb} / {g.pl.length} paris</span> : null}</div>
      <Track race={g.phase === 'bets' ? null : g.race} clock={clock} bets={g.bets} S={S} />
      {g.phase === 'bets' ? <Waiting>Les paris sont ouverts.</Waiting> : null}
      {g.phase === 'result' && g.res ? (
        <div class="hippo-res paper tape pose">
          <p class="hippo-winner">Arrivée</p>
          <ol class="hippo-podium">
            {g.race.rank.map((h, i) => (
              <li key={h}><span class="hippo-place">{PLACE_LABEL[i + 1]}</span> <b>{HORSES[h]}</b> <span class="muted">{PLACE_FX_TXT[i + 1]}</span></li>
            ))}
          </ol>
          <ul>
            {g.res.map((r) => (
              <li key={r.u} class={r.give ? 'is-win' : 'is-lose'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <span><Who S={S} uid={r.u} you={uid} /> <span class="muted small">{HORSES[r.h]}, {PLACE_LABEL[r.place]}</span></span>
                {r.give ? <span>distribue <span class="count">{r.n}</span></span> : <Stamp size="s">{plural(r.n, 'gorgée', 'gorgées')}</Stamp>}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function End({ S, g, uid }) {
  const rows = Object.entries(g.totals).filter(([u]) => S.roster[u]).sort((a, b) => (b[1].won - b[1].lost) - (a[1].won - a[1].lost));
  return (
    <div class="end">
      <h3 class="end-title">Bilan des courses</h3>
      {Object.keys(g.wins).length ? (
        <p class="center">{ORDER.filter((s) => g.wins[s]).map((s) => `${HORSES[s]} : ${plural(g.wins[s], 'victoire', 'victoires')}`).join(' · ')}</p>
      ) : null}
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Joueur</th><th>Courses</th><th>Distribuées</th><th>Bues</th></tr></thead>
          <tbody>{rows.map(([u, t]) => <tr key={u}><td><Who S={S} uid={u} you={uid} /></td><td>{t.races}</td><td>{t.won}</td><td>{t.lost}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function Act({ req, send, sent }) {
  const [h, setH] = useState(null);
  const [n, setN] = useState(2);
  return (
    <div class="act act-bet">
      <h3>Ton pari</h3>
      <div class="horses">
        {ORDER.map((s) => (
          <button type="button" key={s} class={`horse-btn suit-${s}${h === s ? ' is-on' : ''}`} onClick={() => setH(s)} aria-pressed={h === s ? 'true' : 'false'}>
            <PlayingCard c={`A${s}`} size="xs" />
            <span>{HORSES[s]}</span>
          </button>
        ))}
      </div>
      <div class="field">
        <span class="field-l">Mise</span>
        <div class="seg" role="radiogroup" aria-label="Mise">
          {[1, 2, 3, 4, 5].map((x) => (
            <button type="button" key={x} role="radio" aria-checked={n === x ? 'true' : 'false'} class={`seg-btn${n === x ? ' is-on' : ''}`} onClick={() => setN(x)}>{x}</button>
          ))}
        </div>
      </div>
      <p class="hint">Si ton cheval finit 1er, tu distribues {n * 2} ; 2e, tu distribues {n} ; 3e, tu bois {n} ; 4e, tu bois {n * 2}.</p>
      <button type="button" class="btn btn-main btn-big" disabled={!h || sent} onClick={() => send(req.k, { h, n })}>
        {h ? `Parier ${plural(n, 'gorgée', 'gorgées')} sur ${HORSES[h]}` : 'Choisis un cheval'}
      </button>
    </div>
  );
}

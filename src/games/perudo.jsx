// Le Menteur aux dés (Perudo) : chacun ses dés cachés, on annonce une quantité de faces sur toute la table.
// • Les 1 (la Pinte, dessinée sur le dé) sont des jokers. On peut annoncer des Pintes (moitié arrondie au-dessus ;
//   retour aux faces : double + 1) ; sur une annonce de Pintes, seules les Pintes comptent.
// • Surenchère : plus de dés, ou même nombre sur une face plus haute. Ou « Menteur ! » : on soulève tout.
// • Le perdant du défi boit et perd un dé ; il relance la manche suivante. Plus de dés : il est éliminé (cul sec).
import { useState } from 'preact/hooks';
import { Who, nickOf, Av, Stamp } from '../ui/common.jsx';
import { plural } from '../lib/util.js';

const seatsOf = (c, g) => g.pl.filter((u) => c.roster[u]);
const alive = (c, g) => g.pl.filter((u) => c.roster[u] && g.dice[u] > 0);
export const total = (g) => Object.values(g.dice).reduce((a, b) => a + b, 0);
// quantité minimale pour annoncer la face f après l'annonce prev (règles du Perudo pour les jokers) :
// passer sur les Pintes : au moins la moitié (arrondie au-dessus) ; revenir des Pintes : au moins le double + 1
export function minFor(f, prev) {
  if (!prev) return 1;
  if (f === 1) return prev.f === 1 ? prev.q + 1 : Math.ceil(prev.q / 2);
  if (prev.f === 1) return prev.q * 2 + 1;
  return f > prev.f ? prev.q : prev.q + 1;
}
// on n'ouvre pas une manche sur les Pintes
export const higher = (b, prev) => (!prev ? b.f !== 1 : b.q >= minFor(b.f, prev) && !(b.q === prev.q && b.f === prev.f));
// annonce sur les Pintes : on ne compte que les 1 ; sinon les 1 comptent pour la face annoncée
export const countFace = (all, f) => all.reduce((n, d) => n + (d === f || (f !== 1 && d === 1) ? 1 : 0), 0);

function roll(c) {
  const g = c.g;
  const P = c.priv;
  P.dice = {};
  for (const u of g.pl) {
    const n = g.dice[u] || 0;
    P.dice[u] = Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6)).sort();
    c.setSecret(u, n ? { dice: P.dice[u] } : null);
  }
  g.r += 1;
  g.bid = null;
  g.bids = [];
  g.res = null;
  g.phase = 'bid';
  g.mv += 1;
}

function nextAlive(c, from) {
  const g = c.g;
  const pl = g.pl;
  const i = pl.indexOf(from);
  for (let k = 1; k <= pl.length; k++) { const u = pl[(i + k) % pl.length]; if (c.roster[u] && g.dice[u] > 0) return u; }
  return null;
}

function challenge(c, caller) {
  const g = c.g;
  const all = Object.values(c.priv.dice).flat();
  const n = countFace(all, g.bid.f);
  const bidder = g.bid.by;
  const loser = n >= g.bid.q ? caller : bidder;
  g.dice[loser] -= 1;
  const out = g.dice[loser] <= 0;
  const sips = c.opts.sips || 2;
  if (out) { c.penCS(loser, 'Menteur : plus de dés'); if (c.count) c.count(loser, 'elimine'); }
  else c.pen(loser, sips, n >= g.bid.q ? 'Menteur : accusation ratée' : 'Menteur : pris à mentir');
  g.res = { caller, bidder, n, bid: g.bid, loser, out, dice: { ...c.priv.dice } };
  g.phase = 'reveal';
  g.revAt = c.now();
  for (const u of g.pl) c.setSecret(u, null);
  g.cur = out ? nextAlive(c, loser) : loser;
  if (alive(c, g).length <= 1) g.win = alive(c, g)[0] || null;
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  for (const u of g.pl) c.setSecret(u, null);
  const rows = seatsOf(c, g).map((u) => ({ u, d: g.dice[u] || 0 })).sort((a, b) => b.d - a.d);
  g.summary = { rounds: g.r, rows, win: g.win || (rows[0] && rows[0].u) };
}

// joueur automatique : annonce sur sa face la plus fréquente, accuse quand l'annonce dépasse l'espérance
function botMove(g, dice) {
  const T = total(g);
  const own = (f) => countFace(dice, f);
  const expect = (f) => own(f) + (T - dice.length) / 3;
  if (g.bid && g.bid.q > expect(g.bid.f) + 0.8 + Math.random()) return 'liar';
  let best = 2;
  for (let f = 3; f <= 6; f++) if (own(f) > own(best) || (own(f) === own(best) && f > best)) best = f;
  if (!g.bid) return { q: Math.max(1, Math.round(expect(best) - 1)), f: best };
  const q = best > g.bid.f ? g.bid.q : g.bid.q + 1;
  if (q > T) return 'liar';
  return { q, f: best };
}

const PERUDO = {
  id: 'perudo',
  name: 'Le Menteur aux dés',
  tagline: 'Des dés cachés, des annonces de plus en plus folles, et un « Menteur ! » qui fait tout basculer.',
  min: 2,
  max: 8,
  local: true,
  rules: [
    'Chacun a ses dés, cachés sur son téléphone. On annonce une quantité de dés d’une face sur toute la table, par exemple « six 4 ».',
    'La face 1 est la Pinte (dessinée sur le dé) : c’est un joker, elle compte pour toutes les faces.',
    'On peut annoncer des Pintes (sauf pour ouvrir une manche) : au moins la moitié de l’annonce précédente, arrondie au-dessus (5 × 4 → 3 Pintes). Pour revenir à une face après des Pintes : au moins le double plus un (3 Pintes → 7 × une face). Sur une annonce de Pintes, on ne compte que les Pintes.',
    'À son tour : surenchérir (plus de dés, ou même nombre sur une face plus haute) ou crier « Menteur ! ».',
    'Menteur : on soulève tous les dés. Il y en a au moins autant qu’annoncé ? L’accusateur perd. Sinon, c’est l’annonceur.',
    'Le perdant boit et perd un dé, puis il relance la manche suivante. Plus de dés : cul sec et éliminé. Le dernier avec des dés gagne.',
    'Sur un seul téléphone : on passe le téléphone à chaque tour, les autres ne regardent pas les dés.',
  ],
  options: [
    { id: 'dice', label: 'Dés par joueur', choices: [[3, '3'], [4, '4'], [5, '5']], def: 4 },
    { id: 'sips', label: 'Le perdant du défi boit', choices: [[1, '1 gorgée'], [2, '2 gorgées'], [3, '3 gorgées']], def: 2 },
  ],

  start(c) {
    const pl = c.activeUids().slice(0, 8);
    const g = { pl, dice: Object.fromEntries(pl.map((u) => [u, c.opts.dice || 4])), r: 0, mv: 0, cur: pl[0], bid: null, bids: [], res: null, phase: 'bid', win: null };
    c.g = g;
    c.S.game.g = g;
    roll(c);
    return g;
  },

  request({ g, uid }) {
    if (g.phase === 'bid' && uid === g.cur && g.dice[uid] > 0) return { k: `b${g.mv}`, kind: 'bid', secret: true };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (g.phase !== 'bid' || uid !== g.cur || k !== `b${g.mv}`) return false;
    if (v === 'liar') {
      if (!g.bid) return false;
      challenge(c, uid);
      return true;
    }
    if (!v || typeof v !== 'object') return false;
    const q = Math.floor(Number(v.q));
    const f = Math.floor(Number(v.f));
    if (!(q >= 1 && q <= total(g) && f >= 1 && f <= 6)) return false;
    const b = { q, f, by: uid };
    if (!higher(b, g.bid)) return false;
    g.bid = b;
    g.bids.push(b);
    g.mv += 1;
    g.cur = nextAlive(c, uid);
    return true;
  },

  actions({ g }) {
    if (g.phase === 'reveal') {
      if (g.win !== null && g.win !== undefined) return [{ id: 'end', label: 'Résultat final', primary: true }];
      return [{ id: 'next', label: 'Manche suivante', primary: true }, { id: 'end', label: 'Arrêter là', confirm: 'Arrêter la partie ?' }];
    }
    if (g.phase === 'bid') return [{ id: 'skip', label: 'Passer son tour' }, ...(g.bid ? [{ id: 'liar', label: 'Menteur à sa place', confirm: 'Accuser à la place du joueur du tour ?' }] : [])];
    return [];
  },

  act(c, id) {
    const g = c.g;
    if (id === 'next' && g.phase === 'reveal' && !g.win) { roll(c); return true; }
    if (id === 'liar' && g.phase === 'bid' && g.bid) { challenge(c, g.cur); return true; }
    if (id === 'skip' && g.phase === 'bid') { const nx = nextAlive(c, g.cur); if (!nx || nx === g.cur) return false; g.cur = nx; g.mv += 1; return true; }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  // le joueur du tour a quitté la soirée : on passe au suivant (et la partie s'arrête s'il ne reste qu'un joueur)
  tick(c) {
    const g = c.g;
    if (g.phase !== 'bid' || c.roster[g.cur]) return false;
    if (alive(c, g).length <= 1) { g.win = alive(c, g)[0] || null; finish(c); return true; }
    g.cur = nextAlive(c, g.cur);
    g.mv += 1;
    return true;
  },

  turnOf(g) { return g.phase === 'bid' ? g.cur : null; },
  tintOf() { return 'perudo'; },
  bot({ g, secret, req }) {
    if (req.kind !== 'bid' || !secret || !secret.dice) return undefined;
    return botMove(g, secret.dice);
  },

  Table,
  Act,
};
export default PERUDO;

// ---------------------------------------------------------------- affichage

export function Die({ v, size = 'm', hi = false }) {
  const pips = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }[v] || [];
  return (
    <span class={`die die-${size}${hi ? ' is-hi' : ''}${v === 1 ? ' is-paco' : ''}`} role="img" aria-label={v === 1 ? 'dé : la Pinte (joker)' : `dé ${v}`}>
      {v === 1 ? (
        // la face joker : une petite pinte qui déborde, à la place du 1
        <svg class="die-pinte" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.2 7.4 L7.6 20.6 C7.7 21.5 8.3 22 9.2 22 L14.8 22 C15.7 22 16.3 21.5 16.4 20.6 L17.8 7.4 Z" fill="#E8A22A" stroke="#22201C" stroke-width="1.3" stroke-linejoin="round" />
          <path d="M17.6 10 C20.4 10 21.2 11.4 21 13.4 C20.8 15.6 19.4 16.6 16.9 16.6" fill="none" stroke="#22201C" stroke-width="1.3" stroke-linecap="round" />
          <path d="M5.4 7.8 C4.2 7.6 3.8 6 4.8 5.2 C4.8 3.4 6.8 2.6 8 3.6 C8.8 2 11.4 1.8 12.4 3.2 C13.6 1.8 16.4 2.2 16.8 4 C18.6 3.8 19.6 5.4 18.8 6.8 C19 8.2 17.8 8.8 16.8 8.4 C16.4 9.6 14.8 9.8 14.2 8.8 C13.6 10.2 11.6 10.2 11 9 C10.2 10 8.4 9.8 8.2 8.6 C7.2 9 5.8 8.8 5.4 7.8 Z" fill="#FFFDF6" stroke="#22201C" stroke-width="1.2" stroke-linejoin="round" />
          <path d="M9.8 12.6 L9.8 18.6 M13.6 12.6 L13.6 18.6" stroke="#FFF4D6" stroke-width="1.2" stroke-linecap="round" opacity=".7" />
        </svg>
      ) : Array.from({ length: 9 }).map((_, i) => <i key={i} class={pips.includes(i) ? 'on' : ''} />)}
    </span>
  );
}
const bidTxt = (b) => (b.f === 1 ? `${b.q} Pinte${b.q > 1 ? 's' : ''}` : `${b.q} × ${b.f}`);

function Table({ S, g, uid }) {
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const r = g.res;
  return (
    <div class="pe">
      <div class="ose-top">
        <span class="chip">Manche {g.r}</span>
        <span class="chip">{plural(total(g), 'dé', 'dés')} en jeu</span>
      </div>
      <ul class="pr-seats">
        {g.pl.filter((u) => S.roster[u]).map((u) => (
          <li key={u} class={`pr-seat${u === g.cur && g.phase === 'bid' ? ' is-turn' : ''}${!g.dice[u] ? ' is-out' : ''}`}>
            <Av p={S.roster[u]} size="s" />
            <span class="pr-name">{nickOf(S, u)}</span>
            <span class="pr-n">{g.dice[u] ? plural(g.dice[u], 'dé', 'dés') : 'éliminé'}</span>
          </li>
        ))}
      </ul>
      {g.phase === 'bid' ? (
        <div class="pe-bid paper tape">
          {g.bid ? (
            <>
              <span class="ose-lead">{nickOf(S, g.bid.by)} annonce</span>
              <p class="pe-big">{g.bid.q} <span class="muted">×</span> <Die v={g.bid.f} size="l" /></p>
            </>
          ) : <span class="ose-lead">{nickOf(S, g.cur)} ouvre les enchères</span>}
          {g.bids.length > 1 ? <p class="muted small">Avant : {g.bids.slice(0, -1).slice(-4).map(bidTxt).join(', ')}</p> : null}
        </div>
      ) : null}
      {g.phase === 'reveal' && r ? (
        <div class="verdict paper tape">
          <span class="ose-lead">{nickOf(S, r.caller)} crie « Menteur ! » sur {bidTxt(r.bid)}</span>
          <p class="center">Il y en a <b class="pe-big">{r.n}</b> (avec les Pintes).</p>
          <div class="pe-all">
            {Object.entries(r.dice).filter(([, d]) => d.length).map(([u, d]) => (
              <div key={u} class="pe-row"><span class="pr-name">{nickOf(S, u)}</span>{d.map((v, i) => <Die key={i} v={v} size="s" hi={v === r.bid.f || (r.bid.f !== 1 && v === 1)} />)}</div>
            ))}
          </div>
          <div class="verdict-who"><Who S={S} uid={r.loser} size="l" you={uid} /></div>
          <div class="verdict-line"><Stamp size="l">{r.out ? 'Éliminé, cul sec' : 'Perd un dé et boit'}</Stamp></div>
          {g.win ? <p class="center"><b>{nickOf(S, g.win)}</b> est le dernier avec des dés.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function End({ S, g, uid }) {
  const s = g.summary || { rows: [] };
  return (
    <div class="end">
      <h3 class="end-title">Fin · {plural(s.rounds || 0, 'manche', 'manches')}</h3>
      {s.win ? <div class="awards"><div class="award"><span class="award-t">Menteur en chef</span><span class="award-who"><Who S={S} uid={s.win} you={uid} /></span></div></div> : null}
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Joueur</th><th>Dés restants</th></tr></thead>
        <tbody>{s.rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.d}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}

function Act({ g, secret, req, send, sent }) {
  const T = total(g);
  const min = (f) => minFor(f, g.bid);
  const [f, setF] = useState(g.bid ? g.bid.f : 2);
  const [q, setQ] = useState(min(g.bid ? g.bid.f : 2));
  if (req.kind !== 'bid') return null;
  const dice = (secret && secret.dice) || [];
  const qq = Math.max(q, min(f));
  const ok = qq <= T && higher({ q: qq, f }, g.bid);
  return (
    <div class="act">
      <h3>Tes dés</h3>
      <div class="pe-mine">{dice.map((v, i) => <Die key={i} v={v} size="l" />)}</div>
      <p class="muted small">Les Pintes (la face 1) comptent pour toutes les faces.</p>
      {g.bid ? <p class="muted small">Annoncer des Pintes : au moins la moitié de l’annonce (arrondie au-dessus). Revenir des Pintes à une face : au moins le double plus un.</p> : null}
      <div class={`pe-pick${g.bid ? ' is-six' : ''}`} role="group" aria-label="Face">
        {(g.bid ? [1, 2, 3, 4, 5, 6] : [2, 3, 4, 5, 6]).map((x) => (
          <button type="button" key={x} class={`pe-face${f === x ? ' is-picked' : ''}`} aria-pressed={f === x ? 'true' : 'false'} disabled={sent} onClick={() => setF(x)}><Die v={x} size="m" /></button>
        ))}
      </div>
      <div class="pe-q">
        <button type="button" class="btn" disabled={sent || qq <= min(f)} onClick={() => setQ(qq - 1)} aria-label="Un de moins">−</button>
        <span class="pe-big">{qq}</span>
        <button type="button" class="btn" disabled={sent || qq >= T} onClick={() => setQ(qq + 1)} aria-label="Un de plus">+</button>
      </div>
      <div class="tp-answer">
        <button type="button" class="btn btn-main btn-big" disabled={sent || !ok} onClick={() => send(req.k, { q: qq, f })}>{f === 1 ? `Annoncer ${qq} Pinte${qq > 1 ? 's' : ''}` : `Annoncer ${qq} × ${f}`}</button>
        {g.bid ? <button type="button" class="btn btn-big" disabled={sent} onClick={() => send(req.k, 'liar')}>Menteur !</button> : null}
      </div>
    </div>
  );
}

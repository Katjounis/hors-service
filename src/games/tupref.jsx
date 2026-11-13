// « Tu préfères… » : deux options, chacun vote en secret, la minorité boit.
// • Chacun son téléphone : vote secret puis révélation. Un seul téléphone : tout le monde lève la main,
//   on touche ceux qui ont choisi la première option.
// • Seul contre tous : double peine. Égalité parfaite : tout le monde boit une gorgée.
// • Niveaux Soft, HARD et Cul (paquets adultes, désactivés par défaut).
import { useState } from 'preact/hooks';
import { TP } from '../content/soiree.js';
import { Who, nickOf, Av, Stamp, useTicker } from '../ui/common.jsx';
import { plural } from '../lib/util.js';
import { NIV, pickLevels, drawFrom } from './niveaux.js';

function nextCard(c) {
  const g = c.g;
  for (const u of c.S.order) if (c.roster[u] && (g.local || c.online(u)) && !g.pl.includes(u)) g.pl.push(u);
  const { lv, i } = drawFrom(c, 'deck', 'tp', TP, g.lv);
  const [a, b] = TP[lv][i];
  g.n += 1;
  g.card = { lv, a, b };
  g.ans = {};
  g.res = null;
  g.phase = 'ask';
  c.priv.v = {};
}

function reveal(c, votes) {
  const g = c.g;
  const n = c.opts.sips || 1;
  const pl = g.pl.filter((u) => c.roster[u]);
  const A = pl.filter((u) => votes[u] === 0);
  const B = pl.filter((u) => votes[u] === 1);
  let drink = [];
  let mult = 1;
  let why = 'Tu préfères : minorité';
  if (A.length && B.length) {
    if (A.length === B.length) { drink = [...A, ...B]; mult = 0; why = 'Tu préfères : égalité parfaite'; }
    else drink = A.length < B.length ? A : B;
    if (drink.length === 1 && mult) { mult = 2; why = 'Tu préfères : seul contre tous'; }
  }
  for (const u of drink) {
    c.pen(u, mult ? n * mult : 1, why);
    g.score[u] = (g.score[u] || 0) + 1;
  }
  g.res = { A, B, drink, tie: mult === 0, alone: mult === 2 };
  g.phase = 'reveal';
  g.revAt = c.now();
  g.hist.push({ a: g.card.a, b: g.card.b, A: A.length, B: B.length });
  if (g.hist.length > 40) g.hist.shift();
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  const rows = g.pl.filter((u) => c.roster[u]).map((u) => ({ u, k: g.score[u] || 0 })).sort((a, b) => b.k - a.k);
  g.summary = { cards: g.hist.length, rows };
}

const active = (c, g) => g.pl.filter((u) => c.roster[u] && c.online(u));

const TUPREF = {
  id: 'tupref',
  name: 'Tu préfères…',
  tagline: 'Deux choix pourris, un vote secret, et la minorité boit.',
  min: 3,
  local: true,
  rules: [
    'Une carte propose deux options. Chacun choisit la sienne en secret, sans débattre avant.',
    'Révélation : ceux qui sont dans la minorité boivent. Seul contre tous : double peine.',
    'Égalité parfaite : tout le monde boit une gorgée. Tout le monde d’accord : personne ne boit.',
    'Sur un seul téléphone : à trois, tout le monde lève la main pour la première option, on touche ceux qui l’ont levée.',
    'Niveaux Soft, HARD et Cul à mélanger. HARD et Cul s’activent dans les réglages de la soirée, si toute la table est en « Piquant ».',
  ],
  options: [
    { id: 'levels', label: 'Niveaux (un ou plusieurs)', multi: true, choices: [['soft', 'Soft'], ['hard', 'HARD', 3, 'adult'], ['cul', 'Cul', 3, 'adult']], def: ['soft'] },
    { id: 'sips', label: 'La minorité boit', choices: [[1, '1 gorgée'], [2, '2 gorgées'], [3, '3 gorgées']], def: 2 },
    { id: 'cards', label: 'Nombre de cartes', choices: [[15, '15'], [30, '30'], [0, 'Sans fin']], def: 30 },
  ],

  start(c) {
    const { lv, dropped } = pickLevels(c, c.opts.levels, ['soft', 'hard', 'cul']);
    const g = { pl: c.activeUids(), lv, dropped, local: !!c.isLocal, n: 0, max: c.opts.cards || 0, card: null, ans: {}, res: null, phase: 'ask', score: {}, hist: [] };
    c.g = g;
    c.S.game.g = g;
    nextCard(c);
    return g;
  },

  request({ g, uid, local }) {
    if (local || g.local || g.phase !== 'ask' || !g.pl.includes(uid) || g.ans[uid]) return null;
    return { k: `v${g.n}`, kind: 'vote', secret: true };
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (g.local || g.phase !== 'ask' || k !== `v${g.n}` || !g.pl.includes(uid) || g.ans[uid] || (v !== 0 && v !== 1)) return false;
    c.priv.v[uid] = v;
    g.ans[uid] = true;
    const need = active(c, g);
    if (need.length && need.every((u) => g.ans[u])) reveal(c, c.priv.v);
    return true;
  },

  tick(c) {
    const g = c.g;
    if (g.local || g.phase !== 'ask') return false;
    const need = active(c, g);
    if (Object.keys(g.ans).length >= 2 && need.length && need.every((u) => g.ans[u])) { reveal(c, c.priv.v); return true; }
    return false;
  },

  actions({ g }) {
    if (g.phase === 'ask') {
      const out = [];
      if (!g.local) {
        const n = Object.keys(g.ans || {}).length;
        out.push({ id: 'reveal', label: `Révéler maintenant (${plural(n, 'vote', 'votes')})`, disabled: n < 2 });
      }
      out.push({ id: 'skip', label: 'Passer cette carte' });
      return out;
    }
    if (g.phase === 'reveal') {
      if (g.max && g.n >= g.max) return [{ id: 'end', label: 'Bilan', primary: true }];
      return [{ id: 'next', label: 'Carte suivante', primary: true }, { id: 'end', label: 'Arrêter là', confirm: 'Arrêter la partie et voir le bilan ?' }];
    }
    return [];
  },

  act(c, id, arg) {
    const g = c.g;
    if (id === 'who' && g.local && g.phase === 'ask' && arg && arg.step === g.n && Array.isArray(arg.uids)) {
      const votes = {};
      for (const u of g.pl) if (c.roster[u]) votes[u] = arg.uids.includes(u) ? 0 : 1;
      reveal(c, votes);
      return true;
    }
    if (id === 'reveal' && !g.local && g.phase === 'ask' && Object.keys(g.ans).length >= 2) { reveal(c, c.priv.v); return true; }
    if ((id === 'skip' && g.phase === 'ask') || (id === 'next' && g.phase === 'reveal')) {
      if (g.max && g.n >= g.max) finish(c); else nextCard(c);
      return true;
    }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  turnOf() { return null; },
  tintOf(g) { return `jamais-${(g && g.card && g.card.lv) || 'soft'}`; },
  bot() { return Math.random() < 0.5 ? 0 : 1; },

  Table,
  Act,
};
export default TUPREF;

// ---------------------------------------------------------------- affichage

function Table({ S, g, uid, dev, clock }) {
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const voters = g.pl.filter((u) => S.roster[u]);
  const n = Object.keys(g.ans || {}).length;
  return (
    <div class="tp">
      <div class="ose-top">
        <span class="chip">Carte {g.n}{g.max ? ` / ${g.max}` : ''}</span>
        <span class={`chip lv-${g.card.lv}`}>{NIV[g.card.lv].label}</span>
      </div>
      {g.dropped && g.dropped.length && g.n === 1 ? <p class="muted small">{g.dropped.map((l) => NIV[l].label).join(' et ')} : pas disponible avec les réglages ou les limites de la table.</p> : null}
      <p class="tp-lead">Tu préfères…</p>
      <div class="tp-duel" key={g.n}>
        <Side g={g} S={S} uid={uid} i={0} text={g.card.a} />
        <span class="tp-ou" aria-hidden="true">ou</span>
        <Side g={g} S={S} uid={uid} i={1} text={g.card.b} />
      </div>
      {g.phase === 'ask' && g.local && dev && dev.isHost ? <Pick key={g.n} S={S} g={g} dev={dev} /> : null}
      {g.phase === 'ask' && !g.local ? (
        <>
          <div class="voters" aria-hidden="true">{voters.map((u) => <span key={u} class="voter"><Av p={S.roster[u]} size="s" dim={!g.ans[u]} /></span>)}</div>
          <p class="muted center"><span class="count">{n} / {voters.length}</span> votes</p>
        </>
      ) : null}
      {g.phase === 'reveal' ? <Verdict S={S} g={g} uid={uid} clock={clock} /> : null}
    </div>
  );
}

function Side({ g, S, uid, i, text }) {
  const res = g.phase === 'reveal' ? g.res : null;
  const who = res ? (i === 0 ? res.A : res.B) : [];
  const lose = res && !res.tie && res.drink.length && who.length && who.every((u) => res.drink.includes(u));
  return (
    <div class={`tp-opt paper${i ? ' tp-b' : ' tp-a'}${lose ? ' is-lose' : ''}`}>
      <p class="tp-txt">{text}</p>
      {res ? <div class="tp-who">{who.length ? who.map((u) => <Who key={u} S={S} uid={u} you={uid} />) : <span class="muted small">Personne</span>}</div> : null}
    </div>
  );
}

function Verdict({ S, g, uid, clock }) {
  const wait = Math.max(0, (g.revAt || 0) + 600 - clock());
  useTicker(wait > 0, 150);
  if (wait > 0) return <div class="suspense" role="status">Dépouillement…</div>;
  const r = g.res;
  const sips = (S.game && S.game.opts && S.game.opts.sips) || 1;
  if (!r.drink.length) return <p class="jn-none center">Tout le monde d’accord : personne ne boit.</p>;
  return (
    <div class="verdict paper tape">
      <span class="ose-lead">{r.tie ? 'Égalité parfaite' : r.alone ? 'Seul contre tous' : 'La minorité boit'}</span>
      <div class="verdict-who">{r.drink.map((u) => <Who key={u} S={S} uid={u} size="l" you={uid} />)}</div>
      <div class="verdict-line"><Stamp size="l">{r.tie ? '1 gorgée chacun' : plural(r.alone ? sips * 2 : sips, 'gorgée', 'gorgées')}</Stamp></div>
    </div>
  );
}

function Pick({ S, g, dev }) {
  const [sel, setSel] = useState([]);
  const pl = g.pl.filter((u) => S.roster[u]);
  const toggle = (u) => setSel((s) => (s.includes(u) ? s.filter((x) => x !== u) : [...s, u]));
  return (
    <div class="jn-pick">
      <p class="center">À trois, mains levées pour <b>la première option</b>. Touchez-les :</p>
      <div class="pgrid">
        {pl.map((u) => (
          <button type="button" key={u} class={`pgrid-btn${sel.includes(u) ? ' is-picked' : ''}`} aria-pressed={sel.includes(u) ? 'true' : 'false'} onClick={() => toggle(u)}>
            <Av p={S.roster[u]} size="l" /><span class="pgrid-name">{nickOf(S, u)}</span>
          </button>
        ))}
      </div>
      <button type="button" class="btn btn-main btn-big btn-wide" onClick={() => dev.host('game', { id: 'who', arg: { step: g.n, uids: sel } })}>Valider</button>
    </div>
  );
}

function End({ S, g, uid }) {
  const s = g.summary || { rows: [], cards: 0 };
  return (
    <div class="end">
      <h3 class="end-title">Bilan · {plural(s.cards, 'carte', 'cartes')}</h3>
      {s.rows.length && s.rows[0].k > 0 ? (
        <div class="awards"><div class="award"><span class="award-t">Toujours à contre-courant</span><span class="award-who">{s.rows.filter((r) => r.k === s.rows[0].k).map((r) => <Who key={r.u} S={S} uid={r.u} you={uid} />)}</span></div></div>
      ) : null}
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Joueur</th><th>Fois dans la minorité</th></tr></thead>
        <tbody>{s.rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.k}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}

function Act({ g, req, send, sent }) {
  return (
    <div class="act">
      <h3>Ton choix</h3>
      <p class="muted">Secret jusqu’à la révélation.</p>
      <div class="tp-answer">
        <button type="button" class="btn btn-main btn-big" disabled={sent} onClick={() => send(req.k, 0)}>{g.card.a}</button>
        <button type="button" class="btn btn-big" disabled={sent} onClick={() => send(req.k, 1)}>{g.card.b}</button>
      </div>
    </div>
  );
}

// Paranoïa : une question secrète, une réponse à voix haute (un prénom).
// • Le joueur du tour lit sa question en secret sur son téléphone et désigne quelqu'un.
// • Le désigné peut boire pour connaître la question (elle s'affiche pour tout le monde), ou rester dans le flou.
// • Questions Soft ou Cul (paquet adulte, désactivé par défaut).
import { PARANO } from '../content/soiree.js';
import { Who, nickOf, Av, Stamp, PlayerGrid } from '../ui/common.jsx';
import { plural } from '../lib/util.js';
import { NIV, pickLevels, drawFrom } from './niveaux.js';

const seatsOf = (c, g) => g.pl.filter((u) => c.roster[u]);

function nextTurn(c, first = false) {
  const g = c.g;
  for (const u of c.S.order) if (c.roster[u] && (g.local || c.online(u)) && !g.pl.includes(u)) g.pl.push(u);
  const pl = seatsOf(c, g);
  if (g.cur) c.setSecret(g.cur, null);
  g.cur = first || !pl.includes(g.cur) ? pl[0] : pl[(pl.indexOf(g.cur) + 1) % pl.length];
  const { lv, i } = drawFrom(c, 'deck', 'q', PARANO, g.lv);
  c.priv.q = { lv, t: PARANO[lv][i] };
  c.setSecret(g.cur, { q: c.priv.q.t, lv });
  g.n += 1;
  g.phase = 'ask';
  g.named = null;
  g.q = null;
  g.lvq = lv;
  g.drank = false;
}

function finish(c) {
  const g = c.g;
  if (g.cur) c.setSecret(g.cur, null);
  g.phase = 'end';
  const rows = seatsOf(c, g).map((u) => ({ u, k: g.named_n[u] || 0, b: g.drink_n[u] || 0 })).sort((a, b) => b.k - a.k);
  g.summary = { turns: g.hist.length, rows };
}

const PARANOIA = {
  id: 'paranoia',
  name: 'Paranoïa',
  tagline: 'Une question secrète, un prénom lâché à voix haute. Pour savoir pourquoi c’est toi, il faut boire.',
  min: 3,
  local: true,
  rules: [
    'Chacun son tour, le joueur reçoit une question secrète sur son téléphone, du genre « Qui ici… ».',
    'Il ne la lit pas : il désigne quelqu’un de la table, et tout le monde voit le prénom.',
    'Le désigné choisit : boire pour que la question s’affiche pour tout le monde, ou rester dans le flou.',
    'Sur un seul téléphone : on passe le téléphone au joueur du tour, les autres ne regardent pas.',
    'Questions Soft ou Cul. Le paquet Cul s’active dans les réglages de la soirée, si toute la table est en « Piquant ».',
  ],
  options: [
    { id: 'levels', label: 'Questions (une ou plusieurs)', multi: true, choices: [['soft', 'Soft'], ['cul', 'Cul', 3, 'adult']], def: ['soft'] },
    { id: 'sips', label: 'Pour connaître la question', choices: [[1, '1 gorgée'], [2, '2 gorgées'], ['cs', 'Cul sec']], def: 2 },
    { id: 'turns', label: 'Nombre de tours', choices: [[2, '2 par joueur'], [4, '4 par joueur'], [0, 'Sans fin']], def: 4 },
  ],

  start(c) {
    const { lv, dropped } = pickLevels(c, c.opts.levels, ['soft', 'cul']);
    const g = { pl: c.activeUids(), lv, dropped, local: !!c.isLocal, n: 0, per: c.opts.turns || 0, cur: null, phase: 'ask', named: null, q: null, named_n: {}, drink_n: {}, hist: [] };
    c.g = g;
    c.S.game.g = g;
    nextTurn(c, true);
    return g;
  },

  request({ g, uid, secret }) {
    if (g.phase === 'ask' && uid === g.cur && secret && secret.q) return { k: `p${g.n}`, kind: 'pick', secret: true };
    if (g.phase === 'named' && uid === g.named) return { k: `b${g.n}`, kind: 'drink' };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (g.phase === 'ask' && uid === g.cur && k === `p${g.n}`) {
      if (typeof v !== 'string' || v === uid || !g.pl.includes(v) || !c.roster[v]) return false;
      g.named = v;
      g.named_n[v] = (g.named_n[v] || 0) + 1;
      g.phase = 'named';
      return true;
    }
    if (g.phase === 'named' && uid === g.named && k === `b${g.n}` && typeof v === 'boolean') {
      if (v) {
        const s = c.opts.sips;
        if (s === 'cs') c.penCS(uid, 'Paranoïa : pour connaître la question'); else c.pen(uid, Number(s) || 2, 'Paranoïa : pour connaître la question');
        g.drink_n[uid] = (g.drink_n[uid] || 0) + 1;
        g.q = c.priv.q.t;
      }
      g.drank = v;
      g.phase = 'reveal';
      g.hist.push({ by: g.cur, to: g.named, q: c.priv.q.t, open: v });
      if (g.hist.length > 40) g.hist.shift();
      return true;
    }
    return false;
  },

  actions({ g }) {
    if (g.phase === 'reveal') {
      const done = g.per && g.hist.length >= g.per * g.pl.length;
      if (done) return [{ id: 'end', label: 'Bilan', primary: true }];
      return [{ id: 'next', label: 'Joueur suivant', primary: true }, { id: 'end', label: 'Arrêter là', confirm: 'Arrêter la partie et voir le bilan ?' }];
    }
    if (g.phase === 'ask') return [{ id: 'skip', label: 'Passer ce joueur' }];
    if (g.phase === 'named') return [{ id: 'resolve', label: 'Il reste dans le flou' }];
    return [];
  },

  act(c, id) {
    const g = c.g;
    if ((id === 'next' && g.phase === 'reveal') || (id === 'skip' && g.phase === 'ask')) { nextTurn(c); return true; }
    if (id === 'resolve' && g.phase === 'named') { g.phase = 'reveal'; g.drank = false; g.hist.push({ by: g.cur, to: g.named, q: c.priv.q.t, open: false }); return true; }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  tick(c) {
    const g = c.g;
    if (g.phase === 'ask' && !c.roster[g.cur]) { nextTurn(c); return true; }
    if (g.phase === 'named' && !c.roster[g.named]) { g.phase = 'reveal'; g.drank = false; return true; }
    return false;
  },

  turnOf(g) { return g.phase === 'ask' ? g.cur : g.phase === 'named' ? g.named : null; },
  tintOf(g) { return `jamais-${(g && g.lvq) || 'soft'}`; },
  bot({ g, uid, req }) {
    if (req.kind === 'pick') { const o = g.pl.filter((u) => u !== uid); return o[Math.floor(Math.random() * o.length)]; }
    if (req.kind === 'drink') return Math.random() < 0.5;
    return undefined;
  },

  Table,
  Act,
};
export default PARANOIA;

// ---------------------------------------------------------------- affichage

function Table({ S, g, uid }) {
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  return (
    <div class="pa">
      <div class="ose-top">
        <span class="chip">Tour {g.n}</span>
        <span class={`chip lv-${g.lvq}`}>{NIV[g.lvq] ? NIV[g.lvq].label : ''}</span>
      </div>
      {g.dropped && g.dropped.length && g.n === 1 ? <p class="muted small">{g.dropped.map((l) => NIV[l].label).join(' et ')} : pas disponible avec les réglages ou les limites de la table.</p> : null}
      <div class={`jn-card paper tape pose pa-card${g.q ? '' : ' is-hidden'}`} key={g.n}>
        <span class="jn-badge">Question de {nickOf(S, g.cur)}</span>
        <p class="jn-q">{g.q || (g.phase === 'reveal' ? 'Elle restera secrète.' : 'Question secrète')}</p>
      </div>
      {g.phase === 'ask' ? <p class="av-who"><Av p={S.roster[g.cur]} size="l" /> <span><b>{nickOf(S, g.cur)}</b> lit sa question et désigne quelqu’un…</span></p> : null}
      {g.phase !== 'ask' && g.named ? (
        <div class="verdict paper tape">
          <span class="ose-lead">{nickOf(S, g.cur)} a répondu</span>
          <div class="verdict-who"><Who S={S} uid={g.named} size="l" you={uid} /></div>
          {g.phase === 'named' ? <p class="muted center">Boire pour connaître la question ?</p> : null}
          {g.phase === 'reveal' ? <div class="verdict-line"><Stamp size="l">{g.drank ? 'Il a bu' : 'Mystère'}</Stamp></div> : null}
        </div>
      ) : null}
    </div>
  );
}

function End({ S, g, uid }) {
  const s = g.summary || { rows: [], turns: 0 };
  return (
    <div class="end">
      <h3 class="end-title">Bilan · {plural(s.turns, 'tour', 'tours')}</h3>
      {s.rows.length && s.rows[0].k > 0 ? <div class="awards"><div class="award"><span class="award-t">Le plus désigné</span><span class="award-who"><Who S={S} uid={s.rows[0].u} you={uid} /></span></div></div> : null}
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Joueur</th><th>Désigné</th><th>A bu pour savoir</th></tr></thead>
        <tbody>{s.rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.k}</td><td>{r.b}</td></tr>)}</tbody>
      </table></div>
      {g.hist.length ? (
        <details class="log"><summary>Toutes les questions (même les secrètes)</summary>
          <ol>{g.hist.map((h, i) => <li key={i}>{h.q} <b>{nickOf(S, h.by)} : {nickOf(S, h.to)}</b></li>)}</ol>
        </details>
      ) : null}
    </div>
  );
}

function Act({ S, g, uid, secret, req, send, sent }) {
  const sips = S && S.game && S.game.opts && S.game.opts.sips;
  if (req.kind === 'pick') {
    return (
      <div class="act">
        <h3>Ta question secrète</h3>
        <p class="pa-secret paper">{secret && secret.q}</p>
        <p class="muted">Ne la lis pas à voix haute. Désigne quelqu’un :</p>
        <PlayerGrid S={S} uids={g.pl.filter((u) => u !== uid && S.roster[u])} disabled={sent} onPick={(u) => send(req.k, u)} />
      </div>
    );
  }
  return (
    <div class="act">
      <h3>{nickOf(S, g.cur)} t’a désigné</h3>
      <div class="tp-answer">
        <button type="button" class="btn btn-main btn-big" disabled={sent} onClick={() => send(req.k, true)}>Je bois pour savoir ({sips === 'cs' ? 'cul sec' : plural(Number(sips) || 2, 'gorgée', 'gorgées')})</button>
        <button type="button" class="btn btn-big" disabled={sent} onClick={() => send(req.k, false)}>Je préfère ne pas savoir</button>
      </div>
    </div>
  );
}

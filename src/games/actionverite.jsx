// Action ou vérité : chacun son tour choisit, l'app tire la carte au niveau choisi.
// • Refuser = la sanction réglée (cul sec par défaut). Trois vérités d'affilée interdites : la troisième fois, c'est action.
// • Niveaux Soft, HARD et Cul (paquets adultes, désactivés par défaut). Les actions Cul demandent toujours l'accord de l'autre.
import { AV } from '../content/soiree.js';
import { Who, nickOf, Av, Stamp } from '../ui/common.jsx';
import { plural } from '../lib/util.js';
import { NIV, pickLevels, drawFrom } from './niveaux.js';

const seatsOf = (c, g) => g.pl.filter((u) => c.roster[u]);

function nextTurn(c, first = false) {
  const g = c.g;
  for (const u of c.S.order) if (c.roster[u] && (g.local || c.online(u)) && !g.pl.includes(u)) g.pl.push(u);
  const pl = seatsOf(c, g);
  g.cur = first || !pl.includes(g.cur) ? pl[0] : pl[(pl.indexOf(g.cur) + 1) % pl.length];
  g.n += 1;
  g.phase = 'choose';
  g.pick = null;
  g.card = null;
  g.res = null;
}

function draw(c, pick) {
  const g = c.g;
  const pack = AV[pick];
  const { lv, i } = drawFrom(c, 'deck', pick, pack, g.lv);
  g.pick = pick;
  g.card = { lv, t: pack[lv][i] };
  g.phase = 'do';
  g.streak[g.cur] = pick === 'verite' ? (g.streak[g.cur] || 0) + 1 : 0;
}

function resolve(c, ok) {
  const g = c.g;
  const u = g.cur;
  const st = (g.stats[u] = g.stats[u] || { a: 0, v: 0, r: 0 });
  if (ok) { if (g.pick === 'action') st.a += 1; else st.v += 1; }
  else {
    st.r += 1;
    const pun = c.opts.refus;
    if (pun === 'cs') c.penCS(u, 'Action ou vérité : refus');
    else c.pen(u, Number(pun) || 3, 'Action ou vérité : refus');
    if (c.count) c.count(u, 'refus');
  }
  g.res = ok ? 'ok' : 'refus';
  g.phase = 'result';
  g.hist.push({ u, pick: g.pick, t: g.card.t, ok });
  if (g.hist.length > 40) g.hist.shift();
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  const rows = seatsOf(c, g).map((u) => ({ u, ...(g.stats[u] || { a: 0, v: 0, r: 0 }) })).sort((a, b) => b.a + b.v - (a.a + a.v) || a.r - b.r);
  g.summary = { turns: g.hist.length, rows };
}

const AVG = {
  id: 'actionverite',
  name: 'Action ou vérité',
  tagline: 'Le grand classique, en trois niveaux. Tu refuses ? Cul sec.',
  min: 2,
  local: true,
  rules: [
    'Chacun son tour, dans l’ordre des places, choisit « Action » ou « Vérité ». La carte est tirée au hasard dans les niveaux cochés.',
    'Vérité : on répond franchement, la table juge. Action : on la fait tout de suite.',
    'Refuser, c’est la sanction réglée avant de lancer (cul sec par défaut).',
    'Pas plus de deux vérités d’affilée : la troisième fois, c’est action obligatoire.',
    'Toute action qui implique quelqu’un d’autre demande son accord. Il peut dire non, sans sanction pour personne.',
    'Niveaux Soft, HARD et Cul à mélanger. HARD et Cul s’activent avec l’interrupteur « Version Adulte » du salon, si toute la table est en « Piquant ».',
  ],
  options: [
    { id: 'levels', label: 'Niveaux (un ou plusieurs)', multi: true, choices: [['soft', 'Soft'], ['hard', 'HARD', 3, 'adult'], ['cul', 'Cul', 3, 'adult']], def: ['soft'] },
    { id: 'refus', label: 'Si tu refuses', choices: [['cs', 'Cul sec'], [3, '3 gorgées'], [5, '5 gorgées']], def: 'cs' },
    { id: 'turns', label: 'Nombre de tours', choices: [[2, '2 par joueur'], [4, '4 par joueur'], [0, 'Sans fin']], def: 4 },
  ],

  start(c) {
    const { lv, dropped } = pickLevels(c, c.opts.levels, ['soft', 'hard', 'cul']);
    const g = { pl: c.activeUids(), lv, dropped, local: !!c.isLocal, n: 0, per: c.opts.turns || 0, cur: null, phase: 'choose', pick: null, card: null, res: null, streak: {}, stats: {}, hist: [] };
    c.g = g;
    c.S.game.g = g;
    nextTurn(c, true);
    return g;
  },

  request({ g, uid }) {
    if (uid !== g.cur) return null;
    if (g.phase === 'choose') return { k: `c${g.n}`, kind: 'choose', forced: (g.streak[uid] || 0) >= 2 };
    if (g.phase === 'do') return { k: `d${g.n}`, kind: 'done' };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (uid !== g.cur) return false;
    if (g.phase === 'choose' && k === `c${g.n}` && (v === 'action' || v === 'verite')) {
      draw(c, (g.streak[uid] || 0) >= 2 ? 'action' : v);
      return true;
    }
    if (g.phase === 'do' && k === `d${g.n}` && (v === 'ok' || v === 'refus')) { resolve(c, v === 'ok'); return true; }
    return false;
  },

  actions({ g }) {
    if (g.phase === 'do') return [{ id: 'redraw', label: 'Autre carte (même choix)' }, { id: 'skip', label: 'Passer ce joueur' }];
    if (g.phase === 'result') {
      const done = g.per && g.hist.length >= g.per * g.pl.length;
      if (done) return [{ id: 'end', label: 'Bilan', primary: true }];
      return [{ id: 'next', label: 'Joueur suivant', primary: true }, { id: 'end', label: 'Arrêter là', confirm: 'Arrêter la partie et voir le bilan ?' }];
    }
    if (g.phase === 'choose') return [{ id: 'skip', label: 'Passer ce joueur' }];
    return [];
  },

  act(c, id) {
    const g = c.g;
    if (id === 'redraw' && g.phase === 'do') { g.streak[g.cur] = Math.max(0, (g.streak[g.cur] || 0) - (g.pick === 'verite' ? 1 : 0)); draw(c, g.pick); return true; }
    if ((id === 'next' && g.phase === 'result') || (id === 'skip' && (g.phase === 'choose' || g.phase === 'do'))) { nextTurn(c); return true; }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  tick(c) {
    const g = c.g;
    if ((g.phase === 'choose' || g.phase === 'do') && !c.roster[g.cur]) { nextTurn(c); return true; }
    return false;
  },

  turnOf(g) { return g.phase === 'end' ? null : g.cur; },
  tintOf(g) { return `jamais-${(g && g.card && g.card.lv) || 'soft'}`; },
  bot({ req }) {
    if (req.kind === 'choose') return Math.random() < 0.5 ? 'action' : 'verite';
    if (req.kind === 'done') return Math.random() < 0.8 ? 'ok' : 'refus';
    return undefined;
  },

  Table,
  Act,
};
export default AVG;

// ---------------------------------------------------------------- affichage

const PICK = { action: 'Action', verite: 'Vérité' };

function Table({ S, g, uid }) {
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const pun = S.game && S.game.opts && S.game.opts.refus;
  return (
    <div class="av">
      <div class="ose-top">
        <span class="chip">Tour {g.n}</span>
        {g.lv.length > 1 ? <span class="chip">{g.lv.map((l) => NIV[l].label).join(' + ')}</span> : null}
      </div>
      {g.dropped && g.dropped.length && g.n === 1 ? <p class="muted small">{g.dropped.map((l) => NIV[l].label).join(' et ')} : pas disponible avec les réglages ou les limites de la table.</p> : null}
      <p class="av-who"><Av p={S.roster[g.cur]} size="l" /> <span><b>{nickOf(S, g.cur)}</b>{g.phase === 'choose' ? ' choisit…' : g.pick ? ` a pris ${PICK[g.pick].toLowerCase()}` : ''}</span></p>
      {g.card ? (
        <div class={`jn-card paper tape pose lv-${g.card.lv} av-${g.pick}`} key={`${g.n}-${g.card.t}`}>
          <span class={`jn-badge lv-${g.card.lv}`}>{PICK[g.pick]} · {NIV[g.card.lv].label}</span>
          <p class="jn-q">{g.card.t}</p>
        </div>
      ) : (
        <div class="av-choice" aria-hidden="true"><span class="av-big">Action</span><span class="tp-ou">ou</span><span class="av-big">Vérité</span></div>
      )}
      {g.phase === 'result' ? (
        g.res === 'ok' ? <p class="jn-none center">Validé. Au suivant.</p> : (
          <div class="verdict paper tape">
            <span class="ose-lead">Refus</span>
            <div class="verdict-who"><Who S={S} uid={g.cur} size="l" you={uid} /></div>
            <div class="verdict-line"><Stamp size="l">{pun === 'cs' || pun == null ? 'Cul sec' : plural(pun, 'gorgée', 'gorgées')}</Stamp></div>
          </div>
        )
      ) : null}
    </div>
  );
}

function End({ S, g, uid }) {
  const s = g.summary || { rows: [], turns: 0 };
  const coward = s.rows.filter((r) => r.r > 0).sort((a, b) => b.r - a.r);
  return (
    <div class="end">
      <h3 class="end-title">Bilan · {plural(s.turns, 'tour', 'tours')}</h3>
      {coward.length ? <div class="awards"><div class="award"><span class="award-t">Le plus frileux</span><span class="award-who"><Who S={S} uid={coward[0].u} you={uid} /></span></div></div> : null}
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Joueur</th><th>Actions</th><th>Vérités</th><th>Refus</th></tr></thead>
        <tbody>{s.rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.a}</td><td>{r.v}</td><td>{r.r}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}

function Act({ S, g, req, send, sent }) {
  const pun = S && S.game && S.game.opts && S.game.opts.refus;
  if (req.kind === 'choose') {
    return (
      <div class="act">
        <h3>Action ou vérité ?</h3>
        {req.forced ? <p class="muted">Deux vérités d’affilée : cette fois, c’est action.</p> : null}
        <div class="tp-answer">
          <button type="button" class="btn btn-main btn-big" disabled={sent} onClick={() => send(req.k, 'action')}>Action</button>
          <button type="button" class="btn btn-big" disabled={sent || req.forced} onClick={() => send(req.k, 'verite')}>Vérité</button>
        </div>
      </div>
    );
  }
  return (
    <div class="act">
      <h3>{g.pick === 'action' ? 'Fais-le, la table regarde' : 'Réponds, la table juge'}</h3>
      <div class="tp-answer">
        <button type="button" class="btn btn-main btn-big" disabled={sent} onClick={() => send(req.k, 'ok')}>C’est fait</button>
        <button type="button" class="btn btn-big" disabled={sent} onClick={() => send(req.k, 'refus')}>Je refuse ({pun === 'cs' || pun == null ? 'cul sec' : plural(pun, 'gorgée', 'gorgées')})</button>
      </div>
    </div>
  );
}

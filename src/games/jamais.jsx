// « Je n’ai jamais » : une carte, on boit si c’est vrai pour soi (demande de Thierry).
// • Trois niveaux à cocher seuls ou ensemble, cartes mélangées : Soft, HARD (hors sexe) et Cul.
//   HARD et Cul sont des paquets adultes : désactivés par défaut, et seulement si tout le monde est en « Piquant ».
// • « Je n’ai jamais… » : ceux qui l’ont déjà fait répondent « Moi si ! ». « Je pourrais… » et
//   « Je l’ai déjà fait pour… » : ceux pour qui c’est vrai répondent « Moi aussi ! ». Ils prennent la pénalité.
// • Chacun son téléphone : réponses secrètes jusqu’à la révélation. Un seul téléphone : on touche les avatars.
// • Le lecteur tourne dans l’ordre des places. Le paquet reste chez l’hôte (état public léger, pas de spoiler).
import { useState } from 'preact/hooks';
import { NIVEAUX } from '../content/jamais.js';
import { Who, nickOf, Av, useTicker, Stamp } from '../ui/common.jsx';
import { plural } from '../lib/util.js';

export const LEVELS = ['soft', 'hard', 'cul'];
export function levelAllowed(lv, level, adult = false) {
  const n = NIVEAUX[lv];
  return !!n && n.need <= level && (!n.adult || adult === true);
}
// forme de la carte : « Je n’ai jamais… » ou affirmation (« Je pourrais… », « Je l’ai déjà fait pour… »)
export const forme = (t) => (/^je n[’']ai jamais/i.test(t || '') ? 'jamais' : 'oui');
export const OUI = { jamais: 'Moi si\u00a0!', oui: 'Moi aussi\u00a0!' };
export const NON = { jamais: 'Moi non plus', oui: 'Pas moi' };
const cardText = (k) => { const [lv, i] = String(k).split(':'); return (NIVEAUX[lv] && NIVEAUX[lv].list[Number(i)]) || ''; };

function allowed(c, g) {
  const adult = !!(c.S.cfg && c.S.cfg.adult);
  const ok = g.lv.filter((l) => levelAllowed(l, c.level(), adult));
  return ok.length ? ok : ['soft'];
}
function buildDeck(c, lvls) {
  const all = [];
  for (const l of lvls) NIVEAUX[l].list.forEach((_, i) => all.push(`${l}:${i}`));
  return c.shuffle(all);
}
function active(c, g) {
  return g.pl.filter((u) => c.roster[u] && c.online(u));
}
function ordered(g, list) {
  return g.pl.filter((u) => list.includes(u));
}

function nextCard(c) {
  const g = c.g;
  // les retardataires entrent dans le jeu
  for (const u of c.S.order) if (c.roster[u] && (g.local || c.online(u)) && !g.pl.includes(u)) g.pl.push(u);
  // un niveau désactivé en cours de partie (réglages, limites d’un joueur) n’est plus tiré
  const ok = allowed(c, g);
  const p = c.priv;
  let key = null;
  for (let pass = 0; pass < 2 && !key; pass++) {
    while (p.deck && p.i < p.deck.length) {
      const k = p.deck[p.i++];
      if (ok.includes(k.split(':')[0])) { key = k; break; }
    }
    if (!key) { p.deck = buildDeck(c, ok); p.i = 0; }
  }
  const pl = g.pl.filter((u) => c.roster[u]);
  g.n += 1;
  g.card = { k: key, lv: key.split(':')[0], t: cardText(key) };
  g.reader = !g.reader || !pl.includes(g.reader) ? pl[0] : pl[(pl.indexOf(g.reader) + 1) % pl.length];
  g.ans = {};
  g.yes = null;
  g.phase = 'ask';
  p.yes = {};
}

function reveal(c, list) {
  const g = c.g;
  const n = c.opts.sips || 1;
  g.yes = ordered(g, list).filter((u) => c.roster[u]);
  g.phase = 'reveal';
  g.revAt = c.now();
  for (const u of g.yes) {
    c.pen(u, n, 'Je n’ai jamais');
    g.score[u] = (g.score[u] || 0) + 1;
    if (c.count) c.count(u, 'aveux');
  }
  g.hist.push({ k: g.card.k, yes: g.yes.slice() });
  if (g.hist.length > 40) g.hist.shift();
}
function revealSecret(c) {
  const yes = c.priv.yes || {};
  reveal(c, Object.keys(yes).filter((u) => yes[u] === true));
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  const rows = g.pl.filter((u) => c.roster[u]).map((u) => ({ u, yes: g.score[u] || 0 })).sort((a, b) => b.yes - a.yes);
  g.summary = { cards: g.hist.length, rows };
}

const JAMAIS = {
  id: 'jamais',
  name: 'Je n’ai jamais',
  tagline: 'Une carte, et tous ceux pour qui c’est vrai boivent. Trois niveaux à mélanger : Soft, HARD et Cul.',
  min: 2,
  local: true,
  rules: [
    'Une carte s’affiche et le lecteur du tour la lit à voix haute. La lecture tourne dans l’ordre des places.',
    '« Je n’ai jamais… » : ceux qui l’ont déjà fait répondent « Moi si ! » et prennent la pénalité.',
    '« Je pourrais… » ou « Je l’ai déjà fait pour… » : ceux pour qui c’est vrai répondent « Moi aussi ! » et prennent la pénalité.',
    'Chacun son téléphone : chacun répond en secret, puis les noms s’affichent. Sur un seul téléphone : on touche les avatars de ceux qui ont répondu oui.',
    'Avant de lancer, on coche un ou plusieurs niveaux : Soft, HARD (hors sexe) et Cul. Les cartes des niveaux cochés se mélangent, et chaque carte affiche son niveau.',
    'HARD et Cul sont désactivés par défaut : l’hôte les active avec l’interrupteur « Mode Cul et HARD » du salon, et ils ne s’ouvrent que si tout le monde a réglé ses limites sur « Piquant ».',
    'Qui joue sans alcool prend un gage ou des points à la place. Une carte gênante ? L’hôte peut la passer, et chacun peut toujours passer son tour.',
  ],
  options: [
    { id: 'levels', label: 'Niveaux (un ou plusieurs)', multi: true, choices: [['soft', 'Soft'], ['hard', 'HARD', 3, 'adult'], ['cul', 'Cul', 3, 'adult']], def: ['soft'] },
    { id: 'sips', label: 'Quand c’est vrai pour toi', choices: [[1, '1 gorgée'], [2, '2 gorgées'], [3, '3 gorgées']], def: 1 },
    { id: 'cards', label: 'Nombre de cartes', choices: [[20, '20'], [40, '40'], [0, 'Sans fin']], def: 40 },
  ],

  start(c) {
    const want = Array.isArray(c.opts.levels) ? c.opts.levels.filter((l) => LEVELS.includes(l)) : ['soft'];
    const adult = !!(c.S.cfg && c.S.cfg.adult);
    // un niveau trop osé pour les réglages ou les limites de la table est retiré (Soft reste toujours possible)
    let lv = want.filter((l) => levelAllowed(l, c.level(), adult));
    const dropped = want.filter((l) => !lv.includes(l));
    if (!lv.length) lv = ['soft'];
    const g = { pl: c.activeUids(), lv, dropped, local: !!c.isLocal, n: 0, max: c.opts.cards || 0, card: null, reader: null, ans: {}, yes: null, phase: 'ask', score: {}, hist: [] };
    c.g = g;
    c.S.game.g = g;
    c.priv.deck = buildDeck(c, lv);
    c.priv.i = 0;
    nextCard(c);
    return g;
  },

  // chacun son téléphone : une réponse secrète par carte ; un seul téléphone : rien à passer, on touche les avatars
  request({ g, uid, local }) {
    if (local || g.local || g.phase !== 'ask' || !g.pl.includes(uid) || g.ans[uid]) return null;
    return { k: `a${g.n}`, kind: 'answer', secret: true };
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (g.local || g.phase !== 'ask' || k !== `a${g.n}` || !g.pl.includes(uid) || g.ans[uid] || typeof v !== 'boolean') return false;
    c.priv.yes = c.priv.yes || {};
    c.priv.yes[uid] = v;
    g.ans[uid] = true;
    const need = active(c, g);
    if (need.length && need.every((u) => g.ans[u])) revealSecret(c);
    return true;
  },

  actions({ g }) {
    if (g.phase === 'ask') {
      const out = [];
      if (!g.local) {
        const n = Object.keys(g.ans || {}).length;
        out.push({ id: 'reveal', label: n ? `Révéler maintenant (${plural(n, 'réponse', 'réponses')})` : 'Révéler (au moins 1 réponse)', disabled: n < 1 });
      }
      out.push({ id: 'skip', label: 'Passer cette carte' });
      return out;
    }
    if (g.phase === 'reveal') {
      if (g.max && g.n >= g.max) return [{ id: 'end', label: 'Rapport d’incident', primary: true }];
      return [{ id: 'next', label: 'Carte suivante', primary: true }, { id: 'end', label: 'Arrêter là', confirm: 'Arrêter la partie et voir le rapport ?' }];
    }
    return [];
  },

  act(c, id, arg) {
    const g = c.g;
    if (id === 'who' && g.local && g.phase === 'ask' && arg && arg.step === g.n && Array.isArray(arg.uids)) { reveal(c, arg.uids); return true; }
    if (id === 'reveal' && !g.local && g.phase === 'ask' && Object.keys(g.ans).length >= 1) { revealSecret(c); return true; }
    if ((id === 'skip' && g.phase === 'ask') || (id === 'next' && g.phase === 'reveal')) {
      if (g.max && g.n >= g.max) finish(c); else nextCard(c);
      return true;
    }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  // un joueur s’est déconnecté pendant la carte : on révèle dès que tous les présents ont répondu
  tick(c) {
    const g = c.g;
    if (g.local || g.phase !== 'ask') return false;
    const need = active(c, g);
    if (Object.keys(g.ans).length >= 1 && need.length && need.every((u) => g.ans[u])) { revealSecret(c); return true; }
    return false;
  },

  turnOf(g) { return g.phase === 'end' ? null : g.reader; },
  // tout le monde répond : le joueur affiché est seulement celui qui lit la carte à voix haute
  turnText() { return { label: 'Lit la carte', meSmall: 'Lecteur', meLabel: 'Tu lis la carte' }; },
  // teinte du décor : celle du niveau de la carte en cours
  tintOf(g) { return `jamais-${(g && g.card && g.card.lv) || 'soft'}`; },

  // joueur automatique (démo) : avoue une fois sur trois
  bot() { return Math.random() < 0.35; },

  Table,
  Act,
};
export default JAMAIS;

// ---------------------------------------------------------------- affichage

function Table({ S, g, uid, dev, clock }) {
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const lvl = NIVEAUX[g.card.lv];
  const n = Object.keys(g.ans || {}).length;
  const voters = g.pl.filter((u) => S.roster[u]);
  return (
    <div class="jn">
      <div class="ose-top">
        <span class="chip">Carte {g.n}{g.max ? ` / ${g.max}` : ''}</span>
        {g.lv.length > 1 ? <span class="chip">{g.lv.map((l) => NIVEAUX[l].label).join(' + ')}</span> : null}
      </div>
      {g.dropped && g.dropped.length && g.n === 1 ? (
        <p class="muted small">{g.dropped.map((l) => NIVEAUX[l].label).join(' et ')} : pas disponible avec les réglages ou les limites de la table.</p>
      ) : null}
      <div class={`jn-card paper tape pose lv-${g.card.lv}`} key={g.n}>
        <span class={`jn-badge lv-${g.card.lv}`}>{lvl ? lvl.label : ''}</span>
        <p class="jn-q">{g.card.t}</p>
      </div>
      {g.phase === 'ask' && g.local && dev && dev.isHost ? <Pick key={g.n} S={S} g={g} dev={dev} /> : null}
      {g.phase === 'ask' && !g.local ? (
        <>
          <div class="voters" aria-hidden="true">
            {voters.map((u) => <span key={u} class="voter" title={nickOf(S, u)}><Av p={S.roster[u]} size="s" dim={!g.ans[u]} /></span>)}
          </div>
          <p class="muted center"><span class="count">{n} / {voters.length}</span> réponses</p>
        </>
      ) : null}
      {g.phase === 'reveal' && g.yes ? <Reveal S={S} g={g} uid={uid} clock={clock} /> : null}
    </div>
  );
}

// un seul téléphone : on touche ceux qui ont répondu oui, puis on valide
function Pick({ S, g, dev }) {
  const [sel, setSel] = useState([]);
  const f = forme(g.card.t);
  const pl = g.pl.filter((u) => S.roster[u]);
  const toggle = (u) => setSel((s) => (s.includes(u) ? s.filter((x) => x !== u) : [...s, u]));
  return (
    <div class="jn-pick">
      <p class="center">Touchez ceux qui disent <b>{`«\u00a0${OUI[f]}\u00a0»`}</b></p>
      <div class="pgrid">
        {pl.map((u) => (
          <button type="button" key={u} class={`pgrid-btn${sel.includes(u) ? ' is-picked' : ''}`} aria-pressed={sel.includes(u) ? 'true' : 'false'} onClick={() => toggle(u)}>
            <Av p={S.roster[u]} size="l" />
            <span class="pgrid-name">{nickOf(S, u)}</span>
          </button>
        ))}
      </div>
      <button type="button" class="btn btn-main btn-big btn-wide" onClick={() => dev.host('game', { id: 'who', arg: { step: g.n, uids: sel } })}>
        {sel.length ? `Valider (${sel.length})` : 'Personne'}
      </button>
    </div>
  );
}

function Reveal({ S, g, uid, clock }) {
  const wait = Math.max(0, (g.revAt || 0) + 700 - clock());
  useTicker(wait > 0, 150);
  if (wait > 0) return <div class="suspense" role="status">Aveux…</div>;
  const f = forme(g.card.t);
  const sips = (S.game && S.game.opts && S.game.opts.sips) || 1;
  if (!g.yes.length) return <p class="jn-none center">Personne ! Que des anges à cette table.</p>;
  return (
    <div class="verdict paper tape">
      <span class="ose-lead">{OUI[f]}</span>
      <div class="verdict-who">{g.yes.map((u) => <Who key={u} S={S} uid={u} size="l" you={uid} />)}</div>
      <div class="verdict-line">
        <span class="verdict-n">{plural(g.yes.length, 'aveu', 'aveux')}</span>
        <Stamp size="l">{plural(sips, 'gorgée', 'gorgées')}{g.yes.length > 1 ? ' chacun' : ''}</Stamp>
      </div>
    </div>
  );
}

function End({ S, g, uid }) {
  const s = g.summary || { rows: [], cards: 0 };
  const top = s.rows.length && s.rows[0].yes > 0 ? s.rows.filter((r) => r.yes === s.rows[0].yes) : [];
  const low = s.rows.length ? s.rows.filter((r) => r.yes === s.rows[s.rows.length - 1].yes) : [];
  return (
    <div class="end">
      <h3 class="end-title">Bilan des aveux · {plural(s.cards, 'carte', 'cartes')}</h3>
      {top.length ? (
        <div class="awards">
          <div class="award"><span class="award-t">Livre ouvert</span><span class="award-who">{top.map((r) => <Who key={r.u} S={S} uid={r.u} you={uid} />)}</span></div>
          {low.length && low[0].yes < top[0].yes ? <div class="award"><span class="award-t">Le plus sage</span><span class="award-who">{low.map((r) => <Who key={r.u} S={S} uid={r.u} you={uid} />)}</span></div> : null}
        </div>
      ) : null}
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Joueur</th><th>Aveux</th></tr></thead>
          <tbody>{s.rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.yes}</td></tr>)}</tbody>
        </table>
      </div>
      {g.hist.length ? (
        <details class="log">
          <summary>Les cartes jouées</summary>
          <ol>{g.hist.map((h, i) => <li key={i}>{cardText(h.k)} <b>{h.yes.length ? h.yes.map((u) => nickOf(S, u)).join(', ') : 'Personne'}</b></li>)}</ol>
        </details>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- réponse du joueur (chacun son téléphone)

function Act({ g, req, send, sent }) {
  const f = forme(g.card && g.card.t);
  return (
    <div class="act">
      <h3>Ta réponse</h3>
      <p class="muted">Secrète jusqu’à la révélation.</p>
      <div class="jn-answer">
        <button type="button" class="btn btn-main btn-big" disabled={sent} onClick={() => send(req.k, true)}>{OUI[f]}</button>
        <button type="button" class="btn btn-big" disabled={sent} onClick={() => send(req.k, false)}>{NON[f]}</button>
      </div>
    </div>
  );
}

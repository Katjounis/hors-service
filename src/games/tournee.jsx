// La Tournée : des consignes qui s'enchaînent, avec les prénoms de la table, des règles qui durent
// quelques cartes, des duels et des votes à main levée. Tout se joue à voix haute, sur un seul écran.
import { TOURNEE } from '../content/tournee.js';
import { Av } from '../ui/common.jsx';
import { plural } from '../lib/util.js';
import { NIV, pickLevels, drawFrom } from './niveaux.js';

const LIFE = [3, 5]; // une règle dure entre 3 et 5 cartes
const fill = (t, a, b) => t.split('{0}').join(a).split('{1}').join(b);

function draw(c) {
  const g = c.g;
  const pl = g.pl.filter((u) => c.roster[u]);
  g.n += 1;
  // une règle arrivée à échéance passe d'abord
  const done = g.rules.find((r) => r.until <= g.n);
  if (done) {
    g.rules = g.rules.filter((r) => r !== done);
    g.card = { type: 'fin', txt: done.end, who: done.who };
    return;
  }
  const { lv, i } = drawFrom(c, 'deck', 'tournee', TOURNEE, g.lv);
  const [type, txt, end] = TOURNEE[lv][i];
  const [a, b] = c.shuffle(pl.slice());
  const na = c.name(a); const nb = c.name(b || a);
  const card = { type, lv, txt: fill(txt, na, nb), who: [a, b].filter(Boolean).filter((u, j) => txt.includes(`{${j}}`)) };
  if (type === 'regle') {
    const until = g.n + LIFE[0] + Math.floor(Math.random() * (LIFE[1] - LIFE[0] + 1));
    g.rules.push({ txt: card.txt, end: fill(end, na, nb), until, who: card.who });
    if (g.rules.length > 3) g.rules.shift();
  }
  g.card = card;
}

const TOURNEE_GAME = {
  id: 'tournee',
  name: 'La Tournée',
  tagline: 'Des consignes en rafale avec vos prénoms. Des règles qui collent, des duels, des votes.',
  min: 3,
  local: true,
  rules: [
    'Une consigne s’affiche, quelqu’un la lit à voix haute et la table l’applique. Carte suivante.',
    'Certaines visent un ou deux joueurs par leur prénom, d’autres toute la table.',
    'Les « nouvelles règles » restent affichées quelques cartes, puis une carte annonce leur fin.',
    'Les votes se font à main levée : à trois, tout le monde pointe quelqu’un.',
    'Tout se règle en vrai, l’appli ne compte pas les gorgées de ce jeu.',
  ],
  options: [
    { id: 'levels', label: 'Niveaux (un ou plusieurs)', multi: true, choices: [['soft', 'Soft'], ['hard', 'HARD', 3, 'adult']], def: ['soft'] },
    { id: 'cards', label: 'Nombre de cartes', choices: [[25, '25'], [40, '40'], [0, 'Sans fin']], def: 40 },
  ],

  start(c) {
    const { lv, dropped } = pickLevels(c, c.opts.levels, ['soft', 'hard']);
    const g = { pl: c.activeUids(), lv, dropped, n: 0, max: c.opts.cards || 0, rules: [], card: null, phase: 'card' };
    c.g = g;
    c.S.game.g = g;
    draw(c);
    return g;
  },

  request() { return null; },
  input() { return false; },
  tick() { return false; },

  actions({ g }) {
    if (g.phase !== 'card') return [];
    if (g.max && g.n >= g.max) return [{ id: 'end', label: 'Fin de la tournée', primary: true }];
    return [{ id: 'next', label: 'Carte suivante', primary: true }, { id: 'end', label: 'Arrêter là', confirm: 'Arrêter la tournée ?' }];
  },

  act(c, id) {
    const g = c.g;
    if (id === 'next' && g.phase === 'card') { draw(c); return true; }
    if (id === 'end' && g.phase !== 'end') { g.phase = 'end'; g.summary = { cards: g.n }; return true; }
    return false;
  },

  turnOf() { return null; },
  tintOf(g) { return g && g.card && g.card.lv === 'hard' ? 'jamais-hard' : 'tournee'; },
  bot() { return undefined; },

  Table,
  Act: () => null,
};
export default TOURNEE_GAME;

const LABEL = { tous: 'Toute la table', cible: 'Pour toi', duo: 'Duel', vote: 'Vote à main levée', regle: 'Nouvelle règle', fin: 'Fin de règle' };

function Table({ S, g }) {
  if (g.phase === 'end') {
    return (
      <div class="end">
        <h3 class="end-title">{`Tournée terminée · ${plural((g.summary && g.summary.cards) || g.n, 'carte', 'cartes')}`}</h3>
        <p class="muted center">Les règles en cours tombent toutes. Un verre d’eau ne ferait pas de mal.</p>
      </div>
    );
  }
  const k = g.card;
  return (
    <div class="tn">
      <div class="ose-top">
        <span class="chip">{`Carte ${g.n}${g.max ? ` / ${g.max}` : ''}`}</span>
        <span class={`chip${k.lv ? ` lv-${k.lv}` : ''}`}>{LABEL[k.type] || ''}{k.lv === 'hard' ? ` · ${NIV.hard.label}` : ''}</span>
      </div>
      {g.dropped && g.dropped.length && g.n === 1 ? <p class="muted small">{g.dropped.map((l) => NIV[l].label).join(' et ')} : pas disponible avec les réglages de la table.</p> : null}
      <div class={`tn-card paper is-${k.type}`} key={g.n}>
        {k.who && k.who.length ? <div class="tn-who" aria-hidden="true">{k.who.filter((u) => S.roster[u]).map((u) => <Av key={u} p={S.roster[u]} size="m" />)}</div> : null}
        <p class="tn-txt">{k.txt}</p>
      </div>
      {g.rules.length ? (
        <div class="tn-rules">
          <span class="tn-rules-t">Règles en cours</span>
          <ul>{g.rules.map((r, i) => <li key={i}>{r.txt}</li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}

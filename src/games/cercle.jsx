// Le Cercle de feu (King's Cup) : 52 cartes en cercle autour du verre du centre, chacun tire à son tour.
// Chaque valeur a sa règle. Les mini-jeux (sol, valise, rimes…) se jouent à voix haute : le tireur désigne le perdant.
// Le compagnon boit à chaque fois que son binôme boit. Quatrième roi : cul sec du verre du centre, fin de la partie.
import { newDeck } from '../lib/cards.js';
import { PlayingCard, Who, nickOf, Av, Stamp, PlayerGrid } from '../ui/common.jsx';
import { plural } from '../lib/util.js';

export const RULES = {
  A: { t: 'Cascade', d: 'Tout le monde boit en même temps. Le tireur commence, chacun ne s’arrête que quand son voisin de droite s’arrête.', fx: 'all', n: 2 },
  2: { t: 'Tu donnes', d: 'Le tireur distribue 2 gorgées.', fx: 'gift', n: 2 },
  3: { t: 'Tu bois', d: 'Le tireur boit 3 gorgées.', fx: 'self', n: 3 },
  4: { t: 'Le sol', d: 'Tout le monde touche le sol. Le dernier boit.', fx: 'loser', n: 2 },
  5: { t: 'Les mains en l’air', d: 'Tout le monde lève les mains. Le dernier boit.', fx: 'loser', n: 2 },
  6: { t: 'Dans ma valise', d: 'Le tireur commence : « dans ma valise je mets… ». Chacun répète tout et ajoute un objet. Le premier qui se trompe boit.', fx: 'loser', n: 3 },
  7: { t: 'Boum', d: 'On compte à tour de rôle. Multiple de 7 ou nombre avec un 7 : on dit « boum ». Le premier qui se trompe boit.', fx: 'loser', n: 3 },
  8: { t: 'Compagnon', d: 'Le tireur choisit un compagnon : jusqu’à la fin, quand l’un boit, l’autre boit aussi.', fx: 'mate' },
  9: { t: 'Rimes', d: 'Le tireur dit un mot, chacun trouve une rime. Le premier qui sèche boit.', fx: 'loser', n: 2 },
  T: { t: 'Catégorie', d: 'Le tireur choisit un thème (marques de bière, joueurs du XV de France…). Chacun cite un mot. Le premier qui sèche boit.', fx: 'loser', n: 2 },
  J: { t: 'La règle', d: 'Le tireur invente une règle pour le reste de la partie (interdit de dire « boire », de pointer du doigt…). Qui l’oublie boit.', fx: 'rule' },
  Q: { t: 'Maître des questions', d: 'Jusqu’à la prochaine dame, quiconque répond à une question du tireur boit 1 gorgée.', fx: 'queen' },
  K: { t: 'Le roi', d: 'Le tireur verse un peu de son verre dans le verre du centre. Au quatrième roi : il boit le verre du centre, cul sec.', fx: 'king' },
};

const seatsOf = (c, g) => g.pl.filter((u) => c.roster[u]);

// boire, et faire boire le compagnon (un seul niveau, pas de boucle)
function drink(c, u, n, why) {
  const g = c.g;
  c.pen(u, n, why);
  const m = g.mates[u];
  if (m && c.roster[m]) c.pen(m, n, `compagnon de ${nickOf2(c, u)}`);
}
const nickOf2 = (c, u) => (c.roster[u] ? c.roster[u].nick : 'quelqu’un');

function nextTurn(c, first = false) {
  const g = c.g;
  for (const u of c.S.order) if (c.roster[u] && (g.local || c.online(u)) && !g.pl.includes(u)) g.pl.push(u);
  const pl = seatsOf(c, g);
  g.cur = first || !pl.includes(g.cur) ? pl[0] : pl[(pl.indexOf(g.cur) + 1) % pl.length];
  g.phase = 'draw';
  g.n += 1;
}

function drawCard(c) {
  const g = c.g;
  const card = c.priv.deck.pop();
  g.left = c.priv.deck.length;
  g.card = card;
  g.by = g.cur;
  g.loser = null;
  const r = RULES[card[0]];
  g.fx = r.fx;
  g.log.push({ u: g.cur, c: card });
  if (g.log.length > 60) g.log.shift();
  const u = g.cur;
  if (r.fx === 'all') { for (const x of seatsOf(c, g)) c.pen(x, r.n, 'Cercle de feu : cascade'); return after(c); }
  if (r.fx === 'gift') { c.gift(u, r.n, 'Cercle de feu : tu donnes'); return after(c); }
  if (r.fx === 'self') { drink(c, u, r.n, 'Cercle de feu : tu bois'); return after(c); }
  if (r.fx === 'rule') { g.rules.push(u); return after(c); }
  if (r.fx === 'queen') { g.queen = u; return after(c); }
  if (r.fx === 'king') {
    g.kings += 1;
    if (g.kings >= 4) {
      c.penCS(u, 'Cercle de feu : quatrième roi, le verre du centre');
      if (c.count) c.count(u, 'roi');
      g.lastKing = u;
      return finish(c);
    }
    return after(c);
  }
  g.phase = r.fx; // 'loser' ou 'mate' : le tireur désigne
}

function after(c) {
  const g = c.g;
  if (!c.priv.deck.length) return finish(c);
  nextTurn(c);
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  g.summary = { cards: g.log.length, kings: g.kings, lastKing: g.lastKing || null, mates: Object.entries(g.mates) };
}

const CERCLE = {
  id: 'cercle',
  name: 'Le Cercle de feu',
  tagline: '52 cartes autour du verre du centre. Chaque carte a sa règle, et le quatrième roi boit tout.',
  min: 3,
  local: true,
  rules: [
    'Les cartes sont étalées en cercle autour d’un verre vide au centre. Chacun son tour, on tire une carte.',
    'As : cascade. 2 : tu donnes 2. 3 : tu bois 3. 4 : le sol. 5 : les mains en l’air. 6 : dans ma valise. 7 : boum.',
    '8 : compagnon (il boit avec toi jusqu’à la fin). 9 : rimes. 10 : catégorie. Valet : tu inventes une règle. Dame : maître des questions.',
    'Roi : tu verses un peu de ton verre dans celui du centre. Le quatrième roi boit le verre du centre, cul sec, et la partie s’arrête.',
    'Pour les mini-jeux à voix haute, le tireur désigne le perdant sur l’app, qui boit (et son compagnon avec lui).',
  ],
  options: [],

  start(c) {
    const g = { pl: c.activeUids(), local: !!c.isLocal, n: 0, cur: null, phase: 'draw', card: null, by: null, fx: null, left: 52, kings: 0, mates: {}, queen: null, rules: [], log: [], loser: null };
    c.g = g;
    c.S.game.g = g;
    c.priv.deck = newDeck(1);
    nextTurn(c, true);
    return g;
  },

  request({ g, uid }) {
    if (uid !== g.cur) return null;
    if (g.phase === 'draw') return { k: `t${g.n}`, kind: 'draw' };
    if (g.phase === 'loser') return { k: `l${g.n}`, kind: 'loser' };
    if (g.phase === 'mate') return { k: `m${g.n}`, kind: 'mate' };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (uid !== g.cur) return false;
    if (g.phase === 'draw' && k === `t${g.n}`) { drawCard(c); return true; }
    if (g.phase === 'loser' && k === `l${g.n}`) {
      if (v !== null && (typeof v !== 'string' || !g.pl.includes(v) || !c.roster[v])) return false;
      g.loser = v;
      if (v) drink(c, v, RULES[g.card[0]].n || 2, `Cercle de feu : ${RULES[g.card[0]].t.toLowerCase()}`);
      after(c);
      return true;
    }
    if (g.phase === 'mate' && k === `m${g.n}`) {
      if (typeof v !== 'string' || v === uid || !g.pl.includes(v) || !c.roster[v]) return false;
      for (const x of [uid, v]) { const old = g.mates[x]; if (old && g.mates[old] === x) delete g.mates[old]; }
      g.mates[uid] = v;
      g.mates[v] = uid;
      after(c);
      return true;
    }
    return false;
  },

  actions({ g }) {
    if (g.phase === 'loser') return [{ id: 'skip', label: 'Personne ne boit' }];
    if (g.phase === 'mate') return [{ id: 'skip', label: 'Passer' }];
    if (g.phase === 'draw') return [{ id: 'skip', label: 'Passer ce joueur' }, { id: 'end', label: 'Arrêter là', confirm: 'Arrêter la partie ?' }];
    return [];
  },

  act(c, id) {
    const g = c.g;
    if (id === 'skip' && (g.phase === 'loser' || g.phase === 'mate' || g.phase === 'draw')) { if (g.phase === 'draw') nextTurn(c); else after(c); return true; }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  tick(c) {
    const g = c.g;
    if (g.phase === 'end' || c.roster[g.cur]) return false;
    if (g.phase === 'draw') nextTurn(c); else after(c);
    return true;
  },

  turnOf(g) { return g.phase === 'end' ? null : g.cur; },
  tintOf() { return 'cercle'; },
  bot({ g, uid, req }) {
    const o = g.pl.filter((u) => u !== uid);
    const any = o[Math.floor(Math.random() * o.length)];
    if (req.kind === 'draw') return true;
    if (req.kind === 'loser') return Math.random() < 0.15 ? null : any;
    if (req.kind === 'mate') return any;
    return undefined;
  },

  Table,
  Act,
};
export default CERCLE;

// ---------------------------------------------------------------- affichage

function Table({ S, g, uid }) {
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const r = g.card ? RULES[g.card[0]] : null;
  const pairs = [];
  for (const [a, b] of Object.entries(g.mates)) if (a < b) pairs.push([a, b]);
  return (
    <div class="cf">
      <div class="ose-top">
        <span class="chip">{plural(g.left, 'carte', 'cartes')} dans le cercle</span>
        <span class="chip">Rois : {g.kings} / 4</span>
      </div>
      <div class="cf-ring" aria-hidden="true">
        {Array.from({ length: 13 }).map((_, i) => <span key={i} class={`cf-dot${i < Math.round((g.left / 52) * 13) ? '' : ' is-gone'}`} style={`--a:${i * (360 / 13)}deg`} />)}
        <span class={`cf-cup k${g.kings}`} />
      </div>
      {g.card ? (
        <div class="cf-draw" key={g.log.length}>
          <PlayingCard c={g.card} size="l" flip />
          <div class="cf-rule paper tape">
            <span class="ose-lead">{r.t}</span>
            <p>{r.d}</p>
            <p class="muted small">Tiré par {nickOf(S, g.by)}</p>
          </div>
        </div>
      ) : <p class="center muted">Personne n’a encore tiré.</p>}
      {g.phase === 'draw' ? <p class="av-who"><Av p={S.roster[g.cur]} size="m" /> <span>Au tour de <b>{nickOf(S, g.cur)}</b> de tirer</span></p> : null}
      {g.phase === 'loser' ? <p class="av-who"><Av p={S.roster[g.cur]} size="m" /> <span><b>{nickOf(S, g.cur)}</b> désigne le perdant</span></p> : null}
      {g.phase === 'mate' ? <p class="av-who"><Av p={S.roster[g.cur]} size="m" /> <span><b>{nickOf(S, g.cur)}</b> choisit son compagnon</span></p> : null}
      <div class="cf-state">
        {g.queen ? <span class="chip">Maître des questions : {nickOf(S, g.queen)}</span> : null}
        {g.rules.length ? <span class="chip">{plural(g.rules.length, 'règle', 'règles')} en cours</span> : null}
        {pairs.map(([a, b]) => <span key={a} class="chip">{nickOf(S, a)} et {nickOf(S, b)} boivent ensemble</span>)}
      </div>
    </div>
  );
}

function End({ S, g, uid }) {
  const s = g.summary || {};
  return (
    <div class="end">
      <h3 class="end-title">Le cercle est brisé · {plural(s.cards || 0, 'carte', 'cartes')}</h3>
      {s.lastKing ? (
        <div class="verdict paper tape">
          <span class="ose-lead">Quatrième roi</span>
          <div class="verdict-who"><Who S={S} uid={s.lastKing} size="l" you={uid} /></div>
          <div class="verdict-line"><Stamp size="l">Le verre du centre, cul sec</Stamp></div>
        </div>
      ) : <p class="center muted">Plus de cartes : le verre du centre se partage.</p>}
    </div>
  );
}

function Act({ S, g, uid, req, send, sent }) {
  if (req.kind === 'draw') {
    return (
      <div class="act">
        <h3>À toi de tirer</h3>
        <button type="button" class="btn btn-main btn-big btn-wide" disabled={sent} onClick={() => send(req.k, true)}>Tirer une carte</button>
      </div>
    );
  }
  if (req.kind === 'loser') {
    return (
      <div class="act">
        <h3>{RULES[g.card[0]].t} : qui a perdu ?</h3>
        <PlayerGrid S={S} uids={g.pl.filter((u) => S.roster[u])} disabled={sent} onPick={(u) => send(req.k, u)} />
        <button type="button" class="btn btn-wide" disabled={sent} onClick={() => send(req.k, null)}>Personne</button>
      </div>
    );
  }
  return (
    <div class="act">
      <h3>Choisis ton compagnon</h3>
      <PlayerGrid S={S} uids={g.pl.filter((u) => u !== uid && S.roster[u])} disabled={sent} onPick={(u) => send(req.k, u)} />
    </div>
  );
}

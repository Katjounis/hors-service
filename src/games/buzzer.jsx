// Quiz buzzer (pensé pour le mode Écran) : la question et les 4 réponses s'affichent pour tout le monde,
// chacun a un gros bouton BUZZ sur son téléphone. Le plus rapide répond : juste = 1 point et il distribue des
// gorgées ; faux = il boit et il est bloqué pour cette question, les autres peuvent buzzer à leur tour.
// Équité : chaque buzz porte l'heure synchronisée du téléphone ; l'hôte attend un court instant après le premier
// buzz reçu puis donne la main au plus rapide, pour ne pas avantager celui qui a le meilleur réseau.

import { QUIZ } from '../content/buzzer.js';
import { Who, nickOf, Waiting, Av, Stamp, useTicker } from '../ui/common.jsx';
import { plural } from '../lib/util.js';

const ASK_MS = 20000;
const ANSWER_MS = 8000;
const WINDOW_MS = 250;
const LETTERS = ['A', 'B', 'C', 'D'];

function nextQuestion(c) {
  const g = c.g;
  const P = c.priv;
  for (const u of c.S.order) if (c.roster[u] && c.online(u) && !g.pl.includes(u)) g.pl.push(u);
  if (P.i >= P.deck.length) { P.deck = c.shuffle(QUIZ.map((_, i) => i)); P.i = 0; }
  const q = QUIZ[P.deck[P.i++]];
  const order = c.shuffle([0, 1, 2, 3]);
  P.good = order.indexOf(0);
  g.r += 1;
  g.q = { theme: q[0], text: q[1], opts: order.map((i) => q[2 + i]) };
  g.phase = 'ask';
  g.buzz = null;
  g.locked = {};
  g.wrong = [];
  g.ans = null;
  g.winner = null;
  g.tries = 0;
  g.askAt = c.now();
  P.pending = [];
  P.window = 0;
}

function reveal(c, winner) {
  const g = c.g;
  g.phase = 'reveal';
  g.ans = c.priv.good;
  g.winner = winner || null;
  g.revAt = c.now();
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  const rows = g.pl.filter((u) => c.roster[u]).map((u) => ({ u, pts: g.score[u] || 0, ko: g.miss[u] || 0 })).sort((a, b) => b.pts - a.pts || a.ko - b.ko);
  g.summary = { rows, rounds: g.r };
  const last = rows.length ? rows[rows.length - 1] : null;
  if (last && c.opts.sips > 0 && rows.length > 1 && last.pts < rows[0].pts) for (const r of rows.filter((x) => x.pts === last.pts)) c.pen(r.u, c.opts.sips, 'Quiz buzzer : dernier du classement');
}

function giveHand(c) {
  const g = c.g;
  const P = c.priv;
  if (!P.pending.length) return;
  P.pending.sort((a, b) => a.t - b.t);
  const first = P.pending[0];
  g.buzz = first.uid;
  g.buzzAt = c.now();
  g.phase = 'buzzed';
  g.tries += 1;
  P.pending = [];
  P.window = 0;
}

const BUZZER = {
  id: 'buzzer',
  name: 'Quiz buzzer',
  tagline: 'Une question, quatre réponses, un buzzer sur chaque téléphone. Le plus rapide répond ; s’il se trompe, il boit.',
  min: 2,
  local: false,
  rules: [
    'La question et ses quatre réponses s’affichent (en grand sur la télé en mode Écran). Chacun a un buzzer sur son téléphone.',
    'Le plus rapide à buzzer choisit sa réponse sur son téléphone, en 8 secondes.',
    'Bonne réponse : 1 point, et il distribue des gorgées. Mauvaise réponse : il boit, et il ne peut plus buzzer sur cette question ; les autres peuvent tenter leur chance.',
    'Personne ne buzze en 20 secondes : la réponse est révélée.',
    'À la fin, le dernier du classement boit.',
  ],
  options: [
    { id: 'rounds', label: 'Nombre de questions', choices: [[10, '10'], [20, '20'], [30, '30']], def: 20 },
    { id: 'gorg', label: 'Bonne ou mauvaise réponse', choices: [[1, '1 gorgée'], [2, '2 gorgées']], def: 1 },
    { id: 'sips', label: 'Le dernier boit à la fin', choices: [[0, 'Rien'], [3, '3 gorgées'], [5, '5 gorgées']], def: 3 },
  ],

  start(c) {
    const g = { pl: c.activeUids(), r: 0, max: c.opts.rounds || 20, q: null, phase: 'ask', score: {}, miss: {}, locked: {}, wrong: [] };
    c.g = g;
    c.S.game.g = g;
    c.priv.deck = c.shuffle(QUIZ.map((_, i) => i));
    c.priv.i = 0;
    nextQuestion(c);
    return g;
  },

  request({ g, uid }) {
    if (!g.pl.includes(uid)) return null;
    if (g.phase === 'ask' && !g.locked[uid]) return { k: `z${g.r}.${g.tries}`, kind: 'buzz' };
    if (g.phase === 'buzzed' && g.buzz === uid) return { k: `a${g.r}.${g.tries}`, kind: 'answer' };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    const P = c.priv;
    if (g.phase === 'ask' && k === `z${g.r}.${g.tries}` && g.pl.includes(uid) && !g.locked[uid]) {
      if (P.pending.some((p) => p.uid === uid)) return false;
      const now = c.now();
      // heure du buzz côté téléphone (horloge synchronisée), bornée pour éviter la triche
      let t = Number(v);
      if (!Number.isFinite(t) || t > now + 50 || t < now - 1500) t = now;
      P.pending.push({ uid, t });
      if (!P.window) P.window = now + WINDOW_MS;
      return false; // l'état public change au tick, quand la main est donnée
    }
    if (g.phase === 'buzzed' && k === `a${g.r}.${g.tries}` && uid === g.buzz) {
      const i = Number(v);
      if (!Number.isInteger(i) || i < 0 || i > 3) return false;
      const n = c.opts.gorg || 1;
      if (i === P.good) {
        g.score[uid] = (g.score[uid] || 0) + 1;
        c.gift(uid, n, 'Quiz buzzer : bonne réponse');
        if (c.count) c.count(uid, 'quizGood');
        reveal(c, uid);
      } else {
        g.miss[uid] = (g.miss[uid] || 0) + 1;
        c.pen(uid, n, 'Quiz buzzer : mauvaise réponse');
        g.locked[uid] = true;
        g.wrong.push({ uid, i });
        g.buzz = null;
        const left = g.pl.filter((u) => c.roster[u] && c.online(u) && !g.locked[u]);
        if (!left.length) reveal(c, null);
        else { g.phase = 'ask'; g.askAt = c.now(); }
      }
      return true;
    }
    return false;
  },

  tick(c) {
    const g = c.g;
    const P = c.priv;
    const now = c.now();
    if (g.phase === 'ask' && P.window && now >= P.window) { giveHand(c); return true; }
    if (g.phase === 'ask' && !P.window && now - g.askAt > ASK_MS) { reveal(c, null); return true; }
    if (g.phase === 'buzzed' && now - g.buzzAt > ANSWER_MS) {
      // trop lent : compte comme une mauvaise réponse
      const u = g.buzz;
      g.miss[u] = (g.miss[u] || 0) + 1;
      c.pen(u, c.opts.gorg || 1, 'Quiz buzzer : trop lent pour répondre');
      g.locked[u] = true;
      g.wrong.push({ uid: u, i: -1 });
      g.buzz = null;
      const left = g.pl.filter((x) => c.roster[x] && c.online(x) && !g.locked[x]);
      if (!left.length) reveal(c, null); else { g.phase = 'ask'; g.askAt = now; }
      return true;
    }
    return false;
  },

  actions({ g }) {
    if (g.phase === 'reveal') {
      if (g.r >= g.max) return [{ id: 'end', label: 'Classement final', primary: true }];
      return [{ id: 'next', label: 'Question suivante', primary: true }, { id: 'end', label: 'Arrêter là', confirm: 'Arrêter et voir le classement ?' }];
    }
    if (g.phase === 'ask') return [{ id: 'reveal', label: 'Révéler la réponse', confirm: 'Révéler sans attendre ?' }];
    return [];
  },

  act(c, id) {
    const g = c.g;
    if (id === 'next' && g.phase === 'reveal') { nextQuestion(c); return true; }
    if (id === 'reveal' && g.phase === 'ask') { reveal(c, null); return true; }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  bot({ req, dev }) {
    if (!req) return undefined;
    if (req.kind === 'buzz') return Math.random() < 0.5 ? (dev && dev.backend ? dev.backend.now() : Date.now()) : undefined;
    if (req.kind === 'answer') return Math.floor(Math.random() * 4);
    return undefined;
  },

  Table,
  Act,
};

export default BUZZER;

// ---------------------------------------------------------------- affichage

function Table({ S, g, uid, clock, screen }) {
  const live = g.phase === 'ask' || g.phase === 'buzzed';
  useTicker(live, 250);
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const now = clock ? clock() : 0;
  const left = g.phase === 'ask' ? Math.max(0, ASK_MS - (now - g.askAt)) : g.phase === 'buzzed' ? Math.max(0, ANSWER_MS - (now - g.buzzAt)) : 0;
  const ranked = g.pl.filter((u) => S.roster[u]).sort((a, b) => (g.score[b] || 0) - (g.score[a] || 0));
  const wrongI = new Set(g.wrong.map((w) => w.i));
  return (
    <div class={`bz${screen ? ' is-screen' : ''}`}>
      <div class="pipo-top">
        <span class="chip">Question {g.r} / {g.max}</span>
        {g.q ? <span class="chip">{g.q.theme}</span> : null}
        {live ? <span class="chip">{Math.ceil(left / 1000)} s</span> : null}
      </div>
      {g.q ? (
        <div class="bz-q ose-card paper" key={g.r}>
          <p class="ose-q">{g.q.text}</p>
        </div>
      ) : null}
      {g.q ? (
        <ol class="bz-opts">
          {g.q.opts.map((o, i) => (
            <li key={i} class={`${g.ans === i ? 'is-good' : ''}${wrongI.has(i) ? ' is-wrong' : ''}`}><b>{LETTERS[i]}</b> {o}</li>
          ))}
        </ol>
      ) : null}
      {g.phase === 'buzzed' ? <p class="bz-who"><Av p={S.roster[g.buzz]} size="m" /> <b>{nickOf(S, g.buzz)}</b> a buzzé !</p> : null}
      {g.phase === 'reveal' ? (
        <p class="bz-who">{g.winner ? <><Av p={S.roster[g.winner]} size="m" /> <b>{nickOf(S, g.winner)}</b> a trouvé : il distribue.</> : 'Personne n’a trouvé.'}</p>
      ) : null}
      {g.wrong.length ? <p class="muted small">Raté : {g.wrong.map((w) => nickOf(S, w.uid)).join(', ')} (ils boivent).</p> : null}
      <div class="bz-scores">
        {ranked.map((u) => <span key={u} class={`bz-sc${g.locked[u] ? ' is-locked' : ''}`}><Av p={S.roster[u]} size="s" />{nickOf(S, u)} <b>{g.score[u] || 0}</b></span>)}
      </div>
    </div>
  );
}

function End({ S, g, uid }) {
  const rows = (g.summary && g.summary.rows) || [];
  return (
    <div class="end">
      <h3 class="end-title">Classement · {plural(g.summary ? g.summary.rounds : 0, 'question', 'questions')}</h3>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Joueur</th><th>Points</th><th>Ratés</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.pts}</td><td>{r.ko}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}

function Act({ g, req, send, sent, clock }) {
  if (req.kind === 'buzz') {
    return (
      <div class="act bz-act">
        <button type="button" class="bz-btn" disabled={sent} onPointerDown={(e) => { e.preventDefault(); if (!sent) send(req.k, clock ? clock() : Date.now()); }}>{sent ? 'Buzzé…' : 'BUZZ'}</button>
      </div>
    );
  }
  if (req.kind === 'answer') {
    return (
      <div class="act">
        <h3>À toi : ta réponse ?</h3>
        <div class="bz-ans">
          {g.q.opts.map((o, i) => (
            <button type="button" key={i} class="btn btn-big" disabled={sent || g.wrong.some((w) => w.i === i)} onClick={() => send(req.k, i)}><b>{LETTERS[i]}</b>&nbsp;{o}</button>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

// « Qui oserait… ? » : une question, chacun vote en secret pour un autre joueur.
// Révélation : le ou les plus désignés prennent autant de gorgées que de votes reçus.
// Les votes restent chez l'hôte jusqu'à la révélation (personne ne peut les voir avant).

import { QUESTIONS } from '../content/oserait.js';
import { PACKS } from '../content/oserait-paquets.js';
import { Who, nickOf, PlayerGrid, Waiting, Av, useTicker, Stamp, Ribbon, Vs } from '../ui/common.jsx';
import { plural } from '../lib/util.js';

// paquet de questions : « Classique » suit le niveau de la table ; les autres ont un niveau minimum,
// et Cul / HARD doivent en plus être activés dans les réglages de la soirée (adult)
export function packAllowed(pack, level, adult = false) { return !!PACKS[pack] && PACKS[pack].need <= level && (!PACKS[pack].adult || adult === true); }
function makeDeck(c, pack) {
  if (pack !== 'classique') return c.shuffle(PACKS[pack].list.map((_, i) => i));
  const lvl = c.level();
  return c.shuffle(QUESTIONS.map((q, i) => [q, i]).filter(([q]) => q[0] <= lvl).map(([, i]) => i));
}
function questionOf(pack, i) {
  return pack === 'classique' ? QUESTIONS[i] : [PACKS[pack].need, PACKS[pack].list[i]];
}

function active(c, g) {
  return g.pl.filter((u) => c.roster[u] && c.online(u));
}

function nextQuestion(c) {
  const g = c.g;
  // les retardataires connectés entrent dans le jeu
  for (const u of c.S.order) if (c.roster[u] && c.online(u) && !g.pl.includes(u)) g.pl.push(u);
  if (g.i >= g.deck.length) {
    g.deck = makeDeck(c, g.pack);
    g.i = 0;
  }
  const q = questionOf(g.pack, g.deck[g.i++]);
  g.r += 1;
  g.q = q[1];
  g.lvl = q[0];
  g.voted = {};
  g.res = null;
  g.phase = 'vote';
  g.dbl = g.r > 2 && Math.random() < 0.12;
  c.priv.votes = {};
}

function reveal(c) {
  const g = c.g;
  const votes = c.priv.votes || {};
  const counts = {};
  for (const t of Object.values(votes)) counts[t] = (counts[t] || 0) + 1;
  const max = Math.max(0, ...Object.values(counts));
  const top = max > 0 ? Object.keys(counts).filter((u) => counts[u] === max) : [];
  const n = max * (g.dbl ? 2 : 1);
  g.res = { counts, top, max, n, total: Object.keys(votes).length, who: c.opts.reveal === 'open' ? { ...votes } : null };
  g.phase = 'reveal';
  g.revAt = c.now();
  for (const u of top) {
    c.pen(u, n, 'Qui oserait…');
    g.score[u] = (g.score[u] || 0) + 1;
  }
  for (const [u, k] of Object.entries(counts)) g.recv[u] = (g.recv[u] || 0) + k;
  g.hist.push({ q: g.q, top, max, dbl: g.dbl });
  if (g.hist.length > 40) g.hist.shift();
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  const rows = g.pl.filter((u) => c.roster[u]).map((u) => ({ u, top: g.score[u] || 0, recv: g.recv[u] || 0 }))
    .sort((a, b) => b.top - a.top || b.recv - a.recv);
  g.summary = { rounds: g.hist.length, rows };
}

const OSERAIT = {
  id: 'oserait',
  name: 'Qui oserait… ?',
  tagline: 'Une question, un vote secret. Le plus désigné boit autant de gorgées que de votes reçus.',
  min: 3,
  local: true,
  rules: [
    'Une question s’affiche : « Qui est le plus susceptible de… ? ».',
    'Chacun vote en secret pour un autre joueur sur son téléphone. Impossible de voter pour soi.',
    'Quand tout le monde a voté, les résultats s’affichent.',
    'Le ou les joueurs les plus désignés prennent autant de gorgées que de votes reçus (ou un gage, ou des points, pour qui joue sans alcool).',
    'De temps en temps, un « tour double » double les gorgées.',
    'Avant de lancer, l’hôte choisit le paquet de questions : Classique, Alcool, Cul ou HARD. Cul et HARD sont désactivés par défaut : l’hôte les active avec l’interrupteur « Mode Cul et HARD » du salon, et ils ne s’ouvrent que si tout le monde a réglé ses limites sur « Piquant ».',
    'Avec l’option « votes révélés », on voit qui a voté pour qui.',
  ],
  options: [
    { id: 'pack', label: 'Paquet de questions', choices: [['classique', 'Classique'], ['alcool', 'Alcool', 2], ['cul', 'Cul', 3, 'adult'], ['hard', 'HARD', 3, 'adult']], def: 'classique' },
    { id: 'rounds', label: 'Nombre de questions', choices: [[10, '10'], [15, '15'], [25, '25']], def: 10 },
    { id: 'reveal', label: 'Votes', choices: [['anon', 'Anonymes'], ['open', 'Révélés']], def: 'anon' },
  ],

  start(c) {
    // un paquet trop osé pour une des limites de la table retombe sur « Classique »
    const pack = packAllowed(c.opts.pack, c.level(), !!(c.S.cfg && c.S.cfg.adult)) ? c.opts.pack : 'classique';
    const deck = makeDeck(c, pack);
    const g = { pl: c.activeUids(), pack, deck, i: 0, r: 0, max: c.opts.rounds || 10, q: '', voted: {}, res: null, phase: 'vote', score: {}, recv: {}, hist: [], dbl: false };
    c.g = g;
    c.S.game.g = g;
    nextQuestion(c);
    return g;
  },

  request({ g, uid }) {
    if (g.phase !== 'vote' || !g.pl.includes(uid) || g.voted[uid]) return null;
    return { k: `v${g.r}`, kind: 'vote', secret: true };
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (g.phase !== 'vote' || k !== `v${g.r}` || !g.pl.includes(uid) || g.voted[uid]) return false;
    if (typeof v !== 'string' || v === uid || !g.pl.includes(v) || !c.roster[v]) return false;
    c.priv.votes = c.priv.votes || {};
    c.priv.votes[uid] = v;
    g.voted[uid] = true;
    const need = active(c, g);
    if (need.length && need.every((u) => g.voted[u])) reveal(c);
    return true;
  },

  actions({ g }) {
    const n = Object.keys(g.voted || {}).length;
    if (g.phase === 'vote') return [{ id: 'reveal', label: n < 2 ? 'Révéler (au moins 2 votes)' : `Révéler maintenant (${n} votes)`, disabled: n < 2 }];
    if (g.phase === 'reveal') {
      if (g.r >= g.max) return [{ id: 'end', label: 'Rapport d’incident', primary: true }];
      return [{ id: 'next', label: 'Question suivante', primary: true }, { id: 'end', label: 'Arrêter là', confirm: 'Arrêter la partie et voir le rapport ?' }];
    }
    return [];
  },

  act(c, id) {
    const g = c.g;
    if (id === 'reveal' && g.phase === 'vote' && Object.keys(g.voted).length >= 2) { reveal(c); return true; }
    if (id === 'next' && g.phase === 'reveal') { nextQuestion(c); return true; }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  tick(c) {
    // un joueur s'est déconnecté pendant le vote : on révèle dès que tous les présents ont voté
    const g = c.g;
    if (g.phase !== 'vote') return false;
    const need = active(c, g);
    if (Object.keys(g.voted).length >= 2 && need.length && need.every((u) => g.voted[u])) { reveal(c); return true; }
    return false;
  },

  // joueur automatique (démo) : vote au hasard pour un autre joueur
  bot({ S, g, uid }) {
    const others = g.pl.filter((u) => u !== uid && S.roster[u]);
    return others[Math.floor(Math.random() * others.length)];
  },

  Table,
  Act,
};

export default OSERAIT;

// ---------------------------------------------------------------- affichage

function Table({ S, g, uid, clock }) {
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const voters = g.pl.filter((u) => S.roster[u]);
  const n = Object.keys(g.voted).length;
  return (
    <div class="ose">
      <div class="ose-top">
        <span class="chip">Question {g.r} / {g.max}</span>
        {g.pack && g.pack !== 'classique' ? <span class="chip">Paquet {PACKS[g.pack].label}</span> : null}
      </div>
      {g.dbl ? <Ribbon key={`d${g.r}`}>Tour double</Ribbon> : null}
      <div class="ose-card paper tape pose" key={g.r}>
        <span class="ose-lead">Qui est le plus susceptible de…</span>
        <p class="ose-q">{g.q} ?</p>
      </div>
      {g.phase === 'vote' ? (
        <>
          <div class="voters" aria-hidden="true">
            {voters.map((u) => (
              <span key={u} class="voter" title={nickOf(S, u)}>
                <Av p={S.roster[u]} size="s" dim={!g.voted[u]} />
              </span>
            ))}
          </div>
          <p class="muted center"><span class="count">{n} / {voters.length}</span> votes</p>
        </>
      ) : null}
      {g.phase === 'reveal' && g.res ? <Reveal S={S} g={g} uid={uid} clock={clock} /> : null}
    </div>
  );
}

function Reveal({ S, g, uid, clock }) {
  const r = g.res;
  // petit suspense synchronisé sur tous les téléphones (0,9 s), sans bloquer la partie
  const wait = Math.max(0, (g.revAt || 0) + 900 - clock());
  useTicker(wait > 0, 150);
  if (wait > 0) return <div class="suspense" role="status">Dépouillement…</div>;
  const rows = Object.entries(r.counts).sort((a, b) => b[1] - a[1]);
  return (
    <div class="reveal">
      {r.top.length ? (
        <div class="verdict paper tape">
          <span class="ose-lead">Rapport d’incident{g.dbl ? ' · tour double' : ''}</span>
          <div class="verdict-who">{r.top.map((u) => <Who key={u} S={S} uid={u} size="l" you={uid} />)}</div>
          <div class="verdict-line">
            <span class="verdict-n">{r.top.length > 1 ? 'Ex æquo, ' : ''}{plural(r.max, 'vote', 'votes')}</span>
            <Stamp size="l">{plural(r.n, 'gorgée', 'gorgées')}{r.top.length > 1 ? ' chacun' : ''}</Stamp>
          </div>
        </div>
      ) : <p class="center">Aucun vote.</p>}
      <div class="bars">
        {rows.map(([u, k]) => (
          <div class="bar" key={u}>
            <span class="bar-who"><Who S={S} uid={u} you={uid} /></span>
            <span class="bar-track"><span class="bar-fill" style={{ width: `${(k / Math.max(1, r.max)) * 100}%` }} /></span>
            <span class="bar-n">{k}</span>
          </div>
        ))}
      </div>
      {r.who ? (
        <details class="log" open>
          <summary>Qui a voté pour qui</summary>
          <ul>{Object.entries(r.who).map(([a, b]) => <li key={a}><Vs a={nickOf(S, a)} b={nickOf(S, b)} /></li>)}</ul>
        </details>
      ) : null}
    </div>
  );
}

function End({ S, g, uid }) {
  const s = g.summary || { rows: [] };
  const best = s.rows.length && s.rows[0].top > 0 ? s.rows.filter((r) => r.top === s.rows[0].top) : [];
  return (
    <div class="end">
      <h3 class="end-title">Bilan des votes · {plural(s.rounds, 'question', 'questions')}</h3>
      {best.length ? (
        <div class="awards">
          <div class="award">
            <span class="award-t">Le plus souvent désigné</span>
            <span class="award-who">{best.map((r) => <Who key={r.u} S={S} uid={r.u} you={uid} />)}</span>
          </div>
        </div>
      ) : null}
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Joueur</th><th>Désigné</th><th>Votes reçus</th></tr></thead>
          <tbody>{s.rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.top}</td><td>{r.recv}</td></tr>)}</tbody>
        </table>
      </div>
      {g.hist.length ? (
        <details class="log">
          <summary>Historique des questions</summary>
          <ol>{g.hist.map((h, i) => <li key={i}>{h.q} ? <b>{h.top.length ? h.top.map((u) => nickOf(S, u)).join(', ') : 'Personne'}</b> ({h.max})</li>)}</ol>
        </details>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- vote du joueur

function Act({ S, g, uid, req, send, sent }) {
  const others = g.pl.filter((u) => u !== uid && S.roster[u]);
  return (
    <div class="act">
      <h3>Ton vote secret</h3>
      <p class="muted">Qui est le plus susceptible de {g.q} ?</p>
      <PlayerGrid S={S} uids={others} onPick={(u) => send(req.k, u)} disabled={sent} />
    </div>
  );
}

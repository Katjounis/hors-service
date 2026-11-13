// Trouve la carte — règles données par Thierry :
// • Le croupier tire une carte au hasard. Un autre joueur doit la deviner en deux essais.
// • 1er essai : il annonce une valeur ; le croupier répond « plus » ou « moins » (l'As est la plus forte).
// • 2e essai : il annonce une autre valeur.
// • Trouvé au 1er essai : le croupier boit 5 gorgées. Au 2e essai : 3 gorgées.
// • Raté : le joueur boit l'écart entre la carte du croupier et sa 2e annonce (Roi contre Valet = 2).
// • Le croupier peut passer le jeu après avoir gagné contre au moins deux joueurs d'affilée.
//   Il n'est pas obligé : il peut le garder.
// • Précisé par Thierry : le croupier affronte un seul joueur à la fois, chacun son tour avec une nouvelle carte,
//   dans le sens des aiguilles d'une montre (ordre des places). Quand le croupier passe, son voisin le devient.
// Choix technique : on devine la valeur (pas la couleur).

import { useState } from 'preact/hooks';
import { newDeck, rankOf } from '../lib/cards.js';
import { PlayingCard, Who, nickOf, Waiting, Av, Stamp, useTicker } from '../ui/common.jsx';
import { confetti, buzz, useOnce } from '../ui/fx.jsx';
import { plural } from '../lib/util.js';

export const RANKS_TC = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const valTC = (r) => RANKS_TC.indexOf(r) + 2; // 2 … 14 (As le plus fort)
export const SIPS_FIRST = 5;
export const SIPS_SECOND = 3;
export const PASS_AFTER_WINS = 2;
const NAMES = { T: '10', J: 'Valet', Q: 'Dame', K: 'Roi', A: 'As' };
export const rankName = (r) => NAMES[r] || r;
const withArt = (r) => `${r === 'Q' ? 'une' : 'un'} ${rankName(r)}`;
const NEXT_MS = 4500;

// résultat d'une manche : qui boit et combien
export function judgeTrouve(card, g1, g2) {
  const r = rankOf(card);
  if (g1 === r) return { found: 1, drinker: 'dealer', sips: SIPS_FIRST };
  const hint = valTC(r) > valTC(g1) ? 'plus' : 'moins';
  if (g2 == null) return { found: 0, hint };
  if (g2 === r) return { found: 2, hint, drinker: 'dealer', sips: SIPS_SECOND };
  return { found: 0, hint, drinker: 'guesser', sips: Math.abs(valTC(r) - valTC(g2)) };
}

function stat(g, u) {
  g.stats[u] = g.stats[u] || { guessed: 0, found: 0, drank: 0, dealt: 0, dealerDrank: 0, best: 0 };
  return g.stats[u];
}

function present(c, g) { return g.pl.filter((u) => c.roster[u] && c.online(u)); }

// tour de table : l'ordre des places, dans le sens des aiguilles d'une montre (y compris pour ceux arrivés en cours)
export function ringOf(order, pl) { const r = order.filter((u) => pl.includes(u)); return r.length ? r : pl; }
function after(c, g, list, from) {
  // joueur suivant dans le sens des aiguilles d'une montre, parmi « list »
  if (!list.length) return null;
  const ring = ringOf(c.S.order, g.pl);
  const i = ring.indexOf(from);
  for (let k = 1; k <= ring.length; k++) {
    const u = ring[(i + k) % ring.length];
    if (list.includes(u)) return u;
  }
  return list[0];
}

function drawCard(c) {
  const P = c.priv;
  if (!P.deck.length) { P.deck = newDeck(1); c.g.reshuffles += 1; }
  return P.deck.pop();
}

function nextRound(c) {
  const g = c.g;
  for (const u of c.S.order) if (c.roster[u] && c.online(u) && !g.pl.includes(u)) { g.pl.push(u); stat(g, u); }
  const here = present(c, g);
  if (!here.includes(g.dealer)) {
    // croupier absent : le jeu passe au suivant
    g.dealer = after(c, g, here, g.dealer) || g.dealer;
    g.wins = 0;
  }
  const guessers = here.filter((u) => u !== g.dealer);
  if (!guessers.length) { g.phase = 'wait'; return; }
  g.guesser = after(c, g, guessers, g.guesser && guessers.includes(g.guesser) ? g.guesser : g.dealer);
  g.step += 1;
  g.phase = 'guess1';
  g.g1 = null;
  g.g2 = null;
  g.hint = null;
  g.res = null;
  g.nextAt = 0;
  c.priv.card = drawCard(c);
  g.deckN = c.priv.deck.length;
  stat(g, g.dealer).dealt += 1;
  // le croupier voit sa carte sur son téléphone (en mode un seul téléphone, l'appli la garde cachée)
  for (const u of g.pl) c.setSecret(u, u === g.dealer && !c.isLocal ? { game: 'tc', step: g.step, card: c.priv.card } : null);
}

function resolve(c) {
  const g = c.g;
  const card = c.priv.card;
  const r = judgeTrouve(card, g.g1, g.g2);
  const sg = stat(g, g.guesser);
  const sd = stat(g, g.dealer);
  sg.guessed += 1;
  if (r.drinker === 'dealer') {
    c.pen(g.dealer, r.sips, `Trouve la carte : ${c.name(g.guesser)} a trouvé ${r.found === 1 ? 'du premier coup' : 'au deuxième essai'}`);
    sg.found += 1;
    sd.dealerDrank += r.sips;
    g.wins = 0;
  } else {
    c.pen(g.guesser, r.sips, `Trouve la carte : ${rankName(rankOf(card))} contre ${rankName(g.g2)}`);
    sg.drank += r.sips;
    g.wins += 1;
    sd.best = Math.max(sd.best, g.wins);
  }
  g.res = { card, found: r.found, sips: r.sips, drinker: r.drinker === 'dealer' ? g.dealer : g.guesser, t: c.now() };
  g.shown = [card, ...g.shown].slice(0, 12);
  g.phase = 'result';
  // sans choix à faire pour le croupier, la manche suivante démarre toute seule
  g.nextAt = g.wins >= PASS_AFTER_WINS ? 0 : c.now() + NEXT_MS;
  for (const u of g.pl) c.setSecret(u, null);
}

function passDealer(c) {
  const g = c.g;
  const here = present(c, g);
  const next = after(c, g, here.filter((u) => u !== g.dealer), g.dealer);
  if (next) {
    g.dealer = next;
    g.guesser = null;
    g.passes += 1;
  }
  g.wins = 0;
  nextRound(c);
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  for (const u of g.pl) c.setSecret(u, null);
  g.summary = { rows: Object.entries(g.stats).filter(([u]) => c.roster[u]).map(([u, s]) => ({ u, ...s })) };
}

const TROUVE = {
  id: 'trouve',
  name: 'Trouve la carte',
  tagline: 'Le croupier tire une carte, tu as deux essais pour la trouver. Plus ou moins entre les deux.',
  min: 2,
  local: true,
  rules: [
    'Le croupier affronte un seul joueur à la fois. Il tire une carte au hasard, le joueur a deux essais pour trouver sa valeur.',
    'Puis c’est au joueur suivant, avec une nouvelle carte : on tourne dans le sens des aiguilles d’une montre (ordre des places).',
    '1er essai : tu annonces une valeur. Le croupier répond « plus » ou « moins ». L’As est la plus forte carte.',
    '2e essai : tu annonces une autre valeur.',
    'Trouvé du premier coup : le croupier boit 5 gorgées. Trouvé au deuxième essai : il boit 3 gorgées.',
    'Raté : tu bois l’écart entre la carte du croupier et ta deuxième annonce. Exemple : le croupier a un Roi, tu dis Valet, tu bois 2 gorgées.',
    'Le croupier peut passer le jeu à son voisin (sens des aiguilles d’une montre) s’il a gagné contre au moins deux joueurs d’affilée. Il peut aussi le garder.',
  ],
  options: [],

  start(c) {
    const pl = c.activeUids();
    const g = {
      pl, dealer: pl[0], guesser: null, wins: 0, step: 0, phase: 'guess1', g1: null, g2: null, hint: null, res: null,
      shown: [], stats: {}, deckN: 52, reshuffles: 0, passes: 0, nextAt: 0,
    };
    c.g = g;
    c.S.game.g = g;
    c.priv.deck = newDeck(1);
    pl.forEach((u) => stat(g, u));
    nextRound(c);
    return g;
  },

  request({ g, uid }) {
    if (g.phase === 'guess1' && g.guesser === uid) return { k: `a${g.step}`, kind: 'guess', n: 1 };
    if (g.phase === 'guess2' && g.guesser === uid) return { k: `b${g.step}`, kind: 'guess', n: 2 };
    if (g.phase === 'result' && g.dealer === uid && g.wins >= PASS_AFTER_WINS) return { k: `d${g.step}`, kind: 'dealer' };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (g.phase === 'guess1' && k === `a${g.step}` && uid === g.guesser) {
      if (!RANKS_TC.includes(v)) return false;
      g.g1 = v;
      const r = judgeTrouve(c.priv.card, v, null);
      if (r.found === 1) { resolve(c); return true; }
      g.hint = r.hint;
      g.phase = 'guess2';
      return true;
    }
    if (g.phase === 'guess2' && k === `b${g.step}` && uid === g.guesser) {
      if (!RANKS_TC.includes(v)) return false;
      g.g2 = v;
      resolve(c);
      return true;
    }
    if (g.phase === 'result' && k === `d${g.step}` && uid === g.dealer && g.wins >= PASS_AFTER_WINS) {
      if (v === 'passe') { passDealer(c); return true; }
      if (v === 'garde') { nextRound(c); return true; }
      return false;
    }
    return false;
  },

  actions({ S, g, online }) {
    const out = [];
    if (g.phase === 'result') out.push({ id: 'next', label: g.wins >= PASS_AFTER_WINS ? 'Carte suivante (le croupier garde le jeu)' : 'Carte suivante', primary: true });
    if ((g.phase === 'guess1' || g.phase === 'guess2') && g.guesser && !online(g.guesser)) out.push({ id: 'skip', label: `Passer ${nickOf(S, g.guesser)} (absent)` });
    if (g.phase !== 'end' && g.dealer && !online(g.dealer)) out.push({ id: 'pass', label: `Changer de croupier (${nickOf(S, g.dealer)} est absent)` });
    if (g.phase === 'wait') out.push({ id: 'next', label: 'Reprendre', primary: true });
    if (g.phase !== 'end') out.push({ id: 'end', label: 'Terminer la partie', confirm: 'Terminer Trouve la carte ?' });
    return out;
  },

  act(c, id) {
    const g = c.g;
    if (id === 'next' && (g.phase === 'result' || g.phase === 'wait')) { nextRound(c); return true; }
    if (id === 'skip' && (g.phase === 'guess1' || g.phase === 'guess2')) { c.priv.deck.unshift(c.priv.card); nextRound(c); return true; }
    if (id === 'pass' && g.phase !== 'end') { passDealer(c); return true; }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  tick(c) {
    const g = c.g;
    if (g.phase === 'result' && g.nextAt && c.now() >= g.nextAt) { nextRound(c); return true; }
    if (g.phase === 'wait' && present(c, g).length >= 2) { nextRound(c); return true; }
    return false;
  },

  cleanup(c) { for (const u of (c.g && c.g.pl) || []) c.setSecret(u, null); },

  turnOf(g) {
    if (g.phase === 'guess1' || g.phase === 'guess2') return g.guesser;
    return null;
  },

  bot({ g, req }) {
    const rnd = (a) => a[Math.floor(Math.random() * a.length)];
    if (req.kind === 'guess' && req.n === 1) return rnd(['7', '8', '8', '9', 'T']);
    if (req.kind === 'guess') {
      const v = valTC(g.g1);
      const opts = RANKS_TC.filter((r) => (g.hint === 'plus' ? valTC(r) > v : valTC(r) < v));
      return opts.length ? opts[Math.floor(opts.length / 2)] : rnd(RANKS_TC);
    }
    if (req.kind === 'dealer') return Math.random() < 0.5 ? 'passe' : 'garde';
    return undefined;
  },

  Table,
  Act,
};

export default TROUVE;

// ---------------------------------------------------------------- affichage

function Table({ S, g, uid, clock, secret, local }) {
  const res = g.res;
  const fresh = !!(res && clock && clock() - res.t < 2500);
  useTicker(fresh, 500);
  useOnce(res ? `tc:${S.code}:${S.game.seq}:${g.step}` : null, () => {
    if (!fresh) return;
    if (res.found && (local || uid === g.guesser)) { confetti(24); buzz([40, 30, 40]); }
  });
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const mine = secret && secret.game === 'tc' && secret.step === g.step ? secret.card : null;
  return (
    <div class="tc">
      <div class="tc-roles">
        <span class="tc-role"><Av p={S.roster[g.dealer]} size="m" /><span><span class="muted small">Croupier</span><b>{g.dealer === uid ? 'Toi' : nickOf(S, g.dealer)}</b></span></span>
        {g.guesser && S.roster[g.guesser] ? <span class="tc-role"><Av p={S.roster[g.guesser]} size="m" /><span><span class="muted small">Contre</span><b>{g.guesser === uid ? 'Toi' : nickOf(S, g.guesser)}</b></span></span> : null}
        <span class="chip">{plural(g.wins, 'victoire', 'victoires')} d’affilée</span>
        <span class="chip">Pioche {g.deckN}</span>
      </div>
      <div class="tc-table paper kraft tape">
        <div class="tc-card">
          {g.phase === 'result' && res ? <PlayingCard c={res.card} size="l" flip key={`r${g.step}`} />
            : mine ? <span class="tc-mine"><PlayingCard c={mine} size="l" /><span class="muted small">Ta carte, ne la montre pas</span></span>
            : <PlayingCard c="2S" back size="l" />}
        </div>
        <div class="tc-guesses">
          <p class="tc-g"><span class="muted">1er essai</span> <b>{g.g1 ? rankName(g.g1) : '…'}</b>{g.hint ? <span class="tc-hint">{g.hint === 'plus' ? 'C’est plus' : 'C’est moins'}</span> : null}</p>
          <p class="tc-g"><span class="muted">2e essai</span> <b>{g.g2 ? rankName(g.g2) : res && res.found === 1 ? '–' : '…'}</b></p>
        </div>
      </div>
      {g.phase === 'result' && res ? (
        <div class="tc-verdict paper pose" key={`v${g.step}`}>
          {res.found === 1 ? <p><b>{nickOf(S, g.guesser)}</b> trouve du premier coup. Le croupier boit.</p> : null}
          {res.found === 2 ? <p><b>{nickOf(S, g.guesser)}</b> trouve au deuxième essai. Le croupier boit.</p> : null}
          {!res.found ? <p>Raté : c’était {withArt(rankOf(res.card))}, et {nickOf(S, g.guesser)} a dit {rankName(g.g2)}. L’écart se boit.</p> : null}
          <div class="verdict-line"><Who S={S} uid={res.drinker} you={uid} /><Stamp>{plural(res.sips, 'gorgée', 'gorgées')}</Stamp></div>
          {g.wins >= PASS_AFTER_WINS ? <p class="muted small">{nickOf(S, g.dealer)} a gagné contre {g.wins} joueurs d’affilée : il peut passer le jeu ou le garder.</p> : null}
        </div>
      ) : null}
      {g.phase === 'wait' ? <Waiting>Il faut au moins deux joueurs connectés.</Waiting> : null}
      {g.shown.length ? (
        <div class="tc-hist" aria-label="Cartes déjà sorties">
          <span class="muted small">Déjà sorties</span>
          <span class="tc-hist-cards">{g.shown.map((c2, i) => <PlayingCard key={`${c2}${i}`} c={c2} size="xs" />)}</span>
        </div>
      ) : null}
    </div>
  );
}

function End({ S, g, uid }) {
  const rows = (g.summary && g.summary.rows) || [];
  return (
    <div class="end">
      <h3 class="end-title">Bilan de Trouve la carte</h3>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Joueur</th><th>Essais</th><th>Trouvées</th><th>Bues</th><th>Au croupier</th><th>Série</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.guessed}</td><td>{r.found}</td><td>{r.drank}</td><td>{r.dealerDrank}</td><td>{r.best}</td></tr>)}</tbody>
        </table>
      </div>
      <p class="muted small">« Au croupier » : gorgées bues comme croupier. « Série » : meilleure série de victoires comme croupier.</p>
    </div>
  );
}

function Act({ g, req, send, sent }) {
  if (req.kind === 'dealer') {
    return (
      <div class="act">
        <h3>Tu gardes le jeu ?</h3>
        <p>Tu as gagné contre {plural(g.wins, 'joueur', 'joueurs')} d’affilée. Tu peux passer le jeu au joueur suivant, ou le garder.</p>
        <div class="bus-btns two">
          <button type="button" class="btn btn-big" disabled={sent} onClick={() => send(req.k, 'garde')}>Je garde le jeu</button>
          <button type="button" class="btn btn-big btn-main" disabled={sent} onClick={() => send(req.k, 'passe')}>Je passe le jeu</button>
        </div>
      </div>
    );
  }
  return <Guess key={req.k} g={g} req={req} send={send} sent={sent} />;
}

function Guess({ g, req, send, sent }) {
  const [pick, setPick] = useState(null);
  const v1 = req.n === 2 && g.g1 ? valTC(g.g1) : null;
  const unlikely = (r) => v1 != null && (g.hint === 'plus' ? valTC(r) <= v1 : valTC(r) >= v1);
  return (
    <div class="act act-tc">
      <h3>{req.n === 1 ? 'Premier essai' : `Deuxième essai : c’est ${g.hint === 'plus' ? 'plus' : 'moins'} que ${rankName(g.g1)}`}</h3>
      <p class="hint">{req.n === 1 ? 'Trouvé du premier coup : le croupier boit 5 gorgées.' : 'Trouvé : le croupier boit 3 gorgées. Raté : tu bois l’écart.'}</p>
      <div class="rank-grid">
        {RANKS_TC.map((r) => (
          <button type="button" key={r} class={`key${pick === r ? ' is-on' : ''}${unlikely(r) ? ' is-dim' : ''}`} disabled={sent} aria-pressed={pick === r ? 'true' : 'false'} onClick={() => setPick(r)}>{rankName(r)}</button>
        ))}
      </div>
      <button type="button" class="btn btn-main btn-big" disabled={sent || !pick} onClick={() => send(req.k, pick)}>
        {pick ? `J’annonce ${rankName(pick)}` : 'Choisis une valeur'}
      </button>
    </div>
  );
}

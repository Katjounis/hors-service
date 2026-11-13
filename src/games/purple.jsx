// Purple — règles validées par Thierry :
// • Pile vide : on annonce Rouge, Noir ou Purple (les 2 prochaines cartes : une rouge et une noire).
// • Dès qu'il y a des cartes dans la pile : on peut aussi annoncer Plus / Moins (par rapport à la
//   dernière carte) et Intérieur / Extérieur (par rapport aux deux dernières cartes).
// • Bonne réponse : la carte s'ajoute à la pile. Après 2 cartes réussies d'affilée (un Purple réussi
//   compte pour 2), le joueur PEUT passer la main (le joueur suivant reprend la même pile),
//   mais il n'est pas obligé : il peut continuer à jouer (précision de Thierry).
// • Mauvaise réponse : on boit autant de gorgées que de cartes dans la pile, la pile repart de zéro
//   et on rejoue. L'hôte décide quand la partie s'arrête.
// • « Purple jusqu'à la mort » (demande de Samuel) : à tout moment, le joueur lance un tirage par paires
//   jusqu'à tomber sur un purple (une rouge et une noire). Toutes les cartes rejoignent la pile. Il boit une
//   gorgée par carte tirée avant le purple ; purple du premier coup : il distribue 5 gorgées. Ça compte comme
//   un Purple réussi pour la série.
// Précision : égalité de valeur (plus/moins) ou carte égale à une borne (intérieur/extérieur) = raté.

import { newDeck, order, isRed, rankOf, withArticle } from '../lib/cards.js';
import { PlayingCard, Who, nickOf, Waiting, Av, Stamp, useTicker } from '../ui/common.jsx';
import { useState, useEffect } from 'preact/hooks';
import { StreakFire, buzz, useOnce, drumRoll, cymbal, confetti, stopSounds, soundOn, setSound, isReduced } from '../ui/fx.jsx';
import { plural } from '../lib/util.js';

const LABEL = { rouge: 'Rouge', noir: 'Noir', purple: 'Purple', plus: 'Plus', moins: 'Moins', int: 'Intérieur', ext: 'Extérieur', pass: 'Je passe la main', mort: 'Purple jusqu’à la mort' };
export const MORT_GIFT = 5; // purple du premier coup : gorgées à distribuer
export const MORT_MAX = 40; // garde-fou : au plus 40 paires

// tirage « jusqu'à la mort » : paires tirées jusqu'au premier purple (la dernière paire est le purple)
export function drawUntilPurple(drawPair) {
  const pairs = [];
  for (let i = 0; i < MORT_MAX; i++) {
    const p = drawPair();
    pairs.push(p);
    if (isRed(p[0]) !== isRed(p[1])) break;
  }
  return pairs;
}
// sips : une gorgée par carte tirée avant le purple
export const mortSips = (pairs) => (pairs.length - 1) * 2;
// minutage de l'animation (ms après le lancement) : une paire de plus en plus vite, puis le verdict
export function mortTimeline(n) {
  const at = [];
  let t = 1100;
  for (let i = 0; i < n; i++) { at.push(t); t += Math.max(420, 1000 - i * 110); }
  return { at, end: at[n - 1] + 700, total: at[n - 1] + 3600 };
}
export const PASS_AFTER = 2; // cartes réussies d'affilée avant de pouvoir passer la main

export function rankValue(c, ace) {
  const v = order(c);
  return rankOf(c) === 'A' && ace === 'low' ? 1 : v;
}

export function available(pile) {
  const a = ['rouge', 'noir', 'purple'];
  if (pile.length >= 1) a.push('plus', 'moins');
  if (pile.length >= 2) a.push('int', 'ext');
  return a;
}

export function judgePurple(call, pile, drawn, ace) {
  const d = drawn[0];
  if (call === 'rouge') return isRed(d);
  if (call === 'noir') return !isRed(d);
  if (call === 'purple') return isRed(drawn[0]) !== isRed(drawn[1]);
  const last = rankValue(pile[pile.length - 1], ace);
  const v = rankValue(d, ace);
  if (call === 'plus') return v > last;
  if (call === 'moins') return v < last;
  const prev = rankValue(pile[pile.length - 2], ace);
  const lo = Math.min(prev, last);
  const hi = Math.max(prev, last);
  if (call === 'int') return v > lo && v < hi;
  if (call === 'ext') return v < lo || v > hi;
  return false;
}

function stat(g, u) {
  g.stats[u] = g.stats[u] || { drank: 0, worst: 0, calls: 0, good: 0 };
  return g.stats[u];
}

function draw(c, n) {
  const P = c.priv;
  const out = [];
  for (let i = 0; i < n; i++) {
    if (!P.deck.length) {
      P.deck = c.shuffle(P.discard);
      P.discard = [];
      if (!P.deck.length) P.deck = newDeck(1).filter((x) => !c.g.pile.includes(x));
      if (!P.deck.length) P.deck = newDeck(1); // pile géante : un paquet neuf
    }
    out.push(P.deck.pop());
  }
  return out;
}

function nextPlayer(c) {
  const g = c.g;
  // les retardataires connectés prennent place à la suite
  for (const u of c.S.order) if (c.roster[u] && c.online(u) && !g.pl.includes(u)) { g.pl.push(u); stat(g, u); }
  for (let i = 1; i <= g.pl.length; i++) {
    const j = (g.turn + i) % g.pl.length;
    if (c.roster[g.pl[j]]) { g.turn = j; break; }
  }
  g.streak = 0;
}

const PURPLE = {
  id: 'purple',
  name: 'Purple',
  tagline: 'Rouge, noir ou purple. Deux bonnes réponses d’affilée pour passer la main, sinon tu bois la pile.',
  min: 2,
  local: true,
  rules: [
    'Pile vide : annonce Rouge, Noir ou Purple. Purple = les deux prochaines cartes sont une rouge et une noire.',
    'Dès qu’il y a des cartes dans la pile, tu peux aussi annoncer Plus ou Moins (par rapport à la dernière carte), puis Intérieur ou Extérieur (par rapport aux deux dernières).',
    'Bonne réponse : la carte rejoint la pile. Après deux cartes réussies d’affilée (un Purple réussi compte pour deux), tu peux passer la main : le joueur suivant reprend ta pile.',
    'Tu n’es pas obligé de passer : tu peux continuer à jouer pour charger la pile, et passer plus tard.',
    'Mauvaise réponse : tu bois autant de gorgées que de cartes dans la pile, la pile repart de zéro et tu rejoues.',
    'Égalité de valeur ou carte égale à une borne : c’est raté.',
    'Purple jusqu’à la mort : à tout moment, l’appli tire des paires jusqu’à tomber sur un purple. Toutes les cartes vont dans la pile, et tu bois une gorgée par carte tirée avant le purple. Purple du premier coup : tu distribues 5 gorgées.',
    'L’hôte décide quand la partie s’arrête.',
  ],
  options: [
    { id: 'ace', label: 'L’As est', choices: [['high', 'La plus forte carte'], ['low', 'La plus faible carte']], def: 'high' },
  ],

  start(c) {
    const pl = c.activeUids();
    const g = { pl, turn: 0, pile: [], streak: 0, step: 0, last: null, stats: {}, phase: 'play', deckN: 52, maxPile: 0 };
    c.g = g;
    c.S.game.g = g;
    c.priv.deck = newDeck(1);
    c.priv.discard = [];
    pl.forEach((u) => stat(g, u));
    return g;
  },

  request({ g, uid }) {
    if (g.phase === 'play' && g.pl[g.turn] === uid) return { k: `p${g.step}`, kind: 'call', canPass: g.streak >= PASS_AFTER };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (g.phase !== 'play' || g.pl[g.turn] !== uid || k !== `p${g.step}`) return false;
    if (v === 'pass') {
      // passer la main est un choix, possible seulement après 2 cartes réussies d'affilée
      if (g.streak < PASS_AFTER) return false;
      g.last = { uid, call: 'pass', cards: [], ok: true, sips: 0, pass: true, pile: g.pile.length, t: c.now(), lost: 0 };
      stat(g, uid).passes = (stat(g, uid).passes || 0) + 1;
      nextPlayer(c);
      g.step += 1;
      return true;
    }
    if (v === 'mort') {
      const pairs = drawUntilPurple(() => draw(c, 2));
      const cards = pairs.flat();
      g.pile.push(...cards);
      g.step += 1;
      const s = stat(g, uid);
      s.calls += 1;
      s.good += 1;
      s.morts = (s.morts || 0) + 1;
      const sips = mortSips(pairs);
      const last = { uid, call: 'mort', cards: pairs[pairs.length - 1], pairs, ok: true, sips, gift: 0, pass: false, t: c.now(), lost: 0 };
      if (sips > 0) {
        c.pen(uid, sips, `Purple jusqu’à la mort : ${plural(sips, 'carte', 'cartes')} avant le purple`);
        s.drank += sips;
        s.worst = Math.max(s.worst, sips);
      } else {
        last.gift = MORT_GIFT;
        c.gift(uid, MORT_GIFT, 'Purple jusqu’à la mort du premier coup');
      }
      g.streak += 2;
      last.streak = g.streak;
      g.maxPile = Math.max(g.maxPile, g.pile.length);
      g.maxMort = Math.max(g.maxMort || 0, pairs.length);
      if (c.record) { c.record(uid, 'purple', g.streak); c.record(uid, 'mort', cards.length); }
      g.last = last;
      g.deckN = c.priv.deck.length;
      return true;
    }
    if (!available(g.pile).includes(v)) return false;
    const drawn = draw(c, v === 'purple' ? 2 : 1);
    const ok = judgePurple(v, g.pile, drawn, c.opts.ace);
    g.pile.push(...drawn);
    g.step += 1;
    const s = stat(g, uid);
    s.calls += 1;
    const last = { uid, call: v, cards: drawn, ok, sips: 0, pass: false, t: c.now(), lost: 0 };
    if (ok) {
      s.good += 1;
      g.streak += drawn.length;
      g.maxPile = Math.max(g.maxPile, g.pile.length);
      last.streak = g.streak;
      if (c.record) c.record(uid, 'purple', g.streak); // plus longue série de la soirée
    } else {
      if (c.count) c.count(uid, 'purpleFail');
      const n = g.pile.length;
      last.sips = n;
      c.pen(uid, n, `Purple : pile de ${n} carte${n > 1 ? 's' : ''}`);
      s.drank += n;
      s.worst = Math.max(s.worst, n);
      c.priv.discard.push(...g.pile);
      g.pile = [];
      last.lost = g.streak; // série cassée (pour l'animation de fumée)
      g.streak = 0;
    }
    g.last = last;
    g.deckN = c.priv.deck.length;
    return true;
  },

  actions({ S, g, online }) {
    const out = [];
    if (g.phase === 'play') {
      const cur = g.pl[g.turn];
      if (!online(cur)) out.push({ id: 'skip', label: `Passer le tour de ${nickOf(S, cur)}` });
      out.push({ id: 'end', label: 'Terminer la partie', confirm: 'Terminer la partie de Purple ?' });
    }
    return out;
  },

  act(c, id) {
    const g = c.g;
    if (id === 'skip' && g.phase === 'play') { nextPlayer(c); g.step += 1; return true; }
    if (id === 'end' && g.phase === 'play') {
      g.phase = 'end';
      g.summary = { rows: Object.entries(g.stats).filter(([u]) => c.roster[u]).map(([u, s]) => ({ u, ...s })) };
      return true;
    }
    return false;
  },

  bot({ g, req }) {
    // passe la main d'autant plus volontiers que la pile est grosse
    if (Math.random() < 0.06) return 'mort';
    if (req && req.canPass && Math.random() < Math.min(0.9, 0.45 + g.pile.length * 0.08)) return 'pass';
    const a = available(g.pile);
    if (g.pile.length >= 1 && Math.random() < 0.6) {
      const v = order(g.pile[g.pile.length - 1]);
      return v >= 9 ? 'moins' : v <= 6 ? 'plus' : Math.random() < 0.5 ? 'rouge' : 'noir';
    }
    return a[Math.floor(Math.random() * Math.min(3, a.length))];
  },

  turnOf(g) { return g.phase === 'play' ? g.pl[g.turn] : null; },

  Table,
  Act,
};

export default PURPLE;

// ---------------------------------------------------------------- affichage

// ---------------------------------------------------------------- animation « jusqu'à la mort »
function Mort({ S, L, step, clock, mine }) {
  const tl = mortTimeline(L.pairs.length);
  const el = clock ? clock() - L.t : tl.total;
  const [closed, setClosed] = useState(false);
  const [son, setSon] = useState(soundOn());
  const live = el < tl.total && !closed;
  useTicker(live, 90);
  useOnce(`mort:${step}`, () => {
    if (el > tl.end - 300) return; // animation déjà passée (reconnexion) : pas de son en retard
    drumRoll(tl.end - el);
    setTimeout(() => {
      cymbal();
      confetti(34);
      if (mine) buzz(L.gift ? [60, 40, 60, 40, 160] : [120, 60, 200]);
    }, Math.max(0, tl.end - el));
  });
  useEffect(() => () => stopSounds(), []);
  if (!live) return null;
  const shown = tl.at.filter((t) => t <= el).length;
  const done = el >= tl.end;
  const cur = shown ? L.pairs[shown - 1] : null;
  const heat = Math.min(6, Math.max(0, shown - 1));
  const drawn = shown * 2;
  return (
    <div class={`mort${done ? ' is-done' : ''}${isReduced() ? ' is-calm' : ''}`} style={{ '--heat': heat }} role="dialog" aria-label="Purple jusqu’à la mort" onClick={() => { if (done) setClosed(true); }}>
      <div class="mort-spots" aria-hidden="true"><i /><i /><i /><i /></div>
      <div class="mort-in">
        <p class="mort-who">{nickOf(S, L.uid)}</p>
        <h3 class="mort-title">Purple jusqu’à la mort</h3>
        <div class="mort-pair" key={shown}>
          {cur ? cur.map((c2, i) => <span key={c2} class="mort-card" style={{ '--d': `${i * 260}ms` }}><PlayingCard c={c2} size="l" flip /></span>) : (
            <><span class="mort-card"><PlayingCard c="AS" size="l" back /></span><span class="mort-card"><PlayingCard c="AH" size="l" back /></span></>
          )}
        </div>
        <p class="mort-count" aria-live="polite">Cartes tirées : <b>{drawn}</b></p>
        {shown > 1 && !done ? <p class="mort-strip" aria-hidden="true">{L.pairs.slice(0, shown - 1).map((p, i) => <span key={i} class="mort-mini">{p.map((c2) => <PlayingCard key={c2} c={c2} size="xs" flip />)}</span>)}</p> : null}
        {!done && shown >= 5 ? <p class="mort-taunt">{shown >= 8 ? 'On appelle les pompes funèbres ?' : 'Ça sent le sapin…'}</p> : null}
        {done ? (
          <div class="mort-end">
            <Stamp size="xl" tone="purple">PURPLE</Stamp>
            <p class="mort-verdict">{L.gift ? `Du premier coup ! ${nickOf(S, L.uid)} distribue ${plural(L.gift, 'gorgée', 'gorgées')}.` : `${plural(L.sips, 'carte', 'cartes')} avant le purple : ${nickOf(S, L.uid)} boit ${plural(L.sips, 'gorgée', 'gorgées')}.`}</p>
            <p class="mort-close">Touche pour fermer</p>
          </div>
        ) : null}
      </div>
      <button type="button" class="mort-son" aria-pressed={!son} onClick={(e) => { e.stopPropagation(); setSound(!son); setSon(!son); }}>{son ? 'Couper le son' : 'Son coupé'}</button>
    </div>
  );
}

function Table({ S, g, uid, clock, local }) {
  const L = g.last;
  const fresh = !!(L && L.t && clock && clock() - L.t < 1600);
  useTicker(fresh, 400);
  // vibration aux moments clés, sur le téléphone du joueur concerné
  useOnce(L && L.t ? `purple:${g.step}` : null, () => {
    if (!L || !(local || L.uid === uid) || !fresh || L.call === 'mort') return;
    if (!L.ok && L.lost >= 2) buzz([90, 40, 90]);
    else if (!L.ok) buzz(60);
    else if (L.streak >= 8) buzz([50, 30, 50, 30, 120]);
    else if (L.streak >= 5) buzz([40, 30, 40]);
  });
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const shown = g.pile.slice(-9);
  const broke = !!(L && !L.ok && L.lost >= 2 && fresh);
  return (
    <div class="purple">
      {L && L.call === 'mort' ? <Mort key={g.step} S={S} L={L} step={g.step} clock={clock} mine={local || L.uid === uid} /> : null}
      <div class="purple-head">
        <StreakFire streak={g.streak} smokeKey={broke ? `s${g.step}` : null} smoked={broke ? L.lost : 0} />
        <div class="chips">
          <span class="chip">Pile {g.pile.length}</span>
          <span class="chip">Pioche {g.deckN}</span>
          {g.streak >= PASS_AFTER ? <span class="chip">peut passer la main</span> : null}
        </div>
      </div>
      <div class="purple-pile paper kraft tape" aria-label={`Pile de ${g.pile.length} cartes`}>
        {shown.length ? shown.map((card, i) => (
          <span key={`${card}-${g.pile.length - shown.length + i}`} class="purple-slot" style={{ '--i': i }}>
            <PlayingCard c={card} size="m" flip={i === shown.length - 1} />
          </span>
        )) : <span class="purple-empty">Pile vide</span>}
      </div>
      {L ? (
        <div class={`purple-last paper pose${!L.ok && fresh ? ' shake' : ''}`} key={g.step}>
          {L.cards.length ? <span class="purple-last-cards">{L.cards.map((c2) => <PlayingCard key={c2} c={c2} size="xs" flip />)}</span> : null}
          {L.call === 'mort' ? (
            <span style={{ flex: 1 }}><b>{nickOf(S, L.uid)}</b> a tenté le Purple jusqu’à la mort : {plural(L.pairs.length * 2, 'carte tirée', 'cartes tirées')}.{L.gift ? ` Du premier coup, ${plural(L.gift, 'gorgée', 'gorgées')} à distribuer.` : ''}</span>
          ) : L.call === 'pass' ? (
            <span style={{ flex: 1 }}><b>{nickOf(S, L.uid)}</b> passe la main avec une pile de {plural(L.pile, 'carte', 'cartes')}.</span>
          ) : (
            <span style={{ flex: 1 }}>
              <b>{nickOf(S, L.uid)}</b> annonce « {LABEL[L.call]} » : {L.ok ? 'gagné' : 'perdu'}.
              {L.ok && L.streak >= PASS_AFTER ? ` Série de ${L.streak} : la main peut passer, ou on continue.` : ''}
              {!L.ok ? ' Pile bue, même joueur.' : ''}
            </span>
          )}
          {!L.ok || (L.call === 'mort' && L.sips) ? <Stamp>{plural(L.sips, 'gorgée', 'gorgées')}</Stamp> : null}
        </div>
      ) : <p class="muted center">Pile vide : rouge, noir ou purple ?</p>}
    </div>
  );
}

function End({ S, g, uid }) {
  const rows = (g.summary && g.summary.rows) || [];
  return (
    <div class="end">
      <h3 class="end-title">Bilan de Purple · plus grosse pile : {plural(g.maxPile, 'carte', 'cartes')}</h3>
      {g.maxMort ? <p class="muted center">Plus longue série jusqu’à la mort : {plural(g.maxMort * 2, 'carte', 'cartes')}.</p> : null}
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Joueur</th><th>Annonces</th><th>Réussies</th><th>Bues</th><th>Pire pile</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.calls}</td><td>{r.good}</td><td>{r.drank}</td><td>{r.worst}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}

function Act({ g, req, send, sent }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => { setArmed(false); }, [req.k]);
  useEffect(() => { if (!armed) return undefined; const t = setTimeout(() => setArmed(false), 4000); return () => clearTimeout(t); }, [armed]);
  const a = available(g.pile);
  const n = g.pile.length;
  const btn = (v, suits) => (
    <button type="button" class="btn btn-big" disabled={sent || !a.includes(v)} onClick={() => send(req.k, v)}>
      {LABEL[v]}{suits ? <span class="suits" aria-hidden="true">{suits}</span> : null}
    </button>
  );
  const last = g.pile[n - 1];
  return (
    <div class="act act-purple">
      <h3>À toi d’annoncer</h3>
      {req.canPass ? (
        <div class="purple-pass">
          <p>Série de {g.streak}. Tu peux passer la main avec la pile de {plural(n, 'carte', 'cartes')}, ou continuer à jouer.</p>
          <button type="button" class="btn btn-big btn-wide" disabled={sent} onClick={() => send(req.k, 'pass')}>Je passe la main</button>
        </div>
      ) : (
        <p class="hint">Encore {plural(PASS_AFTER - g.streak, 'carte réussie', 'cartes réussies')} d’affilée pour pouvoir passer la main.</p>
      )}
      <p class="hint">En cas d’erreur : {plural(n + 1, 'gorgée', 'gorgées')} ({n + 2} sur un Purple raté).</p>
      <div class="purple-btns">
        {btn('rouge', <span class="r">{'\u2665\uFE0E\u2666\uFE0E'}</span>)}
        {btn('noir', '\u2660\uFE0E\u2663\uFE0E')}
        {btn('purple', <><span class="r">{'\u2665\uFE0E'}</span>{'\u2660\uFE0E'}</>)}
      </div>
      {n >= 1 ? (
        <>
          <p class="hint">Par rapport {n >= 2 ? 'aux dernières cartes' : `à ${withArticle(last)}`} :</p>
          <div class="purple-btns">
            {btn('plus')}
            {btn('moins')}
            {n >= 2 ? btn('int') : null}
            {n >= 2 ? btn('ext') : null}
          </div>
        </>
      ) : null}
      <button type="button" class={`btn btn-wide btn-mort${armed ? ' is-armed' : ''}`} disabled={sent}
        onClick={() => { if (armed) { buzz(30); send(req.k, 'mort'); } else { buzz(15); setArmed(true); } }}>
        <span class="btn-mort-t">{armed ? 'T’es sûr ? Touche encore' : 'Purple jusqu’à la mort'}</span>
        <span class="btn-mort-d">{armed ? 'Une gorgée par carte tirée avant le purple' : 'Paires tirées jusqu’au purple'}</span>
      </button>
    </div>
  );
}

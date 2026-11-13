// Toutankhamon — règles validées par Thierry :
// • Taille du tombeau au choix (3 à 6 rangées). Chaque joueur reçoit 4 cartes.
// • On les regarde 30 secondes, puis elles sont cachées : il faut s'en souvenir.
// • On retourne le tombeau carte par carte, en partant de la base. Chaque rangée fait donner des gorgées :
//   ×1 pour la base, ×2 pour la rangée au-dessus, etc.
// • Si tu as (ou prétends avoir) une carte de même valeur, tu donnes ces gorgées à quelqu'un.
//   Il te croit et boit, ou t'accuse de mentir : si tu mentais, tu bois le double ; sinon, c'est lui.
// • À la fin, test de mémoire : redis tes cartes, chaque erreur coûte une gorgée.
// • Pendant la mémorisation, chacun peut changer l'ordre de ses cartes pour mieux s'en souvenir
//   (demande de Thierry). L'ordre choisi est gardé par l'hôte et réutilisé pour la révélation finale.

import { useState } from 'preact/hooks';
import { newDeck, rankOf, RANKS, label, withArticle } from '../lib/cards.js';
import { PlayingCard, Who, nickOf, Waiting, Av, PlayerGrid, useTicker, Stamp, Vs } from '../ui/common.jsx';
import { plural } from '../lib/util.js';

const RANK_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
const rankLabel = (r) => label(r + 'S');
const MEMO_MS = 30000;

function layout(rows) {
  const out = [];
  for (let row = 1; row <= rows; row++) {
    const count = rows - row + 1;
    for (let i = 0; i < count; i++) out.push({ row, mult: row, c: null });
  }
  return out;
}

function claimsOpen(g) { return g.claims.filter((x) => x.status === 'pending'); }

function startPlay(c) {
  const g = c.g;
  g.phase = 'play';
  g.memoUntil = 0;
  // les cartes disparaissent des téléphones : il faut s'en souvenir
  for (const u of g.pl) c.setSecret(u, { game: 'tomb', gid: g.gid, hand: null, n: (c.priv.hands[u] || []).length });
}

function flipNext(c) {
  const g = c.g;
  if (g.idx >= g.tomb.length - 1) return false;
  g.idx += 1;
  const card = c.priv.tomb[g.idx];
  g.tomb[g.idx].c = card;
  g.flip = { idx: g.idx, rank: rankOf(card), mult: g.tomb[g.idx].mult };
  g.claimed = {};
  return true;
}

function judge(c, claim, verdict) {
  const g = c.g;
  const P = c.priv;
  if (verdict === 'ok') {
    claim.status = 'ok';
    c.pen(claim.to, claim.sips, `Toutankhamon : ${c.name(claim.from)} t’a donné`);
    return;
  }
  const hand = P.hands[claim.from] || [];
  const idx = [];
  hand.forEach((card, i) => { if (rankOf(card) === claim.rank && idx.length < claim.n) idx.push(i); });
  if (idx.length >= claim.n) {
    claim.status = 'true';
    claim.loser = claim.to;
    c.pen(claim.to, claim.sips * 2, 'Toutankhamon : accusation à tort');
    g.known[claim.from] = Array.from(new Set([...(g.known[claim.from] || []), ...idx]));
    g.shown[claim.from] = g.known[claim.from].map((i) => hand[i]);
  } else {
    claim.status = 'liar';
    claim.loser = claim.from;
    c.pen(claim.from, claim.sips * 2, 'Toutankhamon : menteur démasqué');
  }
}

function toRecall(c) {
  const g = c.g;
  g.phase = 'recall';
  g.recalled = {};
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  g.hands = {};
  for (const u of g.pl) { g.hands[u] = viewOf(c, u); c.setSecret(u, null); }
}

// ordre d'affichage choisi par le joueur (permutation des cartes reçues)
export function validPerm(p, n) {
  return Array.isArray(p) && p.length === n && p.every((x) => Number.isInteger(x) && x >= 0 && x < n) && new Set(p).size === n;
}
function viewOf(c, u) {
  const hand = c.priv.hands[u] || [];
  const p = c.priv.view && c.priv.view[u];
  return validPerm(p, hand.length) ? p.map((i) => hand[i]) : hand.slice();
}

// cartes encore cachées d'un joueur (celles qui n'ont pas été révélées par une accusation)
export function hiddenCards(hand, known) {
  return hand.filter((_, i) => !(known || []).includes(i));
}

export function countErrors(hidden, said) {
  const left = hidden.map(rankOf);
  let ok = 0;
  for (const r of said) {
    const i = left.indexOf(r);
    if (i >= 0) { ok += 1; left.splice(i, 1); }
  }
  return hidden.length - ok;
}

const TOUTANKHAMON = {
  id: 'toutankhamon',
  name: 'Toutankhamon',
  tagline: 'Tu mémorises tes cartes, puis tu donnes ou tu bluffes à chaque carte retournée. Test de mémoire à la fin.',
  min: 2,
  local: true,
  rules: [
    'Chaque joueur reçoit 4 cartes et les regarde 30 secondes. Ensuite, elles sont cachées : il faut s’en souvenir.',
    'Les cartes du tombeau sont retournées une à une, en partant de la base. La base fait donner 1 gorgée, la rangée au-dessus 2, et ainsi de suite.',
    'Si tu as une carte de la même valeur que celle retournée, annonce-le et donne les gorgées à quelqu’un (2 cartes = le double). Tu peux aussi bluffer.',
    'Celui qui reçoit te croit et boit, ou t’accuse de mentir. Si tu mentais, tu bois le double. Si tu disais vrai, c’est lui qui boit le double et ta carte est révélée.',
    'À la fin, test de mémoire : redis tes cartes encore cachées. Chaque erreur coûte une gorgée.',
  ],
  options: [
    { id: 'rows', label: 'Taille du tombeau', choices: [[3, '3 rangées'], [4, '4 rangées'], [5, '5 rangées'], [6, '6 rangées']], def: 4 },
  ],

  start(c) {
    const pl = c.activeUids();
    const rows = c.opts.rows || 4;
    const tomb = layout(rows);
    const decks = tomb.length + pl.length * 4 > 52 ? 2 : 1;
    const deck = newDeck(decks);
    c.priv.tomb = deck.splice(0, tomb.length);
    c.priv.hands = {};
    c.priv.view = {};
    for (const u of pl) c.priv.hands[u] = deck.splice(0, 4);
    const g = {
      gid: c.rid(5), pl, rows, decks, tomb, idx: -1, flip: null, claims: [], claimed: {}, known: {}, shown: {},
      phase: 'memo', ready: {}, memoUntil: c.isLocal ? 0 : c.now() + MEMO_MS, recalled: {}, results: {}, hands: null,
    };
    c.g = g;
    c.S.game.g = g;
    for (const u of pl) c.setSecret(u, { game: 'tomb', gid: g.gid, hand: c.priv.hands[u].slice(), n: 4, perm: [0, 1, 2, 3] });
    return g;
  },

  request({ g, uid, secret, local }) {
    if (!g.pl.includes(uid)) return null;
    if (g.phase === 'memo' && !g.ready[uid]) return { k: `m${g.gid}`, kind: 'memo', secret: true };
    if (g.phase === 'play') {
      const judgeMe = g.claims.find((x) => x.status === 'pending' && x.to === uid);
      if (judgeMe) return { k: `j${judgeMe.id}`, kind: 'judge', claim: judgeMe };
      if (!local && g.flip && !g.claimed[uid]) return { k: `c${g.flip.idx}`, kind: 'claim', optional: true };
    }
    if (g.phase === 'recall' && !g.recalled[uid]) return { k: `r${g.gid}`, kind: 'recall', secret: true };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (!g.pl.includes(uid)) return false;
    if (g.phase === 'memo' && k === `o${g.gid}` && !g.ready[uid]) {
      // nouvel ordre des cartes (aide-mémoire du joueur)
      const hand = c.priv.hands[uid] || [];
      if (!validPerm(v, hand.length)) return false;
      c.priv.view[uid] = v.slice();
      c.setSecret(uid, { game: 'tomb', gid: g.gid, hand: hand.slice(), n: hand.length, perm: v.slice() });
      return true;
    }
    if (g.phase === 'memo' && k === `m${g.gid}` && !g.ready[uid]) {
      g.ready[uid] = true;
      if (g.pl.filter((u) => c.roster[u] && c.online(u)).every((u) => g.ready[u])) startPlay(c);
      return true;
    }
    if (g.phase === 'play' && k.startsWith('c') && g.flip && k === `c${g.flip.idx}` && !g.claimed[uid]) {
      if (!v || typeof v.to !== 'string' || v.to === uid || !g.pl.includes(v.to) || ![1, 2].includes(v.n)) return false;
      g.claimed[uid] = true;
      const claim = { id: c.rid(5), from: uid, to: v.to, n: v.n, rank: g.flip.rank, sips: g.flip.mult * v.n, flip: g.flip.idx, status: 'pending' };
      g.claims.push(claim);
      if (g.claims.length > 60) g.claims.splice(0, g.claims.length - 60);
      return true;
    }
    if (g.phase === 'play' && k.startsWith('j')) {
      const claim = g.claims.find((x) => `j${x.id}` === k && x.to === uid && x.status === 'pending');
      if (!claim || !['ok', 'liar'].includes(v)) return false;
      judge(c, claim, v);
      return true;
    }
    if (g.phase === 'recall' && k === `r${g.gid}` && !g.recalled[uid]) {
      const hidden = hiddenCards(c.priv.hands[uid] || [], g.known[uid]);
      if (!Array.isArray(v) || v.length !== hidden.length || !v.every((r) => RANK_ORDER.includes(r))) return false;
      const errors = countErrors(hidden, v);
      g.recalled[uid] = true;
      g.results[uid] = { errors, said: v.slice() };
      if (errors > 0) c.pen(uid, errors, 'Toutankhamon : test de mémoire');
      if (g.pl.filter((u) => c.roster[u] && c.online(u)).every((u) => g.recalled[u])) finish(c);
      return true;
    }
    return false;
  },

  actions({ g }) {
    if (g.phase === 'memo') {
      const n = Object.keys(g.ready).length;
      return [{ id: 'play', label: `Cacher les cartes et commencer (${n}/${g.pl.length} prêts)` }];
    }
    if (g.phase === 'play') {
      const open = claimsOpen(g).length;
      if (g.idx < g.tomb.length - 1) return [{ id: 'flip', label: g.idx < 0 ? 'Retourner la première carte' : 'Retourner la carte suivante', primary: true }];
      return [{ id: 'recall', label: open ? `Test de mémoire (${open} annonce${open > 1 ? 's' : ''} en attente)` : 'Passer au test de mémoire', primary: true, confirm: open ? 'Des annonces attendent une réponse. Passer quand même ?' : null }];
    }
    if (g.phase === 'recall') return [{ id: 'finish', label: 'Révéler toutes les cartes', confirm: 'Terminer sans attendre les derniers joueurs ?' }];
    return [];
  },

  act(c, id) {
    const g = c.g;
    if (id === 'play' && g.phase === 'memo') { startPlay(c); return true; }
    if (id === 'flip' && g.phase === 'play') return flipNext(c);
    if (id === 'recall' && g.phase === 'play') {
      // les annonces sans réponse sont acceptées
      for (const cl of claimsOpen(g)) judge(c, cl, 'ok');
      toRecall(c);
      return true;
    }
    if (id === 'finish' && g.phase === 'recall') { finish(c); return true; }
    return false;
  },

  tick(c) {
    const g = c.g;
    if (g.phase === 'memo' && g.memoUntil && c.now() >= g.memoUntil) { startPlay(c); return true; }
    if (g.phase === 'recall') {
      const need = g.pl.filter((u) => c.roster[u] && c.online(u));
      if (need.length && need.every((u) => g.recalled[u])) { finish(c); return true; }
    }
    return false;
  },

  cleanup(c) { for (const u of (c.g && c.g.pl) || []) c.setSecret(u, null); },

  observe(mem, g, secret) {
    if (secret && secret.game === 'tomb' && secret.gid === g.gid && secret.hand) { mem.gid = g.gid; mem.hand = secret.hand.slice(); }
  },

  bot({ g, uid, req, mem }) {
    const rnd = (a) => a[Math.floor(Math.random() * a.length)];
    const hand = mem && mem.gid === g.gid ? mem.hand || [] : [];
    if (req.kind === 'memo') return true;
    if (req.kind === 'judge') return Math.random() < 0.3 ? 'liar' : 'ok';
    if (req.kind === 'claim') {
      const has = hand.filter((x) => rankOf(x) === g.flip.rank).length;
      if ((has && Math.random() < 0.7) || Math.random() < 0.08) return { to: rnd(g.pl.filter((u) => u !== uid)), n: has >= 2 ? 2 : 1 };
      return undefined;
    }
    if (req.kind === 'recall') {
      const hidden = hiddenCards(hand, g.known[uid]).map(rankOf);
      return hidden.map((r) => (Math.random() < 0.85 ? r : rnd(RANK_ORDER)));
    }
    return undefined;
  },

  Table,
  Act,
};

export default TOUTANKHAMON;

// ---------------------------------------------------------------- affichage

const STATUS = {
  pending: 'en attente de réponse',
  ok: 'cru sur parole',
  true: 'accusé à tort : c’était vrai',
  liar: 'menteur démasqué',
};

function TombView({ g }) {
  const rows = [];
  for (let row = g.rows; row >= 1; row--) {
    const cells = g.tomb.map((p, i) => ({ ...p, i })).filter((p) => p.row === row);
    rows.push(
      <div class="tomb-row" key={row}>
        <span class="tomb-mult">×{row}</span>
        <div class="tomb-cards">
          {cells.map((p) => (
            <span key={p.i} class={`tomb-cell${g.idx === p.i ? ' is-now' : ''}`}>
              {p.c ? <PlayingCard c={p.c} size="s" flip={g.idx === p.i} /> : <PlayingCard c="2S" back size="s" />}
            </span>
          ))}
        </div>
      </div>,
    );
  }
  return <div class="tomb paper kraft tape">{rows}</div>;
}

function LocalClaim({ S, g, sendAs }) {
  const [from, setFrom] = useState(null);
  const [n, setN] = useState(1);
  if (!g.flip) return null;
  const free = g.pl.filter((u) => S.roster[u] && !g.claimed[u]);
  if (!free.length) return null;
  if (!from) {
    return (
      <div class="panel">
        <p><b>Quelqu’un a un {rankLabel(g.flip.rank)} ?</b> Celui qui l’annonce touche son nom.</p>
        <div class="chips">{free.map((u) => <button type="button" key={u} class="btn btn-small" onClick={() => setFrom(u)}>{nickOf(S, u)}</button>)}</div>
      </div>
    );
  }
  return (
    <div class="panel">
      <p><b>{nickOf(S, from)}</b> annonce un {rankLabel(g.flip.rank)}. À qui donne-t-il ?</p>
      <div class="seg">
        {[1, 2].map((x) => <button type="button" key={x} class={`seg-btn${n === x ? ' is-on' : ''}`} onClick={() => setN(x)}>{x === 1 ? '1 carte' : '2 cartes'} ({g.flip.mult * x})</button>)}
      </div>
      <PlayerGrid S={S} uids={g.pl.filter((u) => u !== from && S.roster[u])} onPick={(u) => { sendAs(from, `c${g.flip.idx}`, { to: u, n }); setFrom(null); setN(1); }} />
      <button type="button" class="btn btn-ghost" onClick={() => setFrom(null)}>Annuler</button>
    </div>
  );
}

function Table({ S, g, uid, clock, local, sendAs }) {
  const memoLeft = g.phase === 'memo' && g.memoUntil ? Math.max(0, Math.ceil((g.memoUntil - clock()) / 1000)) : 0;
  useTicker(g.phase === 'memo' && !!g.memoUntil, 500);
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const claims = g.flip ? g.claims.filter((x) => x.flip === g.flip.idx) : [];
  return (
    <div class="tombeau">
      <TombView g={g} />
      {g.phase === 'memo' ? (
        <Waiting>Mémorisation des cartes{memoLeft ? ` : ${memoLeft} s` : ''} ({Object.keys(g.ready).length} / {g.pl.length} prêts)</Waiting>
      ) : null}
      {g.phase === 'play' && g.flip ? (
        <div class="tomb-flip paper pose" key={g.flip.idx}>
          <PlayingCard c={g.tomb[g.flip.idx].c} size="m" flip />
          <p>Un <b>{rankLabel(g.flip.rank)}</b> en rangée ×{g.flip.mult} : celui qui en a un donne {plural(g.flip.mult, 'gorgée', 'gorgées')}.</p>
        </div>
      ) : null}
      {g.phase === 'play' && !g.flip ? <p class="muted center">L’hôte retourne la première carte quand tout le monde est prêt.</p> : null}
      {g.phase === 'play' && local ? <LocalClaim S={S} g={g} sendAs={sendAs} /> : null}
      {claims.length ? (
        <ul class="claims">
          {claims.map((cl) => (
            <li key={cl.id} class={`claim is-${cl.status}`}>
              <span><Vs a={nickOf(S, cl.from)} b={nickOf(S, cl.to)} /> {cl.n > 1 ? 'deux' : 'un'} {rankLabel(cl.rank)}, <span class="count">{plural(cl.sips, 'gorgée', 'gorgées')}</span></span>
              <span class="claim-st">{STATUS[cl.status]}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {Object.keys(g.shown).length ? (
        <div class="tomb-shown">
          <p class="muted small">Cartes révélées</p>
          {Object.entries(g.shown).map(([u, cards]) => (
            <span key={u} class="tomb-shown-row"><Who S={S} uid={u} you={uid} />{cards.map((c2, i) => <PlayingCard key={i} c={c2} size="xs" />)}</span>
          ))}
        </div>
      ) : null}
      {g.phase === 'recall' ? <Waiting>Test de mémoire en cours ({Object.keys(g.recalled).length}/{g.pl.length})</Waiting> : null}
    </div>
  );
}

function End({ S, g, uid }) {
  return (
    <div class="end">
      <h3 class="end-title">Test de mémoire</h3>
      <ul class="tomb-hands">
        {g.pl.filter((u) => S.roster[u]).map((u) => {
          const r = g.results[u];
          return (
            <li key={u}>
              <span class="tomb-hand-who"><Who S={S} uid={u} you={uid} /> {r ? (r.errors ? <Stamp size="s">{plural(r.errors, 'erreur', 'erreurs')}</Stamp> : 'sans faute') : 'pas répondu'}</span>
              <span class="tomb-hand-cards">{(g.hands[u] || []).map((c2, i) => <PlayingCard key={i} c={c2} size="xs" />)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- actions du joueur

function Memo({ g, secret, req, send, post, sent }) {
  const hand = secret.hand;
  const [perm, setPerm] = useState(() => (validPerm(secret.perm, hand.length) ? secret.perm.slice() : hand.map((_, i) => i)));
  const [sel, setSel] = useState(null);
  const apply = (p) => {
    setPerm(p);
    setSel(null);
    if (post) post(`o${g.gid}`, p);
  };
  const tap = (pos) => {
    if (sel === null) { setSel(pos); return; }
    if (sel === pos) { setSel(null); return; }
    const p = perm.slice();
    [p[sel], p[pos]] = [p[pos], p[sel]];
    apply(p);
  };
  const byRank = (a, b) => RANK_ORDER.indexOf(rankOf(hand[a])) - RANK_ORDER.indexOf(rankOf(hand[b]));
  const SUIT_ORDER = 'SHDC';
  const bySuit = (a, b) => SUIT_ORDER.indexOf(hand[a][1]) - SUIT_ORDER.indexOf(hand[b][1]) || byRank(a, b);
  return (
    <div class="act act-memo">
      <h3>Mémorise tes cartes</h3>
      <p class="hint">Touche une carte puis une autre pour les échanger. Range-les dans l’ordre qui t’aide à t’en souvenir.</p>
      <div class="hand">
        {perm.map((i, pos) => (
          <PlayingCard key={`${hand[i]}-${i}`} c={hand[i]} size="l" sel={sel === pos} disabled={sent} onClick={() => tap(pos)} />
        ))}
      </div>
      <div class="bus-btns two">
        <button type="button" class="btn" disabled={sent} onClick={() => apply(perm.slice().sort(byRank))}>Ranger par valeur</button>
        <button type="button" class="btn" disabled={sent} onClick={() => apply(perm.slice().sort(bySuit))}>Ranger par couleur</button>
      </div>
      <p class="hint center">Elles disparaîtront ensuite : il faudra t’en souvenir jusqu’à la fin.</p>
      <button type="button" class="btn btn-main btn-big" disabled={sent} onClick={() => send(req.k, true)}>J’ai mémorisé</button>
    </div>
  );
}

function Act({ S, g, secret, uid, req, send, post, sent, clock }) {
  if (req.kind === 'memo') {
    const ok = secret && secret.game === 'tomb' && secret.gid === g.gid && secret.hand;
    if (!ok) return <Waiting>Distribution des cartes.</Waiting>;
    return <Memo key={req.k} g={g} secret={secret} req={req} send={send} post={post} sent={sent} />;
  }
  if (req.kind === 'judge') {
    const cl = req.claim;
    return (
      <div class="act act-judge">
        <h3>{nickOf(S, cl.from)} te donne {plural(cl.sips, 'gorgée', 'gorgées')}</h3>
        <p>Il annonce {cl.n > 1 ? 'deux' : 'un'} {rankLabel(cl.rank)}. Tu le crois ?</p>
        <div class="bus-btns two">
          <button type="button" class="btn btn-big btn-main" disabled={sent} onClick={() => send(req.k, 'ok')}>Je te crois, je bois</button>
          <button type="button" class="btn btn-big btn-danger" disabled={sent} onClick={() => send(req.k, 'liar')}>Menteur</button>
        </div>
        <p class="hint">Menteur et tu as raison : il boit {cl.sips * 2}. Tu as tort : tu bois {cl.sips * 2}.</p>
      </div>
    );
  }
  if (req.kind === 'claim') return <Claim S={S} g={g} uid={uid} req={req} send={send} sent={sent} />;
  if (req.kind === 'recall') return <Recall g={g} uid={uid} req={req} send={send} sent={sent} />;
  return null;
}

function Claim({ S, g, uid, req, send, sent }) {
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(1);
  if (!open) {
    return (
      <div class="act act-claim">
        <p>Tu as un <b>{rankLabel(g.flip.rank)}</b> ? (ou tu bluffes…)</p>
        <button type="button" class="btn btn-big btn-main" disabled={sent} onClick={() => setOpen(true)}>J’en ai un, je donne {g.flip.mult}</button>
      </div>
    );
  }
  return (
    <div class="act act-claim">
      <h3>À qui donnes-tu ?</h3>
      <div class="seg">
        {[1, 2].map((x) => <button type="button" key={x} class={`seg-btn${n === x ? ' is-on' : ''}`} onClick={() => setN(x)}>{x === 1 ? 'J’en ai un' : 'J’en ai deux'} ({g.flip.mult * x})</button>)}
      </div>
      <PlayerGrid S={S} uids={g.pl.filter((u) => u !== uid && S.roster[u])} onPick={(u) => send(req.k, { to: u, n })} disabled={sent} />
      <button type="button" class="btn btn-ghost" onClick={() => setOpen(false)}>Finalement non</button>
    </div>
  );
}

function Recall({ g, uid, req, send, sent }) {
  const known = g.known[uid] || [];
  const need = 4 - known.length;
  const [said, setSaid] = useState([]);
  return (
    <div class="act act-recall">
      <h3>Test de mémoire</h3>
      <p class="muted">Quelles étaient tes {plural(need, 'carte cachée', 'cartes cachées')} ? (la valeur suffit)</p>
      <div class="recall-slots">
        {Array.from({ length: need }, (_, i) => (
          <span key={i} class={`recall-slot${said[i] ? ' is-on' : ''}`}>{said[i] ? rankLabel(said[i]) : '?'}</span>
        ))}
      </div>
      <div class="rank-grid">
        {RANK_ORDER.map((r) => (
          <button type="button" key={r} class="key" disabled={sent || said.length >= need} onClick={() => setSaid([...said, r])}>{rankLabel(r)}</button>
        ))}
      </div>
      <div class="bus-btns two">
        <button type="button" class="btn" disabled={sent || !said.length} onClick={() => setSaid(said.slice(0, -1))}>Effacer</button>
        <button type="button" class="btn btn-main" disabled={sent || said.length !== need} onClick={() => send(req.k, said)}>Valider</button>
      </div>
    </div>
  );
}

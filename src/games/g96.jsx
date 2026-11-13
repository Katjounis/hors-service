// Le 96 — règles validées par Thierry :
// • 4 cartes en main (secrètes), on repioche après chaque carte posée.
// • Valeurs : As 1, 2→10 valeur faciale, Valet 0, Dame −10. Le Roi ne s'ajoute pas : il met le total à 70
//   (précision de Thierry). Le total ne descend pas sous 0.
// • LE TOTAL N'EST JAMAIS AFFICHÉ : chacun annonce le nouveau total à voix haute (et le tape),
//   les autres doivent s'en souvenir. Annonce fausse : cul sec, et le bon total est révélé.
// • Le premier joueur (dans l'ordre des places) qui a un 10 commence en le posant ; sinon le premier joueur.
// • Total pile sur une dizaine (10…90), y compris en descendant ou avec un Valet : le joueur distribue
//   autant de gorgées que le chiffre des dizaines, réparties comme il veut.
// • Interdit de dépasser 96 (96 pile autorisé). Le joueur pose la carte qu'il veut.
//   Au-delà de 96 → bus seul. Pile 100 → bus avec un passager qui boit la même chose.
// • Bus : 5 cartes en ligne ; plus / moins / égalité sur chacune. Juste → carte suivante (la carte tirée
//   recouvre). Faux → la carte tirée remplace, on boit le numéro de la carte ratée et on recommence.
//   Égalité non annoncée : +5 gorgées. Égalité annoncée juste : on donne 5 gorgées.
//   L'As joue toujours en faveur du joueur (plus fort et plus faible).
// • Après le bus : nouvelle partie (nouvelle donne, total à 0). Deux paquets au-delà de 8 joueurs ;
//   paquet vide → on remélange les cartes posées.

import { useEffect, useState } from 'preact/hooks';
import { newDeck, rankOf, isCard, order, withArticle } from '../lib/cards.js';
import { PlayingCard, Who, nickOf, PlayerGrid, Waiting, Av, Stamp, Ribbon, useTicker } from '../ui/common.jsx';
import { buzz, useOnce } from '../ui/fx.jsx';
import { Icon } from '../ui/icons.jsx';
import { plural } from '../lib/util.js';

const VALUE = { A: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, T: 10, J: 0, Q: -10 };
export const KING_TOTAL = 70;
// valeur ajoutée par une carte (le Roi n'en a pas : il fixe le total)
export const value96 = (c) => (rankOf(c) === 'K' ? null : VALUE[rankOf(c)]);
export const after96 = (total, c) => (rankOf(c) === 'K' ? KING_TOTAL : Math.max(0, total + VALUE[rankOf(c)]));

function effectOf(total) {
  if (total > 96) return total === 100 ? { lose: true, hundred: true } : { lose: true };
  if (total > 0 && total % 10 === 0) return { dz: total / 10 };
  return {};
}

// ---------------------------------------------------------------- logique (exécutée par l'hôte)

function stat(g, uid) {
  g.stats[uid] = g.stats[uid] || { bus: 0, mate: 0, dz: 0, give: 0, err: 0 };
  return g.stats[uid];
}

function draw(c, n = 1) {
  const P = c.priv;
  const out = [];
  for (let i = 0; i < n; i++) {
    if (!P.deck.length) {
      if (!P.discard.length) break;
      P.deck = c.shuffle(P.discard);
      P.discard = [];
      c.g.reshuffles += 1;
    }
    out.push(P.deck.pop());
  }
  return out;
}

function publishHands(c) {
  const g = c.g;
  const P = c.priv;
  g.handN = {};
  for (const u of g.pl) {
    const hand = P.hands[u] || [];
    g.handN[u] = hand.length;
    c.setSecret(u, { game: '96', round: g.round, hand: hand.slice() });
  }
  g.deckN = P.deck.length;
}

function deal(c) {
  const g = c.g;
  const P = c.priv;
  const pl = c.S.order.filter((u) => c.roster[u] && c.online(u));
  g.pl = pl;
  g.decks = pl.length > 8 ? 2 : 1;
  g.round += 1;
  g.n = 0;
  g.last = null;
  g.bus = null;
  g.nextAt = 0;
  g.reshuffles = 0;
  P.total = 0; // le total reste chez l'hôte : jamais publié
  P.deck = newDeck(g.decks);
  P.discard = [];
  P.hands = {};
  for (const u of pl) { P.hands[u] = draw(c, 4); stat(g, u); }
  const starter = pl.findIndex((u) => P.hands[u].some((x) => rankOf(x) === 'T'));
  g.turn = starter >= 0 ? starter : 0;
  g.mustTen = starter >= 0;
  g.turnId = c.rid(5);
  g.phase = 'play';
  publishHands(c);
}

function nextTurn(c) {
  const g = c.g;
  for (let i = 1; i <= g.pl.length; i++) {
    const j = (g.turn + i) % g.pl.length;
    if (c.roster[g.pl[j]]) { g.turn = j; break; }
  }
  g.turnId = c.rid(5);
}

function play(c, uid, idx, card, said) {
  const g = c.g;
  const P = c.priv;
  const hand = P.hands[uid];
  hand.splice(idx, 1);
  P.discard.push(card);
  const before = P.total;
  const after = after96(before, card);
  P.total = after;
  const fx = effectOf(after);
  g.n += 1;
  g.mustTen = false;
  const last = { uid, c: card, n: g.n };
  if (fx.lose) {
    // fin de la manche : on peut révéler le total
    Object.assign(last, { lose: true, hundred: !!fx.hundred, reveal: after, before });
    g.last = last;
    startBus(c, uid, !!fx.hundred, after);
    publishHands(c);
    return;
  }
  last.ok = said === after;
  // annonce juste : le total s'affiche en grand chez tout le monde quelques secondes (jamais une annonce fausse)
  if (last.ok) { last.total = after; last.t = c.now(); }
  if (!last.ok) {
    last.said = said;
    last.reveal = after;
    c.penCS(uid, 'Mauvaise annonce au 96');
    stat(g, uid).err += 1;
  }
  if (fx.dz) {
    last.dz = fx.dz;
    c.gift(uid, fx.dz, 'Dizaine au 96');
    const s = stat(g, uid);
    s.dz += 1;
    s.give += fx.dz;
  }
  g.last = last;
  hand.push(...draw(c, 1));
  nextTurn(c);
  publishHands(c);
}

function startBus(c, uid, hundred, total) {
  const g = c.g;
  const P = c.priv;
  P.busDeck = newDeck(1);
  const line = P.busDeck.splice(0, 5);
  g.bus = { who: uid, mate: null, hundred, line, pos: 0, step: 0, last: null, drunk: 0, done: false };
  g.phase = hundred ? 'mate' : 'bus';
  stat(g, uid).bus += 1;
  c.ev(`${c.name(uid)} ${hundred ? 'tombe pile sur 100' : `dépasse 96 (${total})`} : direction le bus.`, '*', 'game');
}

// résultat d'une annonce dans le bus
export function judgeBus(call, prev, drawn) {
  const op = order(prev);
  const od = order(drawn);
  const eq = op === od;
  const ace = rankOf(prev) === 'A' || rankOf(drawn) === 'A';
  let ok;
  if (call === 'egal') ok = eq;
  else if (ace) ok = true; // l'As est à la fois le plus fort et le plus faible : toujours en ta faveur
  else if (eq) ok = false;
  else ok = call === 'plus' ? od > op : od < op;
  const eqPenalty = !ok && eq && call !== 'egal';
  return { ok, eq, eqPenalty };
}

function busGuess(c, call) {
  const g = c.g;
  const P = c.priv;
  const b = g.bus;
  if (!P.busDeck || !P.busDeck.length) P.busDeck = newDeck(1);
  const drawn = P.busDeck.pop();
  const prev = b.line[b.pos];
  const { ok, eq, eqPenalty } = judgeBus(call, prev, drawn);
  b.line[b.pos] = drawn;
  b.step += 1;
  const res = { call, prev, drawn, ok, eq, pos: b.pos, sips: 0, gave: 0 };
  if (ok) {
    if (call === 'egal') {
      c.gift(b.who, 5, 'Égalité annoncée dans le bus');
      res.gave = 5;
      stat(g, b.who).give += 5;
    }
    b.pos += 1;
    if (b.pos >= 5) {
      b.done = true;
      res.done = true;
      g.phase = 'busdone';
      g.nextAt = c.now() + 4000;
      c.ev(`${c.name(b.who)} descend du bus.`, '*', 'game');
    }
  } else {
    const sips = b.pos + 1 + (eqPenalty ? 5 : 0);
    res.sips = sips;
    res.eqPenalty = eqPenalty;
    c.pen(b.who, sips, 'Bus du 96');
    if (b.mate && c.roster[b.mate]) c.pen(b.mate, sips, `Passager du bus de ${c.name(b.who)}`);
    b.drunk += sips;
    b.pos = 0;
  }
  b.last = res;
}

function afterBus(c) {
  const g = c.g;
  const max = c.opts.rounds || 0;
  if (max && g.round >= max) finish(c);
  else deal(c);
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  for (const u of g.pl) c.setSecret(u, null);
  const rows = Object.entries(g.stats).filter(([u]) => c.roster[u]).map(([u, s]) => ({ u, ...s }));
  const top = (k) => {
    const m = Math.max(0, ...rows.map((r) => r[k]));
    return m > 0 ? rows.filter((r) => r[k] === m).map((r) => r.u) : [];
  };
  g.summary = {
    rounds: g.round,
    rows,
    awards: [
      { t: 'Abonné(e) au bus', u: top('bus') },
      { t: 'Roi ou reine des dizaines', u: top('dz') },
      { t: 'Mémoire de poisson rouge', u: top('err') },
      { t: 'Meilleur(e) passager(e)', u: top('mate') },
    ].filter((a) => a.u.length),
  };
}

const G96 = {
  id: '96',
  name: 'Le 96',
  tagline: 'On additionne les cartes de tête sans dépasser 96. Le total n’est jamais affiché. Mauvaise annonce : cul sec.',
  min: 2,
  local: true,
  rules: [
    'Chacun a 4 cartes secrètes et en repioche une après chaque carte posée.',
    'Valeurs : As 1, de 2 à 10 leur valeur, Valet 0, Dame −10. Le Roi ne s’ajoute pas : quand on pose un Roi, le total passe à 70, quel qu’il soit avant. Le total ne descend jamais sous 0.',
    'L’appli n’affiche jamais le total : quand tu poses une carte, annonce le nouveau total à voix haute et tape-le. Les autres doivent s’en souvenir.',
    'Annonce fausse : cul sec, et l’appli révèle le bon total pour continuer.',
    'Le premier joueur (dans l’ordre des places) qui a un 10 commence en le posant. Sinon, le premier joueur commence.',
    'Si le total tombe pile sur une dizaine (10, 20… 90), tu distribues autant de gorgées que le chiffre des dizaines : 30 = 3 gorgées. Ça compte aussi en descendant avec une Dame, ou avec un Valet posé sur une dizaine.',
    'Interdit de dépasser 96 (96 pile est autorisé). Tu poses la carte que tu veux : au-delà de 96, tu prends le bus.',
    'Pile 100 : tu prends le bus, mais tu emmènes un passager qui boit la même chose que toi.',
    'Le bus : 5 cartes en ligne. Sur chacune, annonce plus, moins ou égalité pour la carte tirée. Juste : carte suivante. Faux : tu bois le numéro de la carte ratée (2e carte = 2) et tu repars du début.',
    'Égalité non annoncée : 5 gorgées en plus. Égalité annoncée et juste : tu donnes 5 gorgées. L’As est à la fois la plus forte et la plus faible carte : il joue toujours en ta faveur.',
    'Quand tu descends du bus, nouvelle partie : nouvelles cartes, total à 0.',
  ],
  options: [
    { id: 'rounds', label: 'Fin de partie', choices: [[0, 'Quand l’hôte arrête'], [3, 'Après 3 bus'], [5, 'Après 5 bus']], def: 0 },
  ],

  start(c) {
    const g = { round: 0, n: 0, pl: [], stats: {}, phase: 'play', turn: 0, turnId: '', handN: {}, deckN: 0, reshuffles: 0, last: null };
    c.g = g;
    c.S.game.g = g;
    deal(c);
    return g;
  },

  request({ g, uid }) {
    if (g.phase === 'play' && g.pl[g.turn] === uid) return { k: `t${g.turnId}`, kind: 'hand', secret: true };
    if (g.phase === 'mate' && g.bus && g.bus.who === uid) return { k: `m${g.round}`, kind: 'mate' };
    if (g.phase === 'bus' && g.bus && g.bus.who === uid) return { k: `b${g.round}.${g.bus.step}`, kind: 'bus' };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    const P = c.priv;
    if (g.phase === 'play' && k === `t${g.turnId}` && g.pl[g.turn] === uid) {
      const hand = P.hands[uid] || [];
      if (!v || typeof v.i !== 'number' || !isCard(v.c) || hand[v.i] !== v.c) return false;
      if (!Number.isInteger(v.a) || v.a < 0 || v.a > 999) return false;
      if (g.mustTen && rankOf(v.c) !== 'T') return false;
      play(c, uid, v.i, v.c, v.a);
      return true;
    }
    if (g.phase === 'mate' && k === `m${g.round}` && g.bus && g.bus.who === uid) {
      if (typeof v !== 'string' || v === uid || !g.pl.includes(v) || !c.roster[v]) return false;
      g.bus.mate = v;
      stat(g, v).mate += 1;
      g.phase = 'bus';
      c.ev(`${c.name(uid)} emmène ${c.name(v)} dans le bus`, '*', 'game');
      return true;
    }
    if (g.phase === 'bus' && g.bus && g.bus.who === uid && k === `b${g.round}.${g.bus.step}`) {
      if (!['plus', 'moins', 'egal'].includes(v)) return false;
      busGuess(c, v);
      return true;
    }
    return false;
  },

  actions({ S, g, online }) {
    const out = [];
    if (g.phase === 'play') {
      const cur = g.pl[g.turn];
      if (!online(cur)) out.push({ id: 'skip', label: `Passer le tour de ${nickOf(S, cur)}` });
    }
    if ((g.phase === 'bus' || g.phase === 'mate') && g.bus && !online(g.bus.who)) {
      out.push({ id: 'abandon', label: 'Arrêter ce bus (joueur absent)' });
    }
    if (g.phase === 'busdone') out.push({ id: 'next', label: 'Nouvelle partie maintenant', primary: true });
    if (g.phase !== 'end') out.push({ id: 'finish', label: 'Terminer la partie', confirm: 'Terminer la partie de 96 ?' });
    return out;
  },

  act(c, id) {
    const g = c.g;
    if (id === 'skip' && g.phase === 'play') {
      g.mustTen = false;
      nextTurn(c);
      return true;
    }
    if (id === 'abandon' && (g.phase === 'bus' || g.phase === 'mate')) { afterBus(c); return true; }
    if (id === 'next' && g.phase === 'busdone') { afterBus(c); return true; }
    if (id === 'finish' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  tick(c) {
    const g = c.g;
    if (g.phase === 'busdone' && g.nextAt && c.now() >= g.nextAt) { afterBus(c); return true; }
    return false;
  },

  cleanup(c) {
    for (const u of (c.g && c.g.pl) || []) c.setSecret(u, null);
  },

  // joueur automatique (démo) : il retient le total comme un humain, en écoutant chaque coup
  observe(mem, g) {
    if (mem.round !== g.round) { mem.round = g.round; mem.n = 0; mem.total = 0; mem.lost = false; }
    const L = g.last;
    if (!L || L.n === mem.n) return;
    if (L.n !== mem.n + 1) mem.lost = true;
    if (L.reveal != null) { mem.total = L.reveal; mem.lost = false; } else mem.total = after96(mem.total, L.c);
    mem.n = L.n;
  },

  bot({ g, secret, uid, req, mem }) {
    const rnd = (a) => a[Math.floor(Math.random() * a.length)];
    if (req.kind === 'hand') {
      const hand = secret && secret.game === '96' && secret.round === g.round ? secret.hand : null;
      if (!hand || !hand.length) return undefined;
      const total = mem && mem.round === g.round ? mem.total : 0;
      const opts = hand.map((card, i) => ({ c: card, i, t: after96(total, card) })).filter((o) => !g.mustTen || rankOf(o.c) === 'T');
      if (!opts.length) return undefined;
      const safe = opts.filter((o) => o.t <= 96);
      const dz = safe.filter((o) => o.t > 0 && o.t % 10 === 0);
      const hundred = opts.filter((o) => o.t === 100);
      const pool = dz.length && Math.random() < 0.7 ? dz : safe.length ? safe : hundred.length ? hundred : opts;
      const o = rnd(pool);
      // une fois sur dix, le joueur automatique se trompe dans son annonce
      const a = Math.random() < 0.1 ? o.t + rnd([-2, -1, 1, 3]) : o.t;
      return { i: o.i, c: o.c, a: Math.max(0, a) };
    }
    if (req.kind === 'mate') return rnd(g.pl.filter((u) => u !== uid));
    if (req.kind === 'bus') {
      const o = order(g.bus.line[g.bus.pos]);
      if (Math.random() < 0.05) return 'egal';
      if (o >= 10) return 'moins';
      if (o <= 6) return 'plus';
      return Math.random() < 0.5 ? 'plus' : 'moins';
    }
    return undefined;
  },

  // joueur à mettre en avant en haut de l'écran
  turnOf(g) {
    if (g.phase === 'play') return g.pl[g.turn];
    if ((g.phase === 'bus' || g.phase === 'mate') && g.bus) return g.bus.who;
    return null;
  },

  Table,
  Act,
};

export default G96;

// ---------------------------------------------------------------- affichage

// Passage dans le bus : ruban jaune et noir plein écran pendant 1 s
function BusFlash({ id }) {
  const [on, setOn] = useState(true);
  useEffect(() => { setOn(true); const t = setTimeout(() => setOn(false), 1000); return () => clearTimeout(t); }, [id]);
  return on ? <div class="busflash" role="status"><span>Le bus</span></div> : null;
}

function BusLine({ g, S, uid }) {
  const b = g.bus;
  return (
    <div class="bus">
      <Ribbon>Le bus</Ribbon>
      <div class="bus-head">
        <Who S={S} uid={b.who} you={uid} />{b.mate ? <> avec <Who S={S} uid={b.mate} you={uid} /></> : null}
      </div>
      <div class="bus-line">
        {b.line.map((card, i) => (
          <div key={i} class={`bus-slot${i === b.pos && !b.done ? ' is-now' : ''}${i < b.pos || b.done ? ' is-ok' : ''}`}>
            <PlayingCard c={card} size="s" />
            <span class="bus-num">{i + 1}</span>
          </div>
        ))}
      </div>
      {b.last ? <BusResult S={S} b={b} /> : <p class="muted center">Plus, moins ou égalité pour la carte n° 1.</p>}
      {b.drunk ? <p class="muted center">Déjà bu dans ce bus : <span class="count">{plural(b.drunk, 'gorgée', 'gorgées')}</span>{b.mate ? ' chacun' : ''}.</p> : null}
    </div>
  );
}

const CALL = { plus: 'Plus', moins: 'Moins', egal: 'Égalité' };

function BusResult({ S, b }) {
  const r = b.last;
  return (
    <div class="bus-res paper pose" key={b.step}>
      <span class="bus-res-cards"><PlayingCard c={r.prev} size="xs" /><Icon name="arrow" size={18} label="puis" /><PlayingCard c={r.drawn} size="xs" flip /></span>
      <span>
        « {CALL[r.call]} » sur la carte {r.pos + 1} : <b>{r.ok ? 'juste' : 'raté'}</b>.
        {r.ok && r.gave ? <> Égalité annoncée : {nickOf(S, b.who)} donne 5 gorgées.</> : null}
        {!r.ok ? <> {plural(r.sips, 'gorgée', 'gorgées')}{r.eqPenalty ? ' (dont 5 pour l’égalité non annoncée)' : ''}{b.mate ? ' pour les deux' : ''}, retour au début.</> : null}
        {r.done ? <> <b>Descente du bus.</b></> : null}
      </span>
    </div>
  );
}

function LastPlay({ S, last }) {
  const who = nickOf(S, last.uid);
  return (
    <div class="g96-last paper pose" key={`${last.n}-${last.c}`}>
      <PlayingCard c={last.c} size="s" flip />
      <div>
        <p><b>{who}</b> a posé {withArticle(last.c)}.</p>
        {last.lose ? (
          <p class="g96-fx">{last.before} + … = <span class="count">{last.reveal}</span>. {last.hundred ? 'Pile 100 : bus avec passager.' : 'Plus de 96 : direction le bus.'}</p>
        ) : null}
        {!last.lose && last.ok ? <p class="g96-ok">Annonce juste.</p> : null}
        {!last.lose && last.ok === false ? (
          <>
            <p class="g96-fx">Annonce fausse ({last.said}). Le total était <span class="count">{last.reveal}</span>.</p>
            <p style={{ marginTop: '10px' }}><Stamp>Cul sec</Stamp></p>
          </>
        ) : null}
        {last.dz ? <p class="g96-fx">Dizaine. {who} distribue {plural(last.dz, 'gorgée', 'gorgées')}.</p> : null}
      </div>
    </div>
  );
}

// annonce juste : le total en très grand, par-dessus le jeu, puis il disparaît (on doit toujours le retenir)
export const BIG_MS = 2600;
function BigTotal({ S, last, clock }) {
  const el = clock && last.t ? clock() - last.t : BIG_MS;
  const live = el < BIG_MS;
  useTicker(live, 200);
  useOnce(live ? `96big:${last.n}` : null, () => buzz(35));
  if (!live) return null;
  return (
    <div class="g96-big" role="status" aria-live="assertive" aria-label={`Annonce juste : ${last.total}`}>
      <span class="g96-big-who">{nickOf(S, last.uid)} annonce juste</span>
      <span class="g96-big-n">{last.total}</span>
    </div>
  );
}

function Table({ S, g, uid, clock }) {
  const cur = g.pl[g.turn];
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const inBus = g.bus && (g.phase === 'bus' || g.phase === 'mate' || g.phase === 'busdone');
  return (
    <div class="g96">
      <div class="g96-top">
        <span class="chip">Partie {g.round}</span>
        <span class="chip">Pioche {g.deckN}</span>
        {g.decks > 1 ? <span class="chip">2 paquets</span> : null}
      </div>
      {g.bus && !g.bus.last && (g.phase === 'mate' || g.phase === 'bus') ? <BusFlash id={`${g.round}-${g.bus.who}`} /> : null}
      {!inBus ? (
        <div class="g96-hidden paper tape" aria-label="Total caché">
          <span class="g96-q" aria-hidden="true">?</span>
          <span class="g96-hidden-t">Le total n’est pas affiché. Retiens la dernière annonce.</span>
        </div>
      ) : null}
      {g.last && g.last.ok && g.last.total != null ? <BigTotal key={g.last.n} S={S} last={g.last} clock={clock} /> : null}
      {g.last ? <LastPlay S={S} last={g.last} /> : (
        <p class="muted center">{g.mustTen ? <><b>{nickOf(S, cur)}</b> a un 10 et commence en le posant.</> : <>Personne n’a de 10. <b>{nickOf(S, cur)}</b> commence.</>}</p>
      )}

      {g.phase === 'play' ? (
        <div class="seats">
          {g.pl.map((u) => (
            <div key={u} class={`seat${u === cur ? ' is-turn' : ''}${S.roster[u] ? '' : ' is-gone'}`}>
              <Av p={S.roster[u]} size="m" />
              <span class="seat-name">{u === uid ? 'Toi' : nickOf(S, u)}</span>
              <span class="seat-cards" aria-label={`${g.handN[u] || 0} cartes`}>{'▮'.repeat(g.handN[u] || 0)}</span>
            </div>
          ))}
        </div>
      ) : null}
      {g.phase === 'mate' ? <Waiting>{nickOf(S, g.bus.who)} choisit qui l’accompagne dans le bus.</Waiting> : null}
      {inBus ? <BusLine g={g} S={S} uid={uid} /> : null}
      {g.phase === 'busdone' ? <p class="center big">Nouvelle partie dans un instant.</p> : null}
    </div>
  );
}

function End({ S, g, uid }) {
  const s = g.summary || { rows: [], awards: [] };
  return (
    <div class="end">
      <h3 class="end-title">Bilan du 96 · {plural(s.rounds, 'partie jouée', 'parties jouées')}</h3>
      {s.awards.length ? (
        <div class="awards">
          {s.awards.map((a) => (
            <div class="award" key={a.t}>
              <span class="award-t">{a.t}</span>
              <span class="award-who">{a.u.map((u) => <Who key={u} S={S} uid={u} you={uid} />)}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Joueur</th><th>Bus</th><th>Passager</th><th>Dizaines</th><th>Erreurs</th></tr></thead>
          <tbody>
            {s.rows.map((r) => (
              <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.bus}</td><td>{r.mate}</td><td>{r.dz}</td><td>{r.err}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- interactions du joueur

function Act({ S, g, secret, uid, req, send, sent }) {
  if (req.kind === 'hand') return <Hand key={req.k} g={g} secret={secret} req={req} send={send} sent={sent} />;
  if (req.kind === 'mate') {
    const others = g.pl.filter((u) => u !== uid && S.roster[u]);
    return (
      <div class="act">
        <h3>Pile 100. Qui t’accompagne dans le bus ?</h3>
        <p class="muted">Ton passager boira la même chose que toi jusqu’à ce que tu descendes.</p>
        <PlayerGrid S={S} uids={others} onPick={(u) => send(req.k, u)} disabled={sent} />
      </div>
    );
  }
  if (req.kind === 'bus') {
    const b = g.bus;
    const card = b.line[b.pos];
    return (
      <div class="act act-bus">
        <h3>Carte {b.pos + 1} sur 5</h3>
        <div class="bus-now"><PlayingCard c={card} size="l" /></div>
        <p class="muted center">La prochaine carte sera…</p>
        <div class="bus-btns">
          <button type="button" class="btn btn-big" disabled={sent} onClick={() => send(req.k, 'plus')}>Plus</button>
          <button type="button" class="btn btn-big" disabled={sent} onClick={() => send(req.k, 'egal')}>Égalité</button>
          <button type="button" class="btn btn-big" disabled={sent} onClick={() => send(req.k, 'moins')}>Moins</button>
        </div>
        <p class="hint">Égalité annoncée et juste : tu donnes 5 gorgées. Égalité non annoncée : 5 gorgées en plus. L’As joue toujours en ta faveur.</p>
      </div>
    );
  }
  return null;
}

function Hand({ g, secret, req, send, sent }) {
  const [sel, setSel] = useState(null);
  const [num, setNum] = useState('');
  const hand = secret && secret.game === '96' && secret.round === g.round ? secret.hand : null;
  if (!hand) return <Waiting>Distribution de tes cartes…</Waiting>;
  const choice = sel != null && hand[sel] ? hand[sel] : null;
  const press = (d) => setNum((x) => (x === '0' ? String(d) : (x + d).slice(0, 3)));
  const go = () => { if (choice && num !== '') send(req.k, { i: sel, c: choice, a: Number(num) }); };
  return (
    <div class="act act-hand">
      <h3>Ta main</h3>
      {g.mustTen ? <p class="note">Tu commences : pose ton 10 et annonce 10.</p>
        : <p class="hint">Pars de la dernière annonce que tu as entendue.</p>}
      <div class="hand">
        {hand.map((card, i) => (
          <PlayingCard key={card + i} c={card} size="l" sel={sel === i} disabled={sent || (g.mustTen && rankOf(card) !== 'T')}
            onClick={() => setSel(i)} />
        ))}
      </div>
      {choice ? (
        <div class="announce announce-sheet" role="dialog" aria-label="Annonce le nouveau total">
          <div class="announce-top">
            <PlayingCard c={choice} size="s" />
            <p>Annonce le total <b>à voix haute</b>, puis tape-le</p>
            <button type="button" class="icon-btn" aria-label="Changer de carte" onClick={() => { setSel(null); setNum(''); }}><Icon name="close" /></button>
          </div>
          <div class="announce-num" aria-live="polite">{num === '' ? '…' : num}</div>
          <div class="keypad">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => <button type="button" key={d} class="key" disabled={sent} onClick={() => press(d)}>{d}</button>)}
            <button type="button" class="key" aria-label="Effacer" disabled={sent || !num} onClick={() => setNum(num.slice(0, -1))}><Icon name="erase" size={26} /></button>
            <button type="button" class="key" disabled={sent} onClick={() => press(0)}>0</button>
            <button type="button" class="key key-ok" disabled={sent || num === ''} onClick={go}>Poser</button>
          </div>
        </div>
      ) : <p class="hint center">Choisis la carte à poser.</p>}
    </div>
  );
}

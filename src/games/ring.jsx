// Le Ring : à chaque manche, deux joueurs tirés au sort s'affrontent, les autres parient.
// • Duel au téléphone (pierre, feuille, ciseaux en secret) ou défi en vrai, tranché par la table.
// • Le perdant boit, les mauvais parieurs aussi.
import { Who, nickOf, Av, Stamp, useTicker } from '../ui/common.jsx';
import { plural } from '../lib/util.js';

export const DEFIS_RING = [
  'Bras de fer de pouces.',
  'Concours de regard : le premier qui cligne ou rigole a perdu.',
  'Le premier qui cite cinq marques de bière.',
  'Le plus longtemps sur un pied, les yeux fermés.',
  'Meilleure imitation d’un mouton. La table tranche.',
  'Le premier qui ramène un objet rouge.',
  'Le plus de pompes en 20 secondes.',
  'Concours de grimaces. La table tranche.',
  'Le premier qui finit un verre d’eau.',
  'L’alphabet à l’envers : le plus loin sans se tromper.',
  'Battle de compliments : le premier qui sèche a perdu.',
  'Tirer la langue le plus longtemps sans rire.',
  'Le premier qui fait rire l’autre a gagné.',
  'Dix secondes de beatbox chacun. La table tranche.',
  'Le premier qui cite six pays qui commencent par M.',
  'Le plus rapide à enlever puis remettre une chaussette.',
  'Chanter le refrain le plus ringard possible. La table tranche.',
  'Le premier qui trouve trois choses bleues dans la pièce.',
];
const CF = { p: 'Pierre', f: 'Feuille', c: 'Ciseaux' };
const BEATS = { p: 'c', f: 'p', c: 'f' };

function present(c, g) { return g.pl.filter((u) => c.roster[u] && (g.local || c.online(u))); }

function newRound(c) {
  const g = c.g;
  const pl = present(c, g);
  if (pl.length < 2) { finish(c); return; }
  // ceux qui ont le moins combattu passent en premier
  const sorted = c.shuffle(pl.slice()).sort((x, y) => (g.fights[x] || 0) - (g.fights[y] || 0));
  const [a, b] = sorted;
  g.n += 1;
  g.a = a; g.b = b;
  g.fights[a] = (g.fights[a] || 0) + 1; g.fights[b] = (g.fights[b] || 0) + 1;
  g.kind = Math.random() < 0.5 ? 'cf' : 'irl';
  const p = c.priv;
  p.deck = p.deck && p.deck.length ? p.deck : c.shuffle(DEFIS_RING.map((_, i) => i));
  g.defi = g.kind === 'irl' ? DEFIS_RING[p.deck.pop()] : null;
  g.try = 1;
  g.picked = {};
  p.picks = {};
  p.bets = {};
  g.betters = [];
  g.res = null;
  g.tieMsg = false;
  g.phase = !g.local && pl.length > 2 ? 'bet' : 'duel';
}

function spectators(c, g) { return present(c, g).filter((u) => u !== g.a && u !== g.b); }

function resolve(c, win) {
  const g = c.g;
  const lose = win === g.a ? g.b : g.a;
  const sips = Number(c.opts.sips) || 2;
  c.pen(lose, sips, `Le Ring : perdu contre ${c.name(win)}`);
  g.wins[win] = (g.wins[win] || 0) + 1;
  const bets = c.priv.bets || {};
  const right = []; const wrong = [];
  for (const [u, side] of Object.entries(bets)) {
    if (!c.roster[u]) continue;
    if ((side === 'a' ? g.a : g.b) === win) right.push(u); else { wrong.push(u); c.pen(u, 1, 'Le Ring : mauvais pari'); }
  }
  g.res = { win, lose, right, wrong, picks: g.kind === 'cf' ? { ...c.priv.picks } : null, at: c.now() };
  g.phase = 'res';
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  const rows = g.pl.filter((u) => c.roster[u]).map((u) => ({ u, w: g.wins[u] || 0, f: g.fights[u] || 0 })).sort((a, b) => b.w - a.w || a.f - b.f);
  g.summary = { rows, rounds: g.n };
}

const RING = {
  id: 'ring',
  name: 'Le Ring',
  tagline: 'Deux joueurs tirés au sort, un duel, et la table qui parie.',
  min: 3,
  local: true,
  rules: [
    'À chaque manche, deux joueurs montent sur le ring. Les autres parient sur le gagnant depuis leur téléphone.',
    'Le duel : soit pierre, feuille, ciseaux en secret sur le téléphone, soit un défi en vrai que la table tranche.',
    'Le perdant boit (2 gorgées par défaut). Chaque mauvais parieur boit une gorgée.',
    'Égalité à pierre, feuille, ciseaux : on rejoue tout de suite.',
    'Sur un seul téléphone, pas de paris : chacun passe le téléphone pour jouer son coup en secret.',
  ],
  options: [
    { id: 'sips', label: 'Le perdant boit', choices: [[2, '2 gorgées'], [3, '3 gorgées'], [4, '4 gorgées']], def: 2 },
    { id: 'rounds', label: 'Nombre de manches', choices: [[6, '6'], [10, '10'], [0, 'Sans fin']], def: 6 },
  ],

  start(c) {
    const g = { pl: c.activeUids(), n: 0, local: !!c.isLocal, max: c.opts.rounds || 0, fights: {}, wins: {}, phase: 'bet' };
    c.g = g;
    c.S.game.g = g;
    newRound(c);
    return g;
  },

  request({ g, uid }) {
    if (g.phase === 'bet' && uid !== g.a && uid !== g.b && g.pl.includes(uid) && !g.betters.includes(uid)) return { k: `b${g.n}`, kind: 'bet' };
    if (g.phase === 'duel' && g.kind === 'cf' && (uid === g.a || uid === g.b) && !g.picked[uid]) return { k: `c${g.n}.${g.try}`, kind: 'cf', secret: true };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (g.phase === 'bet' && k === `b${g.n}` && uid !== g.a && uid !== g.b && g.pl.includes(uid) && !g.betters.includes(uid) && (v === 'a' || v === 'b')) {
      c.priv.bets[uid] = v;
      g.betters.push(uid);
      if (spectators(c, g).every((u) => g.betters.includes(u))) g.phase = 'duel';
      return true;
    }
    if (g.phase === 'duel' && g.kind === 'cf' && k === `c${g.n}.${g.try}` && (uid === g.a || uid === g.b) && !g.picked[uid] && CF[v]) {
      c.priv.picks[uid] = v;
      g.picked[uid] = true;
      if (g.picked[g.a] && g.picked[g.b]) {
        const pa = c.priv.picks[g.a]; const pb = c.priv.picks[g.b];
        if (pa === pb) { g.try += 1; g.picked = {}; c.priv.picks = {}; g.tieMsg = CF[pa]; return true; }
        resolve(c, BEATS[pa] === pb ? g.a : g.b);
      }
      return true;
    }
    return false;
  },

  tick(c) {
    const g = c.g;
    // un combattant parti : la manche est rejouée avec d'autres
    if ((g.phase === 'bet' || g.phase === 'duel') && !g.local && (!c.online(g.a) || !c.online(g.b))) { newRound(c); return true; }
    if (g.phase === 'bet' && spectators(c, g).every((u) => g.betters.includes(u))) { g.phase = 'duel'; return true; }
    return false;
  },

  actions({ g }) {
    if (g.phase === 'bet') return [{ id: 'go', label: `Fin des paris (${plural(g.betters.length, 'pari', 'paris')})`, primary: true }];
    if (g.phase === 'duel') return [{ id: 'reroll', label: 'Autre défi' }, { id: 'skip', label: 'Annuler ce duel' }, { id: 'end', label: 'Arrêter là', confirm: 'Arrêter la partie et voir le bilan ?' }];
    if (g.phase === 'res') {
      if (g.max && g.n >= g.max) return [{ id: 'end', label: 'Bilan', primary: true }];
      return [{ id: 'next', label: 'Manche suivante', primary: true }, { id: 'end', label: 'Arrêter là', confirm: 'Arrêter la partie et voir le bilan ?' }];
    }
    return [];
  },

  act(c, id, arg) {
    const g = c.g;
    if (id === 'go' && g.phase === 'bet') { g.phase = 'duel'; return true; }
    if (id === 'win' && g.phase === 'duel' && g.kind === 'irl' && arg && (arg.uid === g.a || arg.uid === g.b)) { resolve(c, arg.uid); return true; }
    if (id === 'reroll' && g.phase === 'duel') {
      const p = c.priv;
      g.kind = 'irl';
      p.deck = p.deck && p.deck.length ? p.deck : c.shuffle(DEFIS_RING.map((_, i) => i));
      g.defi = DEFIS_RING[p.deck.pop()];
      g.picked = {}; p.picks = {};
      return true;
    }
    if (id === 'skip' && g.phase === 'duel') { if (g.max && g.n >= g.max) finish(c); else newRound(c); return true; }
    if (id === 'next' && g.phase === 'res') { if (g.max && g.n >= g.max) finish(c); else newRound(c); return true; }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  turnOf() { return null; },
  tintOf() { return 'ring'; },
  bot({ req }) {
    if (req.kind === 'bet') return Math.random() < 0.5 ? 'a' : 'b';
    return ['p', 'f', 'c'][Math.floor(Math.random() * 3)];
  },

  Table,
  Act,
};
export default RING;

// ---------------------------------------------------------------- affichage

function Corner({ S, u, uid, tag, win, lose }) {
  return (
    <div class={`ring-corner${win ? ' is-win' : ''}${lose ? ' is-lose' : ''}`}>
      <Av p={S.roster[u]} size="xl" mood={win ? 'win' : lose ? 'drink' : null} />
      <b class="ring-name">{nickOf(S, u)}</b>
      <span class="ring-tag">{tag}</span>
    </div>
  );
}

function Table({ S, g, uid, dev, clock }) {
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  if (!S.roster[g.a] || !S.roster[g.b]) return <p class="muted center">Changement de combattants…</p>;
  const r = g.res;
  return (
    <div class="ring">
      <div class="ose-top">
        <span class="chip">{`Manche ${g.n}${g.max ? ` / ${g.max}` : ''}`}</span>
        <span class="chip">{g.kind === 'cf' ? 'Pierre, feuille, ciseaux' : 'Défi en vrai'}</span>
      </div>
      <div class="ring-mat" key={g.n}>
        <Corner S={S} u={g.a} uid={uid} tag="Coin rouge" win={r && r.win === g.a} lose={r && r.lose === g.a} />
        <span class="ring-vs" aria-hidden="true">VS</span>
        <Corner S={S} u={g.b} uid={uid} tag="Coin bleu" win={r && r.win === g.b} lose={r && r.lose === g.b} />
      </div>
      {g.kind === 'irl' && g.defi ? <p class="ring-defi paper">{g.defi}</p> : null}
      {g.phase === 'bet' ? <p class="muted center">{`Paris ouverts : ${plural(g.betters.length, 'pari reçu', 'paris reçus')}.`}</p> : null}
      {g.phase === 'duel' && g.kind === 'cf' ? (
        <p class="center">{g.tieMsg ? `Égalité (${g.tieMsg}), on rejoue. ` : ''}{'Chacun choisit son coup en secret.'}</p>
      ) : null}
      {g.phase === 'duel' && g.kind === 'irl' && dev && dev.isHost ? (
        <div class="ring-judge">
          <p class="center">Qui a gagné ?</p>
          <div class="bus-btns two">
            <button type="button" class="btn btn-big" onClick={() => dev.host('game', { id: 'win', arg: { uid: g.a } })}>{nickOf(S, g.a)}</button>
            <button type="button" class="btn btn-big" onClick={() => dev.host('game', { id: 'win', arg: { uid: g.b } })}>{nickOf(S, g.b)}</button>
          </div>
        </div>
      ) : null}
      {g.phase === 'duel' && g.kind === 'irl' && !(dev && dev.isHost) ? <p class="muted center">L’hôte désigne le gagnant.</p> : null}
      {g.phase === 'res' && r ? <Result S={S} g={g} uid={uid} clock={clock} /> : null}
    </div>
  );
}

function Result({ S, g, uid, clock }) {
  const r = g.res;
  const wait = Math.max(0, r.at + 500 - clock());
  useTicker(wait > 0, 120);
  if (wait > 0) return <div class="suspense" role="status">Et le gagnant est…</div>;
  const sips = (S.game && S.game.opts && Number(S.game.opts.sips)) || 2;
  return (
    <div class="verdict paper tape">
      {r.picks ? <p class="center ring-picks">{`${CF[r.picks[g.a]]} contre ${CF[r.picks[g.b]]}`}</p> : null}
      <span class="ose-lead">K.-O.</span>
      <div class="verdict-who"><Who S={S} uid={r.lose} size="l" you={uid} /></div>
      <div class="verdict-line"><Stamp size="l">{plural(sips, 'gorgée', 'gorgées')}</Stamp></div>
      {r.wrong.length ? <p class="center small">{`Mauvais paris, une gorgée : ${r.wrong.map((u) => nickOf(S, u)).join(', ')}`}</p> : null}
      {r.right.length ? <p class="center small muted">{`Bien vu : ${r.right.map((u) => nickOf(S, u)).join(', ')}`}</p> : null}
    </div>
  );
}

function End({ S, g, uid }) {
  const s = g.summary || { rows: [] };
  const top = s.rows.length && s.rows[0].w > 0 ? s.rows.filter((r) => r.w === s.rows[0].w) : [];
  return (
    <div class="end">
      <h3 class="end-title">{`Bilan · ${plural(s.rounds || 0, 'manche', 'manches')}`}</h3>
      {top.length ? <div class="awards"><div class="award"><span class="award-t">Champion du Ring</span><span class="award-who">{top.map((r) => <Who key={r.u} S={S} uid={r.u} you={uid} />)}</span></div></div> : null}
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Joueur</th><th>Victoires</th><th>Combats</th></tr></thead>
        <tbody>{s.rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.w}</td><td>{r.f}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}

function Act({ S, g, req, send, sent }) {
  if (req.kind === 'bet') {
    return (
      <div class="act">
        <h3>Ton pari</h3>
        <p class="muted">Mauvais pari : une gorgée.</p>
        <div class="bus-btns two">
          <button type="button" class="btn btn-big" disabled={sent} onClick={() => send(req.k, 'a')}>{nickOf(S, g.a)}</button>
          <button type="button" class="btn btn-big" disabled={sent} onClick={() => send(req.k, 'b')}>{nickOf(S, g.b)}</button>
        </div>
      </div>
    );
  }
  return (
    <div class="act">
      <h3>Ton coup</h3>
      <p class="muted">Secret jusqu’à la révélation.</p>
      <div class="ring-cf">
        {Object.entries(CF).map(([k, lab]) => <button type="button" key={k} class="btn btn-big" disabled={sent} onClick={() => send(req.k, k)}>{lab}</button>)}
      </div>
    </div>
  );
}

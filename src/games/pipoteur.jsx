// Pipoteur — règles validées par Thierry :
// • Les civils ont tous le même mot. Le pipoteur a un mot proche et ne sait pas qu'il est le pipoteur.
// • 1 pipoteur jusqu'à 6 joueurs, 2 au-delà. Le Blanc-Bec (aucun mot, il le sait) à partir de 5 joueurs.
// • Chaque tour : chacun donne un indice à voix haute dans l'ordre affiché (le Blanc-Bec ne commence jamais),
//   puis vote secret pour éliminer quelqu'un. L'éliminé révèle son rôle.
// • Égalité : nouveau vote entre les ex æquo ; nouvelle égalité : personne n'est éliminé, nouveau tour.
// • Le Blanc-Bec éliminé peut deviner le mot des civils : s'il trouve, il gagne seul.
// • Les civils gagnent quand tous les pipoteurs et le Blanc-Bec sont éliminés ; les infiltrés gagnent
//   quand il ne reste qu'un civil.

import { useState } from 'preact/hooks';
import { NIVEAUX_MOTS, combos } from '../content/mots.js';
import { Who, nickOf, PlayerGrid, Waiting, Av, Stamp, Vs } from '../ui/common.jsx';
import { Icon } from '../ui/icons.jsx';
import { plural, norm } from '../lib/util.js';

const ROLE = { civil: 'Civil', pipo: 'Pipoteur', bb: 'Blanc-Bec' };
const ROLE_PL = { civils: 'Les civils', pipoteurs: 'Les pipoteurs', bb: 'Le Blanc-Bec' };

export const LEVELS = ['soft', 'hard', 'cul'];
export function levelAllowed(lv, level, adult = false) {
  const n = NIVEAUX_MOTS[lv];
  return !!n && n.need <= level && (!n.adult || adult === true);
}
// combinaisons déjà tirées pendant la soirée (le tirage tourne chez l'hôte) : pas de doublon tant qu'il en reste
const USED = new Set();
export function pickWords(lvls, maxProx, rnd = Math.random) {
  let pool = [];
  for (const l of lvls) pool = pool.concat(combos(l, maxProx));
  if (!pool.length) pool = combos('soft', 2);
  const key = (x) => `${x.lv}:${x.f}:${x.j}`;
  let free = pool.filter((x) => !USED.has(key(x)));
  if (!free.length) { for (const x of pool) USED.delete(key(x)); free = pool; }
  // on tire d'abord une famille (pour ne pas favoriser les familles à beaucoup de voisins), puis un voisin
  const fams = [...new Set(free.map((x) => `${x.lv}:${x.f}`))];
  const fam = fams[Math.floor(rnd() * fams.length)];
  const inFam = free.filter((x) => `${x.lv}:${x.f}` === fam);
  const pick = inFam[Math.floor(rnd() * inFam.length)];
  USED.add(key(pick));
  const swap = rnd() < 0.5;
  return { civil: swap ? pick.b : pick.a, pipo: swap ? pick.a : pick.b, lv: pick.lv };
}
export function resetUsed() { USED.clear(); }

function aliveOnline(c, g) { return g.alive.filter((u) => c.roster[u] && c.online(u)); }

function startClues(c) {
  const g = c.g;
  const P = c.priv;
  g.r += 1;
  let order = c.shuffle(g.alive);
  // le Blanc-Bec ne commence jamais
  if (order.length > 1 && P.roles[order[0]] === 'bb') {
    const j = 1 + Math.floor(Math.random() * (order.length - 1));
    [order[0], order[j]] = [order[j], order[0]];
  }
  g.order = order;
  g.phase = 'clues';
  g.voted = {};
  g.cand = null;
  g.revote = false;
  g.res = null;
  P.votes = {};
}

function openVote(c, cand) {
  const g = c.g;
  g.phase = 'vote';
  g.cand = cand;
  g.voted = {};
  c.priv.votes = {};
}

function resolveVote(c) {
  const g = c.g;
  const P = c.priv;
  const counts = {};
  for (const t of Object.values(P.votes)) counts[t] = (counts[t] || 0) + 1;
  const max = Math.max(0, ...Object.values(counts));
  const top = max > 0 ? g.cand.filter((u) => counts[u] === max) : [];
  g.res = { counts, who: { ...P.votes }, top, revote: g.revote };
  if (top.length === 1) { eliminate(c, top[0]); return; }
  if (!g.revote && top.length > 1) {
    g.revote = true;
    openVote(c, top);
    g.revote = true;
    return;
  }
  // nouvelle égalité (ou aucun vote) : personne n'est éliminé
  g.last = { none: true };
  g.phase = 'elim';
}

function eliminate(c, u) {
  const g = c.g;
  const role = c.priv.roles[u];
  g.alive = g.alive.filter((x) => x !== u);
  g.out.push({ uid: u, role, r: g.r });
  g.last = { uid: u, role };
  c.ev(`Hors service : ${c.name(u)} (${ROLE[role]})`, '*', 'game');
  if (role === 'bb') { g.phase = 'guess'; return; }
  if (!checkEnd(c)) g.phase = 'elim';
}

function checkEnd(c) {
  const g = c.g;
  const R = c.priv.roles;
  const pipo = g.alive.filter((u) => R[u] === 'pipo').length;
  const bb = g.alive.filter((u) => R[u] === 'bb').length;
  const civ = g.alive.filter((u) => R[u] === 'civil').length;
  if (pipo + bb === 0) { finish(c, 'civils'); return true; }
  if (civ <= 1) { finish(c, pipo ? 'pipoteurs' : 'bb'); return true; }
  return false;
}

function finish(c, winner) {
  const g = c.g;
  const R = c.priv.roles;
  g.phase = 'end';
  g.winner = winner;
  const wins = (u) => {
    if (winner === 'civils') return R[u] === 'civil';
    if (winner === 'bb') return R[u] === 'bb';
    return R[u] === 'pipo' || (R[u] === 'bb' && g.alive.includes(u));
  };
  const POINTS = { civil: 2, pipo: 10, bb: 6 };
  g.reveal = { roles: { ...R }, words: { civil: c.priv.words.civil, pipo: c.priv.words.pipo }, lv: c.priv.words.lv };
  g.points = {};
  for (const u of g.pl) {
    if (!c.roster[u]) continue;
    if (wins(u)) g.points[u] = POINTS[R[u]];
    else if (c.opts.sips > 0) c.pen(u, c.opts.sips, 'Pipoteur : équipe perdante');
  }
  for (const u of g.pl) c.setSecret(u, null);
  g.summary = { winner };
}

const PIPOTEUR = {
  id: 'pipoteur',
  name: 'Pipoteur',
  tagline: 'Tout le monde a le même mot, sauf le pipoteur, qui ne le sait pas. Indices à voix haute, vote secret.',
  min: 3,
  local: true,
  rules: [
    'Chacun reçoit un mot secret. Les civils ont tous le même. Le pipoteur a un mot proche et ne sait pas qu’il est le pipoteur.',
    'Un pipoteur jusqu’à 6 joueurs, deux au-delà. À partir de 5 joueurs, un Blanc-Bec n’a aucun mot (et le sait) : il doit bluffer.',
    'À chaque tour, donnez un indice à voix haute sur votre mot, dans l’ordre affiché. Le Blanc-Bec ne commence jamais.',
    'Puis chacun vote en secret pour éliminer un joueur. Le plus désigné est éliminé et son rôle est révélé.',
    'Égalité : nouveau vote entre les ex æquo. Nouvelle égalité : personne n’est éliminé, on refait un tour d’indices.',
    'Le Blanc-Bec éliminé peut deviner le mot des civils : s’il le trouve, il gagne seul.',
    'Les civils gagnent quand tous les pipoteurs et le Blanc-Bec sont éliminés. Les infiltrés gagnent s’il ne reste qu’un civil.',
    'Points : civils 2, pipoteur 10, Blanc-Bec 6. Option : l’équipe perdante boit.',
    'Les mots viennent de familles : un même mot peut tomber avec plusieurs voisins d’une partie à l’autre (Océan et Mer, Océan et Étang…). « Piégeux » ajoute les voisins les plus traîtres.',
    'Niveaux à cocher : Soft, HARD (hors sexe) et Cul. HARD et Cul sont désactivés par défaut et ne s’ouvrent que si tout le monde est en « Piquant ».',
  ],
  options: [
    { id: 'levels', label: 'Niveaux (un ou plusieurs)', multi: true, choices: [['soft', 'Soft'], ['hard', 'HARD', 3, 'adult'], ['cul', 'Cul', 3, 'adult']], def: ['soft'] },
    { id: 'diff', label: 'Mots', choices: [[1, 'Proches'], [2, 'Piégeux']], def: 2 },
    { id: 'sips', label: 'L’équipe perdante boit', choices: [[0, 'Rien'], [2, '2 gorgées'], [3, '3 gorgées'], [5, '5 gorgées']], def: 3 },
  ],

  // teinte du décor : celle du niveau si un seul est coché (sinon on trahirait le niveau tiré)
  tintOf(g) { return g && g.lv && g.lv.length === 1 && g.lv[0] !== 'soft' ? `jamais-${g.lv[0]}` : 'pipoteur'; },

  start(c) {
    const pl = c.activeUids();
    const n = pl.length;
    const nPipo = n >= 7 ? 2 : 1;
    const nBb = n >= 5 ? 1 : 0;
    const want = Array.isArray(c.opts.levels) ? c.opts.levels.filter((l) => LEVELS.includes(l)) : ['soft'];
    const adult = !!(c.S.cfg && c.S.cfg.adult);
    let lv = want.filter((l) => levelAllowed(l, c.level(), adult));
    const dropped = want.filter((l) => !lv.includes(l));
    if (!lv.length) lv = ['soft'];
    const picked = pickWords(lv, c.opts.diff === 1 ? 1 : 2);
    const words = { civil: picked.civil, pipo: picked.pipo };
    const mixed = c.shuffle(pl);
    const roles = {};
    mixed.forEach((u, i) => { roles[u] = i < nPipo ? 'pipo' : i < nPipo + nBb ? 'bb' : 'civil'; });
    const g = {
      gid: c.rid(5), pl, alive: pl.slice(), phase: 'words', seen: {}, r: 0, order: [], voted: {}, cand: null, revote: false,
      res: null, out: [], last: null, guess: null, winner: null, reveal: null, counts: { pipo: nPipo, bb: nBb },
      lv, dropped, wlv: null,
    };
    c.g = g;
    c.S.game.g = g;
    c.priv.roles = roles;
    c.priv.words = { ...words, lv: picked.lv };
    c.priv.votes = {};
    for (const u of pl) {
      c.setSecret(u, { game: 'pipo', gid: g.gid, bb: roles[u] === 'bb', word: roles[u] === 'bb' ? null : roles[u] === 'pipo' ? words.pipo : words.civil });
    }
    return g;
  },

  request({ g, uid }) {
    if (g.phase === 'words' && g.pl.includes(uid) && !g.seen[uid]) return { k: `w${g.gid}`, kind: 'word', secret: true };
    if (g.phase === 'vote' && g.alive.includes(uid) && !g.voted[uid]) return { k: `v${g.r}.${g.revote ? 2 : 1}`, kind: 'vote', secret: true };
    if (g.phase === 'guess' && g.last && g.last.uid === uid) return { k: `g${g.r}`, kind: 'guess' };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    if (g.phase === 'words' && k === `w${g.gid}` && g.pl.includes(uid) && !g.seen[uid]) {
      g.seen[uid] = true;
      if (g.pl.filter((u) => c.roster[u] && c.online(u)).every((u) => g.seen[u])) startClues(c);
      return true;
    }
    if (g.phase === 'vote' && k === `v${g.r}.${g.revote ? 2 : 1}` && g.alive.includes(uid) && !g.voted[uid]) {
      if (typeof v !== 'string' || v === uid || !g.cand.includes(v)) return false;
      c.priv.votes[uid] = v;
      g.voted[uid] = true;
      const need = aliveOnline(c, g);
      if (need.length && need.every((u) => g.voted[u])) resolveVote(c);
      return true;
    }
    if (g.phase === 'guess' && k === `g${g.r}` && g.last && g.last.uid === uid) {
      if (typeof v !== 'string') return false;
      const ok = norm(v) !== '' && norm(v) === norm(c.priv.words.civil);
      g.guess = { uid, txt: v.slice(0, 40), ok };
      if (ok) { c.ev(`${c.name(uid)} a deviné le mot : le Blanc-Bec gagne.`, '*', 'game'); finish(c, 'bb'); } else if (!checkEnd(c)) g.phase = 'elim';
      return true;
    }
    return false;
  },

  actions({ S, g, online }) {
    if (g.phase === 'words') {
      const n = Object.keys(g.seen).length;
      return [{ id: 'clues', label: `Commencer les indices (${n}/${g.pl.length} prêts)`, disabled: n < 2 }];
    }
    if (g.phase === 'clues') return [{ id: 'vote', label: 'Tout le monde a parlé : voter', primary: true }];
    if (g.phase === 'vote') {
      const n = Object.keys(g.voted).length;
      return [{ id: 'resolve', label: `Révéler les votes maintenant (${n})`, disabled: n < 1, confirm: 'Révéler sans attendre les autres ?' }];
    }
    if (g.phase === 'elim') return [{ id: 'next', label: 'Tour suivant', primary: true }];
    if (g.phase === 'guess' && g.last && !online(g.last.uid)) return [{ id: 'skipguess', label: `Passer (${nickOf(S, g.last.uid)} est absent)` }];
    return [];
  },

  act(c, id) {
    const g = c.g;
    if (id === 'clues' && g.phase === 'words') { startClues(c); return true; }
    if (id === 'vote' && g.phase === 'clues') { openVote(c, g.alive.slice()); return true; }
    if (id === 'resolve' && g.phase === 'vote' && Object.keys(g.voted).length) { resolveVote(c); return true; }
    if (id === 'next' && g.phase === 'elim') { startClues(c); return true; }
    if (id === 'skipguess' && g.phase === 'guess') { g.guess = { uid: g.last.uid, txt: '', ok: false }; if (!checkEnd(c)) g.phase = 'elim'; return true; }
    return false;
  },

  tick(c) {
    const g = c.g;
    if (g.phase === 'vote') {
      const need = aliveOnline(c, g);
      if (Object.keys(g.voted).length && need.length && need.every((u) => g.voted[u])) { resolveVote(c); return true; }
    }
    if (g.phase === 'words') {
      const need = g.pl.filter((u) => c.roster[u] && c.online(u));
      if (need.length >= c.S.game.g.pl.length - 1 && need.length && need.every((u) => g.seen[u]) && Object.keys(g.seen).length >= 2) { startClues(c); return true; }
    }
    return false;
  },

  cleanup(c) { for (const u of (c.g && c.g.pl) || []) c.setSecret(u, null); },

  bot({ g, uid, req }) {
    if (req.kind === 'word') return true;
    if (req.kind === 'vote') {
      const opts = g.cand.filter((u) => u !== uid);
      return opts[Math.floor(Math.random() * opts.length)];
    }
    if (req.kind === 'guess') {
      const all = combos('soft', 2).flatMap((x) => [x.a, x.b]);
      return all[Math.floor(Math.random() * all.length)];
    }
    return undefined;
  },

  Table,
  Act,
};

export default PIPOTEUR;

// ---------------------------------------------------------------- affichage

function MyWord({ secret, g, uid }) {
  const [show, setShow] = useState(false);
  if (!secret || secret.game !== 'pipo' || secret.gid !== g.gid) return null;
  const out = !g.alive.includes(uid);
  return (
    <button type="button" class={`myword${show ? ' is-open' : ''}`} onClick={() => setShow(!show)} aria-pressed={show ? 'true' : 'false'}>
      <span class="myword-l">{out ? 'Tu es hors service' : 'Ton mot'}</span>
      <span class="myword-w">{show ? (secret.bb ? 'Aucun : tu es le Blanc-Bec' : secret.word) : <Icon name="eye" size={26} label="Touche pour voir" />}</span>
    </button>
  );
}

function VoteResult({ S, g, uid }) {
  const r = g.res;
  if (!r) return null;
  const rows = Object.entries(r.counts).sort((a, b) => b[1] - a[1]);
  return (
    <details class="log" open>
      <summary>Votes{r.revote ? ' (second vote)' : ''}</summary>
      <ul>{rows.map(([u, n]) => <li key={u}><b>{nickOf(S, u)}</b> : {plural(n, 'vote', 'votes')}</li>)}</ul>
      <ul class="muted">{Object.entries(r.who).map(([a, b]) => <li key={a}><Vs a={nickOf(S, a)} b={nickOf(S, b)} /></li>)}</ul>
    </details>
  );
}

function Table({ S, g, uid, secret }) {
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  return (
    <div class="pipo">
      <div class="pipo-top">
        <span class="chip">{g.r ? `Tour ${g.r}` : 'Distribution'}</span>
        <span class="chip">{g.alive.length} en jeu</span>
        <span class="chip">{plural(g.counts.pipo, 'pipoteur', 'pipoteurs')}{g.counts.bb ? ' · 1 Blanc-Bec' : ''}</span>
        {g.lv && (g.lv.length > 1 || g.lv[0] !== 'soft') ? <span class="chip">{g.lv.map((l) => NIVEAUX_MOTS[l].label).join(' + ')}</span> : null}
      </div>
      {g.dropped && g.dropped.length && g.r <= 1 ? (
        <p class="muted small">{g.dropped.map((l) => NIVEAUX_MOTS[l].label).join(' et ')} : pas disponible avec les réglages ou les limites de la table.</p>
      ) : null}
      {uid ? <MyWord secret={secret} g={g} uid={uid} /> : null}

      {g.phase === 'words' ? <Waiting>Chacun découvre son mot en secret ({Object.keys(g.seen).length}/{g.pl.length})</Waiting> : null}

      {g.phase === 'clues' ? (
        <div class="pipo-order">
          <p class="pipo-h">Un indice chacun, à voix haute, dans cet ordre :</p>
          <ol>
            {g.order.map((u) => <li key={u}><Who S={S} uid={u} you={uid} /></li>)}
          </ol>
        </div>
      ) : null}

      {g.phase === 'vote' ? (
        <div class="pipo-vote">
          <p class="pipo-h">{g.revote ? 'Égalité. Second vote entre :' : 'Vote : qui est le pipoteur ?'}</p>
          <div class="voters">
            {g.alive.map((u) => (
              <span key={u} class={`voter${g.voted[u] ? ' is-done' : ''}`} title={nickOf(S, u)}><Av p={S.roster[u]} size="m" dim={!g.voted[u]} /></span>
            ))}
          </div>
          <p class="muted center"><span class="count">{Object.keys(g.voted).length} / {g.alive.length}</span> votes</p>
          {g.revote ? <p class="center">{g.cand.map((u) => nickOf(S, u)).join(' ou ')}</p> : null}
        </div>
      ) : null}

      {(g.phase === 'elim' || g.phase === 'guess') && g.last ? (
        <div class="pipo-out paper tape pose" key={`${g.r}-${g.out.length}`}>
          {g.last.none ? (
            <p class="pipo-out-t">Nouvelle égalité : personne n’est mis hors service.</p>
          ) : (
            <>
              <Av p={S.roster[g.last.uid]} size="xl" />
              <Stamp size="l">Mis hors service</Stamp>
              <p class="pipo-out-t"><b>{nickOf(S, g.last.uid)}</b> était</p>
              <p class="pipo-role">{ROLE[g.last.role]}</p>
            </>
          )}
          {g.phase === 'guess' ? <p class="muted">{nickOf(S, g.last.uid)} tente de deviner le mot des civils.</p> : null}
          {g.guess && g.guess.uid === g.last.uid && !g.guess.ok && g.guess.txt ? <p class="muted">Il a proposé « {g.guess.txt} » : raté.</p> : null}
        </div>
      ) : null}
      {g.phase === 'elim' || g.phase === 'guess' ? <VoteResult S={S} g={g} uid={uid} /> : null}

      {g.out.length ? (
        <div class="pipo-gone">
          <p class="muted small">Hors service</p>
          <ul>{g.out.map((o) => <li key={o.uid}><Who S={S} uid={o.uid} you={uid} /> <span class={`role-tag is-${o.role}`}>{ROLE[o.role]}</span></li>)}</ul>
        </div>
      ) : null}
    </div>
  );
}

function End({ S, g, uid }) {
  const R = g.reveal ? g.reveal.roles : {};
  return (
    <div class="end">
      <h3 class="end-title">{ROLE_PL[g.winner]} {g.winner === 'bb' ? 'gagne' : 'gagnent'}</h3>
      {g.reveal ? (
        <div class="pipo-words">
          <span>Mot des civils : <b>{g.reveal.words.civil}</b></span>
          <span>Mot des pipoteurs : <b>{g.reveal.words.pipo}</b></span>
          {g.reveal.lv && NIVEAUX_MOTS[g.reveal.lv] ? <span class={`jn-badge lv-${g.reveal.lv}`}>{NIVEAUX_MOTS[g.reveal.lv].label}</span> : null}
        </div>
      ) : null}
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>Joueur</th><th>Rôle</th><th>Points</th></tr></thead>
          <tbody>
            {g.pl.filter((u) => S.roster[u]).map((u) => (
              <tr key={u}><td><Who S={S} uid={u} you={uid} /></td><td><span class={`role-tag is-${R[u]}`}>{ROLE[R[u]]}</span></td><td>{g.points[u] || 0}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- actions du joueur

function Act({ S, g, secret, uid, req, send, sent }) {
  if (req.kind === 'word') {
    const mine = secret && secret.game === 'pipo' && secret.gid === g.gid ? secret : null;
    if (!mine) return <Waiting>Distribution des mots…</Waiting>;
    return (
      <div class="act act-word">
        <h3>Ton mot secret</h3>
        {mine.bb ? (
          <div class="word-card paper tape"><span>Tu es</span><b>Blanc-Bec</b><span>Tu n’as pas de mot. Écoute les indices et bluffe.</span></div>
        ) : (
          <div class="word-card paper tape"><b>{mine.word}</b><span>Retiens-le. Tu ne sais pas si tu es civil ou pipoteur.</span></div>
        )}
        <button type="button" class="btn btn-main btn-big" disabled={sent} onClick={() => send(req.k, true)}>J’ai retenu, cacher</button>
      </div>
    );
  }
  if (req.kind === 'vote') {
    const cand = g.cand.filter((u) => u !== uid && S.roster[u]);
    return (
      <div class="act">
        <h3>{g.revote ? 'Second vote' : 'Ton vote secret'}</h3>
        <p class="muted">Qui veux-tu mettre hors service ?</p>
        <PlayerGrid S={S} uids={cand} onPick={(u) => send(req.k, u)} disabled={sent} />
      </div>
    );
  }
  if (req.kind === 'guess') return <Guess req={req} send={send} sent={sent} />;
  return null;
}

function Guess({ req, send, sent }) {
  const [txt, setTxt] = useState('');
  return (
    <div class="act">
      <h3>Dernière chance, Blanc-Bec</h3>
      <p class="muted">Devine le mot des civils. Si tu trouves, tu gagnes seul.</p>
      <input id={`guess-${req.k}`} class="input" maxLength={40} value={txt} placeholder="Ton mot" onInput={(e) => setTxt(e.currentTarget.value)} />
      <button type="button" class="btn btn-main btn-big" disabled={sent || !txt.trim()} onClick={() => send(req.k, txt.trim())}>Valider</button>
    </div>
  );
}

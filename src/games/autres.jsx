// Quiz sur les autres — version « réponses drôles » choisie par Thierry :
// • À chaque manche, une question vise un joueur (« Le mot de passe de Julie, c'est sûrement… »).
// • Tous les autres écrivent une réponse drôle, en secret.
// • Les réponses s'affichent sans les auteurs ; chacun vote pour sa préférée (pas la sienne).
// • Chaque vote reçu = 1 point. Adaptation soirée : la meilleure réponse distribue 2 gorgées,
//   une réponse sans aucun vote fait boire 1 gorgée à son auteur.

import { useState } from 'preact/hooks';
import { QUESTIONS_AUTRES, REPONSES_BOT } from '../content/autres.js';
import { Who, nickOf, Waiting, Av, useTicker, Stamp } from '../ui/common.jsx';
import { plural } from '../lib/util.js';

function writers(c, g) { return g.pl.filter((u) => u !== g.target && c.roster[u] && c.online(u)); }
function voters(c, g) { return g.pl.filter((u) => c.roster[u] && c.online(u)); }

function nextRound(c) {
  const g = c.g;
  const P = c.priv;
  for (const u of c.S.order) if (c.roster[u] && c.online(u) && !g.pl.includes(u)) g.pl.push(u);
  if (g.r >= g.max) { finish(c); return; }
  const present = g.pl.filter((u) => c.roster[u] && c.online(u));
  if (present.length < 3) { finish(c); return; }
  // le joueur visé tourne : celui qui a été le moins visé passe en premier
  const target = present.slice().sort((a, b) => (g.aimed[a] || 0) - (g.aimed[b] || 0) || Math.random() - 0.5)[0];
  g.aimed[target] = (g.aimed[target] || 0) + 1;
  if (!P.deck || P.i >= P.deck.length) {
    const lvl = Math.min(c.level(), (c.roster[target] && c.roster[target].lim) || 3);
    P.deck = c.shuffle(QUESTIONS_AUTRES.map((q, i) => [q, i]).filter(([q]) => q[0] <= lvl).map(([, i]) => i));
    P.i = 0;
  }
  const q = QUESTIONS_AUTRES[P.deck[P.i++]];
  g.r += 1;
  g.target = target;
  g.q = q[1].replace('{A}', c.name(target));
  g.phase = 'write';
  g.written = {};
  g.voted = {};
  g.list = [];
  g.res = null;
  g.until = c.opts.time ? c.now() + c.opts.time * 1000 : 0;
  P.answers = {};
  P.author = {};
  P.votes = {};
}

function toVote(c) {
  const g = c.g;
  const P = c.priv;
  const entries = Object.entries(P.answers);
  if (entries.length === 0) { g.res = { empty: true }; g.phase = 'reveal'; return; }
  g.list = c.shuffle(entries.map(([u, txt]) => {
    const id = c.rid(4);
    P.author[id] = u;
    return { id, txt };
  }));
  for (const u of g.pl) {
    const own = g.list.find((a) => P.author[a.id] === u);
    c.setSecret(u, { game: 'qo', r: g.r, mine: own ? own.id : null });
  }
  if (g.list.length === 1) { reveal(c); return; }
  g.phase = 'vote';
}

function reveal(c) {
  const g = c.g;
  const P = c.priv;
  const counts = {};
  for (const a of g.list) counts[a.id] = 0;
  for (const id of Object.values(P.votes)) counts[id] = (counts[id] || 0) + 1;
  if (g.list.length === 1) counts[g.list[0].id] = Math.max(1, counts[g.list[0].id]);
  const max = Math.max(0, ...Object.values(counts));
  const rows = g.list.map((a) => ({ ...a, by: P.author[a.id], votes: counts[a.id] || 0 }))
    .sort((x, y) => y.votes - x.votes);
  const winners = max > 0 ? rows.filter((r) => r.votes === max).map((r) => r.by) : [];
  for (const r of rows) {
    g.score[r.by] = (g.score[r.by] || 0) + r.votes;
    if (r.votes === 0 && rows.length > 1) c.pen(r.by, 1, 'Quiz sur les autres : aucun vote');
  }
  for (const u of winners) c.gift(u, 2, 'Quiz sur les autres : meilleure réponse');
  g.res = { rows, winners, who: { ...P.votes } };
  g.phase = 'reveal';
  g.hist.push({ q: g.q, best: rows[0] ? rows[0].txt : '', by: winners });
  for (const u of g.pl) c.setSecret(u, null);
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  for (const u of g.pl) c.setSecret(u, null);
}

const AUTRES = {
  id: 'autres',
  name: 'Quiz sur les autres',
  tagline: 'Une question sur un joueur. Chacun écrit une réponse en secret, puis on vote pour la meilleure.',
  min: 3,
  local: true,
  rules: [
    'À chaque manche, une question vise un joueur : « Le mot de passe de Julie, c’est sûrement… ».',
    'Tous les autres écrivent en secret la réponse la plus drôle possible.',
    'Les réponses s’affichent sans leurs auteurs. Chacun vote pour sa préférée, mais pas pour la sienne. Le joueur visé vote aussi.',
    'Chaque vote reçu rapporte 1 point.',
    'La meilleure réponse distribue 2 gorgées. Une réponse qui n’a reçu aucun vote fait boire 1 gorgée à son auteur.',
  ],
  options: [
    { id: 'rounds', label: 'Nombre de manches', choices: [[5, '5'], [8, '8'], [12, '12']], def: 8 },
    { id: 'time', label: 'Temps pour écrire', choices: [[60, '60 s'], [90, '90 s'], [0, 'Sans limite']], def: 90 },
  ],

  start(c) {
    const g = { pl: c.activeUids(), r: 0, max: c.opts.rounds || 8, phase: 'write', target: null, q: '', written: {}, voted: {}, list: [], res: null, score: {}, aimed: {}, hist: [], until: 0 };
    c.g = g;
    c.S.game.g = g;
    nextRound(c);
    return g;
  },

  request({ g, uid, secret }) {
    if (!g.pl.includes(uid)) return null;
    if (g.phase === 'write' && uid !== g.target && !g.written[uid]) return { k: `w${g.r}`, kind: 'write', secret: true };
    if (g.phase === 'vote' && !g.voted[uid]) {
      // on attend de savoir quelle réponse est la sienne (secret), pour ne pas pouvoir voter pour elle
      if (!(secret && secret.game === 'qo' && secret.r === g.r)) return null;
      return { k: `v${g.r}`, kind: 'vote', secret: true, mine: secret.mine };
    }
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    const P = c.priv;
    if (!g.pl.includes(uid)) return false;
    if (g.phase === 'write' && k === `w${g.r}` && uid !== g.target && !g.written[uid]) {
      const txt = typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, 90) : '';
      if (!txt) return false;
      P.answers[uid] = txt;
      g.written[uid] = true;
      const need = writers(c, g);
      if (need.length && need.every((u) => g.written[u])) toVote(c);
      return true;
    }
    if (g.phase === 'vote' && k === `v${g.r}` && !g.voted[uid]) {
      if (typeof v !== 'string' || !g.list.some((a) => a.id === v) || P.author[v] === uid) return false;
      P.votes[uid] = v;
      g.voted[uid] = true;
      const need = voters(c, g);
      if (need.length && need.every((u) => g.voted[u] || !g.list.some((a) => P.author[a.id] !== u))) reveal(c);
      return true;
    }
    return false;
  },

  actions({ g }) {
    const stop = { id: 'end', label: 'Arrêter', confirm: 'Arrêter et voir le rapport ?' };
    if (g.phase === 'write') {
      const n = Object.keys(g.written).length;
      return [{ id: 'vote', label: `Passer au vote (${n} réponse${n > 1 ? 's' : ''})`, disabled: n < 1 }, stop];
    }
    if (g.phase === 'vote') return [{ id: 'reveal', label: 'Révéler maintenant', disabled: !Object.keys(g.voted).length }, stop];
    if (g.phase === 'reveal') return [{ id: 'next', label: g.r >= g.max ? 'Rapport d’incident' : 'Manche suivante', primary: true }, { id: 'end', label: 'Arrêter', confirm: 'Arrêter et voir le rapport ?' }];
    return [];
  },

  act(c, id) {
    const g = c.g;
    if (id === 'vote' && g.phase === 'write' && Object.keys(g.written).length) { toVote(c); return true; }
    if (id === 'reveal' && g.phase === 'vote') { reveal(c); return true; }
    if (id === 'next' && g.phase === 'reveal') { nextRound(c); return true; }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  tick(c) {
    const g = c.g;
    if (g.phase === 'write') {
      const n = Object.keys(g.written).length;
      if (g.until && c.now() >= g.until) { toVote(c); return true; }
      const need = writers(c, g);
      if (n && need.length && need.every((u) => g.written[u])) { toVote(c); return true; }
    }
    if (g.phase === 'vote') {
      const need = voters(c, g).filter((u) => g.list.some((a) => c.priv.author[a.id] !== u));
      if (Object.keys(g.voted).length && need.every((u) => g.voted[u])) { reveal(c); return true; }
    }
    return false;
  },

  cleanup(c) { for (const u of (c.g && c.g.pl) || []) c.setSecret(u, null); },

  bot({ g, req }) {
    if (req.kind === 'write') return REPONSES_BOT[Math.floor(Math.random() * REPONSES_BOT.length)];
    if (req.kind === 'vote') {
      const opts = g.list.filter((a) => a.id !== req.mine);
      return opts.length ? opts[Math.floor(Math.random() * opts.length)].id : undefined;
    }
    return undefined;
  },

  Table,
  Act,
};

export default AUTRES;

// ---------------------------------------------------------------- affichage

function Timer({ until, clock }) {
  const left = until ? Math.max(0, Math.ceil((until - clock()) / 1000)) : 0;
  useTicker(!!until && left > 0, 500);
  if (!until) return null;
  return <span class={`chip${left <= 10 ? ' chip-hot' : ''}`}>{left} s</span>;
}

function Table({ S, g, uid, clock }) {
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const nW = Object.keys(g.written).length;
  return (
    <div class="qo">
      <div class="ose-top">
        <span class="chip">Manche {g.r} / {g.max}</span>
        {g.phase === 'write' ? <Timer until={g.until} clock={clock} /> : null}
      </div>
      <div class="qo-card paper rose tape pose" key={g.r}>
        <span class="qo-target"><Av p={S.roster[g.target]} size="m" /> {g.target === uid ? 'Ça parle de toi' : `Sur ${nickOf(S, g.target)}`}</span>
        <p class="qo-q">{g.q}</p>
      </div>
      {g.phase === 'write' ? <Waiting>{g.target === uid ? 'Les autres écrivent sur toi.' : 'Écriture des réponses.'} {plural(nW, 'reçue', 'reçues')}.</Waiting> : null}
      {g.phase === 'vote' ? (
        <>
          <ul class="qo-list">{g.list.map((a, i) => <li key={a.id} class={`paper ${i % 2 ? 'tilt-b' : 'tilt-c'}`}>{a.txt}</li>)}</ul>
          <p class="muted center"><span class="count">{Object.keys(g.voted).length}</span> vote{Object.keys(g.voted).length > 1 ? 's' : ''}</p>
        </>
      ) : null}
      {g.phase === 'reveal' && g.res ? (
        g.res.empty ? <p class="center">Personne n’a répondu à temps.</p> : (
          <ul class="qo-list is-reveal">
            {g.res.rows.map((r) => (
              <li key={r.id} class={`paper ${g.res.winners.includes(r.by) && r.votes ? 'tape tilt-a' : 'tilt-c'}`}>
                <span class="qo-txt">{r.txt}</span>
                <span class="qo-by"><Who S={S} uid={r.by} you={uid} /> <span class="count">{plural(r.votes, 'vote', 'votes')}</span>
                  {g.res.winners.includes(r.by) && r.votes ? <Stamp size="s" tone="bleu">Meilleure réponse</Stamp> : null}
                  {!r.votes ? <Stamp size="s">1 gorgée</Stamp> : null}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

function End({ S, g, uid }) {
  const rows = g.pl.filter((u) => S.roster[u]).map((u) => ({ u, s: g.score[u] || 0 })).sort((a, b) => b.s - a.s);
  const best = rows.length && rows[0].s > 0 ? rows.filter((r) => r.s === rows[0].s) : [];
  return (
    <div class="end">
      <h3 class="end-title">Plume d’or</h3>
      {best.length ? <div class="awards"><div class="award"><span class="award-t">Réponses les plus drôles</span><span class="award-who">{best.map((r) => <Who key={r.u} S={S} uid={r.u} you={uid} />)}</span></div></div> : null}
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Joueur</th><th>Points</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.s}</td></tr>)}</tbody></table></div>
      {g.hist.length ? (
        <details class="log"><summary>Meilleures réponses</summary>
          <ol>{g.hist.map((h, i) => <li key={i}>{h.q} <b>{h.best}</b></li>)}</ol>
        </details>
      ) : null}
    </div>
  );
}

function Act({ S, g, req, send, sent }) {
  if (req.kind === 'write') return <Write key={req.k} S={S} g={g} req={req} send={send} sent={sent} />;
  if (req.kind === 'vote') {
    return (
      <div class="act">
        <h3>Vote pour la meilleure réponse</h3>
        <div class="qo-votes">
          {g.list.map((a) => (
            <button type="button" key={a.id} class={`qo-vote${a.id === req.mine ? ' is-mine' : ''}`} disabled={sent || a.id === req.mine} onClick={() => send(req.k, a.id)}>
              {a.txt}{a.id === req.mine ? <em class="you">la tienne</em> : null}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

function Write({ g, req, send, sent }) {
  const [txt, setTxt] = useState('');
  return (
    <div class="act">
      <h3>Ta réponse secrète</h3>
      <p class="muted">{g.q}</p>
      <textarea id={`qo-${req.k}`} class="input qo-input" rows={3} maxLength={90} value={txt} placeholder="Ta réponse"
        onInput={(e) => setTxt(e.currentTarget.value)} />
      <div class="qo-row"><span class="hint count">{txt.length} / 90</span>
        <button type="button" class="btn btn-main" disabled={sent || !txt.trim()} onClick={() => send(req.k, txt.trim())}>Envoyer</button>
      </div>
    </div>
  );
}

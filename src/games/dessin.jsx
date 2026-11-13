// Dessine et devine (pensé pour le mode Écran) : chacun son tour, un joueur dessine un mot secret sur son
// téléphone ; le dessin s'affiche en direct sur la télé et sur les autres téléphones, qui tapent leurs idées.
// Points : 3 au premier qui trouve, 2 au deuxième, 1 ensuite ; le dessinateur prend 1 point par joueur qui trouve.
// Alcool : le premier qui trouve distribue 2 gorgées ; à la fin du chrono, ceux qui n'ont pas trouvé boivent 1 gorgée ;
// si personne ne trouve, c'est le dessinateur qui boit 2 gorgées.
// Un seul téléphone : le dessinateur dessine, les autres crient leurs idées ; l'hôte valide « Trouvé par… ».

import { useEffect, useRef, useState } from 'preact/hooks';
import { MOTS_DESSIN } from '../content/dessin.js';
import { Who, nickOf, PlayerGrid, Waiting, Av, Stamp, useTicker } from '../ui/common.jsx';
import { plural, norm } from '../lib/util.js';

const MAX_PTS = 6000; // nombres (x, y) au total dans le dessin, pour rester léger sur le réseau

function nextTurn(c) {
  const g = c.g;
  const P = c.priv;
  for (const u of c.S.order) if (c.roster[u] && (g.local || c.online(u)) && !g.pl.includes(u)) g.pl.push(u);
  const pl = g.pl.filter((u) => c.roster[u]);
  g.di = (g.di + 1) % pl.length;
  g.drawer = pl[g.di];
  g.r += 1;
  if (P.i + 3 > P.deck.length) { P.deck = c.shuffle(MOTS_DESSIN.map((_, i) => i)); P.i = 0; }
  P.choices = P.deck.slice(P.i, P.i + 3).map((i) => MOTS_DESSIN[i]);
  P.i += 3;
  P.word = null;
  g.phase = 'choose';
  g.strokes = [];
  g.found = [];
  g.feed = [];
  g.hint = null;
  g.word = null;
  g.drawAt = 0;
  for (const u of g.pl) c.setSecret(u, u === g.drawer ? { game: 'dessin', r: g.r, choices: P.choices } : { game: 'dessin', r: g.r });
}

function endTurn(c) {
  const g = c.g;
  const P = c.priv;
  g.phase = 'reveal';
  g.word = P.word;
  g.revAt = c.now();
  const guessers = g.pl.filter((u) => c.roster[u] && u !== g.drawer);
  if (!g.found.length) c.pen(g.drawer, 2, 'Dessine et devine : personne n’a trouvé ton dessin');
  else for (const u of guessers) if (!g.found.includes(u)) c.pen(u, 1, 'Dessine et devine : pas trouvé');
  g.hist.push({ drawer: g.drawer, word: P.word, found: g.found.slice() });
  c.setSecret(g.drawer, { game: 'dessin', r: g.r });
}

function found(c, u) {
  const g = c.g;
  if (g.found.includes(u) || u === g.drawer) return;
  const pts = g.found.length === 0 ? 3 : g.found.length === 1 ? 2 : 1;
  g.score[u] = (g.score[u] || 0) + pts;
  g.score[g.drawer] = (g.score[g.drawer] || 0) + 1;
  if (!g.found.length) c.gift(u, 2, 'Dessine et devine : premier à trouver');
  g.found.push(u);
  const guessers = g.pl.filter((x) => c.roster[x] && x !== g.drawer && (g.local || c.online(x)));
  if (guessers.every((x) => g.found.includes(x))) endTurn(c);
}

function finish(c) {
  const g = c.g;
  g.phase = 'end';
  const rows = g.pl.filter((u) => c.roster[u]).map((u) => ({ u, pts: g.score[u] || 0 })).sort((a, b) => b.pts - a.pts);
  g.summary = { rows, rounds: g.hist.length };
}

const DESSIN = {
  id: 'dessin',
  name: 'Dessine et devine',
  tagline: 'Un joueur dessine un mot sur son téléphone, le dessin s’affiche en direct sur la télé. Le premier qui trouve distribue.',
  min: 3,
  local: true,
  rules: [
    'Chacun son tour, un joueur choisit un mot parmi trois et le dessine sur son téléphone. Interdit d’écrire des lettres ou des chiffres.',
    'Le dessin s’affiche en direct (en grand sur la télé en mode Écran). Les autres tapent leurs propositions sur leur téléphone.',
    'Points : 3 au premier qui trouve, 2 au deuxième, 1 ensuite ; le dessinateur gagne 1 point par joueur qui trouve.',
    'Le premier qui trouve distribue 2 gorgées. À la fin du chrono, ceux qui n’ont pas trouvé boivent 1 gorgée. Personne n’a trouvé : le dessinateur boit 2 gorgées.',
    'Sur un seul téléphone : le dessinateur dessine, les autres crient leurs idées, et l’hôte valide « Trouvé par… ».',
  ],
  options: [
    { id: 'time', label: 'Temps pour dessiner', choices: [[60, '60 s'], [80, '80 s'], [100, '100 s']], def: 80 },
    { id: 'tours', label: 'Tours de table', choices: [[1, '1'], [2, '2'], [3, '3']], def: 1 },
  ],

  start(c) {
    const pl = c.activeUids();
    const g = { pl, di: -1, r: 0, max: pl.length * (c.opts.tours || 1), score: {}, hist: [], strokes: [], found: [], feed: [], local: !!c.isLocal, phase: 'choose' };
    c.g = g;
    c.S.game.g = g;
    c.priv.deck = c.shuffle(MOTS_DESSIN.map((_, i) => i));
    c.priv.i = 0;
    nextTurn(c);
    return g;
  },

  request({ g, uid, secret }) {
    if (!secret || secret.game !== 'dessin' || secret.r !== g.r) return null;
    if (g.phase === 'choose' && uid === g.drawer && secret.choices) return { k: `c${g.r}`, kind: 'choose', secret: true };
    if (g.phase === 'draw' && uid === g.drawer) return { k: `d${g.r}`, kind: 'draw', secret: true, live: true };
    if (g.phase === 'draw' && !g.local && uid !== g.drawer && !g.found.includes(uid)) return { k: `g${g.r}`, kind: 'guess', live: true };
    return null;
  },

  input(c, uid, k, v) {
    const g = c.g;
    const P = c.priv;
    if (g.phase === 'choose' && k === `c${g.r}` && uid === g.drawer) {
      if (!P.choices.includes(v)) return false;
      P.word = v;
      g.phase = 'draw';
      g.drawAt = c.now();
      g.hint = v.replace(/[^\s'’-]/g, '_');
      c.setSecret(uid, { game: 'dessin', r: g.r, word: v });
      return true;
    }
    if (g.phase === 'draw' && k === `d${g.r}` && uid === g.drawer) {
      if (!v || typeof v !== 'object') return false;
      if (v.clear) { g.strokes = []; return true; }
      if (v.undo) { g.strokes.pop(); return true; }
      const pts = Array.isArray(v.p) ? v.p.filter((n) => Number.isInteger(n) && n >= 0 && n <= 999) : [];
      if (pts.length % 2 || !pts.length) return false;
      const total = g.strokes.reduce((a, s) => a + s.p.length, 0);
      if (total + pts.length > MAX_PTS) return false;
      const id = Number(v.id) || 0;
      const last = g.strokes[g.strokes.length - 1];
      if (last && last.id === id) last.p.push(...pts);
      else g.strokes.push({ id, w: v.w === 2 ? 2 : 1, p: pts });
      return true;
    }
    if (g.phase === 'draw' && k === `g${g.r}` && uid !== g.drawer && !g.found.includes(uid)) {
      if (typeof v !== 'string' || !v.trim()) return false;
      const txt = v.trim().slice(0, 40);
      if (norm(txt) === norm(P.word)) { found(c, uid); g.feed.push({ uid, ok: true }); }
      else g.feed.push({ uid, txt });
      if (g.feed.length > 12) g.feed.splice(0, g.feed.length - 12);
      return true;
    }
    return false;
  },

  tick(c) {
    const g = c.g;
    if (g.phase === 'draw' && c.now() - g.drawAt > (c.opts.time || 80) * 1000) { endTurn(c); return true; }
    return false;
  },

  actions({ S, g }) {
    if (g.phase === 'reveal') {
      if (g.r >= g.max) return [{ id: 'end', label: 'Classement final', primary: true }];
      return [{ id: 'next', label: 'Au suivant de dessiner', primary: true }, { id: 'end', label: 'Arrêter là', confirm: 'Arrêter et voir le classement ?' }];
    }
    if (g.phase === 'draw') {
      const out = !g.local ? [] : g.pl.filter((u) => S.roster[u] && u !== g.drawer && !g.found.includes(u)).map((u) => ({ id: `found:${u}`, label: `Trouvé par ${nickOf(S, u)}` }));
      return [...out, { id: 'stop', label: 'Fin du dessin', confirm: 'Arrêter ce dessin maintenant ?' }];
    }
    return [{ id: 'skip', label: 'Passer ce tour', confirm: 'Passer le tour de ce dessinateur ?' }];
  },

  act(c, id) {
    const g = c.g;
    if (id === 'next' && g.phase === 'reveal') { nextTurn(c); return true; }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    if (id === 'stop' && g.phase === 'draw') { endTurn(c); return true; }
    if (id === 'skip' && g.phase === 'choose') { nextTurn(c); return true; }
    if (typeof id === 'string' && id.startsWith('found:') && g.phase === 'draw') { found(c, id.slice(6)); return true; }
    return false;
  },

  turnOf(g) { return g.phase === 'choose' || g.phase === 'draw' ? g.drawer : null; },
  cleanup(c) { for (const u of (c.g && c.g.pl) || []) c.setSecret(u, null); },

  bot({ g, req, secret, mem }) {
    if (!req) return undefined;
    if (req.kind === 'choose') return secret.choices[0];
    if (req.kind === 'draw') {
      mem.n = (mem.n || 0) + 1;
      const x = Math.floor(Math.random() * 900);
      const y = Math.floor(Math.random() * 900);
      return { id: mem.n, p: [x, y, x + 50, y + 30, x + 80, y + 90] };
    }
    if (req.kind === 'guess') {
      mem.g = (mem.g || 0) + 1;
      if (mem.g % 2) return undefined;
      return Math.random() < 0.3 && g.word ? g.word : MOTS_DESSIN[Math.floor(Math.random() * MOTS_DESSIN.length)];
    }
    return undefined;
  },

  Table,
  Act,
};

export default DESSIN;

// ---------------------------------------------------------------- dessin (affichage)

export function Sketch({ strokes, big }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(r.width * dpr);
    cv.height = Math.round(r.height * dpr);
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#F2EADB';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.strokeStyle = '#22201C';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const sx = cv.width / 1000;
    const sy = cv.height / 1000;
    for (const s of strokes || []) {
      ctx.lineWidth = (s.w === 2 ? 14 : 6) * sx;
      ctx.beginPath();
      for (let i = 0; i < s.p.length; i += 2) {
        const x = s.p[i] * sx;
        const y = s.p[i + 1] * sy;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      if (s.p.length === 2) ctx.lineTo(s.p[0] * sx + 0.1, s.p[1] * sy);
      ctx.stroke();
    }
  });
  return <canvas ref={ref} class={`dz-canvas${big ? ' is-big' : ''}`} aria-label="Dessin en cours" role="img" />;
}

function Table({ S, g, uid, clock, screen, local }) {
  useTicker(g.phase === 'draw', 500);
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const left = g.phase === 'draw' && clock ? Math.max(0, Math.ceil(((S.game.opts.time || 80) * 1000 - (clock() - g.drawAt)) / 1000)) : null;
  const ranked = g.pl.filter((u) => S.roster[u]).sort((a, b) => (g.score[b] || 0) - (g.score[a] || 0));
  return (
    <div class={`dz${screen ? ' is-screen' : ''}`}>
      <div class="pipo-top">
        <span class="chip">Tour {g.r} / {g.max}</span>
        <span class="chip">Dessinateur : {nickOf(S, g.drawer)}</span>
        {left != null ? <span class="chip">{left} s</span> : null}
      </div>
      {g.phase === 'choose' ? <Waiting>{nickOf(S, g.drawer)} choisit son mot…</Waiting> : null}
      {g.phase !== 'choose' && uid !== g.drawer && !(local && g.phase === 'draw') ? <Sketch strokes={g.strokes} big={screen} /> : null}
      {g.phase === 'draw' && g.hint ? <p class="dz-hint" aria-label={`Mot de ${g.hint.length} caractères`}>{g.hint}</p> : null}
      {g.phase === 'reveal' ? <p class="dz-word">C’était : <Stamp>{g.word}</Stamp></p> : null}
      {g.feed.length ? (
        <ul class="dz-feed">{g.feed.slice(-6).map((f, i) => <li key={i} class={f.ok ? 'is-ok' : ''}><b>{nickOf(S, f.uid)}</b> {f.ok ? 'a trouvé !' : f.txt}</li>)}</ul>
      ) : null}
      <div class="bz-scores">
        {ranked.map((u) => <span key={u} class={`bz-sc${g.found.includes(u) ? ' is-found' : ''}`}><Av p={S.roster[u]} size="s" />{nickOf(S, u)} <b>{g.score[u] || 0}</b></span>)}
      </div>
    </div>
  );
}

function End({ S, g, uid }) {
  const rows = (g.summary && g.summary.rows) || [];
  return (
    <div class="end">
      <h3 class="end-title">Classement · {plural(rows.length ? g.summary.rounds : 0, 'dessin', 'dessins')}</h3>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Joueur</th><th>Points</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.pts}</td></tr>)}</tbody>
      </table></div>
      {g.hist.length ? <details class="log"><summary>Les mots</summary><ol>{g.hist.map((h, i) => <li key={i}>{nickOf(S, h.drawer)} : <b>{h.word}</b> ({h.found.length ? h.found.map((u) => nickOf(S, u)).join(', ') : 'personne'})</li>)}</ol></details> : null}
    </div>
  );
}

// ---------------------------------------------------------------- toile du dessinateur

function DrawPad({ g, req, post, secret }) {
  const ref = useRef(null);
  const st = useRef({ id: Date.now() % 100000, buf: [], down: false, timer: 0, w: 1 });
  const [w, setW] = useState(1);
  const [show, setShow] = useState(false);
  const flush = () => {
    const s = st.current;
    if (!s.buf.length) return;
    post(req.k, { id: s.id, w: s.w, p: s.buf.splice(0) });
  };
  useEffect(() => { const t = setInterval(flush, 220); return () => { clearInterval(t); flush(); }; }, []);
  const at = (e) => {
    const r = ref.current.getBoundingClientRect();
    return [Math.max(0, Math.min(999, Math.round(((e.clientX - r.left) / r.width) * 999))), Math.max(0, Math.min(999, Math.round(((e.clientY - r.top) / r.height) * 999)))];
  };
  const down = (e) => {
    e.preventDefault();
    const s = st.current;
    flush();
    s.id += 1;
    s.down = true;
    s.w = w;
    try { ref.current.setPointerCapture(e.pointerId); } catch (er) { /* rien */ }
    s.buf.push(...at(e));
    s.lastX = s.buf[0];
    s.lastY = s.buf[1];
  };
  const move = (e) => {
    const s = st.current;
    if (!s.down) return;
    const [x, y] = at(e);
    if (Math.abs(x - s.lastX) + Math.abs(y - s.lastY) < 6) return; // simplification du trait
    s.buf.push(x, y);
    s.lastX = x;
    s.lastY = y;
  };
  const up = () => { st.current.down = false; flush(); };
  return (
    <div class="dz-pad">
      <p class="dz-secret" onClick={() => setShow(!show)}>Ton mot : <b>{show ? secret.word : '••••• (touche pour voir)'}</b></p>
      <div class="dz-wrap">
        <Sketch strokes={g.strokes} />
        <div ref={ref} class="dz-touch" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} />
      </div>
      <div class="dz-tools">
        <button type="button" class={`btn btn-small${w === 1 ? ' is-on' : ''}`} onClick={() => setW(1)}>Trait fin</button>
        <button type="button" class={`btn btn-small${w === 2 ? ' is-on' : ''}`} onClick={() => setW(2)}>Trait épais</button>
        <button type="button" class="btn btn-small" onClick={() => post(req.k, { undo: true })}>Annuler</button>
        <button type="button" class="btn btn-small" onClick={() => post(req.k, { clear: true })}>Effacer</button>
      </div>
    </div>
  );
}

function Act({ S, g, uid, req, send, post, sent, secret }) {
  const [txt, setTxt] = useState('');
  if (req.kind === 'choose') {
    return (
      <div class="act">
        <h3>Choisis ton mot</h3>
        <p class="hint">Interdit d’écrire des lettres ou des chiffres. Montre ton écran à personne.</p>
        <div class="bz-ans">{secret.choices.map((w) => <button type="button" key={w} class="btn btn-big" disabled={sent} onClick={() => send(req.k, w)}>{w}</button>)}</div>
      </div>
    );
  }
  if (req.kind === 'draw') {
    if (!secret || !secret.word) return <Waiting>…</Waiting>;
    return <div class="act"><DrawPad g={g} req={req} post={post || send} secret={secret} /></div>;
  }
  if (req.kind === 'guess') {
    const go = () => { if (txt.trim()) { (post || send)(req.k, txt); setTxt(''); } };
    return (
      <div class="act">
        <h3>Ta proposition</h3>
        <div class="qo-row">
          <input class="input" value={txt} maxLength={40} placeholder="C’est…" onInput={(e) => setTxt(e.currentTarget.value)} onKeyDown={(e) => { if (e.key === 'Enter') go(); }} />
          <button type="button" class="btn btn-main" onClick={go}>Envoyer</button>
        </div>
      </div>
    );
  }
  return null;
}

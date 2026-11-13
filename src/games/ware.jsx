// Hors Service Ware — rafale de micro-jeux façon WarioWare, sur un seul téléphone (demande de Thierry) :
// • Une consigne d'un mot (« Tape ! », « Secoue ! », « Ne touche rien ! »…), 3 à 5 secondes par micro-jeu,
//   de plus en plus vite au fil des manches.
// • Une vie perdue = une pénalité. 14 micro-jeux, dont 3 avec les capteurs du téléphone
//   (sur iPhone, autorisation demandée par un bouton : DeviceMotionEvent.requestPermission).
// Choix techniques : chacun joue à son tour (sens des aiguilles d'une montre) jusqu'à perdre ses vies ;
// le score (micro-jeux réussis) sert de record.
import { useEffect, useRef, useState } from 'preact/hooks';
import { Av, nickOf, Who, Stamp } from '../ui/common.jsx';
import { plural, shuffle } from '../lib/util.js';
import { Arena, blip, buzz, fast, pickOne, rand, tnow, unlockAudio } from './arcade.jsx';

// ------------------------------------------------------------------ capteurs
const needsPermission = () => typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function';
async function askSensors() {
  try {
    if (needsPermission() && (await DeviceMotionEvent.requestPermission()) !== 'granted') return false;
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function'
      && (await DeviceOrientationEvent.requestPermission()) !== 'granted') return false;
    return true;
  } catch (e) { return false; }
}
// un capteur répond-il vraiment ? (un ordinateur n'en a pas)
function probeSensors(ms = 900) {
  return new Promise((res) => {
    if (typeof window === 'undefined') { res(false); return; }
    let ok = false;
    const on = (e) => { if ((e.accelerationIncludingGravity && e.accelerationIncludingGravity.x != null) || e.beta != null) ok = true; };
    window.addEventListener('devicemotion', on);
    window.addEventListener('deviceorientation', on);
    setTimeout(() => {
      window.removeEventListener('devicemotion', on);
      window.removeEventListener('deviceorientation', on);
      res(ok);
    }, ms);
  });
}

// ------------------------------------------------------------------ micro-jeux
const stop = (e) => { if (e && e.cancelable) e.preventDefault(); };
function Arrow({ deg = 0 }) {
  return (
    <svg class="mg-arrow" viewBox="0 0 24 24" style={{ transform: `rotate(${deg}deg)` }} aria-hidden="true">
      <path d="M4 12h15M13 5.5l6.5 6.5-6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  );
}
function Tap({ lvl, win }) {
  const [p] = useState(() => ({ x: rand(14, 86), y: rand(16, 82) }));
  const s = Math.max(34, 84 - lvl * 9);
  return <button type="button" class="mg-target" data-ok="1" aria-label="Cible" style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${s}px`, height: `${s}px` }} onPointerDown={(e) => { stop(e); win(); }} />;
}
function Mash({ lvl, win }) {
  const need = 9 + lvl * 3;
  const n = useRef(0);
  const [left, setLeft] = useState(need);
  return (
    <button type="button" class="mg-zone" data-mash={need} onPointerDown={(e) => { stop(e); n.current += 1; setLeft(Math.max(0, need - n.current)); if (n.current >= need) win(); }}>
      <span class="mg-big">{left}</span><span class="mg-sub">tape partout, vite</span>
    </button>
  );
}
function Dont({ lose, onTimeout }) {
  onTimeout(() => true);
  return <div class="mg-zone" data-dont="1" onPointerDown={(e) => { stop(e); lose(); }}><span class="mg-big">…</span><span class="mg-sub">pas un doigt sur l’écran</span></div>;
}
function Hold({ lose, onTimeout }) {
  const held = useRef(false);
  const [on, setOn] = useState(false);
  onTimeout(() => held.current);
  const up = () => { if (held.current) { held.current = false; setOn(false); lose(); } };
  return (
    <button type="button" class={`mg-hold${on ? ' is-on' : ''}`} data-hold="1" onPointerDown={(e) => { stop(e); held.current = true; setOn(true); }}
      onPointerUp={up} onPointerCancel={up} onPointerLeave={up}>{on ? 'Tiens bon…' : 'Appuie et garde le doigt'}</button>
  );
}
const DIRS = { droite: [1, 0, 0], bas: [0, 1, 90], gauche: [-1, 0, 180], haut: [0, -1, 270] };
function Swipe({ win, lose }) {
  const [dir] = useState(() => pickOne(Object.keys(DIRS)));
  const st = useRef(null);
  const move = (e) => {
    const s = st.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.hypot(dx, dy) < 60) return;
    st.current = null;
    const [ex, ey] = DIRS[dir];
    const ok = Math.abs(dx) > Math.abs(dy) ? ex !== 0 && Math.sign(dx) === ex : ey !== 0 && Math.sign(dy) === ey;
    if (ok) win(); else lose();
  };
  return (
    <div class="mg-zone" data-swipe={dir} onPointerDown={(e) => { stop(e); st.current = { x: e.clientX, y: e.clientY }; }} onPointerMove={move}>
      <Arrow deg={DIRS[dir][2]} /><span class="mg-sub">vers {dir === 'haut' || dir === 'bas' ? 'le' : 'la'} {dir}</span>
    </div>
  );
}
function Catch({ lvl, win }) {
  const [p] = useState(() => ({ y: rand(16, 80), rev: Math.random() < 0.5 }));
  return <button type="button" class={`mg-target mg-runner${p.rev ? ' rev' : ''}`} data-ok="1" aria-label="Cible qui bouge" style={{ top: `${p.y}%`, '--d': `${Math.max(0.55, 1.7 - lvl * 0.22).toFixed(2)}s`, width: `${Math.max(44, 80 - lvl * 7)}px`, height: `${Math.max(44, 80 - lvl * 7)}px` }} onPointerDown={(e) => { stop(e); win(); }} />;
}
function Count({ lvl, win, lose }) {
  const [q] = useState(() => {
    const n = 5 + Math.floor(rand(0, 4 + lvl * 2));
    return { n, dots: Array.from({ length: n }, () => ({ x: rand(8, 88), y: rand(12, 80) })), opts: shuffle([n, n + 1, n - 1, n + 2]) };
  });
  const [ask, setAsk] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAsk(true), fast() ? 300 : Math.max(450, 1000 - lvl * 110)); return () => clearTimeout(t); }, []);
  if (!ask) return <div class="mg-zone mg-dots" aria-label="Points à compter">{q.dots.map((d, i) => <i key={i} style={{ left: `${d.x}%`, top: `${d.y}%` }} />)}</div>;
  return <div class="mg-choices">{q.opts.map((v) => <button key={v} type="button" class="btn btn-big" data-ok={v === q.n ? '1' : undefined} onPointerDown={(e) => { stop(e); if (v === q.n) win(); else lose(); }}>{v}</button>)}</div>;
}
const COLS = [['rouge', '#E5502F'], ['jaune', '#FFD23F'], ['bleu', '#5B8DEF'], ['vert', '#6CC9A8'], ['rose', '#F4A6B8']];
function Couleur({ win, lose }) {
  const [q] = useState(() => { const s = shuffle(COLS.slice()); return { ink: s[0], word: s[1], opts: shuffle([s[0], s[1], s[2]]) }; });
  return (
    <div class="mg-col">
      <p class="mg-word" style={{ color: q.ink[1] }}>{q.word[0].toUpperCase()}</p>
      <p class="mg-sub">la couleur de l’encre, pas le mot</p>
      <div class="mg-swatches">{q.opts.map((c) => <button key={c[0]} type="button" class="mg-swatch" style={{ background: c[1] }} aria-label={c[0]} data-ok={c === q.ink ? '1' : undefined} onPointerDown={(e) => { stop(e); if (c === q.ink) win(); else lose(); }} />)}</div>
    </div>
  );
}
function Biggest({ lvl, win, lose }) {
  const [q] = useState(() => {
    const base = Math.floor(rand(15, 80));
    const spread = Math.max(2, 14 - lvl * 3);
    const set = new Set();
    while (set.size < (lvl >= 3 ? 6 : 4)) set.add(Math.max(1, Math.floor(base + rand(-spread, spread))));
    const nums = shuffle([...set]);
    return { nums, max: Math.max(...nums) };
  });
  return <div class="mg-grid">{q.nums.map((v) => <button key={v} type="button" class="btn btn-big mg-num" data-ok={v === q.max ? '1' : undefined} onPointerDown={(e) => { stop(e); if (v === q.max) win(); else lose(); }}>{v}</button>)}</div>;
}
const ODD = [['O', 'Q'], ['E', 'F'], ['8', 'B'], ['M', 'N'], ['6', '9'], ['b', 'd'], ['p', 'q'], ['V', 'W'], ['C', 'G']];
function Odd({ lvl, win, lose }) {
  const [q] = useState(() => { const [a, b] = pickOne(ODD); const n = lvl >= 4 ? 20 : lvl >= 2 ? 16 : 12; return { a, b, n, odd: Math.floor(rand(0, n)) }; });
  return <div class={`mg-grid ${q.n > 12 ? 'g4' : 'g3'}`}>{Array.from({ length: q.n }, (_, i) => <button key={i} type="button" class="btn mg-glyph" data-ok={i === q.odd ? '1' : undefined} onPointerDown={(e) => { stop(e); if (i === q.odd) win(); else lose(); }}>{i === q.odd ? q.b : q.a}</button>)}</div>;
}
function Double({ win }) {
  const [p] = useState(() => ({ x: rand(16, 84), y: rand(18, 80) }));
  const last = useRef(0);
  const [hit, setHit] = useState(false);
  return (
    <button type="button" class={`mg-target is-double${hit ? ' is-hit' : ''}`} data-double="1" aria-label="Cible à toucher deux fois" style={{ left: `${p.x}%`, top: `${p.y}%` }}
      onPointerDown={(e) => { stop(e); const t = tnow(); if (t - last.current < 330) win(); else { last.current = t; setHit(true); } }}>×2</button>
  );
}
function Shake({ lvl, win }) {
  const need = 3 + lvl;
  const [n, setN] = useState(0);
  useEffect(() => {
    let c = 0;
    let lastT = 0;
    const on = (e) => {
      const a = e.accelerationIncludingGravity || e.acceleration;
      if (!a || a.x == null) return;
      const m = Math.hypot(a.x, a.y, a.z || 0);
      const t = tnow();
      if (m > 17 && t - lastT > 140) { lastT = t; c += 1; setN(c); buzz(10); if (c >= need) win(); }
    };
    window.addEventListener('devicemotion', on);
    return () => window.removeEventListener('devicemotion', on);
  }, []);
  return <div class="mg-zone"><span class="mg-big">{Math.max(0, need - n)}</span><span class="mg-sub">secousses</span></div>;
}
function Flip({ win }) {
  useEffect(() => {
    const on = (e) => { if (e.beta != null && Math.abs(e.beta) > 150) win(); };
    window.addEventListener('deviceorientation', on);
    return () => window.removeEventListener('deviceorientation', on);
  }, []);
  return <div class="mg-zone"><Arrow deg={90} /><span class="mg-sub">écran contre la table</span></div>;
}
function Tilt({ win, lose }) {
  const [dir] = useState(() => (Math.random() < 0.5 ? -1 : 1));
  useEffect(() => {
    const on = (e) => { if (e.gamma == null) return; if (e.gamma * dir > 35) win(); else if (e.gamma * dir < -45) lose(); };
    window.addEventListener('deviceorientation', on);
    return () => window.removeEventListener('deviceorientation', on);
  }, []);
  return <div class="mg-zone"><Arrow deg={dir < 0 ? 180 : 0} /><span class="mg-sub">penche à {dir < 0 ? 'gauche' : 'droite'}</span></div>;
}

// Feu vert : tape seulement quand ça passe au vert (taper trop tôt = perdu)
function FeuVert({ lvl, win, lose }) {
  const [go, setGo] = useState(false);
  const goRef = useRef(false);
  useEffect(() => { const t = setTimeout(() => { goRef.current = true; setGo(true); }, fast() ? 200 : rand(600, Math.max(900, 1800 - lvl * 120))); return () => clearTimeout(t); }, []);
  return (
    <button type="button" class={`mg-zone mg-feu${go ? ' is-go' : ''}`} data-feu={go ? 'go' : 'wait'} onPointerDown={(e) => { stop(e); if (goRef.current) win(); else lose(); }}>
      <span class="mg-big">{go ? 'TAPE' : 'Attends…'}</span><span class="mg-sub">{go ? '' : 'trop tôt = perdu'}</span>
    </button>
  );
}
// Calcul : une opération éclair
function Calcul({ lvl, win, lose }) {
  const [q] = useState(() => {
    const a = Math.floor(rand(2, 9 + lvl * 3));
    const b = Math.floor(rand(2, 9 + lvl * 2));
    const op = lvl >= 2 && Math.random() < 0.5 ? 'x' : Math.random() < 0.5 ? '+' : '-';
    const r = op === 'x' ? a * b : op === '+' ? a + b : a - b;
    const opts = shuffle([r, r + 1, r - 1, r + (op === 'x' ? a : 10)].filter((v, i, arr) => arr.indexOf(v) === i)).slice(0, 4);
    if (!opts.includes(r)) opts[0] = r;
    return { txt: `${a} ${op === 'x' ? '×' : op} ${b}`, r, opts: shuffle(opts) };
  });
  return (
    <div class="mg-col">
      <p class="mg-word">{q.txt}</p>
      <div class="mg-grid">{q.opts.map((v) => <button key={v} type="button" class="btn btn-big mg-num" data-ok={v === q.r ? '1' : undefined} onPointerDown={(e) => { stop(e); if (v === q.r) win(); else lose(); }}>{v}</button>)}</div>
    </div>
  );
}
// Mémoire : retiens une suite de flèches, puis tape-la
const ARW = [['haut', 270], ['droite', 0], ['bas', 90], ['gauche', 180]];
function Memoire({ lvl, win, lose }) {
  const [seq] = useState(() => Array.from({ length: 3 + Math.min(3, Math.floor(lvl / 2)) }, () => Math.floor(rand(0, 4))));
  const [show, setShow] = useState(true);
  const pos = useRef(0);
  const [n, setN] = useState(0);
  useEffect(() => { const t = setTimeout(() => setShow(false), fast() ? 200 : 450 * seq.length); return () => clearTimeout(t); }, []);
  if (show) return <div class="mg-col"><div class="mg-seq" data-seq={seq.join('')}>{seq.map((d, i) => <Arrow key={i} deg={ARW[d][1]} />)}</div><p class="mg-sub">retiens</p></div>;
  const tap = (d) => { if (d !== seq[pos.current]) { lose(); return; } pos.current += 1; setN(pos.current); if (pos.current >= seq.length) win(); };
  return (
    <div class="mg-col">
      <p class="mg-sub">{n} / {seq.length}</p>
      <div class="mg-pad">{ARW.map(([nm, deg], i) => <button key={nm} type="button" class={`btn mg-arw a-${nm}`} aria-label={nm} data-arw={i} onPointerDown={(e) => { stop(e); tap(i); }}><Arrow deg={deg} /></button>)}</div>
    </div>
  );
}
// Pas le rouge : touche toutes les cibles sauf les rouges
function PasRouge({ lvl, win, lose }) {
  const [q] = useState(() => {
    const n = 3 + Math.min(4, lvl);
    const items = Array.from({ length: n + 2 }, (_, i) => ({ id: i, red: i >= n, x: rand(10, 86), y: rand(14, 80) }));
    return { n, items };
  });
  const [done, setDone] = useState({});
  const hit = useRef(0);
  return (
    <div class="mg-zone mg-free">
      {q.items.map((t) => (done[t.id] ? null : (
        <button key={t.id} type="button" class={`mg-dot${t.red ? ' is-red' : ''}`} aria-label={t.red ? 'cible rouge' : 'cible'} data-ok={t.red ? undefined : '1'} style={{ left: `${t.x}%`, top: `${t.y}%` }}
          onPointerDown={(e) => { stop(e); if (t.red) { lose(); return; } setDone((d) => ({ ...d, [t.id]: true })); hit.current += 1; if (hit.current >= q.n) win(); }} />
      )))}
    </div>
  );
}

export const MICRO = [
  { id: 'tap', word: 'Tape !', C: Tap },
  { id: 'mash', word: 'Martèle !', C: Mash },
  { id: 'dont', word: 'Ne touche rien !', C: Dont, timeout: true },
  { id: 'hold', word: 'Maintiens !', C: Hold },
  { id: 'swipe', word: 'Swipe !', C: Swipe },
  { id: 'catch', word: 'Attrape !', C: Catch },
  { id: 'count', word: 'Compte !', C: Count, extra: 600 },
  { id: 'color', word: 'Couleur !', C: Couleur },
  { id: 'big', word: 'Le plus grand !', C: Biggest },
  { id: 'odd', word: 'L’intrus !', C: Odd },
  { id: 'double', word: 'Double tape !', C: Double },
  { id: 'feu', word: 'Feu vert !', C: FeuVert },
  { id: 'calc', word: 'Calcule !', C: Calcul },
  { id: 'memo', word: 'Retiens !', C: Memoire, extra: 2200 },
  { id: 'rouge', word: 'Pas le rouge !', C: PasRouge },
  { id: 'shake', word: 'Secoue !', C: Shake, sensor: true },
  { id: 'flip', word: 'Retourne !', C: Flip, sensor: true },
  { id: 'tilt', word: 'Penche !', C: Tilt, sensor: true },
];
const WORD = Object.fromEntries(MICRO.map((m) => [m.id, m.word]));
// 3,4 s au début, puis de plus en plus vite, jusqu'à 1,4 s
export const microMs = (k) => Math.max(1400, 3400 - k * 150);
// en duel, ces micro-jeux ne marchent pas à deux (on gagne en ne faisant rien, ou capteurs du téléphone)
const DUEL_OK = (m) => !m.sensor && !m.timeout && m.id !== 'hold';

// ------------------------------------------------------------------ moteur
const nextOf = (pl, u) => pl[(pl.indexOf(u) + 1) % pl.length];
function stat(g, u) { g.stats[u] = g.stats[u] || { runs: 0, best: 0, total: 0, lost: 0 }; return g.stats[u]; }
function finish(c) {
  const g = c.g;
  g.phase = 'end';
  g.summary = { rows: g.pl.map((u) => ({ u, ...stat(g, u) })).sort((a, b) => b.best - a.best || b.total - a.total) };
}

const WARE = {
  id: 'ware',
  name: 'Hors Service Ware',
  tagline: 'Une rafale de micro-jeux de 3 à 5 secondes, consigne d’un mot, de plus en plus vite. Chaque vie perdue est une pénalité.',
  min: 2,
  local: true,
  solo: true,
  rules: [
    'Chacun son tour, le téléphone en main : une consigne d’un mot s’affiche (« Tape ! », « Secoue ! », « Ne touche rien ! »…), tu as 3 à 5 secondes.',
    'Les micro-jeux s’enchaînent de plus en plus vite. Ton tour s’arrête quand tu n’as plus de vies.',
    'Chaque vie perdue est une pénalité. Le score (micro-jeux réussis) compte pour les records.',
    'Mode duel : deux joueurs face à face, le téléphone posé entre eux, l’écran coupé en deux. Même consigne pour les deux : le premier qui réussit gagne la manche, celui qui se trompe la perd. Chaque manche perdue est une pénalité. Le vainqueur reste, le suivant le défie.',
    'Secoue, Retourne et Penche utilisent les capteurs du téléphone : sur iPhone, autorise-les avec le bouton avant de jouer. Sans capteurs, ces micro-jeux sont retirés.',
  ],
  options: [
    { id: 'mode', label: 'Mode', choices: [['solo', 'Chacun son tour'], ['duel', 'Duel à deux']], def: 'solo' },
    { id: 'to', label: 'Duel en', choices: [[3, '3 manches gagnantes'], [5, '5 manches gagnantes']], def: 5 },
    { id: 'lives', label: 'Vies par tour (chacun son tour)', choices: [[3, '3 vies'], [2, '2 vies'], [1, '1 vie']], def: 2 },
    { id: 'sips', label: 'Une vie perdue', choices: [[1, '1 gorgée'], [2, '2 gorgées']], def: 1 },
  ],

  start(c) {
    const pl = c.activeUids();
    const duel = c.opts.mode === 'duel';
    const g = { pl, cur: pl[0], step: 1, phase: 'ready', res: null, stats: {}, hist: [], duel: duel ? [pl[0], pl[1]] : null };
    pl.forEach((u) => stat(g, u));
    c.g = g;
    c.S.game.g = g;
    return g;
  },

  request() { return null; },
  input() { return false; },

  actions({ g }) {
    const out = [];
    if (g.phase === 'result') out.push({ id: 'next', label: 'Joueur suivant', primary: true });
    if (g.phase === 'ready') out.push({ id: 'skip', label: 'Passer ce tour' });
    if (g.phase !== 'end') out.push({ id: 'end', label: 'Terminer', confirm: 'Terminer Hors Service Ware et voir le rapport ?' });
    return out;
  },

  act(c, id, arg) {
    const g = c.g;
    if (id === 'run' && g.phase === 'ready' && arg && arg.step === g.step) {
      const lives = c.opts.lives || 3;
      const lost = Array.isArray(arg.lost) ? arg.lost.filter((x) => WORD[x]).slice(0, lives) : [];
      const score = Math.max(0, Math.min(500, Math.floor(Number(arg.score) || 0)));
      const u = g.cur;
      const s = stat(g, u);
      s.runs += 1; s.total += score; s.lost += lost.length;
      if (score > s.best) s.best = score;
      if (c.record) c.record(u, 'ware', score);
      if (c.count) { c.count(u, 'wareWin', score); c.count(u, 'wareLost', lost.length); }
      const n = c.opts.sips || 1;
      for (const id2 of lost) c.pen(u, n, `Hors Service Ware : « ${WORD[id2]} » raté`);
      g.res = { uid: u, score, lost: lost.length, n, t: c.now() };
      g.hist.push({ uid: u, score });
      if (g.hist.length > 30) g.hist.shift();
      g.phase = 'result';
      return true;
    }
    if (id === 'duelres' && g.duel && g.phase === 'ready' && arg && arg.step === g.step) {
      const [a, b] = g.duel;
      const to = c.opts.to || 5;
      const sa = Math.max(0, Math.min(to, Math.floor(Number(arg.a) || 0)));
      const sb = Math.max(0, Math.min(to, Math.floor(Number(arg.b) || 0)));
      if (sa !== to && sb !== to) return false;
      const n = c.opts.sips || 1;
      if (sb) c.pen(a, n * sb, `Hors Service Ware : ${plural(sb, 'manche perdue', 'manches perdues')} en duel`);
      if (sa) c.pen(b, n * sa, `Hors Service Ware : ${plural(sa, 'manche perdue', 'manches perdues')} en duel`);
      const w = sa >= sb ? a : b;
      const l = w === a ? b : a;
      stat(g, w).total += 1;
      stat(g, w).runs += 1;
      stat(g, l).runs += 1;
      stat(g, l).lost += 1;
      g.wins = g.wins || {};
      g.wins[w] = (g.wins[w] || 0) + 1;
      if (c.record) c.record(w, 'wareDuel', g.wins[w]);
      g.res = { duel: true, w, l, sw: Math.max(sa, sb), sl: Math.min(sa, sb), n, t: c.now() };
      g.phase = 'result';
      return true;
    }
    if (g.duel && ((id === 'next' && g.phase === 'result') || (id === 'skip' && g.phase === 'ready'))) {
      // le vainqueur reste, le joueur suivant le défie
      const w = g.res && g.res.w ? g.res.w : g.duel[0];
      const out = g.res && g.res.l ? g.res.l : g.duel[1];
      let nx = nextOf(g.pl, out);
      if (nx === w) nx = nextOf(g.pl, nx);
      g.duel = [w, nx];
      g.step += 1;
      g.res = null;
      g.phase = 'ready';
      return true;
    }
    if ((id === 'next' && g.phase === 'result') || (id === 'skip' && g.phase === 'ready')) {
      g.cur = nextOf(g.pl, g.cur);
      g.step += 1;
      g.res = null;
      g.phase = 'ready';
      return true;
    }
    if (id === 'end' && g.phase !== 'end') { finish(c); return true; }
    return false;
  },

  turnOf(g) { return g.phase === 'ready' && !g.duel ? g.cur : null; },
  Table,
  Act: () => null,
};
export default WARE;

// ------------------------------------------------------------------ la rafale, en plein écran
function WareRun({ lives: L, sensors, onDone }) {
  const pool = MICRO.filter((m) => !m.sensor || sensors);
  const st = useRef({ k: 0, score: 0, lives: L, lost: [], timers: [], settled: false, test: null, mg: null });
  const [view, setView] = useState({ phase: 'intro', mg: null, k: 0, score: 0, lives: L });
  const later = (fn, ms) => { st.current.timers.push(setTimeout(fn, ms)); };
  const clear = () => { st.current.timers.forEach(clearTimeout); st.current.timers = []; };
  const dur = (k, m) => (fast() ? 1100 : microMs(k) + ((m && m.extra) || 0));
  const settle = (won) => {
    const s = st.current;
    if (s.settled || !s.mg) return;
    s.settled = true;
    clear();
    if (won) { s.score += 1; blip(990, 0.07, 'triangle', 0.05); buzz(25); }
    else { s.lives -= 1; s.lost.push(s.mg.id); blip(170, 0.22, 'sawtooth', 0.05); buzz([90, 40, 90]); }
    s.k += 1;
    setView({ phase: won ? 'win' : 'lose', mg: s.mg, k: s.k, score: s.score, lives: s.lives });
    later(next, fast() ? 200 : 650);
  };
  function next() {
    const s = st.current;
    if (s.lives <= 0) {
      setView((v) => ({ ...v, phase: 'over' }));
      later(() => onDone({ score: s.score, lost: s.lost }), fast() ? 300 : 1800);
      return;
    }
    let m = pickOne(pool);
    if (pool.length > 1) while (s.mg && m.id === s.mg.id) m = pickOne(pool);
    s.mg = m;
    s.test = null;
    s.settled = false;
    const k = s.k;
    setView({ phase: 'intro', mg: m, k, score: s.score, lives: s.lives });
    later(() => {
      setView({ phase: 'play', mg: m, k, score: s.score, lives: s.lives });
      later(() => settle(s.test ? !!s.test() : !!m.timeout), dur(k, m));
    }, fast() ? 250 : Math.max(300, 650 - k * 30));
  }
  useEffect(() => { next(); return clear; }, []);
  const { phase, mg, k, score, lives } = view;
  const lvl = Math.min(6, Math.floor(k / 2));
  return (
    <Arena cls="ware" label="Hors Service Ware" state={phase}>
      <div class="ware-hud">
        <span class="ware-lives" aria-label={plural(lives, 'vie', 'vies')}>{Array.from({ length: L }, (_, i) => <i key={i} class={i < lives ? 'on' : ''} />)}</span>
        <span class="ware-score" aria-label={`Score : ${score}`}>{score}</span>
      </div>
      {phase === 'intro' && mg ? <p class="ware-word" key={`w${k}`}>{mg.word}</p> : null}
      {phase === 'play' && mg ? (
        <div class="ware-play" data-mg={mg.id} key={`p${k}`}>
          <p class="ware-mini">{mg.word}</p>
          <mg.C lvl={lvl} win={() => settle(true)} lose={() => settle(false)} onTimeout={(fn) => { st.current.test = fn; }} />
          <span class="ware-bar" style={{ '--d': `${dur(k, mg)}ms` }} aria-hidden="true" />
        </div>
      ) : null}
      {phase === 'win' ? <p class="ware-flash ok" key={`f${k}`}>Bien !</p> : null}
      {phase === 'lose' ? <p class="ware-flash ko" key={`f${k}`}>Raté !</p> : null}
      {phase === 'over' ? <div class="ware-over"><p class="ware-word">Hors service</p><p>{plural(score, 'micro-jeu réussi', 'micro-jeux réussis')}</p></div> : null}
    </Arena>
  );
}

// ------------------------------------------------------------------ duel : écran coupé en deux, même consigne
function DuelRun({ a, b, to, onDone }) {
  const pool = MICRO.filter(DUEL_OK);
  const st = useRef({ k: 0, sc: [0, 0], timers: [], settled: true, mg: null });
  const [view, setView] = useState({ phase: 'intro', mg: null, k: 0, sc: [0, 0], who: null });
  const later = (fn, ms) => { st.current.timers.push(setTimeout(fn, ms)); };
  const clear = () => { st.current.timers.forEach(clearTimeout); st.current.timers = []; };
  const dur = (k, m) => (fast() ? 1100 : Math.max(1600, 3600 - k * 120) + ((m && m.extra) || 0));
  // side : 0 (en haut, a) ou 1 (en bas, b) ; won : il a réussi (sinon il s'est trompé, l'autre marque)
  const settle = (side, won) => {
    const s = st.current;
    if (s.settled || !s.mg) return;
    s.settled = true;
    clear();
    const winner = side == null ? null : won ? side : 1 - side;
    if (winner != null) { s.sc[winner] += 1; blip(winner ? 660 : 880, 0.08, 'triangle', 0.05); buzz(30); } else blip(200, 0.2, 'sawtooth', 0.04);
    s.k += 1;
    setView({ phase: 'point', mg: s.mg, k: s.k, sc: s.sc.slice(), who: winner });
    later(next, fast() ? 200 : 900);
  };
  function next() {
    const s = st.current;
    if (s.sc[0] >= to || s.sc[1] >= to) {
      setView((v) => ({ ...v, phase: 'over' }));
      later(() => onDone({ a: s.sc[0], b: s.sc[1] }), fast() ? 300 : 2000);
      return;
    }
    let m = pickOne(pool);
    if (pool.length > 1) while (s.mg && m.id === s.mg.id) m = pickOne(pool);
    s.mg = m;
    s.settled = false;
    const k = s.k;
    setView({ phase: 'intro', mg: m, k, sc: s.sc.slice(), who: null });
    later(() => {
      setView({ phase: 'play', mg: m, k, sc: s.sc.slice(), who: null });
      later(() => settle(null, false), dur(k, m)); // personne n'a réussi : manche nulle
    }, fast() ? 250 : 700);
  }
  useEffect(() => { next(); return clear; }, []);
  const { phase, mg, k, sc, who } = view;
  const lvl = Math.min(6, 1 + Math.floor(k / 2));
  const half = (side) => (
    <div class={`wd-half ${side ? 'b' : 'a'}${phase === 'point' && who === side ? ' is-win' : ''}${phase === 'point' && who === 1 - side ? ' is-lose' : ''}`}>
      <div class="wd-top"><span class="wd-name">{side ? b : a}</span><span class="wd-sc">{sc[side]}</span></div>
      {phase === 'intro' && mg ? <p class="ware-word" key={`w${k}`}>{mg.word}</p> : null}
      {phase === 'play' && mg ? (
        <div class="ware-play" data-mg={mg.id} key={`p${k}${side}`}>
          <p class="ware-mini">{mg.word}</p>
          <mg.C lvl={lvl} win={() => settle(side, true)} lose={() => settle(side, false)} onTimeout={() => {}} />
          <span class="ware-bar" style={{ '--d': `${dur(k, mg)}ms` }} aria-hidden="true" />
        </div>
      ) : null}
      {phase === 'point' ? <p class={`ware-flash ${who === side ? 'ok' : 'ko'}`} key={`f${k}`}>{who == null ? 'Nul' : who === side ? 'Point !' : 'Raté'}</p> : null}
      {phase === 'over' ? <p class="ware-word">{sc[side] >= to ? 'Gagné' : 'Hors service'}</p> : null}
    </div>
  );
  return (
    <Arena cls="ware ware-duel" label="Duel Hors Service Ware" state={phase}>
      {half(0)}
      <div class="duel-mid" aria-hidden="true" />
      {half(1)}
    </Arena>
  );
}

function Table({ S, g, uid, dev }) {
  const [run, setRun] = useState(false);
  const [sensors, setSensors] = useState(null);
  useEffect(() => { setRun(false); }, [g.step]);
  useEffect(() => { if (!needsPermission()) probeSensors(900).then(setSensors); }, []);
  if (g.phase === 'end') return <End S={S} g={g} uid={uid} />;
  const L = (S.game.opts && S.game.opts.lives) || 3;
  if (g.duel) {
    const [a, b] = g.duel;
    const to = (S.game.opts && S.game.opts.to) || 5;
    return (
      <div class="ware-table">
        {run && g.phase === 'ready' ? (
          <DuelRun a={nickOf(S, a)} b={nickOf(S, b)} to={to} key={g.step} onDone={(r) => dev.host('game', { id: 'duelres', arg: { step: g.step, ...r } })} />
        ) : null}
        <div class="duel-card paper pose">
          {g.phase === 'ready' ? (
            <>
              <div class="duel-vs"><span><Av p={S.roster[a]} size="l" />{nickOf(S, a)}</span><em>contre</em><span><Av p={S.roster[b]} size="l" />{nickOf(S, b)}</span></div>
              <p class="muted">Posez le téléphone entre vous deux. {nickOf(S, a)} joue en haut, {nickOf(S, b)} en bas. Même consigne pour les deux : le premier qui réussit marque, celui qui se trompe donne le point. Premier à {to}.</p>
              <button type="button" class="btn btn-main btn-big btn-wide" onClick={() => { unlockAudio(); setRun(true); }}>Lancer le duel</button>
            </>
          ) : null}
          {g.phase === 'result' && g.res ? (
            <div class="duel-res">
              <Stamp>{g.res.sw} – {g.res.sl}</Stamp>
              <p><b>{nickOf(S, g.res.w)}</b> gagne le duel contre <b>{nickOf(S, g.res.l)}</b>.</p>
              <p class="muted">Chaque manche perdue coûte {plural(g.res.n, 'gorgée', 'gorgées')}. Le vainqueur reste, le suivant le défie.</p>
            </div>
          ) : null}
        </div>
      </div>
    );
  }
  return (
    <div class="ware-table">
      {run && g.phase === 'ready' ? (
        <WareRun lives={L} sensors={!!sensors} key={g.step} onDone={(r) => dev.host('game', { id: 'run', arg: { step: g.step, ...r } })} />
      ) : null}
      <div class="duel-card paper tape pose">
        {g.phase === 'ready' ? (
          <>
            <p class="bombe-who"><Av p={S.roster[g.cur]} size="l" /> <span><span class="muted small">À toi de jouer</span><b>{nickOf(S, g.cur)}</b></span></p>
            <p class="muted">{plural(L, 'vie', 'vies')}. Une consigne d’un mot, 3 à 5 secondes, de plus en plus vite. Chaque vie perdue est une pénalité.</p>
            {needsPermission() && !sensors ? (
              <button type="button" class="btn btn-wide" onClick={async () => { const ok = await askSensors(); setSensors(ok ? await probeSensors(700) : false); }}>Activer les capteurs (Secoue, Retourne, Penche)</button>
            ) : null}
            {sensors === false ? <p class="muted small">Capteurs indisponibles : Secoue, Retourne et Penche sont retirés de la rafale.</p> : null}
            <button type="button" class="btn btn-main btn-big btn-wide" onClick={() => { unlockAudio(); setRun(true); }}>C’est parti</button>
          </>
        ) : null}
        {g.phase === 'result' && g.res ? (
          <div class="duel-res">
            <Stamp>{plural(g.res.score, 'réussi', 'réussis')}</Stamp>
            <p><b>{nickOf(S, g.res.uid)}</b> enchaîne {plural(g.res.score, 'micro-jeu', 'micro-jeux')} avant d’être hors service.</p>
            <p class="muted">{g.res.lost ? `${plural(g.res.lost, 'vie perdue', 'vies perdues')} : ${plural(g.res.lost, 'pénalité', 'pénalités')} de ${plural(g.res.n, 'gorgée', 'gorgées')}.` : 'Aucune vie perdue.'}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function End({ S, g, uid }) {
  const rows = (g.summary && g.summary.rows) || [];
  return (
    <div class="end">
      <h3 class="end-title">Bilan de la rafale</h3>
      <div class="tbl-wrap"><table class="tbl">
        <thead><tr><th>Joueur</th><th>Tours</th><th>Record</th><th>Réussis</th><th>Vies perdues</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r.u}><td><Who S={S} uid={r.u} you={uid} /></td><td>{r.runs}</td><td>{r.best}</td><td>{r.total}</td><td>{r.lost}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}

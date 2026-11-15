// Bruitages synthétisés (Web Audio, aucun fichier) : verre, tampon, trombone triste, ding, fanfare.
// Coupables depuis les préférences ; rien ne joue tant qu'on n'a pas touché l'écran.
const KEY = 'hs:son'; // même réglage que le son des animations (fx.jsx)
let ctx = null;
export function sonsOn() { try { return localStorage.getItem(KEY) !== '0'; } catch (e) { return true; } }
export function setSons(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) { /* stockage bloqué */ } }
function ac() {
  if (typeof window === 'undefined' || !sonsOn()) return null;
  const A = window.AudioContext || window.webkitAudioContext;
  if (!A) return null;
  try {
    if (!ctx) ctx = new A();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx.state === 'running' ? ctx : null;
  } catch (e) { return null; }
}
if (typeof window !== 'undefined') {
  const wake = () => { if (sonsOn()) ac(); };
  window.addEventListener('pointerdown', wake, { passive: true });
}
function tone(c, { f = 440, f2 = null, t = 0, d = 0.15, type = 'sine', v = 0.2 }) {
  const o = c.createOscillator(); const g = c.createGain();
  const at = c.currentTime + t;
  o.type = type; o.frequency.setValueAtTime(f, at);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, at + d);
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(v, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + d);
  o.connect(g).connect(c.destination); o.start(at); o.stop(at + d + 0.02);
}
function noise(c, { t = 0, d = 0.08, v = 0.3, hp = 800 }) {
  const n = Math.floor(c.sampleRate * d); const b = c.createBuffer(1, n, c.sampleRate); const ch = b.getChannelData(0);
  for (let i = 0; i < n; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const s = c.createBufferSource(); s.buffer = b; const fl = c.createBiquadFilter(); fl.type = 'highpass'; fl.frequency.value = hp;
  const g = c.createGain(); g.gain.value = v; s.connect(fl).connect(g).connect(c.destination); s.start(c.currentTime + t);
}
const SONS = {
  verre: (c) => { tone(c, { f: 2600, d: 0.25, v: 0.12 }); tone(c, { f: 3900, d: 0.18, v: 0.06, t: 0.01 }); },
  tampon: (c) => { tone(c, { f: 140, f2: 60, d: 0.14, type: 'triangle', v: 0.35 }); noise(c, { d: 0.05, v: 0.25, hp: 400 }); },
  trombone: (c) => { [[392, 0], [370, 0.28], [349, 0.56], [330, 0.84]].forEach(([f, t], i) => tone(c, { f, f2: i === 3 ? 290 : null, t, d: i === 3 ? 0.6 : 0.26, type: 'sawtooth', v: 0.07 })); },
  ding: (c) => { tone(c, { f: 1320, d: 0.3, v: 0.12 }); tone(c, { f: 1760, d: 0.35, v: 0.08, t: 0.08 }); },
  tic: (c) => tone(c, { f: 900, d: 0.04, type: 'square', v: 0.04 }),
  fanfare: (c) => { [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38]].forEach(([f, t], i) => tone(c, { f, t, d: i === 3 ? 0.5 : 0.14, type: 'triangle', v: 0.12 })); },
};
export function son(k) {
  const c = ac();
  if (!c || !SONS[k]) return;
  try { SONS[k](c); } catch (e) { /* audio indisponible */ }
}

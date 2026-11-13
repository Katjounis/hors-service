// Jeux arcade (un seul téléphone) : outils communs.
// Son synthétisé (aucun fichier audio), vibration, arène plein écran, horloge précise.
// Animations en transform/opacity uniquement ; prefers-reduced-motion est géré par la feuille de styles.
import { buzz } from '../ui/fx.jsx';

export { buzz };
// tests automatiques : window.__HS_FAST raccourcit délais et mèches
export const fast = () => typeof window !== 'undefined' && !!window.__HS_FAST;
export const tnow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
export const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
export const rand = (a, b) => a + Math.random() * (b - a);

let actx = null;
function audio() {
  if (typeof window === 'undefined') return null;
  try {
    const A = window.AudioContext || window.webkitAudioContext;
    if (!A) return null;
    actx = actx || new A();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  } catch (e) { return null; }
}
// à appeler sur un geste de l'utilisateur (iPhone : le son ne démarre qu'après un toucher)
export function unlockAudio() { audio(); }

export function blip(freq = 880, dur = 0.06, type = 'square', vol = 0.05) {
  const a = audio();
  if (!a) return;
  try {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g); g.connect(a.destination);
    o.start(); o.stop(a.currentTime + dur + 0.02);
  } catch (e) { /* son indisponible */ }
}

// explosion : bruit blanc filtré qui s'éteint
export function boomSound() {
  const a = audio();
  if (!a) return;
  try {
    const len = Math.floor(a.sampleRate * 1.1);
    const buf = a.createBuffer(1, len, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = a.createBufferSource();
    const f = a.createBiquadFilter();
    const g = a.createGain();
    f.type = 'lowpass'; f.frequency.value = 900;
    g.gain.value = 0.5;
    src.buffer = buf;
    src.connect(f); f.connect(g); g.connect(a.destination);
    src.start();
  } catch (e) { /* son indisponible */ }
}

export function Arena({ cls = '', label, state, children }) {
  return <div class={`arena${cls ? ` ${cls}` : ''}`} role="application" aria-label={label} data-state={state}>{children}</div>;
}

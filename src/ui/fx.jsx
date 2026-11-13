// Effets d'ambiance : vibration, confettis, feu de série. Uniquement transform et opacity,
// coupés par prefers-reduced-motion (sauf la vibration, qui n'est pas un mouvement à l'écran).
import { useEffect, useMemo, useRef } from 'preact/hooks';

const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

// vibration du téléphone, si le navigateur le permet
export function buzz(pattern = 40) {
  try {
    if (typeof navigator === 'undefined' || !navigator.vibrate) return;
    // le navigateur refuse la vibration tant qu'on n'a pas touché l'écran : on ne la demande pas
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    navigator.vibrate(pattern);
  } catch (e) { /* non pris en charge */ }
}

// confettis légers : quelques papiers qui tombent, puis disparaissent (aucune bibliothèque)
const CONF_COLORS = ['#FFD23F', '#E5502F', '#F2EADB', '#5B8DEF', '#6CC9A8', '#F4A6B8'];
let lastConfetti = 0;
export function confetti(n = 26) {
  if (typeof document === 'undefined' || reduced()) return;
  if (Date.now() - lastConfetti < 1500) return; // jamais deux pluies d'affilée
  lastConfetti = Date.now();
  const box = document.createElement('div');
  box.className = 'confetti';
  box.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    p.style.left = `${Math.random() * 100}%`;
    p.style.background = CONF_COLORS[i % CONF_COLORS.length];
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * 120}px`);
    p.style.setProperty('--rot', `${(Math.random() - 0.5) * 720}deg`);
    p.style.animationDelay = `${Math.random() * 0.25}s`;
    p.style.animationDuration = `${1.1 + Math.random() * 0.7}s`;
    box.appendChild(p);
  }
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 2200);
}

// joue un effet une seule fois par événement (clé), même si l'écran se redessine
const played = new Set();
export function useOnce(key, fn) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!key || played.has(key)) return;
    played.add(key);
    if (played.size > 400) played.clear();
    ref.current();
  }, [key]);
}

// ---------------------------------------------------------------- feu de série (Purple)
// 7 emplacements autour du compteur, du centre vers les côtés
const SLOTS = [0, -26, 26, -52, 52, -78, 78];
const PALIER = 5; // au-delà : effet spécial
const INCENDIE = 8;

function Flame({ a, s, d }) {
  return (
    <span class="flame" style={{ '--a': `${a}deg`, '--s': s }}>
      <svg class="flame-in" viewBox="0 0 24 30" style={{ animationDuration: `${d}s` }} aria-hidden="true">
        <path d="M12 1.5C14.5 7 21 10.5 21 18.5C21 24.5 17 28.5 12 28.5C7 28.5 3 24.5 3 18.5C3 13.5 6.5 11 8 6.5C9.2 10 10.4 11.4 11.6 11.6C11.2 8.3 11 5 12 1.5Z" fill="#E5502F" stroke="#22201C" stroke-width="2" stroke-linejoin="round" />
        <path d="M12 12C13.5 15.5 17 17.5 17 21.5C17 25 14.8 27 12 27C9.2 27 7 25 7 21.5C7 19 8.6 17.6 9.5 15.5C10.4 17.6 11.4 18 12 12Z" fill="#F28C38" />
        <path d="M12 19C12.8 21 14.5 22 14.5 24C14.5 25.6 13.4 26.5 12 26.5C10.6 26.5 9.5 25.6 9.5 24C9.5 22.6 10.6 21.6 12 19Z" fill="#FFD23F" />
      </svg>
    </span>
  );
}

export function StreakFire({ streak, smokeKey = null, smoked = 0, label = 'Série' }) {
  const lit = streak >= 2;
  const n = lit ? Math.min(SLOTS.length, streak) : 0;
  const size = 0.62 + Math.min(streak, 7) * 0.08;
  const level = streak >= INCENDIE ? 'incendie' : streak >= PALIER ? 'feu' : lit ? 'braise' : '';
  return (
    <div class={`fire${level ? ` is-${level}` : ''}`} role="status" aria-label={`${label} : ${streak}${level === 'feu' || level === 'incendie' ? ', en feu' : ''}`}>
      {level === 'feu' || level === 'incendie' ? <span class="fire-glow" aria-hidden="true" /> : null}
      {SLOTS.slice(0, n).map((a, i) => <Flame key={i} a={a} s={(size * (1 - Math.abs(a) / 260)).toFixed(2)} d={(0.55 + ((i * 37) % 30) / 100).toFixed(2)} />)}
      {level === 'feu' || level === 'incendie' ? (
        <span class="embers" aria-hidden="true">{[0, 1, 2, 3, 4, 5, 6].map((i) => <i key={i} style={{ '--x': `${(i * 23) % 100}%`, animationDelay: `${(i * 0.27) % 1.4}s` }} />)}</span>
      ) : null}
      {smokeKey && smoked >= 2 ? (
        <span class="smoke" key={smokeKey} aria-hidden="true">
          {SLOTS.slice(0, Math.min(SLOTS.length, smoked)).map((a, i) => <i key={i} style={{ '--a': `${a}deg`, animationDelay: `${i * 0.06}s` }} />)}
        </span>
      ) : null}
      <span class="fire-n" key={`n${streak}`}>{streak}<small>série</small></span>
      {level === 'feu' ? <span class="fire-word" key="feu">En feu</span> : null}
      {level === 'incendie' ? <span class="fire-word" key="inc">Incendie</span> : null}
    </div>
  );
}

// ---------------------------------------------------------------- décor : un appart en fin de soirée
// Guirlande lumineuse en haut, halos colorés, verres et bougie sur la table en bas, grain et vignette.
// Léger : SVG en ligne dessiné une fois ; seules l'opacité et la position bougent (ampoules qui scintillent,
// flamme, halos qui dérivent), donc tout tourne sur la carte graphique. Coupé par prefers-reduced-motion.
// Teinte : celle du jeu en cours ; dans « Je n'ai jamais », celle du niveau de la carte.
const TINTS = {
  oserait: '244, 166, 184', 96: '242, 140, 56', pipoteur: '108, 201, 168', purple: '155, 127, 212', hippodrome: '163, 196, 90',
  toutankhamon: '91, 141, 239', autres: '244, 166, 184', trouve: '255, 210, 63', degaine: '229, 80, 47', bombe: '242, 140, 56', ware: '91, 141, 239',
  jamais: '255, 176, 88',
};
// trois couleurs par ambiance : lumière principale, seconde lumière, ampoules
const PALETTES = {
  base: ['255, 186, 96', '236, 104, 150', '255, 222, 168'],
  'jamais-soft': ['255, 172, 80', '255, 118, 70', '255, 220, 160'],
  'jamais-hard': ['150, 92, 240', '255, 136, 46', '206, 170, 255'],
  'jamais-cul': ['238, 48, 92', '255, 100, 180', '255, 176, 208'],
};
export const paletteOf = (k) => PALETTES[k] || (TINTS[k] ? [TINTS[k], '255, 186, 96', '255, 222, 168'] : PALETTES.base);

// guirlande : deux arcs par motif de 360 × 120, répétés sur toute la largeur
const GW = 360;
const GH = 120;
const WIRE = 'M0 12 Q90 112 180 12 Q270 112 360 12';
const BULBS = (() => {
  const out = [];
  for (const x0 of [0, 180]) {
    for (const t of [0.1, 0.26, 0.42, 0.58, 0.74, 0.9]) {
      const x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * (x0 + 90) + t * t * (x0 + 180);
      const y = (1 - t) ** 2 * 12 + 2 * (1 - t) * t * 112 + t * t * 12;
      out.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, c: [3, 1, 3, 2][out.length % 4] });
    }
  }
  return out;
})();
const col = (c, a) => ({ fill: `rgba(var(--d${c}), ${a})` });

function Garland({ id, part }) {
  const pid = `${id}-${part}`;
  const bulbs = part === 'base' ? BULBS : BULBS.filter((_, i) => i % 2 === (part === 'a' ? 0 : 1));
  return (
    <svg class={`amb-lights ${part}`} width="100%" height={GH} aria-hidden="true" focusable="false">
      <defs>
        {part !== 'base' ? [1, 2, 3].map((c) => (
          <radialGradient key={c} id={`${pid}-g${c}`}>
            <stop offset="0" style={{ stopColor: `rgb(var(--d${c}))`, stopOpacity: 0.62 }} />
            <stop offset="0.38" style={{ stopColor: `rgb(var(--d${c}))`, stopOpacity: 0.2 }} />
            <stop offset="1" style={{ stopColor: `rgb(var(--d${c}))`, stopOpacity: 0 }} />
          </radialGradient>
        )) : null}
        <pattern id={`${pid}-p`} width={GW} height={GH} patternUnits="userSpaceOnUse">
          {part === 'base' ? (
            <>
              <path d={WIRE} fill="none" stroke="#0E0C0A" stroke-width="1.8" />
              <path d={WIRE} fill="none" stroke="rgba(255, 236, 200, .14)" stroke-width=".7" />
              {bulbs.map((b, i) => (
                <g key={i}>
                  <rect x={b.x - 1.7} y={b.y - 1} width="3.4" height="4.2" rx=".8" fill="#2A2622" />
                  <ellipse cx={b.x} cy={b.y + 7.4} rx="3.3" ry="4.7" style={col(b.c, 0.45)} />
                </g>
              ))}
            </>
          ) : bulbs.map((b, i) => (
            <g key={i}>
              <circle cx={b.x} cy={b.y + 7.4} r="20" fill={`url(#${pid}-g${b.c})`} />
              <ellipse cx={b.x} cy={b.y + 7.4} rx="3.3" ry="4.7" style={col(b.c, 1)} />
              <circle cx={b.x - 1} cy={b.y + 5.6} r="1.3" fill="rgba(255, 255, 255, .85)" />
            </g>
          ))}
        </pattern>
      </defs>
      <rect width="100%" height={GH} fill={`url(#${pid}-p)`} />
    </svg>
  );
}

// verres sur la table : vin, whisky avec glaçons, bière, cocktail, et une bougie (dessin 400 × 170, pieds à y = 150)
function Verres({ id }) {
  const glass = { fill: 'rgba(255, 255, 255, .05)', stroke: 'rgba(255, 246, 230, .32)', 'stroke-width': 1.3, 'stroke-linejoin': 'round' };
  const shine = { fill: 'none', stroke: 'rgba(255, 255, 255, .4)', 'stroke-width': 1.6, 'stroke-linecap': 'round' };
  return (
    <svg class="amb-verres" viewBox="0 0 400 170" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-refl`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'rgb(var(--d1))', stopOpacity: 0.22 }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--d1))', stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {/* reflets sur la table */}
      <rect x="80" y="151" width="30" height="16" fill={`url(#${id}-refl)`} />
      <rect x="153" y="151" width="34" height="16" fill={`url(#${id}-refl)`} />
      <rect x="227" y="151" width="26" height="18" fill={`url(#${id}-refl)`} />
      <rect x="296" y="151" width="28" height="14" fill={`url(#${id}-refl)`} />
      {/* verre de vin */}
      <path d="M95 98 C84 98 76 84 76 58 L114 58 C114 84 106 98 95 98 Z" {...glass} />
      <path d="M78.6 74 C80 88 86 96 95 96 C104 96 110 88 111.4 74 Z" style={col(2, 0.55)} />
      <path d="M95 98 V143" {...glass} />
      <ellipse cx="95" cy="147.5" rx="16" ry="3.2" {...glass} />
      <path d="M81.5 64 C81.5 78 85 87 89 91" {...shine} />
      {/* whisky et glaçons */}
      <path d="M150 98 L154 149 L186 149 L190 98 Z" {...glass} />
      <path d="M151.4 114 L154.4 147 L185.6 147 L188.6 114 Z" style={col(1, 0.42)} />
      <rect x="157" y="106" width="12.5" height="11.5" rx="2.4" fill="rgba(255, 255, 255, .2)" transform="rotate(-8 163 112)" />
      <rect x="171" y="109" width="12" height="11" rx="2.4" fill="rgba(255, 255, 255, .16)" transform="rotate(10 177 114)" />
      <path d="M155 104 L158 142" {...shine} />
      {/* bouteille de bière */}
      <path d="M229 150 V93 C229 85 234 81 236.5 76 V52 H243.5 V76 C246 81 251 85 251 93 V150 Z" fill="rgba(52, 36, 18, .78)" stroke-width="1.2" style={{ stroke: 'rgba(var(--d1), .35)' }} />
      <rect x="235.5" y="46.5" width="9" height="6" rx="1" style={col(3, 0.5)} />
      <rect x="231" y="108" width="18" height="20" rx="1.5" fill="rgba(242, 234, 219, .3)" />
      <path d="M233.5 96 V144" {...shine} style={{ stroke: 'rgba(255, 255, 255, .22)' }} />
      {/* cocktail */}
      <path d="M286 70 L334 70 L310 101 Z" {...glass} />
      <path d="M290.5 74 L329.5 74 L310 98.5 Z" style={col(2, 0.5)} />
      <path d="M318.5 57 L306 95" stroke-width="2.2" stroke-linecap="round" style={{ stroke: 'rgba(var(--d2), .85)' }} />
      <circle cx="331.5" cy="70" r="6.5" fill="rgba(255, 214, 90, .45)" stroke="rgba(255, 236, 160, .5)" stroke-width="1" />
      <path d="M310 101 V143" {...glass} />
      <ellipse cx="310" cy="147.5" rx="14" ry="3" {...glass} />
      {/* bougie */}
      <rect x="351" y="136" width="20" height="13" rx="2" fill="rgba(242, 234, 219, .55)" />
      <ellipse cx="361" cy="136" rx="10" ry="2.4" fill="rgba(255, 246, 230, .7)" />
      <path d="M361 136 V131" stroke="#2A2622" stroke-width="1.2" />
    </svg>
  );
}

// flamme de la bougie et son halo : un calque à part, qui vacille (seule son opacité bouge)
function Flamme({ id }) {
  return (
    <svg class="amb-verres amb-flamme" viewBox="0 0 400 170" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-fl`}>
          <stop offset="0" stop-color="#FFD58A" stop-opacity=".55" />
          <stop offset=".45" stop-color="#FF9F45" stop-opacity=".16" />
          <stop offset="1" stop-color="#FF9F45" stop-opacity="0" />
        </radialGradient>
      </defs>
      <circle cx="361" cy="124" r="34" fill={`url(#${id}-fl)`} />
      <path d="M361 119 C365 124 365 129 361 131 C357 129 357 124 361 119 Z" fill="#FFE2A6" />
    </svg>
  );
}

let ambN = 0;
export function Ambiance({ game = null }) {
  const [d1, d2, d3] = paletteOf(game);
  const id = useMemo(() => `amb${(ambN += 1)}`, []);
  return (
    <div class={`ambiance${game ? ' is-game' : ''}`} style={{ '--d1': d1, '--d2': d2, '--d3': d3 }} aria-hidden="true">
      <i class="amb-halo h1" />
      <i class="amb-halo h2" />
      <i class="amb-halo h3" />
      <i class="amb-bokeh" />
      <Garland id={id} part="base" />
      <Garland id={id} part="a" />
      <Garland id={id} part="b" />
      <i class="amb-table" />
      <Verres id={id} />
      <Flamme id={id} />
    </div>
  );
}

// ---------------------------------------------------------------- sons (Web Audio, aucun fichier)
// Roulement de tambour et coup de cymbale synthétisés : bruit filtré, enveloppes courtes.
// Le son se coupe dans le menu de l'animation (mémorisé sur le téléphone).
let actx = null;
const SOUND_KEY = 'hs:son';
export function soundOn() { try { return localStorage.getItem(SOUND_KEY) !== '0'; } catch (e) { return true; } }
export function setSound(on) { try { localStorage.setItem(SOUND_KEY, on ? '1' : '0'); } catch (e) { /* stockage bloqué */ } if (!on) stopSounds(); }
function ctx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return null;
  if (!actx) { try { actx = new AC(); } catch (e) { return null; } }
  if (actx.state === 'suspended') actx.resume().catch(() => {});
  return actx;
}
let noiseBuf = null;
function noise(a) {
  if (noiseBuf && noiseBuf.sampleRate === a.sampleRate) return noiseBuf;
  noiseBuf = a.createBuffer(1, a.sampleRate * 1.5, a.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return noiseBuf;
}
const live = new Set();
export function stopSounds() { for (const s of live) { try { s.stop(); } catch (e) { /* déjà arrêté */ } } live.clear(); }
function hit(a, t, { f = 220, q = 0.8, len = 0.09, vol = 0.35, type = 'bandpass' } = {}) {
  const src = a.createBufferSource();
  src.buffer = noise(a);
  const flt = a.createBiquadFilter();
  flt.type = type; flt.frequency.value = f; flt.Q.value = q;
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  src.connect(flt).connect(g).connect(a.destination);
  src.start(t, Math.random() * 0.5, len + 0.05);
  live.add(src);
  src.onended = () => live.delete(src);
}
// roulement : des coups de caisse claire de plus en plus serrés pendant `ms`
export function drumRoll(ms) {
  if (!soundOn()) return;
  const a = ctx();
  if (!a) return;
  const t0 = a.currentTime + 0.02;
  const end = t0 + ms / 1000;
  let t = t0;
  let gap = 0.085;
  let i = 0;
  while (t < end) {
    const p = (t - t0) / Math.max(0.1, end - t0);
    hit(a, t, { f: 1800, q: 0.7, len: 0.07, vol: 0.12 + 0.22 * p + (i % 2 ? 0 : 0.05) });
    gap = Math.max(0.032, 0.085 - p * 0.055);
    t += gap;
    i++;
  }
  hit(a, end, { f: 90, q: 1, len: 0.35, vol: 0.6, type: 'lowpass' }); // grosse caisse finale
}
export function cymbal() {
  if (!soundOn()) return;
  const a = ctx();
  if (!a) return;
  const t = a.currentTime + 0.01;
  hit(a, t, { f: 7000, q: 0.4, len: 1.6, vol: 0.32, type: 'highpass' });
  hit(a, t, { f: 90, q: 1, len: 0.5, vol: 0.7, type: 'lowpass' });
}
export function boom() {
  if (!soundOn()) return;
  const a = ctx();
  if (!a) return;
  hit(a, a.currentTime + 0.01, { f: 120, q: 1, len: 0.5, vol: 0.55, type: 'lowpass' });
}
export const isReduced = reduced;

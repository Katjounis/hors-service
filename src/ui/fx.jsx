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

// ---- fenêtre de nuit : immeubles d'en face, fenêtres allumées (quelques-unes s'allument et s'éteignent)
const IMM = [[0, 70, 46], [48, 40, 34], [84, 92, 40], [126, 58, 30], [158, 104, 44], [204, 76, 40]];
function Fenetre({ id }) {
  const lit = [];
  IMM.forEach(([x, top, w], k) => {
    for (let y = top + 8; y < 186; y += 14) {
      for (let xx = x + 5; xx < x + w - 6; xx += 10) {
        const h = (xx * 7 + y * 13 + k * 31) % 17;
        if (h < 5) lit.push({ x: xx, y, blink: h === 0 ? 1 : h === 1 ? 2 : 0 });
      }
    }
  });
  return (
    <svg class="amb-fenetre" viewBox="0 0 250 230" aria-hidden="true" focusable="false">
      <rect x="8" y="8" width="234" height="196" fill="#0B0D16" />
      <circle cx="196" cy="44" r="13" fill="#E9E1CF" fill-opacity=".85" />
      <circle cx="191" cy="40" r="13" fill="#0B0D16" />
      {IMM.map(([x, top, w], i) => <rect key={i} x={x + 8} y={top + 8} width={w} height={196 - top} fill={i % 2 ? '#141824' : '#181C2A'} />)}
      {lit.map((l, i) => <rect key={i} class={l.blink ? `amb-win b${l.blink}` : null} x={l.x + 8} y={l.y + 8} width="5" height="7" fill="#F2C46A" fill-opacity=".7" />)}
      {/* croisée et cadre */}
      <rect x="4" y="4" width="242" height="204" fill="none" stroke="#3A2E26" stroke-width="8" />
      <path d="M125 8 V204 M8 104 H242" stroke="#3A2E26" stroke-width="5" />
      <rect x="0" y="206" width="250" height="10" fill="#4A3A2E" />
      {/* rideau */}
      <path d="M232 0 C222 60 238 140 226 230 H250 V0 Z" fill="#5A2430" />
      <path d="M238 0 C232 70 244 150 236 230" stroke="#3E1820" stroke-width="2" fill="none" />
    </svg>
  );
}

// ---- lampe sur pied : abat-jour et cône de lumière (teinte de l'ambiance)
function Lampe({ id }) {
  return (
    <svg class="amb-lampe" viewBox="0 0 160 520" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-lp`} cx=".5" cy=".18" r=".7">
          <stop offset="0" style={{ stopColor: 'rgb(var(--d1))', stopOpacity: 0.32 }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--d1))', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      <ellipse cx="80" cy="110" rx="80" ry="150" fill={`url(#${id}-lp)`} />
      <path d="M44 40 H116 L132 104 H28 Z" style={{ fill: 'rgb(var(--d1))' }} fill-opacity=".55" />
      <path d="M44 40 H116 L132 104 H28 Z" fill="none" stroke="#2A1F18" stroke-width="2" />
      <path d="M80 104 V500" stroke="#2A2420" stroke-width="5" />
      <ellipse cx="80" cy="506" rx="34" ry="8" fill="#2A2420" />
    </svg>
  );
}

// ---- le salon en bas : canapé, table basse en fin de soirée (verres, bouteilles couchées, boîte de pizza,
// paquet de chips, cartes à jouer, bougie), parquet. Dessin 400 × 220, posé en bas de l'écran.
function Salon({ id }) {
  const glass = { fill: 'rgba(255, 255, 255, .06)', stroke: 'rgba(255, 246, 230, .4)', 'stroke-width': 1.2, 'stroke-linejoin': 'round' };
  return (
    <svg class="amb-salon" viewBox="0 0 400 220" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      {/* canapé */}
      <path d="M18 92 Q18 70 40 70 H360 Q382 70 382 92 V150 H18 Z" fill="#3B2430" />
      <path d="M34 86 Q34 78 44 78 H196 V128 H34 Z" fill="#46293A" />
      <path d="M204 78 H356 Q366 78 366 86 V128 H204 Z" fill="#46293A" />
      <rect x="6" y="96" width="34" height="62" rx="8" fill="#33202A" />
      <rect x="360" y="96" width="34" height="62" rx="8" fill="#33202A" />
      <path d="M262 96 l26 -10 l14 26 l-28 8 z" fill="#C8301E" fill-opacity=".7" />
      <path d="M70 98 q20 -14 44 0 l-6 22 h-34 z" fill="#E7C877" fill-opacity=".35" />
      {/* parquet */}
      <rect x="0" y="150" width="400" height="70" fill="#2A1B12" />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M0 ${158 + i * 14} H400`} stroke="#1E130C" stroke-width="1.5" />)}
      {[30, 110, 190, 270, 350, 70, 150, 230, 310].map((x, i) => <path key={i} d={`M${x} ${150 + (i < 5 ? 0 : 14)} v14`} stroke="#1E130C" stroke-width="1.5" />)}
      {/* table basse */}
      <rect x="40" y="150" width="320" height="12" fill="#5A3A22" />
      <rect x="40" y="150" width="320" height="3" fill="#7A5232" />
      <rect x="54" y="162" width="10" height="40" fill="#4A2E1A" />
      <rect x="336" y="162" width="10" height="40" fill="#4A2E1A" />
      {/* boîte de pizza ouverte */}
      <path d="M60 150 L64 140 H132 L128 150 Z" fill="#B88A55" />
      <path d="M70 140 L76 116 H136 L132 140 Z" fill="#C99A62" />
      <path d="M72 148 l18 -6 l10 6 z" fill="#E7B04A" fill-opacity=".8" />
      <circle cx="84" cy="146" r="2" fill="#B23A22" />
      {/* cartes éparpillées */}
      <rect x="140" y="144" width="14" height="6" fill="#F2EADB" transform="rotate(-12 147 147)" />
      <rect x="150" y="145" width="14" height="5" fill="#F2EADB" transform="rotate(8 157 147)" />
      {/* bouteille couchée */}
      <path d="M170 146 H206 Q212 146 214 144 H226 V150 H214 Q212 148 206 148 H170 Q166 148 166 147 Q166 146 170 146 Z" fill="#2E4A2A" />
      {/* bouteilles debout */}
      <path d="M232 150 V112 Q232 104 238 100 V86 H244 V100 Q250 104 250 112 V150 Z" fill="rgba(52, 36, 18, .9)" stroke="rgba(255, 236, 200, .25)" stroke-width="1" />
      <rect x="235" y="118" width="12" height="14" fill="rgba(242, 234, 219, .35)" />
      <path d="M256 150 V120 Q256 114 260 111 V100 H265 V111 Q269 114 269 120 V150 Z" fill="#1F3A2A" stroke="rgba(255, 236, 200, .2)" stroke-width="1" />
      {/* verres */}
      <path d="M182 124 C176 124 172 116 172 104 H192 C192 116 188 124 182 124 Z" {...glass} />
      <path d="M173.3 112 C174 119 178 123 182 123 C186 123 190 119 190.7 112 Z" style={{ fill: 'rgba(var(--d2), .6)' }} />
      <path d="M182 124 V146" {...glass} />
      <ellipse cx="182" cy="148" rx="8" ry="2" {...glass} />
      <path d="M200 126 L202 149 H216 L218 126 Z" {...glass} />
      <path d="M200.8 136 L202.4 148 H215.6 L217.2 136 Z" style={{ fill: 'rgba(var(--d1), .5)' }} />
      <path d="M278 132 L280 149 H292 L294 132 Z" {...glass} />
      <path d="M296 128 L300 116 L308 118 L306 128 Z" {...glass} transform="rotate(64 302 124)" />
      {/* paquet de chips */}
      <path d="M312 150 L316 122 Q326 118 336 122 L340 150 Z" fill="#C8301E" fill-opacity=".85" />
      <path d="M318 132 H334" stroke="#FFD23F" stroke-width="3" />
      {/* bougie */}
      <rect x="344" y="138" width="10" height="12" fill="rgba(242, 234, 219, .6)" />
      <path d="M349 138 V134" stroke="#2A2622" stroke-width="1" />
    </svg>
  );
}

function Flamme({ id }) {
  return (
    <svg class="amb-salon amb-flamme" viewBox="0 0 400 220" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-fl`}>
          <stop offset="0" stop-color="#FFD58A" stop-opacity=".5" />
          <stop offset=".45" stop-color="#FF9F45" stop-opacity=".14" />
          <stop offset="1" stop-color="#FF9F45" stop-opacity="0" />
        </radialGradient>
      </defs>
      <circle cx="349" cy="130" r="26" fill={`url(#${id}-fl)`} />
      <path d="M349 127 C352 130 352 133 349 135 C346 133 346 130 349 127 Z" fill="#FFE2A6" />
    </svg>
  );
}

let ambN = 0;
export function Ambiance({ game = null }) {
  const [d1, d2, d3] = paletteOf(game);
  const id = useMemo(() => `amb${(ambN += 1)}`, []);
  return (
    <div class={`ambiance${game ? ' is-game' : ''}`} style={{ '--d1': d1, '--d2': d2, '--d3': d3 }} aria-hidden="true">
      <i class="amb-mur" />
      <Fenetre id={id} />
      <Lampe id={id} />
      <i class="amb-ombre" />
      <Salon id={id} />
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

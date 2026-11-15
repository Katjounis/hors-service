// Effets d'ambiance : vibration, confettis, feu de série. Uniquement transform et opacity,
// coupés par prefers-reduced-motion (sauf la vibration, qui n'est pas un mouvement à l'écran).
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { sceneOf, DecorBas, DecorHaut } from './decor.jsx';
import { Character } from './avatar.jsx';
import { son } from './sons.js';

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
  jamais: '255, 176, 88', president: '232, 196, 80', cercle: '240, 110, 60', perudo: '210, 140, 80', paranoia: '150, 110, 220', actionverite: '238, 84, 110', tupref: '96, 190, 200',
};
// trois couleurs par ambiance : lumière principale, seconde lumière, ampoules
const PALETTES = {
  base: ['255, 186, 96', '236, 104, 150', '255, 222, 168'],
  'jamais-soft': ['255, 172, 80', '255, 118, 70', '255, 220, 160'],
  'jamais-hard': ['150, 92, 240', '255, 136, 46', '206, 170, 255'],
  'jamais-cul': ['238, 48, 92', '255, 100, 180', '255, 176, 208'],
  garou: ['255, 186, 96', '200, 60, 40', '255, 222, 168'],
  'garou-nuit': ['110, 140, 210', '60, 80, 150', '200, 210, 240'],
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

// ---- cadres au mur (haut droite) : une affiche de concert, un paysage, un petit miroir rond
function Cadres() {
  return (
    <svg class="amb-cadres" viewBox="0 0 220 260" aria-hidden="true" focusable="false">
      <path d="M60 4 L36 40 M60 4 L84 40" stroke="#4A3A2E" stroke-width="1.5" />
      <rect x="20" y="40" width="80" height="108" fill="#3A2E26" />
      <rect x="27" y="47" width="66" height="94" fill="#C8301E" />
      <circle cx="60" cy="84" r="20" fill="#FFD23F" />
      <rect x="34" y="114" width="52" height="6" fill="#F2EADB" />
      <rect x="40" y="125" width="40" height="4" fill="#F2EADB" fill-opacity=".7" />
      <rect x="118" y="20" width="92" height="70" fill="#3A2E26" />
      <rect x="124" y="26" width="80" height="58" fill="#2E4A5A" />
      <path d="M124 70 L150 46 L170 62 L184 50 L204 68 V84 H124 Z" fill="#3E6B4A" />
      <circle cx="190" cy="38" r="6" fill="#E9E1CF" fill-opacity=".8" />
      <circle cx="164" cy="150" r="30" fill="#3A2E26" />
      <circle cx="164" cy="150" r="24" fill="#5A6470" fill-opacity=".6" />
      <path d="M150 140 L164 130" stroke="#E9E1CF" stroke-opacity=".5" stroke-width="3" />
    </svg>
  );
}

// ---- le salon en bas, sur toute la largeur (dessin 800 × 300, centré, recadré sur les côtés au téléphone) :
// au mur un grand tableau et une étagère de vinyles ; au sol une plante, le canapé, la table basse en bazar
// (pizza, bouteilles, verres, chips, cartes, bougie) et la lampe sur pied posée sur le parquet.
function Salon({ id }) {
  const glass = { fill: 'rgba(255, 255, 255, .06)', stroke: 'rgba(255, 246, 230, .4)', 'stroke-width': 1.2, 'stroke-linejoin': 'round' };
  return (
    <svg class="amb-salon" viewBox="0 0 800 300" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-lp`} cx=".5" cy=".3" r=".6">
          <stop offset="0" style={{ stopColor: 'rgb(var(--d1))', stopOpacity: 0.3 }} />
          <stop offset="1" style={{ stopColor: 'rgb(var(--d1))', stopOpacity: 0 }} />
        </radialGradient>
      </defs>
      {/* grand tableau au-dessus du canapé */}
      <rect x="318" y="14" width="164" height="70" fill="#3A2E26" />
      <rect x="325" y="21" width="150" height="56" fill="#E9DFC9" />
      <path d="M325 60 Q360 30 400 52 T475 40 V77 H325 Z" fill="#C8301E" fill-opacity=".75" />
      <circle cx="355" cy="40" r="9" fill="#FFD23F" />
      {/* étagère de vinyles (à gauche) */}
      <rect x="92" y="64" width="120" height="6" fill="#5A3A22" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <rect key={i} x={98 + i * 9} y={30 + (i % 3) * 3} width="7" height={34 - (i % 3) * 3} fill={['#2E4A5A', '#C8301E', '#E7C877', '#3E6B4A', '#5A2430', '#F2EADB', '#22201C'][i]} />)}
      <circle cx="185" cy="46" r="17" fill="#141110" />
      <circle cx="185" cy="46" r="5" fill="#C8301E" />
      <rect x="92" y="110" width="120" height="6" fill="#5A3A22" />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={100 + i * 13} y={84 + (i % 2) * 4} width="10" height={26 - (i % 2) * 4} fill={['#E7C877', '#2E4A5A', '#F2EADB', '#C8301E', '#3E6B4A'][i]} />)}
      {/* petit tableau à droite */}
      <rect x="600" y="40" width="64" height="80" fill="#3A2E26" />
      <rect x="606" y="46" width="52" height="68" fill="#1F5A3E" />
      <path d="M632 60 l10 18 h-20 z" fill="#FFD23F" />
      {/* parquet */}
      <rect x="0" y="230" width="800" height="70" fill="#2A1B12" />
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M0 ${238 + i * 14} H800`} stroke="#1E130C" stroke-width="1.5" />)}
      {Array.from({ length: 20 }, (_, i) => <path key={i} d={`M${(i * 80 + (i % 2) * 40) % 800} ${230 + (i % 5) * 14} v14`} stroke="#1E130C" stroke-width="1.5" />)}
      {/* plante */}
      <rect x="120" y="196" width="40" height="36" fill="#8A4A2E" />
      <rect x="116" y="192" width="48" height="8" fill="#9A5A3A" />
      {[[-38, 70], [-20, 92], [0, 104], [20, 90], [38, 72]].map(([dx, h], i) => (
        <path key={i} d={`M140 194 Q${140 + dx * 0.4} ${194 - h * 0.6} ${140 + dx} ${194 - h}`} stroke="#3E6B4A" stroke-width="9" stroke-linecap="round" fill="none" />
      ))}
      {/* canapé */}
      <path d="M218 172 Q218 150 240 150 H560 Q582 150 582 172 V230 H218 Z" fill="#3B2430" />
      <path d="M234 166 Q234 158 244 158 H396 V208 H234 Z" fill="#46293A" />
      <path d="M404 158 H556 Q566 158 566 166 V208 H404 Z" fill="#46293A" />
      <rect x="206" y="176" width="34" height="62" fill="#33202A" />
      <rect x="560" y="176" width="34" height="62" fill="#33202A" />
      <path d="M462 176 l26 -10 l14 26 l-28 8 z" fill="#C8301E" fill-opacity=".7" />
      <path d="M270 178 q20 -14 44 0 l-6 22 h-34 z" fill="#E7C877" fill-opacity=".35" />
      {/* lampe sur pied, posée au sol à droite */}
      <ellipse cx="660" cy="150" rx="90" ry="110" fill={`url(#${id}-lp)`} />
      <path d="M632 120 H688 L702 168 H618 Z" style={{ fill: 'rgb(var(--d1))' }} fill-opacity=".55" />
      <path d="M632 120 H688 L702 168 H618 Z" fill="none" stroke="#2A1F18" stroke-width="2" />
      <path d="M660 168 V284" stroke="#2A2420" stroke-width="4" />
      <ellipse cx="660" cy="286" rx="22" ry="5" fill="#1A120C" />
      {/* table basse */}
      <rect x="240" y="230" width="320" height="12" fill="#5A3A22" />
      <rect x="240" y="230" width="320" height="3" fill="#7A5232" />
      <rect x="254" y="242" width="10" height="40" fill="#4A2E1A" />
      <rect x="536" y="242" width="10" height="40" fill="#4A2E1A" />
      <path d="M260 230 L264 220 H332 L328 230 Z" fill="#B88A55" />
      <path d="M270 220 L276 196 H336 L332 220 Z" fill="#C99A62" />
      <path d="M272 228 l18 -6 l10 6 z" fill="#E7B04A" fill-opacity=".8" />
      <rect x="340" y="224" width="14" height="6" fill="#F2EADB" transform="rotate(-12 347 227)" />
      <rect x="350" y="225" width="14" height="5" fill="#F2EADB" transform="rotate(8 357 227)" />
      <path d="M370 226 H406 Q412 226 414 224 H426 V230 H414 Q412 228 406 228 H370 Q366 228 366 227 Q366 226 370 226 Z" fill="#2E4A2A" />
      <path d="M432 230 V192 Q432 184 438 180 V166 H444 V180 Q450 184 450 192 V230 Z" fill="rgba(52, 36, 18, .9)" stroke="rgba(255, 236, 200, .25)" stroke-width="1" />
      <rect x="435" y="198" width="12" height="14" fill="rgba(242, 234, 219, .35)" />
      <path d="M456 230 V200 Q456 194 460 191 V180 H465 V191 Q469 194 469 200 V230 Z" fill="#1F3A2A" stroke="rgba(255, 236, 200, .2)" stroke-width="1" />
      <path d="M382 204 C376 204 372 196 372 184 H392 C392 196 388 204 382 204 Z" {...glass} />
      <path d="M373.3 192 C374 199 378 203 382 203 C386 203 390 199 390.7 192 Z" style={{ fill: 'rgba(var(--d2), .6)' }} />
      <path d="M382 204 V226" {...glass} />
      <ellipse cx="382" cy="228" rx="8" ry="2" {...glass} />
      <path d="M400 206 L402 229 H416 L418 206 Z" {...glass} />
      <path d="M400.8 216 L402.4 228 H415.6 L417.2 216 Z" style={{ fill: 'rgba(var(--d1), .5)' }} />
      <path d="M478 212 L480 229 H492 L494 212 Z" {...glass} />
      <path d="M512 230 L516 202 Q526 198 536 202 L540 230 Z" fill="#C8301E" fill-opacity=".85" />
      <path d="M518 212 H534" stroke="#FFD23F" stroke-width="3" />
      <rect x="544" y="218" width="10" height="12" fill="rgba(242, 234, 219, .6)" />
      <path d="M549 218 V214" stroke="#2A2622" stroke-width="1" />
    </svg>
  );
}

function Flamme({ id }) {
  return (
    <svg class="amb-salon amb-flamme" viewBox="0 0 800 300" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-fl`}>
          <stop offset="0" stop-color="#FFD58A" stop-opacity=".5" />
          <stop offset=".45" stop-color="#FF9F45" stop-opacity=".14" />
          <stop offset="1" stop-color="#FF9F45" stop-opacity="0" />
        </radialGradient>
      </defs>
      <circle cx="549" cy="210" r="26" fill={`url(#${id}-fl)`} />
      <path d="M549 207 C552 210 552 213 549 215 C546 213 546 210 549 207 Z" fill="#FFE2A6" />
    </svg>
  );
}

let ambN = 0;
// Thème « table de jeu » (choisi par Samuel le 14/11) : un tapis de feutre vu de dessus, éclairé au centre,
// sans décor dessiné. La couleur du feutre change un peu selon le jeu (nuit pour le Garou, bordeaux pour le Cul).
const FEUTRES = { 'jamais-hard': 'violet', 'jamais-cul': 'bordeaux', garou: 'nuit', 'garou-nuit': 'nuit', paranoia: 'violet', actionverite: 'bordeaux', degaine: 'bordeaux', bombe: 'bordeaux', ware: 'nuit', buzzer: 'nuit', dessin: 'bleu', poker: 'bordeaux', roulette: 'bordeaux', ring: 'nuit' };
const OBJ_NORMAL = ['verre', 'cartes', 'pyramide', 'pizza'];
const OBJ_HOT = ['verre', 'rouge', 'menottes'];
let swapN = 0;
export function Ambiance({ game = null, hot = false }) {
  const [d1, d2, d3] = paletteOf(game);
  const first = useMemo(() => (ambN += 1) === 1, []);
  const f = hot ? 'cul' : FEUTRES[game] || 'vert';
  // changement de feutre ou de mode : l'ancien tapis s'efface, les objets sont ramassés puis reposés
  const prev = useRef({ f, hot });
  const [swap, setSwap] = useState(null);
  const [stamp, setStamp] = useState(null);
  useEffect(() => {
    const p = prev.current;
    prev.current = { f, hot };
    if (p.f === f && p.hot === hot) return undefined;
    const n = ++swapN;
    setSwap({ n, f: p.f, out: p.hot !== hot ? (p.hot ? OBJ_HOT : OBJ_NORMAL).filter((o) => o !== 'verre') : [] });
    if (p.hot !== hot) { setStamp({ n, on: hot }); buzz(hot ? [30, 40, 60] : 30); }
    const t1 = setTimeout(() => setSwap((s) => (s && s.n === n ? null : s)), 700);
    const t2 = setTimeout(() => setStamp((s) => (s && s.n === n ? null : s)), 1250);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [f, hot]);
  const list = hot ? OBJ_HOT : OBJ_NORMAL;
  const anim = first || (swap && swap.out.length);
  return (
    <>
      <div class={`ambiance feutre feutre-${f}${game ? ' is-game' : ''}${hot ? ' is-hot' : ''}${anim ? ' is-anim' : ''}${first ? ' is-first' : ''}`} style={{ '--d1': d1, '--d2': d2, '--d3': d3 }} aria-hidden="true">
        {swap ? <i class={`feutre-prev feutre-${swap.f}`} key={`p${swap.n}`} /> : null}
        <i class="feutre-grain" />
        <i class="feutre-lampe" />
        {list.map((o, i) => <i key={o} class={`obj obj-${o}`} style={{ '--i': o === 'verre' ? 0 : i }} />)}
        {swap ? swap.out.map((o) => <i key={`out-${o}-${swap.n}`} class={`obj obj-${o} is-out`} />) : null}
      </div>
      {stamp ? <div class={`hot-stamp${stamp.on ? '' : ' is-calme'}`} key={`s${stamp.n}`} aria-hidden="true"><span>{stamp.on ? 'Cul et hard' : 'Retour au calme'}</span></div> : null}
    </>
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

// carte coquine (niveau « Cul ») qui sort : un tampon moqueur sur tous les écrans, le même partout
const COCHON = ['Oh le cochon !', 'Petit coquin…', 'Ça devient chaud', 'Qui a écrit ça ?!', 'Les voisins écoutent', 'Ouh là là…', 'Verre d’eau pour tout le monde', 'Personne ne regarde sa mère'];
export function Cochon({ card }) {
  const key = card && card.lv === 'cul' ? `${card.k || ''}${card.t || ''}${card.a || ''}` : null;
  const [show, setShow] = useState(null);
  const seen = useRef(null);
  useEffect(() => {
    if (!key || key === seen.current) return undefined;
    seen.current = key;
    let h = 0;
    for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    setShow({ txt: COCHON[h % COCHON.length], n: h });
    son('tampon');
    const t = setTimeout(() => setShow(null), 1900);
    return () => clearTimeout(t);
  }, [key]);
  if (!show) return null;
  return <div class="cochon" key={show.n} aria-hidden="true"><span>{show.txt}</span></div>;
}

// Chambrage : le personnage de la victime tombe au milieu de l'écran avec une phrase, sur tous les téléphones.
// Ne rejoue pas les anciens événements à l'ouverture de l'appli.
export function Chambre({ S, me }) {
  const seen = useRef(null);
  const [show, setShow] = useState(null);
  const last = S && S.ev ? S.ev.filter((e) => e.k === 'chambre').pop() : null;
  useEffect(() => {
    if (!S) return undefined;
    if (seen.current == null) { seen.current = last ? last.i : 0; return undefined; }
    if (!last || last.i <= seen.current) return undefined;
    seen.current = last.i;
    const p = S.roster[last.u];
    if (!p) return undefined;
    setShow({ i: last.i, txt: last.txt, av: p.av, mine: last.u === me });
    if (last.u === me) buzz([30, 60, 30]);
    son('trombone');
    const t = setTimeout(() => setShow(null), 2600);
    return () => clearTimeout(t);
  }, [last ? last.i : 0]);
  if (!show) return null;
  return (
    <div class={`chambre${show.mine ? ' is-moi' : ''}`} key={show.i} role="status">
      <span class="chambre-av" aria-hidden="true"><Character av={show.av} mood="drink" size={132} /></span>
      <span class="chambre-t">{show.txt}</span>
    </div>
  );
}

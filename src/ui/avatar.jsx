// Le personnage « bouille » : une petite tête ronde, traits épais, couleurs plates.
// Chaque joueur choisit la couleur, l'expression et trois accessoires (tête, visage, en plus).
// Code compact stocké dans le profil : « couleur.expression.tête.visage.plus » (ex. « 3.1.5.0.2 »).
// Le personnage réagit : sourire quand le joueur distribue, tête dépitée quand il doit boire.
import { AV_COUNTS, avatarId } from '../lib/util.js';

const INK = '#22201C';
const PAPER = '#F2EADB';
const RED = '#E5502F';
const YEL = '#FFD23F';
const BLUE = '#2B4C9B';

export const AV_COLORS = ['#FFD23F', '#F28C38', '#E5502F', '#F4A6B8', '#9B7FD4', '#5B8DEF', '#6CC9A8', '#A3C45A', '#D9C3A0', '#B8B2A7'];
export const AV_NAMES = {
  color: ['Jaune', 'Orange', 'Rouge', 'Rose', 'Violet', 'Bleu', 'Menthe', 'Vert', 'Kraft', 'Gris'],
  expr: ['Content', 'Blasé', 'Surpris', 'Bourré', 'Diabolique', 'Amoureux', 'Endormi', 'Clin d’œil'],
  head: ['Rien', 'Casquette', 'Couronne', 'Chapeau de fête', 'Bandeau', 'Casque de chantier', 'Auréole', 'Cornes', 'Bonnet', 'Fleur', 'Casque audio'],
  face: ['Rien', 'Lunettes de soleil', 'Lunettes rondes', 'Moustache', 'Nez de clown', 'Monocle'],
  extra: ['Rien', 'Verre à la main', 'Nœud papillon', 'Cravate', 'Micro'],
};
export const AV_PARTS = ['color', 'expr', 'head', 'face', 'extra'];

export function parseAv(av) {
  return avatarId(av).split('.').map(Number);
}
export function makeAv(parts) {
  return parts.map((x, i) => Math.max(0, Math.min(AV_COUNTS[i] - 1, x | 0))).join('.');
}
export function randomAv() {
  const r = (n) => Math.floor(Math.random() * n);
  return makeAv([r(10), r(8), Math.random() < 0.8 ? r(11) : 0, Math.random() < 0.45 ? r(6) : 0, Math.random() < 0.35 ? r(5) : 0]);
}
export function describeAv(av) {
  const p = parseAv(av);
  return AV_PARTS.map((k, i) => AV_NAMES[k][p[i]]).filter((x, i) => i < 2 || x !== 'Rien').join(', ');
}

const S = { stroke: INK, 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };

function Eyes({ expr, mood }) {
  if (mood === 'win') {
    return (
      <g {...S} fill="none">
        <path d="M19 35 q5 -6 10 0 M35 35 q5 -6 10 0" />
        <path d="M23 41 Q32 54 41 41 Z" fill={INK} />
        <path d="M27.5 46.5 q4.5 4 9 0" stroke={RED} stroke-width="2.5" />
      </g>
    );
  }
  if (mood === 'drink') {
    return (
      <g {...S} fill="none">
        <path d="M18 28 L27 25 M46 28 L37 25" />
        <circle cx="24" cy="35" r="2.3" fill={INK} stroke="none" />
        <circle cx="40" cy="35" r="2.3" fill={INK} stroke="none" />
        <path d="M26 48 Q32 42.5 38 48" />
        <path d="M51 22 q3.5 5.5 0 8 q-3.5 -2.5 0 -8 z" fill="#5B8DEF" stroke-width="1.8" />
      </g>
    );
  }
  switch (expr) {
    case 1: // blasé
      return (
        <g {...S} fill="none">
          <path d="M19 32 h10 M35 32 h10" />
          <path d="M21 32 a3 3 0 0 0 6 0 Z M37 32 a3 3 0 0 0 6 0 Z" fill={INK} stroke-width="1.5" />
          <path d="M27 45 h10" />
        </g>
      );
    case 2: // surpris
      return (
        <g {...S}>
          <path d="M18 23 q5 -3.5 10 0 M36 23 q5 -3.5 10 0" fill="none" />
          <circle cx="24" cy="32" r="5.2" fill={PAPER} stroke-width="2.5" />
          <circle cx="40" cy="32" r="5.2" fill={PAPER} stroke-width="2.5" />
          <circle cx="24" cy="32.5" r="2.1" fill={INK} stroke="none" />
          <circle cx="40" cy="32.5" r="2.1" fill={INK} stroke="none" />
          <ellipse cx="32" cy="46" rx="3.2" ry="4.2" fill={INK} stroke="none" />
        </g>
      );
    case 3: // bourré
      return (
        <g {...S} fill="none">
          <path d="M21 31.5 a3.5 3.5 0 1 0 3.5 -3 M37 31.5 a3.5 3.5 0 1 0 3.5 -3" stroke-width="2.6" />
          <circle cx="32" cy="38.5" r="3" fill={RED} stroke-width="2" />
          <path d="M24.5 46 q2.6 -3 5.2 0 t5.2 0 t5.2 0" />
        </g>
      );
    case 4: // diabolique
      return (
        <g {...S}>
          <path d="M18 26 L28 30.5 M46 26 L36 30.5" fill="none" />
          <circle cx="24" cy="34" r="2.3" fill={INK} stroke="none" />
          <circle cx="40" cy="34" r="2.3" fill={INK} stroke="none" />
          <path d="M22.5 41.5 Q32 52 41.5 41.5 Z" fill={PAPER} stroke-width="2.6" />
          <path d="M28 42.2 v3.6 M32 42.4 v4.4 M36 42.2 v3.6" fill="none" stroke-width="1.8" />
        </g>
      );
    case 5: // amoureux
      return (
        <g {...S} fill="none">
          <path d="M24 37.5 l-5 -5 a2.9 2.9 0 0 1 5 -3.6 a2.9 2.9 0 0 1 5 3.6 z M40 37.5 l-5 -5 a2.9 2.9 0 0 1 5 -3.6 a2.9 2.9 0 0 1 5 3.6 z" fill={RED} stroke-width="1.8" />
          <path d="M26 44 Q32 49.5 38 44" />
        </g>
      );
    case 6: // endormi
      return (
        <g {...S} fill="none">
          <path d="M19 33 q5 3.5 10 0 M35 33 q5 3.5 10 0" />
          <ellipse cx="32" cy="45.5" rx="2.4" ry="2" fill={INK} stroke="none" />
          <path d="M47 11 h5 l-5 6 h5" stroke-width="2" />
        </g>
      );
    case 7: // clin d'œil
      return (
        <g {...S} fill="none">
          <circle cx="24" cy="33" r="2.8" fill={INK} stroke="none" />
          <path d="M35 34 q5 -4.5 10 0" />
          <path d="M26 44 Q34 49 39.5 42" />
        </g>
      );
    default: // content
      return (
        <g {...S} fill="none">
          <circle cx="24" cy="33" r="2.8" fill={INK} stroke="none" />
          <circle cx="40" cy="33" r="2.8" fill={INK} stroke="none" />
          <path d="M26 43 Q32 49 38 43" />
        </g>
      );
  }
}

function Head({ k }) {
  switch (k) {
    case 1: return <g {...S} stroke-width="2.6"><path d="M13 23 C13 8 51 8 51 23 Z" fill={BLUE} /><path d="M45 20.5 h13 q3 0 3 3 h-16 z" fill={BLUE} /><circle cx="32" cy="10.5" r="2" fill={INK} stroke="none" /></g>;
    case 2: return <g {...S} stroke-width="2.5"><path d="M19 20 L17 6 L25 11.5 L32 3 L39 11.5 L47 6 L45 20 Z" fill={YEL} /><circle cx="32" cy="15" r="2" fill={RED} stroke-width="1.5" /></g>;
    case 3: return <g {...S} stroke-width="2.5" transform="rotate(14 33 12)"><path d="M23.5 19 L33 2.5 L42.5 19 Z" fill="#F4A6B8" /><path d="M27.5 12.5 L37 15.5 M30.5 7 L35.5 8.6" fill="none" stroke-width="2" /><circle cx="33" cy="2.8" r="3" fill={YEL} stroke-width="2" /></g>;
    case 4: return <g {...S} stroke-width="2.5"><path d="M11 26.5 C20 20.5 44 20.5 53 26.5 L53 32 C44 26 20 26 11 32 Z" fill={RED} /><path d="M53 27.5 l8 -5 M53 30.5 l8 3" fill="none" stroke={RED} stroke-width="3.5" /></g>;
    case 5: return <g {...S} stroke-width="2.6"><path d="M12 22 C12 4 52 4 52 22 Z" fill={YEL} /><path d="M32 6.5 v15" fill="none" stroke-width="2" /><path d="M8 21.5 h48 v3.5 h-48 z" fill={YEL} /></g>;
    case 6: return <g><ellipse cx="32" cy="7" rx="13" ry="3.8" fill="none" stroke={INK} stroke-width="6" /><ellipse cx="32" cy="7" rx="13" ry="3.8" fill="none" stroke={YEL} stroke-width="3" /></g>;
    case 7: return <g {...S} stroke-width="2.5"><path d="M17 21 C13.5 13 14.5 7 19 3.5 C19 10 22 14.5 26 16.5 Z" fill={RED} /><path d="M47 21 C50.5 13 49.5 7 45 3.5 C45 10 42 14.5 38 16.5 Z" fill={RED} /></g>;
    case 8: return <g {...S} stroke-width="2.5"><path d="M13 22 C13 5 51 5 51 22 Z" fill="#6CC9A8" /><rect x="11" y="18.5" width="42" height="7" rx="3" fill="#6CC9A8" /><circle cx="32" cy="5.5" r="4" fill={PAPER} /></g>;
    case 9: return <g {...S} stroke-width="1.8"><circle cx="44" cy="7" r="3.6" fill="#F4A6B8" /><circle cx="50.5" cy="11.5" r="3.6" fill="#F4A6B8" /><circle cx="48" cy="18.5" r="3.6" fill="#F4A6B8" /><circle cx="40.5" cy="18" r="3.6" fill="#F4A6B8" /><circle cx="38.5" cy="11" r="3.6" fill="#F4A6B8" /><circle cx="44.5" cy="13" r="3" fill={YEL} /></g>;
    case 10: return <g {...S}><path d="M12 31 C12 5 52 5 52 31" fill="none" stroke-width="4" /><rect x="6.5" y="26" width="8.5" height="14" rx="3.5" fill="#9B7FD4" stroke-width="2.5" /><rect x="49" y="26" width="8.5" height="14" rx="3.5" fill="#9B7FD4" stroke-width="2.5" /></g>;
    default: return null;
  }
}

function Face({ k }) {
  switch (k) {
    case 1: return <g {...S} stroke-width="2.4"><path d="M17 29 h12 v4.5 q-6 6.5 -12 0 z M35 29 h12 v4.5 q-6 6.5 -12 0 z" fill={INK} /><path d="M29 30.5 h6 M17 30 l-5 -2.5 M47 30 l5 -2.5" fill="none" /></g>;
    case 2: return <g {...S} stroke-width="2.4" fill="none"><circle cx="24" cy="33" r="6.3" /><circle cx="40" cy="33" r="6.3" /><path d="M30.3 33 h3.4" /></g>;
    case 3: return <path d="M32 41 C28 37 22 37.5 19 40.5 C17 42.5 15 41.5 15 39.5 C15 45 22 46.5 27 44 L32 42 L37 44 C42 46.5 49 45 49 39.5 C49 41.5 47 42.5 45 40.5 C42 37.5 36 37 32 41 Z" fill={INK} />;
    case 4: return <circle cx="32" cy="39" r="4.6" fill={RED} stroke={INK} stroke-width="2.5" />;
    case 5: return <g {...S} stroke-width="2.4" fill="none"><circle cx="40" cy="33" r="6" /><path d="M46 35 q4 8 -2 15" stroke-width="1.5" /></g>;
    default: return null;
  }
}

function Extra({ k }) {
  switch (k) {
    case 1: return <g {...S} stroke-width="2.5"><path d="M49 45 q7 -2 8.5 -8" fill="none" stroke-width="3" /><path d="M52.5 22.5 h10 l-1.6 14.5 h-6.8 z" fill={YEL} /><path d="M52 23 q2.2 -3.4 5.2 -1.2 q3.2 -2.4 5.6 1.2 z" fill={PAPER} stroke-width="2" /></g>;
    case 2: return <g {...S} stroke-width="2.3"><path d="M32 53 L23 48 L23 58 Z M32 53 L41 48 L41 58 Z" fill={RED} /><circle cx="32" cy="53" r="2.6" fill={RED} /></g>;
    case 3: return <g {...S} stroke-width="2.3"><path d="M29 47.5 h6 l-1.2 3.5 l3 8 l-4.8 3.2 l-4.8 -3.2 l3 -8 z" fill={BLUE} /></g>;
    case 4: return <g {...S}><path d="M15 45 q-7 -2 -8.5 -9" fill="none" stroke-width="3" /><rect x="2.5" y="21" width="8" height="10" rx="4" fill={INK} stroke="none" /><path d="M6.5 31 v5" fill="none" stroke-width="3" /></g>;
    default: return null;
  }
}

// mood : null (expression choisie), « win » (content, il distribue) ou « drink » (dépité, il boit)
export function Character({ av, mood = null, bg = true, size = 64, label = null }) {
  const [color, expr, head, face, extra] = parseAv(av);
  const fill = AV_COLORS[color] || AV_COLORS[0];
  return (
    <svg class="bouille" viewBox="0 0 64 64" width={size} height={size} role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : 'true'} focusable="false" overflow="visible">
      {bg ? <circle cx="32" cy="33" r="31" fill={PAPER} /> : null}
      <ellipse cx="23" cy="57.5" rx="6" ry="3.4" fill={INK} />
      <ellipse cx="41" cy="57.5" rx="6" ry="3.4" fill={INK} />
      <path d="M32 14.5 C46.5 14.5 54.5 24.5 54.5 37 C54.5 50.5 45 57 32 57 C19 57 9.5 50.5 9.5 37 C9.5 24.5 17.5 14.5 32 14.5 Z" fill={fill} stroke={INK} stroke-width="3" />
      <ellipse cx="18.5" cy="41.5" rx="3.8" ry="2.4" fill="#E5502F" opacity={expr === 3 || mood === 'drink' ? 0.55 : 0.28} />
      <ellipse cx="45.5" cy="41.5" rx="3.8" ry="2.4" fill="#E5502F" opacity={expr === 3 || mood === 'drink' ? 0.55 : 0.28} />
      <Eyes expr={expr} mood={mood} />
      <Face k={face} />
      <Head k={head} />
      <Extra k={extra} />
    </svg>
  );
}

// Le personnage : un portrait dessiné au feutre sur un sous-bock (buste, vrai visage, coiffure).
// Le trait est noir, les couleurs sont posées comme au feutre, légèrement décalées du trait.
// Code compact stocké dans le profil :
// « couleur.expression.tête.visage.plus.coiffure.peau.cheveux » (ex. « 3.1.5.0.2.4.1.0 »).
// Les anciens codes à 5 parties restent valides : coiffure, peau et cheveux sont alors tirés du code.
// Le personnage réagit : grand sourire quand le joueur distribue, mine inquiète quand il doit boire.
import { useMemo } from 'preact/hooks';
import { AV_COUNTS, avatarId } from '../lib/util.js';

const INK = '#22201C';
const PAPER = '#F2EADB';
const RED = '#D9412B';
const YEL = '#F2C230';
const BLUE = '#2F55A4';

export const AV_COLORS = ['#F2C230', '#EE8A3A', '#D9412B', '#EFA0B4', '#8F72CC', '#4F82E0', '#5CBF9C', '#97B84E', '#CDB48C', '#A9A39A'];
export const AV_SKINS = ['#F7DCC6', '#ECC09C', '#D29C70', '#A8704A', '#6B432B'];
export const AV_HAIRS = ['#2A231F', '#5A3824', '#94643A', '#E2BC6E', '#C1532A', '#E58AAE'];
export const AV_NAMES = {
  color: ['Jaune', 'Orange', 'Rouge', 'Rose', 'Violet', 'Bleu', 'Menthe', 'Vert', 'Kraft', 'Gris'],
  expr: ['Content', 'Blasé', 'Surpris', 'Bourré', 'Diabolique', 'Amoureux', 'Endormi', 'Clin d’œil'],
  head: ['Rien', 'Casquette', 'Couronne', 'Chapeau de fête', 'Bandeau', 'Casque de chantier', 'Auréole', 'Cornes', 'Bonnet', 'Fleur', 'Casque audio'],
  face: ['Rien', 'Lunettes de soleil', 'Lunettes rondes', 'Moustache', 'Nez de clown', 'Monocle'],
  extra: ['Rien', 'Verre à la main', 'Nœud papillon', 'Cravate', 'Micro'],
  hair: ['Rasé', 'Court', 'Mèche', 'Bouclé', 'Long', 'Chignon', 'Crête', 'Carré'],
  skin: ['Très claire', 'Claire', 'Mate', 'Foncée', 'Très foncée'],
  hairCol: ['Noirs', 'Bruns', 'Châtains', 'Blonds', 'Roux', 'Roses'],
  kind: ['Humain', 'Alien', 'Cubique', 'Glitché', 'Robot', 'Zombie', 'Fantôme', 'Squelette'],
};
// teintes de peau propres à chaque espèce
export const KIND_SKINS = [
  AV_SKINS_H(),
  ['#93D16C', '#5FBF8E', '#A98BE0', '#7FC4E8', '#C9D85A'],
  AV_SKINS_H(),
  AV_SKINS_H(),
  ['#BAC1C8', '#8E98A3', '#D6B06A', '#C9714A', '#6F7A86'],
  ['#A9C29A', '#8FAE87', '#B7B98E', '#9DAAB2', '#8C9C6E'],
  ['#F7F4EE', '#DDEBF7', '#E3F4E4', '#F7DDE6', '#E6DDF5'],
  ['#F1E8D2', '#E6DBC0', '#D8CCB0', '#F4EFE6', '#E9E0CC'],
];
function AV_SKINS_H() { return ['#F7DCC6', '#ECC09C', '#D29C70', '#A8704A', '#6B432B']; }
// coiffures seulement pour les espèces qui ont des cheveux
export const KIND_HAIR = [true, false, true, true, false, true, false, false];
// ordre de stockage (ne pas changer) et ordre d'affichage dans l'atelier
export const AV_PARTS = ['color', 'expr', 'head', 'face', 'extra', 'hair', 'skin', 'hairCol', 'kind'];
export const AV_EDIT = ['kind', 'skin', 'hair', 'hairCol', 'expr', 'color', 'head', 'face', 'extra'];
export const AV_SWATCH = { color: AV_COLORS, skin: AV_SKINS, hairCol: AV_HAIRS };

export function parseAv(av) {
  return avatarId(av).split('.').map(Number);
}
export function makeAv(parts) {
  return AV_COUNTS.map((n, i) => Math.max(0, Math.min(n - 1, parts[i] | 0))).join('.');
}
export function randomAv() {
  const r = (n) => Math.floor(Math.random() * n);
  return makeAv([r(10), r(8), Math.random() < 0.5 ? r(11) : 0, Math.random() < 0.35 ? r(6) : 0, Math.random() < 0.3 ? r(5) : 0, r(8), r(5), r(6), r(8)]);
}
export function describeAv(av) {
  const p = parseAv(av);
  return AV_EDIT.map((k) => [k, AV_NAMES[k][p[AV_PARTS.indexOf(k)]]])
    .filter(([k, x]) => x !== 'Rien' && !(k === 'kind' && x === 'Humain'))
    .map(([k, x]) => (k === 'skin' ? `peau ${x.toLowerCase()}` : k === 'hairCol' ? `cheveux ${x.toLowerCase()}` : k === 'color' ? `tee-shirt ${x.toLowerCase()}` : x))
    .join(', ');
}

// ---------------------------------------------------------------- dessin
// Chaque forme est posée en deux temps : l'aplat de couleur, un peu décalé comme un coloriage au feutre,
// puis le trait noir par-dessus, doublé d'un second passage plus fin pour l'effet « repassé au feutre ».
const OFF = 'translate(.9 .7)';
// trait tremblé : chaque coordonnée bouge un peu, toujours de la même façon pour un même tracé
const jitCache = new Map();
function jit(d, amp = 0.32) {
  const key = d + amp;
  const hit = jitCache.get(key);
  if (hit) return hit;
  let i = 0;
  const out = d.replace(/-?\d*\.?\d+/g, (n) => {
    i += 1;
    const h = Math.sin(i * 12.9898 + parseFloat(n) * 78.233) * 43758.5453;
    return (parseFloat(n) + (h - Math.floor(h) - 0.5) * 2 * amp).toFixed(2);
  });
  jitCache.set(key, out);
  return out;
}
function F({ d: d0, fill, w = 2.2, line = true, sketch = true, op, j = 0.32 }) {
  const d = j ? jit(d0, j) : d0;
  const d2 = j ? jit(d0, j * 1.4) : d0;
  return (
    <g>
      {fill && fill !== 'none' ? <path d={d} fill={fill} transform={OFF} opacity={op} /> : null}
      {line ? <path d={d} fill="none" stroke={INK} stroke-width={w} stroke-linecap="round" stroke-linejoin="round" /> : null}
      {line && sketch ? <path d={d2} fill="none" stroke={INK} stroke-width={w * 0.35} stroke-linecap="round" opacity=".5" transform="translate(.4 -.3)" /> : null}
    </g>
  );
}
function L({ d, w = 2, color = INK, j = 0.22 }) {
  return <path d={j ? jit(d, j) : d} fill="none" stroke={color} stroke-width={w} stroke-linecap="round" stroke-linejoin="round" />;
}
function Dot({ x, y, r = 1.5, c = INK }) {
  return <ellipse cx={x} cy={y} rx={r * 0.9} ry={r * 1.15} fill={c} />;
}

const HEAD = 'M32 13.6 C41.6 13.3 47.3 19.9 47.4 28.7 C47.6 35.9 45.2 41.7 40.6 45.3 C37.8 47.5 34.9 48.4 32 48.4 C28.6 48.4 25.6 47.3 22.9 45 C18.6 41.3 16.6 35.7 16.7 29 C16.9 20 22.6 13.8 32 13.6 Z';
const EAR_L = 'M17.4 27.4 C13.9 26.2 12.5 29.3 13.3 32 C14 34.5 16 35.7 17.7 34.8';
const EAR_R = 'M46.8 27.1 C50.3 25.9 51.6 29.1 50.7 31.9 C49.9 34.3 48 35.5 46.3 34.6';
const NECK = 'M27.3 42.6 L26.7 58 L37.3 58 L36.7 42.6 Z';
const SHIRT = 'M5 66 C5.8 57.4 12.5 52.6 22.4 51 C25.4 54.4 28.8 55.4 32 55.4 C35.2 55.4 38.8 54.4 41.7 51 C51.5 52.6 58.2 57.4 59 66 Z';

function shade(hex, k) {
  const n = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return '#' + n.map((v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0')).join('');
}

// cheveux derrière la tête (longs, carré)
function HairBack({ k, c }) {
  if (k === 4) return <F d="M16 30 C14.6 16.6 22.4 10.8 32 10.8 C41.6 10.8 49.4 16.6 48 30 C47.8 38.4 49.6 45.4 52.2 51.4 C47.8 53.4 43.4 52.8 40.6 50.6 L23.4 50.6 C20.6 52.8 16.2 53.4 11.8 51.4 C14.4 45.4 16.2 38.4 16 30 Z" fill={c} />;
  if (k === 7) return <F d="M16 30.5 C14.6 16.8 22.4 10.8 32 10.8 C41.6 10.8 49.4 16.8 48 30.5 C48.2 35.6 49 39.6 50.2 43.4 C46.4 45.2 42.6 44.6 40.8 42.6 L23.2 42.6 C21.4 44.6 17.6 45.2 13.8 43.4 C15 39.6 15.8 35.6 16 30.5 Z" fill={c} />;
  return null;
}
// cheveux sur le front et le haut du crâne
function Strands({ k, c }) {
  const col = shade(c, 0.68);
  const S2 = {
    1: 'M24.8 20 C26.6 16.4 30 14.4 34 14.2 M33.4 20.8 C35.6 17.2 39 15.6 42.6 16.4 M20.4 22.6 C21 19 23.4 16 26.6 14.6',
    2: 'M21.6 21.4 C26.6 20.2 31.4 17.4 34.6 13.8 M28.6 22.2 C33.4 20.8 38 17.8 40.6 14.8 M37.6 19.2 C40.6 18.2 43.4 18.6 45.4 21',
    4: 'M30.6 22 C28.6 18.6 25.8 15.6 22.4 14.8 M33.4 22 C35.6 18.6 38.4 15.6 41.8 14.8 M18.6 29 C18.6 22.4 20.2 18.6 22.8 16.6 M45.4 29 C45.4 22.4 43.8 18.6 41.2 16.6',
    5: 'M24.4 18.6 C27.6 15.4 31 14.4 34.2 14.4 M34.4 17.2 C37.8 16.6 41.4 17.6 44 20.4',
    7: 'M24 22.4 C24.2 18 26.6 14.8 30.4 13.8 M33.6 22.4 C34.4 18.6 37.4 15.4 41.4 15 M19.2 28.8 C19 24.6 19.8 21.8 21.4 19.8 M44.8 28.8 C45 24.6 44.2 21.8 42.6 19.8',
  };
  if (k === 3) return <L d="M19.4 21.4 C20.6 19.6 22.6 19.8 22.8 21.6 M27.4 15.6 C28.8 14 30.8 14.6 30.6 16.4 M36 15.2 C37.4 13.8 39.4 14.6 39 16.4 M42.4 19.4 C44 18.6 45.4 19.8 44.8 21.4 M24 18 C25.4 16.8 27 17.4 26.8 18.8 M32.6 18.6 C34 17.6 35.6 18.2 35.2 19.8" w={0.9} color={col} />;
  return S2[k] ? <L d={S2[k]} w={0.9} color={col} /> : null;
}
function HairFront({ k, c, hat }) {
  return <g><HairFront0 k={k} c={c} hat={hat} />{hat ? null : <Strands k={k} c={c} />}</g>;
}
function HairFront0({ k, c, hat }) {
  switch (k) {
    case 0: return <path d="M18.4 24 C19.6 17.4 25 14.4 32 14.2 C39 14 44.4 17.2 45.8 24 C41 20.6 23.2 20.6 18.4 24 Z" fill={c} opacity=".35" transform={OFF} />;
    case 1: return <F d="M16.9 27.4 C16.2 17.6 22.8 12 32.4 12 C42 12 48 17.6 47.3 27.2 C45.6 22.6 42.4 20.4 38.6 19.8 C35 21.8 28.6 22 24.8 20 C21.2 21 18.6 23.4 16.9 27.4 Z" fill={c} />;
    case 2: return <F d="M16.8 28.2 C15.6 17 23 11 33 11.4 C42.6 11.8 48.6 18.4 47.6 27.4 C46.4 22.4 43.6 19.6 40.2 18.8 C34 23.8 25.4 24.6 19.6 21.8 C18.2 23.6 17.3 25.8 16.8 28.2 Z" fill={c} />;
    case 3: return <F d="M15.6 31 C12 27.8 13.4 22 17 20.8 C16.4 15.6 21.6 12 25.6 13.4 C27.6 9.2 33.8 8.8 36.2 12.4 C40.2 10.2 45.4 13.4 45.2 17.6 C49.2 18.6 50.8 24.2 48.2 27.8 C49.2 29.8 48.6 31.6 47.4 32.4 C46.9 27.6 45 23.8 41.4 21.8 C36 23.6 27.6 23.6 22.4 21.8 C18.9 23.8 17.1 27.6 16.8 32.4 C16.1 32 15.7 31.6 15.6 31 Z" fill={c} />;
    case 4: return <F d="M17 30 C16.6 18.6 23.2 12.6 32 12.6 C40.8 12.6 47.4 18.6 47 30 C45.6 23.8 42.2 20.8 38 20.4 C35.6 22.6 33.4 23.4 32 23.6 C30.6 23.4 28.4 22.6 26 20.4 C21.8 20.8 18.4 23.8 17 30 Z" fill={c} />;
    case 5: return (
      <g>
        {hat ? null : <F d="M27.6 13 C26.6 8.4 29.4 5.4 32.6 5.4 C35.8 5.4 38.2 8.4 37 13" fill={c} />}
        <F d="M17.2 26.4 C16.8 17.4 23.2 12.4 32.2 12.4 C41.2 12.4 47.6 17.4 47 26.4 C44.4 21.6 39 19.4 32.2 19.4 C25.4 19.4 19.8 21.6 17.2 26.4 Z" fill={c} />
      </g>
    );
    case 6: return (
      <g>
        <path d="M18.6 24 C19.8 17.6 23.4 14.8 27 14 L27.6 20 C24 20.6 21 22 18.6 24 Z M45.6 24 C44.4 17.6 40.8 14.8 37.2 14 L36.6 20 C40.2 20.6 43.2 22 45.6 24 Z" fill={c} opacity=".35" transform={OFF} />
        {hat ? null : <F d="M28.4 21.6 L27.4 14.2 L29.8 15.8 L29.2 8.6 L31.6 11.2 L32.4 3.8 L34 10.8 L36.2 8.2 L35.2 15.6 L37.4 13.8 L35.8 21.6 C33.6 22.4 30.6 22.4 28.4 21.6 Z" fill={c} />}
      </g>
    );
    case 7: return <F d="M17 29.6 C16.2 18.2 23 12.4 32 12.4 C41 12.4 47.8 18.2 47 29.6 C46.4 26.8 45.6 25 44.4 23.6 L19.6 23.6 C18.4 25 17.6 26.8 17 29.6 Z" fill={c} />;
    default: return null;
  }
}

function Eyes({ expr, mood }) {
  if (mood === 'win') {
    return (
      <g>
        <L d="M22.6 30.4 C24.2 28 27 28 28.6 30.4 M35.4 30.4 C37 28 39.8 28 41.4 30.4" w={2.2} />
        <F d="M25.6 38.8 C27.8 45.2 36.4 45.2 38.6 38.8 C34.6 39.8 29.6 39.8 25.6 38.8 Z" fill="#8E2A22" w={2} />
        <L d="M23 24.8 C24.8 23.4 27 23.2 28.8 24 M35.2 24 C37 23.2 39.2 23.4 41 24.8" w={1.7} />
      </g>
    );
  }
  if (mood === 'drink') {
    return (
      <g>
        <L d="M22.8 26.6 C24.6 24.8 26.6 24.2 28.6 24.6 M35.4 24.6 C37.4 24.2 39.4 24.8 41.2 26.6" w={1.7} />
        <Dot x={25.6} y={30.6} r={1.6} /><Dot x={38.4} y={30.6} r={1.6} />
        <L d="M27 42 C28.6 40.2 30.2 41.6 32 40.4 C33.8 41.6 35.4 40.2 37 42" w={1.9} />
        <F d="M47.2 20.4 C49.6 23.8 50 25.6 48.6 26.6 C47.4 27.4 45.8 26.6 46 25 C46.1 23.8 46.6 22.4 47.2 20.4 Z" fill="#7FB6EA" w={1.3} sketch={false} />
      </g>
    );
  }
  switch (expr) {
    case 1: return (
      <g>
        <L d="M22.6 29.6 C24.6 28.8 26.8 28.8 28.8 29.4 M35.2 29.4 C37.2 28.8 39.4 28.8 41.4 29.6" w={2} />
        <path d="M23.6 29.8 C24.2 32 27.4 32 28 29.8 Z M36 29.8 C36.6 32 39.8 32 40.4 29.8 Z" fill={INK} />
        <L d="M27.6 42 C30.4 41.4 33.6 42.2 36.6 41.6" w={1.9} />
      </g>
    );
    case 2: return (
      <g>
        <L d="M22.4 23.4 C24.4 21.4 27 21 29 22 M35 22 C37 21 39.6 21.4 41.6 23.4" w={1.7} />
        <F d="M25.6 26.8 C28 26.8 28.8 29 28.6 30.8 C28.4 32.8 27 33.8 25.6 33.8 C24 33.8 22.6 32.6 22.6 30.6 C22.6 28.6 23.6 26.8 25.6 26.8 Z" fill="#FFFDF6" w={1.6} />
        <F d="M38.4 26.8 C40.4 26.8 41.4 28.6 41.4 30.6 C41.4 32.6 40 33.8 38.4 33.8 C37 33.8 35.4 32.8 35.4 30.8 C35.2 29 36 26.8 38.4 26.8 Z" fill="#FFFDF6" w={1.6} />
        <Dot x={25.8} y={30.6} r={1.2} /><Dot x={38.2} y={30.6} r={1.2} />
        <F d="M32 39.4 C33.8 39.4 34.4 41.2 34.2 42.6 C34 44 33 44.8 32 44.8 C30.8 44.8 29.8 43.8 29.8 42.4 C29.8 41 30.4 39.4 32 39.4 Z" fill="#8E2A22" w={1.7} sketch={false} />
      </g>
    );
    case 3: return (
      <g>
        <L d="M22.8 30.2 C24.4 31.8 27 31.8 28.6 30.2 M35.4 30.2 C37 31.8 39.6 31.8 41.2 30.2" w={2} />
        <L d="M23.4 27.2 C25 26.4 26.8 26.4 28.2 27.4 M35.8 27.4 C37.2 26.4 39 26.4 40.6 27.2" w={1.3} />
        <path d="M30.6 33.4 C32.6 32.8 34.6 33.8 34.4 35.8 C34.2 37.4 32.2 38 30.8 37.2 C29.4 36.4 29.2 34 30.6 33.4 Z" fill="#E0573E" opacity=".85" />
        <L d="M26.2 41.4 C27.6 43.2 29 40.4 30.6 42.2 C32 43.8 33.4 40.6 35 42.4 C36.2 43.6 37.4 42 38 41.2" w={1.8} />
      </g>
    );
    case 4: return (
      <g>
        <L d="M22.2 25.4 C24.8 26 27 27 29 28.6 M41.8 25.4 C39.2 26 37 27 35 28.6" w={2.1} />
        <Dot x={25.8} y={31} r={1.6} /><Dot x={38.2} y={31} r={1.6} />
        <F d="M24.8 39.2 C28.4 41.6 35.6 41.6 39.4 38.6 C38.4 44 34.8 46 31.8 46 C28.6 46 25.6 43.6 24.8 39.2 Z" fill="#FFFDF6" w={1.9} />
        <L d="M28.6 40.8 L28.8 44.2 M32 41.2 L32 45.6 M35.4 40.8 L35.2 44.4" w={1.1} />
      </g>
    );
    case 5: return (
      <g>
        <F d="M25.6 33.6 C23.6 32 21.8 30.4 22 28.6 C22.2 27 24.4 26.4 25.6 28.2 C26.6 26.4 29 26.8 29 28.8 C29 30.6 27.4 32 25.6 33.6 Z" fill="#E0573E" w={1.4} sketch={false} />
        <F d="M38.4 33.6 C36.4 32 34.8 30.6 35 28.8 C35.2 27 37.4 26.6 38.4 28.2 C39.6 26.4 42 27 42 28.8 C42 30.6 40.2 32 38.4 33.6 Z" fill="#E0573E" w={1.4} sketch={false} />
        <L d="M27.2 40.4 C29.4 43 34.6 43.2 36.8 40.4" w={2} />
      </g>
    );
    case 6: return (
      <g>
        <L d="M22.8 30 C24.6 31.6 26.8 31.6 28.6 30 M35.4 30 C37.2 31.6 39.4 31.6 41.2 30" w={2} />
        <path d="M30.6 41.4 C31.6 40.6 33 40.8 33.4 41.8 C33.6 42.8 32.6 43.4 31.6 43.2 C30.6 43 30.2 42 30.6 41.4 Z" fill={INK} />
        <L d="M47.4 13.4 L51.4 13.2 L47.6 18 L51.8 17.8 M53 8.6 L55.6 8.6 L53.2 11.6 L55.8 11.6" w={1.4} />
      </g>
    );
    case 7: return (
      <g>
        <L d="M22.8 25.6 C24.6 24.6 26.8 24.6 28.6 25.4 M35.4 27.2 C37.4 26.4 39.4 26.6 41.4 27.6" w={1.6} />
        <Dot x={25.8} y={30.4} r={1.6} />
        <L d="M35.2 31 C37 29.4 39.4 29.4 41.2 31" w={2} />
        <L d="M27.4 41.4 C30 43.2 34.4 42.8 37.4 39.6" w={2} />
      </g>
    );
    default: return (
      <g>
        <L d="M22.8 25.8 C24.6 24.6 26.8 24.4 28.6 25.2 M35.4 25.2 C37.2 24.4 39.4 24.6 41.2 25.8" w={1.6} />
        <Dot x={25.8} y={30.4} r={1.6} /><Dot x={38.2} y={30.4} r={1.6} />
        <L d="M27.4 40.6 C29.8 43.4 34.4 43.6 36.8 40.4" w={2} />
      </g>
    );
  }
}

function Hat({ k, c }) {
  switch (k) {
    case 1: return (
      <g>
        <F d="M44.4 21.6 C50.2 21 56.2 22.2 58 24.4 C53.4 25.8 48.4 25.6 45.6 24.4 Z" fill={shade(BLUE, 0.8)} w={1.9} />
        <F d="M16.4 23.6 C15.8 14.6 22.8 9.6 32.4 9.6 C42 9.6 48.4 14.4 47.8 23.4 C40.4 21.6 24 21.6 16.4 23.6 Z" fill={BLUE} />
        <L d="M32.4 9.8 C31.6 14 31.4 18 31.8 21.8" w={1.1} />
        <Dot x={32.4} y={9.6} r={1.4} />
      </g>
    );
    case 2: return (
      <g>
        <F d="M19.4 20.4 L18.4 8.6 L24.8 13.6 L32 5.6 L39.2 13.6 L45.6 8.6 L44.6 20.4 C38 19 26 19 19.4 20.4 Z" fill={YEL} />
        <path d="M30.6 15 C31.4 13.8 32.8 13.8 33.4 15 C34 16.2 33 17.4 32 17.4 C31 17.4 30.2 16.2 30.6 15 Z" fill={RED} />
        <Dot x={18.4} y={8.4} r={1.3} c={RED} /><Dot x={45.6} y={8.4} r={1.3} c={RED} /><Dot x={32} y={5.2} r={1.3} c={BLUE} />
      </g>
    );
    case 3: return (
      <g transform="rotate(12 33 14)">
        <F d="M23.4 19.6 L32.4 1.8 L42.2 19 C36.2 20.4 29.4 20.6 23.4 19.6 Z" fill="#EFA0B4" />
        <L d="M27.2 12.6 C30.6 13.8 34.4 14 37.8 13.2 M30 6.8 C31.6 7.6 33.6 7.6 35.2 7" w={1.4} />
        <F d="M32.4 -1.8 C34.6 -1.8 35.6 0 35.4 1.6 C35.2 3.2 33.8 4 32.4 4 C30.8 4 29.6 2.8 29.8 1.2 C30 -0.4 31 -1.8 32.4 -1.8 Z" fill={YEL} w={1.6} />
      </g>
    );
    case 4: return (
      <g>
        <F d="M15.8 23.8 C24 20 40.4 20 48.4 23.6 L48.2 28.6 C40.2 25.2 24 25.4 16 29 Z" fill={RED} />
        <F d="M48.2 25.2 C52.4 22.6 56.4 22.4 58.6 21.6 C57.2 24 55.4 25.6 52.4 26.6 C55.6 27.4 57.4 29.2 58.4 31.6 C55.2 30.2 51.4 29.2 48.2 27.6 Z" fill={RED} w={1.7} />
      </g>
    );
    case 5: return (
      <g>
        <F d="M12.4 23.4 C18 21.8 46 21.8 51.6 23.4 C51.8 25 50.8 25.8 49.6 25.8 L14.4 25.8 C13.2 25.8 12.2 25 12.4 23.4 Z" fill={YEL} w={2} />
        <F d="M16.6 22.6 C16.2 13.2 23.4 7.8 32 7.8 C40.6 7.8 47.8 13.2 47.4 22.6 C39.6 21.6 24.4 21.6 16.6 22.6 Z" fill={YEL} />
        <L d="M29.4 8.4 C29 12.6 29 17.4 29.4 22 M34.6 8.4 C35 12.6 35 17.4 34.6 22" w={1.6} />
      </g>
    );
    case 6: return (
      <g>
        <path d="M19.4 7.6 C19.4 4.4 25 2.4 32 2.4 C39 2.4 44.6 4.4 44.6 7.6 C44.6 10.8 39 12.6 32 12.6 C25 12.6 19.4 10.8 19.4 7.6 Z" fill="none" stroke={INK} stroke-width="5.4" />
        <path d="M19.4 7.6 C19.4 4.4 25 2.4 32 2.4 C39 2.4 44.6 4.4 44.6 7.6 C44.6 10.8 39 12.6 32 12.6 C25 12.6 19.4 10.8 19.4 7.6 Z" fill="none" stroke={YEL} stroke-width="2.6" />
      </g>
    );
    case 7: return (
      <g>
        <F d="M19.6 20.4 C16.4 15.4 16.4 9.4 19.2 4.4 C19.8 9.6 22.4 13.6 26.4 15.6 C24.2 16.6 21.6 18.2 19.6 20.4 Z" fill={RED} />
        <F d="M44.4 20.4 C47.6 15.4 47.6 9.4 44.8 4.4 C44.2 9.6 41.6 13.6 37.6 15.6 C39.8 16.6 42.4 18.2 44.4 20.4 Z" fill={RED} />
      </g>
    );
    case 8: return (
      <g>
        <F d="M16 22.4 C15.4 12.6 22.6 7.2 32 7.2 C41.4 7.2 48.6 12.6 48 22.4 Z" fill={c} />
        <F d="M14.6 19.6 C24 17.6 40 17.6 49.4 19.6 L49.2 25.6 C40 23.6 24 23.6 14.8 25.6 Z" fill={c} />
        <L d="M19 20 L19 24.6 M23.4 19.4 L23.4 24 M27.8 19 L27.8 23.6 M32.2 19 L32.2 23.4 M36.6 19 L36.6 23.6 M41 19.4 L41 24 M45.4 20 L45.4 24.6" w={0.9} />
        <F d="M32 1.6 C34.8 1.6 36.2 3.4 36 5.4 C35.8 7.4 34 8.6 32 8.6 C30 8.6 28.2 7.2 28.2 5.2 C28.2 3.2 29.6 1.6 32 1.6 Z" fill={PAPER} w={1.7} />
      </g>
    );
    case 9: return (
      <g>
        {[[44.6, 13.6], [49.4, 16.4], [48.4, 21.6], [43.4, 22.2], [41.6, 17.4]].map(([x, y], i) => (
          <F key={i} d={`M${x - 2.8} ${y} C${x - 2.8} ${y - 2.6} ${x + 2.8} ${y - 2.6} ${x + 2.8} ${y} C${x + 2.8} ${y + 2.6} ${x - 2.8} ${y + 2.6} ${x - 2.8} ${y} Z`} fill="#EFA0B4" w={1.4} sketch={false} />
        ))}
        <F d="M45.2 15.8 C46.8 15.8 47.4 17 47.2 18 C47 19.2 46 19.8 45 19.6 C44 19.4 43.4 18.4 43.6 17.4 C43.8 16.4 44.4 15.8 45.2 15.8 Z" fill={YEL} w={1.2} sketch={false} />
      </g>
    );
    case 10: return (
      <g>
        <L d="M14.6 30 C13.4 14.4 21.4 7.4 32 7.4 C42.6 7.4 50.6 14.4 49.4 30" w={3.4} />
        <F d="M11 26 C11 24.2 12.4 23.4 14.4 23.4 C16.4 23.4 17.6 24.4 17.6 26.4 L17.6 35 C17.6 37 16.4 38 14.4 38 C12.4 38 11 37 11 35 Z" fill={AV_COLORS[4]} w={1.9} />
        <F d="M46.4 26.4 C46.4 24.4 47.6 23.4 49.6 23.4 C51.6 23.4 53 24.2 53 26 L53 35 C53 37 51.6 38 49.6 38 C47.6 38 46.4 37 46.4 35 Z" fill={AV_COLORS[4]} w={1.9} />
      </g>
    );
    default: return null;
  }
}

function FaceAcc({ k }) {
  switch (k) {
    case 1: return (
      <g>
        <F d="M21.4 28 C24 27.4 27.6 27.4 29.8 28 C30 31.6 28.6 34 25.6 34 C22.8 34 21.4 31.6 21.4 28 Z M34.2 28 C36.4 27.4 40 27.4 42.6 28 C42.6 31.6 41.2 34 38.4 34 C35.4 34 34 31.6 34.2 28 Z" fill={INK} w={1.8} sketch={false} />
        <L d="M29.8 29 C31.2 28.4 32.8 28.4 34.2 29 M21.4 28.4 L17.2 27 M42.6 28.4 L46.8 27" w={1.6} />
        <path d="M23 29 L25.2 29.2 M35.8 29 L38 29.2" stroke="#FFFDF6" stroke-width="1" opacity=".7" />
      </g>
    );
    case 2: return (
      <g>
        <path d="M21.4 30.4 C21.4 27.6 23.4 25.8 25.8 25.8 C28.4 25.8 30.2 27.8 30.2 30.4 C30.2 33 28.2 35 25.8 35 C23.2 35 21.4 33 21.4 30.4 Z M33.8 30.4 C33.8 27.8 35.6 25.8 38.2 25.8 C40.6 25.8 42.6 27.6 42.6 30.4 C42.6 33 40.8 35 38.2 35 C35.8 35 33.8 33 33.8 30.4 Z" fill="#FFFDF6" opacity=".25" />
        <L d="M21.4 30.4 C21.4 27.6 23.4 25.8 25.8 25.8 C28.4 25.8 30.2 27.8 30.2 30.4 C30.2 33 28.2 35 25.8 35 C23.2 35 21.4 33 21.4 30.4 Z M33.8 30.4 C33.8 27.8 35.6 25.8 38.2 25.8 C40.6 25.8 42.6 27.6 42.6 30.4 C42.6 33 40.8 35 38.2 35 C35.8 35 33.8 33 33.8 30.4 Z M30.2 29.6 C31.4 28.8 32.6 28.8 33.8 29.6" w={1.7} />
      </g>
    );
    case 3: return <F d="M32 37.4 C29.6 35.4 25.8 35.4 23.6 37 C22.2 38 21 37.6 20.8 36.4 C20 39.6 23.4 41.6 27.2 40.6 C29.2 40 30.8 39.2 32 38.6 C33.2 39.2 34.8 40 36.8 40.6 C40.6 41.6 44 39.6 43.2 36.4 C43 37.6 41.8 38 40.4 37 C38.2 35.4 34.4 35.4 32 37.4 Z" fill={INK} w={1.2} sketch={false} />;
    case 4: return <F d="M32.4 32.2 C35 32.2 36.2 34 36 35.8 C35.8 37.8 34.2 38.8 32.4 38.8 C30.4 38.8 28.8 37.6 28.8 35.6 C28.8 33.6 30.2 32.2 32.4 32.2 Z" fill={RED} w={1.8} />;
    case 5: return (
      <g>
        <L d="M33.6 30.6 C33.6 27.8 35.6 25.8 38.2 25.8 C40.8 25.8 42.8 27.8 42.8 30.6 C42.8 33.2 40.8 35.2 38.2 35.2 C35.6 35.2 33.6 33.2 33.6 30.6 Z" w={1.8} />
        <L d="M42.6 32 C44.6 36.4 44.4 42 41.6 48.4" w={0.9} />
      </g>
    );
    default: return null;
  }
}

function Extra({ k, shirt, sk }) {
  switch (k) {
    case 1: return (
      <g>
        <F d="M45.6 66 C46 60 47.6 55.2 50.6 51.6 L56 53.4 C54.4 57.6 53.4 61.4 53.2 66 Z" fill={shirt} />
        <F d="M50.2 35.4 L59.8 35.4 L58.4 50.4 C56.4 51.2 53.4 51.2 51.4 50.4 Z" fill={YEL} w={1.9} />
        <F d="M49.6 35.8 C50.4 32.6 53.2 32.2 54.8 33.6 C56.4 31.8 59.8 32.6 60.4 35.8 Z" fill="#FFFDF6" w={1.6} />
        <F d="M48.6 47.6 C48.6 45.4 50.2 44.4 52.6 44.6 L56.4 45 C57.8 45.2 58.2 46.6 57.6 47.8 C57.8 49.6 56.6 50.8 55 50.8 L51.4 51 C49.6 51 48.6 49.6 48.6 47.6 Z" fill={sk} w={1.7} sketch={false} />
      </g>
    );
    case 2: return (
      <g>
        <F d="M32 55 C29.4 52.6 26.4 51.4 24.6 52.4 C23.8 54.6 24 57.6 24.8 59.4 C26.8 59.8 29.6 58 32 55.6 C34.4 58 37.2 59.8 39.2 59.4 C40 57.6 40.2 54.6 39.4 52.4 C37.6 51.4 34.6 52.6 32 55 Z" fill={RED} w={1.8} />
        <F d="M30.6 54 C31.4 53.2 32.6 53.2 33.4 54 C33.8 55 33.4 56.4 32 56.4 C30.6 56.4 30.2 55 30.6 54 Z" fill={RED} w={1.4} sketch={false} />
      </g>
    );
    case 3: return <F d="M30 54 C31.2 53.4 32.8 53.4 34 54 L33.2 56.6 L35.8 64.6 L32 67 L28.2 64.6 L30.8 56.6 Z" fill={BLUE} w={1.8} />;
    case 4: return (
      <g>
        <F d="M18.4 66 C18 60 16.4 55.2 13.4 51.6 L8 53.4 C9.6 57.6 10.6 61.4 10.8 66 Z" fill={shirt} />
        <F d="M10.6 44.2 L13 52.6 L15.6 52 L14.4 43.6 Z" fill={INK} w={1.2} sketch={false} />
        <F d="M9.2 39.6 C9.2 37.4 10.8 36.2 12.6 36.2 C14.6 36.2 16 37.6 16 39.6 C16 41.8 14.6 43.4 12.6 43.4 C10.6 43.4 9.2 41.8 9.2 39.6 Z" fill="#6B6660" w={1.6} />
        <F d="M10.4 49.6 C10 47.6 11.4 46.4 13.6 46.6 C15.6 46.8 16.4 48.4 15.8 50.2 C15.4 52 13.6 52.8 12 52.4 C10.8 52 10.6 51 10.4 49.6 Z" fill={sk} w={1.6} sketch={false} />
      </g>
    );
    default: return null;
  }
}

// ---------------------------------------------------------------- espèces
const ALIEN_HEAD = 'M32 8.6 C45.4 8.6 51.2 17.8 50.4 28 C49.4 38.4 41.2 47.4 32 48.4 C22.8 47.4 14.6 38.4 13.6 28 C12.8 17.8 18.6 8.6 32 8.6 Z';
function AlienFace({ expr, mood, sk }) {
  const e = mood === 'win' ? 'win' : mood === 'drink' ? 'drink' : expr;
  const eyeL = 'M18.6 27.6 C20.2 22.8 26.8 22.2 29.4 27 C28.8 31.4 23.4 33.4 18.6 27.6 Z';
  const eyeR = 'M45.4 27.6 C43.8 22.8 37.2 22.2 34.6 27 C35.2 31.4 40.6 33.4 45.4 27.6 Z';
  if (e === 6 || e === 'win') return (<g><L d="M19 28 C22 31 26.6 31 29.4 28 M34.6 28 C37.4 31 42 31 45 28" w={2.2} /><L d={e === 'win' ? 'M27.6 39.4 C29.6 42.6 34.4 42.6 36.4 39.4' : 'M30.6 40.6 C31.6 41.2 32.4 41.2 33.4 40.6'} w={1.8} /></g>);
  const lid = e === 1 || e === 3 ? <path d="M17.6 27.6 C20 21 27.6 21 30.4 27 L30.4 22 L17.6 22 Z M46.4 27.6 C44 21 36.4 21 33.6 27 L33.6 22 L46.4 22 Z" fill={sk} transform="translate(0 2.4)" /> : null;
  const tilt = e === 4 ? ['rotate(14 24 27)', 'rotate(-14 40 27)'] : ['', ''];
  return (
    <g>
      <g transform={tilt[0]}><F d={eyeL} fill={e === 5 ? '#E0573E' : INK} w={1.6} sketch={false} /></g>
      {e === 7 ? <L d="M35 28 C37.6 30.4 42 30.4 44.8 28" w={2.2} /> : <g transform={tilt[1]}><F d={eyeR} fill={e === 5 ? '#E0573E' : INK} w={1.6} sketch={false} /></g>}
      {e !== 5 ? <g><ellipse cx="22.4" cy="26.2" rx="1.6" ry="1.1" fill="#FFFDF6" opacity=".9" />{e !== 7 ? <ellipse cx="38.4" cy="26.2" rx="1.6" ry="1.1" fill="#FFFDF6" opacity=".9" /> : null}</g> : null}
      {e === 4 ? <g><circle cx="25" cy="27.6" r="1" fill="#FF4A3A" /><circle cx="39" cy="27.6" r="1" fill="#FF4A3A" /></g> : null}
      {lid}
      {e === 2 ? <F d="M32 38.6 C33.6 38.6 34.2 40 34 41.2 C33.8 42.4 33 43 32 43 C31 43 30.2 42.2 30.2 41 C30.2 39.8 30.8 38.6 32 38.6 Z" fill="#3A2A30" w={1.5} sketch={false} />
        : e === 'drink' ? <L d="M28.6 41.4 C30 40 31 41.2 32 40.2 C33 41.2 34 40 35.4 41.4" w={1.7} />
        : e === 4 ? <L d="M28 39.4 C30.4 41.4 33.6 41.4 36 39.4 L35 42 L33.6 40.6 L32 42.4 L30.4 40.6 L29 42 Z" w={1.5} />
        : e === 1 ? <L d="M29 40.6 L35 40.4" w={1.7} />
        : <L d="M28.8 39.8 C30.6 41.8 33.4 41.8 35.2 39.8" w={1.8} />}
    </g>
  );
}
// tête en pixels : grille 8 x 8, cases de 3,6
const PX = 3.6, PX0 = 17.6, PY0 = 12.4;
function Px({ c, r, fill, w = 1, h = 1 }) { return <rect x={PX0 + c * PX} y={PY0 + r * PX} width={PX * w + 0.05} height={PX * h + 0.05} fill={fill} />; }
function CubeHead({ expr, mood, sk, hc, hair, shirt }) {
  const dark = shade(sk, 0.82);
  const e = mood === 'win' ? 'win' : mood === 'drink' ? 'drink' : expr;
  const cells = [];
  // visage
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) cells.push(<Px key={`s${r}-${c}`} c={c} r={r} fill={(r + c * 3) % 7 === 0 ? dark : sk} />);
  // cheveux : deux rangées + côtés selon la coiffure
  if (hair !== 0) {
    const rows = hair === 4 || hair === 7 ? 2 : hair === 6 ? 1 : 2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < 8; c++) if (!(hair === 6 && (c < 3 || c > 4))) cells.push(<Px key={`h${r}-${c}`} c={c} r={r} fill={(r + c) % 3 === 0 ? shade(hc, 1.18) : hc} />);
    if (hair === 4 || hair === 7 || hair === 3) for (let r = 2; r < (hair === 4 ? 8 : 5); r++) { cells.push(<Px key={`l${r}`} c={0} r={r} fill={hc} />); cells.push(<Px key={`r${r}`} c={7} r={r} fill={hc} />); }
    if (hair === 2) { cells.push(<Px key="m1" c={1} r={2} fill={hc} />); cells.push(<Px key="m2" c={2} r={2} fill={hc} />); }
    if (hair === 6) for (let r = -2; r < 0; r++) for (let c = 3; c < 5; c++) cells.push(<Px key={`k${r}-${c}`} c={c} r={r} fill={hc} />);
    if (hair === 5) for (let c = 3; c < 5; c++) cells.push(<Px key={`b${c}`} c={c} r={-1} fill={hc} />);
  }
  // yeux
  const eye = (c, kind) => {
    if (kind === 'closed') return <Px key={`e${c}`} c={c} r={4} w={2} h={0.4} fill={INK} />;
    if (kind === 'heart') return <Px key={`e${c}`} c={c} r={3.6} w={2} h={1} fill="#E0573E" />;
    return [<Px key={`ew${c}`} c={c} r={3.6} w={2} h={1} fill="#FFFDF6" />, <Px key={`ep${c}`} c={c + (kind === 'x' ? 0.5 : 1)} r={3.6} w={1} h={1} fill={kind === 'red' ? '#C2241B' : '#3B2C6B'} />];
  };
  const ek = e === 6 || e === 'win' ? 'closed' : e === 5 ? 'heart' : e === 4 ? 'red' : e === 3 ? 'x' : 'open';
  cells.push(eye(1, ek));
  cells.push(e === 7 ? <Px key="wink" c={5} r={4} w={2} h={0.4} fill={INK} /> : eye(5, ek));
  if (e === 4) { cells.push(<Px key="b1" c={1} r={3} w={2} h={0.45} fill={INK} />); cells.push(<Px key="b2" c={5} r={3} w={2} h={0.45} fill={INK} />); }
  // nez et bouche
  cells.push(<Px key="nez" c={3.5} r={4.8} w={1} h={0.9} fill={shade(sk, 0.7)} />);
  const m = e === 2 ? [[3, 6, 2, 1.2]] : e === 1 ? [[2.5, 6.2, 3, 0.45]] : e === 'drink' ? [[2, 6.6, 1, 0.5], [3, 6.2, 2, 0.5], [5, 6.6, 1, 0.5]] : e === 6 ? [[3.5, 6.3, 1, 0.6]] : e === 'win' || e === 4 ? [[2, 5.9, 4, 1.1]] : [[2, 5.9, 1, 0.5], [3, 6.3, 2, 0.5], [5, 5.9, 1, 0.5]];
  m.forEach(([c, r, w, h], i) => cells.push(<Px key={`m${i}`} c={c} r={r} w={w} h={h} fill={e === 'win' || e === 4 ? '#5A1B18' : INK} />));
  if (e === 4 || e === 'win') cells.push(<Px key="dents" c={2.2} r={5.9} w={3.6} h={0.4} fill="#FFFDF6" />);
  return (
    <g>
      <rect x={PX0 + 2.5 * PX} y={PY0 + 8 * PX - 1} width={PX * 3} height="6" fill={dark} />
      <path d="M4 66 L4 58 L8 58 L8 54.4 L22 54.4 L22 51.8 L42 51.8 L42 54.4 L56 54.4 L56 58 L60 58 L60 66 Z" fill={shirt} />
      <path d="M4 66 L4 58 L8 58 L8 54.4 L22 54.4 L22 51.8 L42 51.8 L42 54.4 L56 54.4 L56 58 L60 58 L60 66" fill="none" stroke={INK} stroke-width="2" />
      <rect x={PX0 + 2.5 * PX} y="51.8" width={PX * 3} height="2.6" fill={shade(shirt, 0.8)} />
      {cells}
      <rect x={PX0} y={PY0} width={PX * 8} height={PX * 8} fill="none" stroke={INK} stroke-width="2.2" />
    </g>
  );
}
function RobotHead({ expr, mood, sk, shirt, head }) {
  const e = mood === 'win' ? 'win' : mood === 'drink' ? 'drink' : expr;
  const led = e === 4 ? '#FF5A4A' : e === 5 ? '#FF7FA8' : '#6BF2D8';
  const eyes = e === 6 || e === 'win' ? <L d="M22.6 29 L28 29 M36 29 L41.4 29" w={2.4} color={led} />
    : e === 5 ? <g fill={led}><path d="M25.2 31.6 L22.4 28.6 C21.8 27.4 23.4 26 25.2 27.6 C27 26 28.6 27.4 28 28.6 Z" /><path d="M38.8 31.6 L36 28.6 C35.4 27.4 37 26 38.8 27.6 C40.6 26 42.2 27.4 41.6 28.6 Z" /></g>
    : e === 3 ? <L d="M22.8 26.4 L27.6 31.2 M27.6 26.4 L22.8 31.2 M36.4 26.4 L41.2 31.2 M41.2 26.4 L36.4 31.2" w={1.8} color={led} />
    : e === 2 ? <g fill="none" stroke={led} stroke-width="1.8"><rect x="22.2" y="25.6" width="6" height="6" /><rect x="35.8" y="25.6" width="6" height="6" /></g>
    : <g fill={led}><rect x="22.6" y={e === 1 ? 28.4 : 26.6} width="5.4" height={e === 1 ? 2 : 4} /><rect x="36" y={e === 1 ? 28.4 : 26.6} width="5.4" height={e === 1 ? 2 : 4} />{e === 7 ? <rect x="35.4" y="26" width="6.6" height="5" fill="#1A2226" /> : null}</g>;
  const mouth = e === 'drink' ? 'M24.6 38.6 L27.6 36.6 L30.6 38.6 L33.6 36.6 L36.6 38.6 L39.4 36.6'
    : e === 2 ? 'M29.6 36.4 L34.4 36.4 L34.4 40 L29.6 40 Z' : e === 1 || e === 6 ? 'M26.6 37.6 L37.4 37.6'
    : 'M24.8 36 L26.8 38.6 L37.2 38.6 L39.2 36';
  return (
    <g>
      <F d="M27 44 L27 52.6 L37 52.6 L37 44" fill={shade(sk, 0.75)} w={2} />
      <F d={SHIRT} fill={shirt} />
      <L d="M22.4 51 C25.4 56 38.6 56 41.7 51" w={1.5} />
      {head === 0 ? <g><L d="M32 14.6 L32 8" w={1.8} /><F d="M32 4.4 C33.8 4.4 34.6 5.6 34.4 6.8 C34.2 8 33.2 8.6 32 8.6 C30.8 8.6 29.8 7.8 29.8 6.6 C29.8 5.4 30.6 4.4 32 4.4 Z" fill="#E0573E" w={1.4} sketch={false} /></g> : null}
      <F d="M12.4 25 L15.6 25 L15.6 35 L12.4 35 Z M48.4 25 L51.6 25 L51.6 35 L48.4 35 Z" fill={shade(sk, 0.7)} w={1.8} />
      <F d="M18.6 14.6 L45.4 14.6 C47.6 14.6 48.6 15.6 48.6 17.8 L48.6 42.4 C48.6 44.6 47.6 45.6 45.4 45.6 L18.6 45.6 C16.4 45.6 15.4 44.6 15.4 42.4 L15.4 17.8 C15.4 15.6 16.4 14.6 18.6 14.6 Z" fill={sk} />
      <path d="M17.4 17 L46.6 17 L46.6 19.4 L17.4 19.4 Z" fill="#FFFFFF" opacity=".25" />
      {[[18.4, 17.6], [45.6, 17.6], [18.4, 42.6], [45.6, 42.6]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r=".9" fill={INK} opacity=".6" />)}
      <F d="M20 22.4 L44 22.4 C45 22.4 45.4 22.8 45.4 23.8 L45.4 40.2 C45.4 41.2 45 41.6 44 41.6 L20 41.6 C19 41.6 18.6 41.2 18.6 40.2 L18.6 23.8 C18.6 22.8 19 22.4 20 22.4 Z" fill="#1A2226" w={1.8} sketch={false} />
      {eyes}
      <L d={mouth} w={1.8} color={led} />
    </g>
  );
}
const GHOST = 'M32 9.6 C44.4 9.6 50.4 18.8 50.4 31 L50.4 60.6 C47.8 63.4 45.6 58.4 42.6 61.2 C39.6 64 37.4 58.4 34.4 61.2 C31.4 64 29.2 58.4 26.2 61.2 C23.2 64 21 58.4 18 61.2 C16 63 13.6 62.4 13.6 60.4 L13.6 31 C13.6 18.8 19.6 9.6 32 9.6 Z';
function GhostFace({ expr, mood }) {
  const e = mood === 'win' ? 'win' : mood === 'drink' ? 'drink' : expr;
  const hole = (x, y, rx, ry) => <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="#2A2530" />;
  return (
    <g>
      {e === 6 || e === 'win' ? <L d="M21.6 28 C23.6 30 27 30 29 28 M35 28 C37 30 40.4 30 42.4 28" w={2.2} />
        : e === 5 ? <g fill="#E0573E"><path d="M25.2 32.6 L21.6 28.8 C20.6 27 23 25.2 25.2 27.4 C27.4 25.2 29.8 27 28.8 28.8 Z" /><path d="M38.8 32.6 L35.2 28.8 C34.2 27 36.6 25.2 38.8 27.4 C41 25.2 43.4 27 42.4 28.8 Z" /></g>
        : <g>{hole(25.2, 28.4, e === 2 ? 3.4 : 2.8, e === 1 ? 1.6 : e === 2 ? 4.2 : 3.6)}{e === 7 ? <L d="M35.4 28.6 C37.4 30.4 40.6 30.4 42.6 28.6" w={2.2} /> : hole(38.8, 28.4, e === 2 ? 3.4 : 2.8, e === 1 ? 1.6 : e === 2 ? 4.2 : 3.6)}</g>}
      {e === 4 ? <L d="M21.2 23 L28.6 25.4 M42.8 23 L35.4 25.4" w={2} /> : null}
      {e === 2 || e === 'drink' ? hole(32, 40.6, 2.6, 3.4) : e === 1 || e === 6 ? <L d="M29.4 40.4 L34.6 40.2" w={1.8} /> : <path d="M26.6 38.2 C28.4 43.8 35.6 43.8 37.4 38.2 C34 39.2 30 39.2 26.6 38.2 Z" fill="#2A2530" />}
      <path d="M18.6 35.4 C20.2 34.6 22.2 34.8 23 35.8 C22.2 37 20 37.2 18.6 35.4 Z M41 35.8 C41.8 34.8 43.8 34.6 45.4 35.4 C44 37.2 41.8 37 41 35.8 Z" fill="#EFA0B4" opacity=".6" />
    </g>
  );
}
const SKULL = 'M32 12 C43.2 12 49.2 19.2 49.2 28.2 C49.2 34 46.6 37.4 43.2 38.8 L42.2 44.2 C38.2 47.4 25.8 47.4 21.8 44.2 L20.8 38.8 C17.4 37.4 14.8 34 14.8 28.2 C14.8 19.2 20.8 12 32 12 Z';
function SkullFace({ expr, mood }) {
  const e = mood === 'win' ? 'win' : mood === 'drink' ? 'drink' : expr;
  const socket = (x, s) => <path d={`M${x - 4.4} ${29.6} C${x - 4.6} ${25.4} ${x - 1.4} ${24.2} ${x + 0.6} ${24.6} C${x + 3.6} ${25} ${x + 4.8} ${27.4} ${x + 4.2} ${30.4} C${x + 3.6} ${33.2} ${x + 1} ${34} ${x - 1} ${33.6} C${x - 3} ${33.2} ${x - 4.4} ${31.8} ${x - 4.4} ${29.6} Z`} fill="#2A2530" transform={s} />;
  return (
    <g>
      {e === 6 ? <L d="M20.6 29.6 C22.6 31.4 27 31.4 29 29.6 M35 29.6 C37 31.4 41.4 31.4 43.4 29.6" w={2.4} /> : <g>{socket(24.8, '')}{e === 7 ? <L d="M35 29.6 C37 31.4 41.4 31.4 43.4 29.6" w={2.4} /> : socket(39.2, 'translate(78.4 0) scale(-1 1)')}</g>}
      {e === 5 ? <g fill="#E0573E"><circle cx="24.8" cy="29.2" r="1.8" /><circle cx="39.2" cy="29.2" r="1.8" /></g> : e === 4 ? <g fill="#FF4A3A"><circle cx="24.8" cy="29.4" r="1.1" /><circle cx="39.2" cy="29.4" r="1.1" /></g> : e !== 6 ? <g fill="#FFFDF6" opacity=".85"><circle cx="25.4" cy="29" r="0.9" /><circle cx="38.6" cy="29" r="0.9" /></g> : null}
      <path d="M32 33.6 L30 37.4 C30.6 38.2 31.4 37.8 32 37.2 C32.6 37.8 33.4 38.2 34 37.4 Z" fill="#2A2530" />
      <L d={e === 'drink' ? 'M24.4 42.8 C27 40.6 29 42.4 32 41 C35 42.4 37 40.6 39.6 42.8' : e === 'win' || e === 4 ? 'M23.6 40 C27 43.2 37 43.2 40.4 40' : 'M24.4 41.4 L39.6 41.4'} w={1.6} />
      <L d="M27 39.6 L27.2 43.6 M30 39.8 L30 44.2 M33.6 39.8 L33.6 44.2 M36.8 39.6 L36.6 43.6" w={1} />
      <L d="M38.2 15.6 C39.4 18 39 20.2 37.4 21.6" w={0.9} />
    </g>
  );
}

let clipN = 0;
// une espèce dessinée (sans le sous-bock) ; « glitch » réutilise la base humaine
function Body({ p, mood }) {
  const cid = useMemo(() => `avh${(clipN += 1)}`, []);
  const [color, expr, head, face, extra, hair, skin, hairCol, kind] = p;
  const shirt = AV_COLORS[color] || AV_COLORS[0];
  const sk = (KIND_SKINS[kind] || KIND_SKINS[0])[skin] || AV_SKINS[1];
  const hc = AV_HAIRS[hairCol] || AV_HAIRS[0];
  const hatHidesTop = head === 1 || head === 5 || head === 8;
  const acc = (
    <g>
      <FaceAcc k={face} />
      <Hat k={head} c={shirt} />
      <Extra k={extra} shirt={shirt} sk={kind === 6 ? sk : kind === 4 ? shade(sk, 0.85) : sk} />
    </g>
  );
  if (kind === 1) return (
    <g>
      <F d="M28.4 42 L27.6 58 L36.4 58 L35.6 42 Z" fill={sk} w={2} />
      <path d="M28.2 45.6 C30.6 48 33.4 48 35.8 45.6 L36 49.6 C33.4 51.4 30.6 51.4 28 49.6 Z" fill={shade(sk, 0.8)} />
      <F d={SHIRT} fill={shirt} />
      <L d="M22.4 51 C25.4 56 38.6 56 41.7 51" w={1.5} />
      {head === 0 ? <g><L d="M25 10.6 C23.6 7 21.2 4.6 18.4 3.6 M39 10.6 C40.4 7 42.8 4.6 45.6 3.6" w={1.6} /><F d="M16.2 3.6 C16.2 2.2 17.2 1.4 18.4 1.4 C19.6 1.4 20.6 2.4 20.4 3.6 C20.2 4.8 19.4 5.6 18.2 5.6 C17 5.6 16.2 4.8 16.2 3.6 Z M43.6 3.6 C43.6 2.4 44.6 1.4 45.8 1.4 C47 1.4 47.8 2.2 47.8 3.6 C47.8 4.8 47 5.6 45.8 5.6 C44.6 5.6 43.6 4.8 43.6 3.6 Z" fill={sk} w={1.3} sketch={false} /></g> : null}
      <F d={ALIEN_HEAD} fill={sk} />
      <path d="M22 16 C25 13.6 29 12.8 32 12.8" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" opacity=".45" />
      <AlienFace expr={expr} mood={mood} sk={sk} />
      {acc}
    </g>
  );
  if (kind === 2) return (<g><CubeHead expr={expr} mood={mood} sk={sk} hc={hc} hair={hair} shirt={shirt} />{acc}</g>);
  if (kind === 4) return (<g><RobotHead expr={expr} mood={mood} sk={sk} shirt={shirt} head={head} />{acc}</g>);
  if (kind === 6) return (
    <g>
      <F d={GHOST} fill={sk} />
      <path d="M17.6 30 C17.8 21 22.6 14.8 29.6 13.8" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity=".7" />
      <GhostFace expr={expr} mood={mood} />
      {acc}
    </g>
  );
  if (kind === 7) return (
    <g>
      <F d="M28.2 43.4 C30.8 42.6 33.2 42.6 35.8 43.4 L35.4 47.4 C33 48.2 31 48.2 28.6 47.4 Z" fill={sk} w={1.7} />
      <F d="M28.6 48.4 C31 47.6 33 47.6 35.4 48.4 L35.2 52.6 C33 53.4 31 53.4 28.8 52.6 Z" fill={sk} w={1.7} />
      <F d="M29 53.6 C31.2 52.8 32.8 52.8 35 53.6 L35 58 L29 58 Z" fill={sk} w={1.7} />
      <F d={SHIRT} fill={shirt} />
      <L d="M22.4 51 C25.4 56 38.6 56 41.7 51" w={1.5} />
      <F d={SKULL} fill={sk} />
      <SkullFace expr={expr} mood={mood} />
      {acc}
    </g>
  );
  // humain, zombie (et base du glitch)
  const zombie = kind === 5;
  return (
    <g>
      <defs><clipPath id={cid}><path d={HEAD} /></clipPath></defs>
      <HairBack k={hair} c={hc} />
      <F d={NECK} fill={sk} w={2} />
      <path d="M27 45.6 C30.4 48.8 33.8 48.8 37 45.6 L37.1 50.4 C33.6 52.4 30.4 52.4 26.9 50.4 Z" fill={shade(sk, 0.8)} />
      <F d={SHIRT} fill={shirt} />
      <path d="M8.4 64 C9.4 59 12.6 55.6 17.6 53.6 C16.4 57 16 60.6 16.4 64 Z M55.6 64 C54.6 59 51.4 55.6 46.4 53.6 C47.6 57 48 60.6 47.6 64 Z" fill={shade(shirt, 0.84)} />
      {zombie ? <path d="M12 60 L15 57 L17 61 L20 58 M47 59 L50 56 L52 60" fill="none" stroke={INK} stroke-width="1.2" /> : null}
      <L d="M22.4 51 C25.4 56 38.6 56 41.7 51" w={1.5} />
      <F d={EAR_L} fill={sk} w={2} />
      <F d={EAR_R} fill={sk} w={2} />
      <F d={HEAD} fill={sk} />
      <g clip-path={`url(#${cid})`}><path d="M47.6 18 C44.2 30 41.6 41.4 31.4 50 L52 52 L52 14 Z" fill={shade(sk, 0.9)} /><path d="M21.4 20.6 C23.4 17.6 26.6 16 29.6 15.6" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" opacity=".35" /></g>
      {zombie ? null : <path d="M18.8 36.4 C20.6 35.4 23 35.6 24 36.8 C23 38.2 20.4 38.4 18.8 36.4 Z M40 36.8 C41 35.6 43.4 35.4 45.2 36.4 C43.6 38.4 41 38.2 40 36.8 Z" fill="#E0573E" opacity={expr === 3 || mood === 'drink' ? 0.5 : 0.22} />}
      {zombie ? <path d="M21.4 33.6 C23.4 35.4 27.6 35.6 29.4 33.4 M34.6 33.4 C36.6 35.6 40.6 35.4 42.6 33.6" fill="none" stroke="#5E6B4E" stroke-width="2.4" opacity=".55" stroke-linecap="round" /> : null}
      <L d="M32.6 30.6 C31.8 33.4 30.6 35.6 31.4 36.4 C32 36.9 33 36.8 33.8 36.4" w={1.5} />
      <HairFront k={hair} c={hc} hat={hatHidesTop} />
      {zombie ? <L d="M36.4 18.4 L43.4 22.4 M37.4 17.6 L36.6 19.6 M39.6 18.8 L38.8 20.8 M41.8 20.2 L41 22.2" w={1.2} /> : null}
      <Eyes expr={expr} mood={mood} />
      {zombie ? <path d="M33.6 42 L34.8 44.6 L36 42.2 Z" fill="#FFFDF6" stroke={INK} stroke-width=".8" /> : null}
      {acc}
    </g>
  );
}

// mood : null (expression choisie), « win » (il distribue) ou « drink » (il boit)
export function Character({ av, mood = null, bg = true, size = 64, label = null }) {
  const p = parseAv(av);
  const kind = p[8];
  const id = useMemo(() => `avc${(clipN += 1)}`, []);
  const body = <Body p={p} mood={mood} />;
  return (
    <svg class={`bouille${kind === 3 ? ' is-glitch' : ''}`} viewBox="0 0 64 64" width={size} height={size} role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : 'true'} focusable="false" overflow="visible">
      <defs>
        <clipPath id={id}><path d="M32 2 C49.4 2 62.4 14.8 62.4 33 C62.4 51 49.4 64.4 32 64.4 C14.6 64.4 1.6 51 1.6 33 C1.6 14.8 14.6 2 32 2 Z" /></clipPath>
        {kind === 3 ? (
          <>
            <filter id={`${id}m`}><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 .18  0 0 0 0 .55  0 0 0 .8 0" /></filter>
            <filter id={`${id}c`}><feColorMatrix type="matrix" values="0 0 0 0 .12  0 0 0 0 .9  0 0 0 0 .86  0 0 0 .8 0" /></filter>
            <clipPath id={`${id}s1`}><rect x="-10" y="27" width="84" height="4.4" /></clipPath>
            <clipPath id={`${id}s2`}><rect x="-10" y="41" width="84" height="2.6" /></clipPath>
            <clipPath id={`${id}s3`}><rect x="-10" y="15.6" width="84" height="2" /></clipPath>
          </>
        ) : null}
      </defs>
      {bg ? (
        <g>
          <path d="M32 2 C49.4 2 62.4 14.8 62.4 33 C62.4 51 49.4 64.4 32 64.4 C14.6 64.4 1.6 51 1.6 33 C1.6 14.8 14.6 2 32 2 Z" fill={PAPER} />
          <path d="M32 5.4 C47.6 5.4 59 16.8 59 33 C59 49 47.6 61 32 61 C16.4 61 5 49 5 33 C5 16.8 16.4 5.4 32 5.4 Z" fill="none" stroke={INK} stroke-width=".6" opacity=".22" />
        </g>
      ) : null}
      <g clip-path={bg ? `url(#${id})` : undefined}>
        <g transform="translate(1.9 4.6) scale(.94)">
          {kind === 3 ? (
            <g>
              <g filter={`url(#${id}c)`} transform="translate(-1.8 .3)" class="gl-c">{body}</g>
              <g filter={`url(#${id}m)`} transform="translate(1.8 -.3)" class="gl-m">{body}</g>
              {body}
              <g clip-path={`url(#${id}s1)`}><g transform="translate(3.4 0)" class="gl-s1"><Body p={p} mood={mood} /></g></g>
              <g clip-path={`url(#${id}s2)`}><g transform="translate(-2.6 0)" class="gl-s2"><Body p={p} mood={mood} /></g></g>
              <g clip-path={`url(#${id}s3)`}><g transform="translate(2 0)"><Body p={p} mood={mood} /></g></g>
              <path d="M6 24.6 L22 24.6 M44 46.4 L60 46.4 M10 52 L18 52" stroke="#2EE6D6" stroke-width="1" opacity=".7" />
            </g>
          ) : body}
        </g>
      </g>
    </svg>
  );
}

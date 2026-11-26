// Les 12 figures du deck « Classique » : 4 rois, 4 dames, 4 valets, en double portrait.
// Chaque figure est dessinée sur une demi-carte de 202 × 151 (le haut du cadre) ; la carte pose la moitié basse tournée de 180°.
// Règles de proportion communes : visage d'environ 54 de haut (plus d'un tiers de la demi-carte), cou attaché
// sous la mâchoire et fondu dans l'encolure, épaules à environ trois largeurs de visage, mains qui tiennent leurs objets.
// La zone en haut à gauche (x < 46, y < 98) est sous le coin de la carte : ni visage ni main n'y vont.
import { C, n, enseigne, couleur } from './base.mjs';

const T = C.encre;
const W = 1.5;
// (une épaisseur donnée dans « plus » remplace celle par défaut : pas d'attribut en double, sinon le SVG seul est refusé)
const P = (d, fill, plus = '') => `<path d="${d}" fill="${fill}" stroke="${T}"${/stroke-width=/.test(plus) ? '' : ` stroke-width="${W}"`} stroke-linejoin="round" stroke-linecap="round"${plus ? ' ' + plus : ''}/>`;
const F = (d, fill, plus = '') => `<path d="${d}" fill="${fill}"${plus ? ' ' + plus : ''}/>`; // aplat sans trait
const Li = (d, w = 1.2, col = T, plus = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${plus ? ' ' + plus : ''}/>`;
const Gt = (tr, s) => `<g transform="${tr}">${s}</g>`;
const rond = (x, y, r, fill, trait = true) => trait ? `<circle cx="${n(x, 2)}" cy="${n(y, 2)}" r="${r}" fill="${fill}" stroke="${T}" stroke-width="${W * .8}"/>` : `<circle cx="${n(x, 2)}" cy="${n(y, 2)}" r="${r}" fill="${fill}"/>`;

export const PEAUX = {
  claire: { p: '#F3CFAE', o: '#DFA985', l: '#C24A4A' },
  rosee: { p: '#EFC2A0', o: '#D99B78', l: '#BF4446' },
  doree: { p: '#E3B285', o: '#C98F62', l: '#B5483F' },
  olive: { p: '#CF9B6E', o: '#B27D52', l: '#A9443B' },
  brune: { p: '#9A6340', o: '#7C4A2D', l: '#8A3A33' },
  foncee: { p: '#6B4128', o: '#55311D', l: '#7A332D' },
};
export const CHEVEUX = { blond: '#E0B55A', chatain: '#7A4A26', brun: '#4A2E1A', noir: '#221B17', roux: '#B4542B', gris: '#A9A49C', blanc: '#E9E5DD', auburn: '#8E3A22' };
const YEUX = { brun: '#5A3A22', bleu: '#3D6FA8', vert: '#4E7A47', noir: '#2A1E18', noisette: '#7A5A2A' };

// ---------- le visage, dans son propre repère : centre (0, 0), pommettes à x = ±22, menton à y = +29 ----------
// o : { peau, yeux, sourcils (couleur), regard (-1..1), tourne (-1..1), machoire, menton, age, expression, joues, nez }
function visage(o) {
  const pe = PEAUX[o.peau] || PEAUX.claire, a = o.large || 22, jw = o.machoire ?? 15, ch = o.menton ?? 5, dx = (o.tourne || 0) * 3;
  const cont = `M${-a} -6 C${-a} -22 -12 -31 0 -31 C12 -31 ${a} -22 ${a} -6 C${a} 4 ${jw + 3} 11 ${jw} 17 C${jw - 3} 23 ${ch + 4} 29 0 29.5 C${-ch - 4} 29 ${-jw + 3} 23 ${-jw} 17 C${-jw - 3} 11 ${-a} 4 ${-a} -6 Z`;
  const oreilles = P(`M${-a + 1} -3 C${-a - 6} -6 ${-a - 7} 6 ${-a + 1} 11 Z`, pe.p) + P(`M${a - 1} -3 C${a + 6} -6 ${a + 7} 6 ${a - 1} 11 Z`, pe.p)
    + Li(`M${-a - 2} 0 C${-a - 4} 3 ${-a - 3} 6 ${-a} 7`, .9) + Li(`M${a + 2} 0 C${a + 4} 3 ${a + 3} 6 ${a} 7`, .9);
  const peau = P(cont, pe.p);
  // ombre douce sur un côté (aplat, pas de dégradé)
  const ombre = F(`M${a} -6 C${a} 4 ${jw + 3} 11 ${jw} 17 C${jw - 3} 23 ${ch + 4} 29 0 29.5 C${ch + 2} 26 ${jw - 4} 18 ${jw - 2} 10 C${a - 4} 2 ${a - 3} -8 ${a - 6} -18 C${a - 2} -14 ${a} -10 ${a} -6 Z`, pe.o, 'opacity=".55"');
  // yeux en amande, iris et pupille, paupière marquée
  const oeil = (x, cote) => {
    const g = (o.regard || 0) * 1.6, ycol = YEUX[o.yeux] || YEUX.brun;
    if (o.expression === 'clin' && cote > 0) return Li(`M${x - 6} -3 Q${x} 0 ${x + 6} -3`, 1.8);
    return P(`M${x - 6.2} -3.5 C${x - 3} -7.6 ${x + 3} -7.6 ${x + 6.2} -3.5 C${x + 3} -.6 ${x - 3} -.6 ${x - 6.2} -3.5 Z`, '#FFFFFF', 'stroke-width=".9"')
      + `<circle cx="${n(x + g, 2)}" cy="-3.7" r="2.7" fill="${ycol}"/><circle cx="${n(x + g, 2)}" cy="-3.7" r="1.25" fill="#141110"/><circle cx="${n(x + g - .9, 2)}" cy="-4.6" r=".6" fill="#fff"/>`
      + Li(`M${x - 6.6} -3.4 C${x - 3} -8.4 ${x + 3} -8.4 ${x + 6.6} -3.6`, 1.7)
      + (o.cils ? Li(`M${x + 5.6} -4.6 l2.2 -1.6 M${x + 4} -6 l1.6 -2 M${x - 5.6} -4.6 l-2 -1.4`, .9) : '')
      + (o.age ? Li(`M${x - 5} 0.6 Q${x} 2.2 ${x + 5} .4`, .7, T, 'opacity=".55"') : '');
  };
  const sc = o.sourcils || '#3a2a1e', s = o.severe ? 1 : 0;
  const sourcils = P(`M${-15 + dx} ${-10 + s} C${-11 + dx} ${-13.5} ${-6 + dx} ${-13.2} ${-3 + dx} ${-11 + s * 2} C${-6 + dx} ${-11.6} ${-11 + dx} ${-11.4} ${-15 + dx} ${-10 + s} Z`, sc, 'stroke-width=".8"')
    + P(`M${15 + dx} ${-10 + s} C${11 + dx} ${-13.5} ${6 + dx} ${-13.2} ${3 + dx} ${-11 + s * 2} C${6 + dx} ${-11.6} ${11 + dx} ${-11.4} ${15 + dx} ${-10 + s} Z`, sc, 'stroke-width=".8"');
  const nez = o.nez === 'aquilin'
    ? Li(`M${2 + dx} -4 C${3 + dx} 1 ${6 + dx} 5 ${5 + dx} 10 C${4 + dx} 12.5 ${1 + dx} 12.5 ${-1 + dx} 11.5 M${-4 + dx} 10.6 C${-3 + dx} 12.6 ${-1 + dx} 12.6 ${0 + dx} 11.6`, 1.2)
    : Li(`M${1.5 + dx} -3 C${2.4 + dx} 2 ${4.6 + dx} 6 ${4.6 + dx} 9.4 C${3.6 + dx} 12 ${0 + dx} 12.4 ${-2.6 + dx} 11 M${-4.4 + dx} 9.8 C${-4.6 + dx} 11.2 ${-3.6 + dx} 12 ${-2.6 + dx} 11.6`, 1.2);
  const lv = pe.l, by = 19;
  let bouche;
  if (o.expression === 'sourire' || o.expression === 'clin') bouche = P(`M${-8 + dx} ${by - 1} C${-4 + dx} ${by + 1.6} ${4 + dx} ${by + 1.6} ${8 + dx} ${by - 1} C${5 + dx} ${by + 5.4} ${-5 + dx} ${by + 5.4} ${-8 + dx} ${by - 1} Z`, lv, 'stroke-width="1"') + F(`M${-6 + dx} ${by + .2} C${-2 + dx} ${by + 1.6} ${2 + dx} ${by + 1.6} ${6 + dx} ${by + .2} C${3 + dx} ${by + 2.4} ${-3 + dx} ${by + 2.4} ${-6 + dx} ${by + .2} Z`, '#fff');
  else if (o.expression === 'rire') bouche = P(`M${-8 + dx} ${by - 1.4} C${-4 + dx} ${by + .6} ${4 + dx} ${by + .6} ${8 + dx} ${by - 1.4} C${6 + dx} ${by + 7} ${-6 + dx} ${by + 7} ${-8 + dx} ${by - 1.4} Z`, '#5a1d1a', 'stroke-width="1"') + F(`M${-6.4 + dx} ${by - .2} C${-3 + dx} ${by + 1.2} ${3 + dx} ${by + 1.2} ${6.4 + dx} ${by - .2} L${5.6 + dx} ${by + 1.8} C${2 + dx} ${by + 2.8} ${-2 + dx} ${by + 2.8} ${-5.6 + dx} ${by + 1.8} Z`, '#fff');
  else bouche = P(`M${-7.5 + dx} ${by} C${-4 + dx} ${by - 2.6} ${-1.4 + dx} ${by - 1.8} ${dx} ${by - 1.2} C${1.4 + dx} ${by - 1.8} ${4 + dx} ${by - 2.6} ${7.5 + dx} ${by} C${4 + dx} ${by + 3.6} ${-4 + dx} ${by + 3.6} ${-7.5 + dx} ${by} Z`, lv, 'stroke-width="1"') + Li(`M${-7.2 + dx} ${by} C${-3 + dx} ${by + 1} ${3 + dx} ${by + 1} ${7.2 + dx} ${by}`, .9);
  const joues = o.joues === false ? '' : `<ellipse cx="${n(-12 + dx, 2)}" cy="8" rx="5" ry="3.2" fill="#E0605A" opacity=".28"/><ellipse cx="${n(12 + dx, 2)}" cy="8" rx="5" ry="3.2" fill="#E0605A" opacity=".28"/>`;
  const rides = o.age ? Li(`M${-9 + dx} 9 C${-10 + dx} 13 ${-9 + dx} 16 ${-7 + dx} 18 M${9 + dx} 9 C${10 + dx} 13 ${9 + dx} 16 ${7 + dx} 18 M-7 -19 Q0 -21 7 -19`, .8, T, 'opacity=".5"') : '';
  return { oreilles, peau: peau + ombre, traits: joues + rides + oeil(-9.5 + dx, -1) + oeil(9.5 + dx, 1) + sourcils + nez + bouche, contour: cont, pe };
}

// ---------- pièces communes ----------
// cou : attaché sous la mâchoire et évasé jusqu'à l'encolure (pas de rectangle posé sous la tête)
const cou = (pe, l = 10, bas = 46) => P(`M${-l} 14 C${-l} 26 ${-l - 1} ${bas - 12} ${-l - 6} ${bas} L${l + 6} ${bas} C${l + 1} ${bas - 12} ${l} 26 ${l} 14 Z`, pe.p) + F(`M${l} 18 C${l} 28 ${l + 1} ${bas - 12} ${l + 6} ${bas} L${l - 2} ${bas} C${l - 3} 34 ${l - 3} 26 ${l - 4} 20 Z`, pe.o, 'opacity=".6"');
// --- les mains, dessinées doigt par doigt ---
// poing qui serre un manche vertical (le manche passe en x = 0, derrière les doigts) ; s = 1 : poignet à gauche, pouce à droite
function poing(pe, s = 1) {
  let out = P(`M${-7 * s} -8.6 L${-15 * s} -7.4 L${-15.6 * s} 7.4 L${-7 * s} 8.6 Z`, pe.p);
  for (let i = 0; i < 4; i++) { const y = -8.4 + i * 4.2; out += P(`M${-8 * s} ${n(y, 2)} C${-10.6 * s} ${n(y + .6, 2)} ${-10.6 * s} ${n(y + 3.6, 2)} ${-8 * s} ${n(y + 4.2, 2)} L${7.4 * s} ${n(y + 4.2, 2)} C${9.6 * s} ${n(y + 3.8, 2)} ${10 * s} ${n(y + .4, 2)} ${7.4 * s} ${n(y, 2)} Z`, pe.p, 'stroke-width=".95"'); }
  return out + P(`M${4 * s} -8.6 C${9 * s} -12.4 ${14.6 * s} -10 ${13.6 * s} -5.4 C${12.8 * s} -2.4 ${8.6 * s} -1.6 ${5 * s} -3.6 Z`, pe.p, 'stroke-width=".95"');
}
// main en coupe sous une orbe (l'orbe est centrée en (0, -12)) : paume, bouts des doigts devant, pouce sur le côté
function paume(pe, s = 1) {
  let out = P('M-13 -3 C-14 5 -8 10 0 10 C8 10 14 5 13 -3 C8 1 -8 1 -13 -3 Z', pe.p);
  for (const x of [-7.5, -2.5, 2.5, 7.5]) out += P(`M${x - 2.6} -1.2 C${x - 2.8} -5.6 ${x + 2.8} -5.6 ${x + 2.6} -1.2 C${x + 1} .2 ${x - 1} .2 ${x - 2.6} -1.2 Z`, pe.p, 'stroke-width=".9"');
  return out + P(`M${-12 * s} -3 C${-17 * s} -7 ${-17 * s} -13 ${-13 * s} -14.6 C${-11 * s} -11 ${-10.6 * s} -7 ${-9 * s} -3.4 Z`, pe.p, 'stroke-width=".9"');
}
// main posée à plat (sur la poitrine, la ceinture) : doigts vers s
function mainPosee(pe, s = 1) {
  return P(`M${-11 * s} -6 C${-4 * s} -8.4 ${6 * s} -8.4 ${12 * s} -6 C${15.4 * s} -4.8 ${15.4 * s} -1.6 ${12.6 * s} -.8 C${15.6 * s} .6 ${15.2 * s} 3.6 ${12.2 * s} 4 C${14.4 * s} 5.6 ${13.2 * s} 8.8 ${9.6 * s} 8.4 C${3 * s} 8.6 ${-4 * s} 8 ${-11 * s} 6.4 Z`, pe.p)
    + Li(`M${3 * s} -3.6 L${12.4 * s} -3.4 M${3 * s} 1 L${12.6 * s} 1.6 M${3 * s} 5 L${10.6 * s} 6`, .8)
    + P(`M${-2 * s} -7.6 C${2 * s} -12 ${8 * s} -12.6 ${10 * s} -10 C${7 * s} -9 ${4 * s} -7.6 ${2 * s} -6 Z`, pe.p, 'stroke-width=".9"');
}
// main qui pince une tige (fleur, éventail) : trois doigts repliés, l'index allongé sur la tige
function pince(pe, s = 1) {
  let out = P(`M${-6 * s} -6 L${-13 * s} -5 L${-13.6 * s} 6 L${-6 * s} 7 Z`, pe.p);
  for (let i = 0; i < 3; i++) { const y = -4.4 + i * 4; out += P(`M${-7 * s} ${y} C${-9 * s} ${y + .6} ${-9 * s} ${y + 3.4} ${-7 * s} ${y + 4} L${6 * s} ${y + 4} C${8 * s} ${y + 3.6} ${8.4 * s} ${y + .4} ${6 * s} ${y} Z`, pe.p, 'stroke-width=".9"'); }
  return out + P(`M${-6 * s} -4.6 C${-4 * s} -12 ${0} -16 ${3 * s} -15.4 C${5 * s} -14.8 ${5 * s} -12.6 ${3.6 * s} -11 C${1.6 * s} -8.6 ${1 * s} -6.4 ${1 * s} -4.4 Z`, pe.p, 'stroke-width=".9"')
    + P(`M${4 * s} -4.4 C${8 * s} -7.6 ${12 * s} -6 ${11 * s} -2.4 C${10 * s} 0 ${7 * s} 0 ${5 * s} -1.4 Z`, pe.p, 'stroke-width=".9"');
}
const mainFine = pince;

// ermine : fond blanc et mouchetures noires
const hermine = (u) => `<pattern id="her${u}" width="14" height="16" patternUnits="userSpaceOnUse"><rect width="14" height="16" fill="${C.blanc}"/><path d="M7 4 C8.6 7 8.6 10 7 12.6 C5.4 10 5.4 7 7 4 Z" fill="${T}"/><circle cx="5" cy="3.4" r=".9" fill="${T}"/><circle cx="7" cy="2.4" r=".9" fill="${T}"/><circle cx="9" cy="3.4" r=".9" fill="${T}"/></pattern>`;
// étoffes : rayures, losanges, semis de points, fleurs de lys
const motifs = (u, f) => {
  const out = [];
  if (f.rayures) out.push(`<pattern id="ray${u}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${f.rayures[0]}"/><rect width="4" height="10" fill="${f.rayures[1]}"/></pattern>`);
  if (f.losanges) out.push(`<pattern id="los${u}" width="16" height="20" patternUnits="userSpaceOnUse"><rect width="16" height="20" fill="${f.losanges[0]}"/><path d="M8 0 L16 10 L8 20 L0 10 Z" fill="${f.losanges[1]}"/><path d="M8 3 L13.4 10 L8 17 L2.6 10 Z" fill="none" stroke="${T}" stroke-width=".7" opacity=".5"/></pattern>`);
  if (f.points) out.push(`<pattern id="pts${u}" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="${f.points[0]}"/><circle cx="3" cy="3" r="1.6" fill="${f.points[1]}"/><circle cx="9" cy="9" r="1.6" fill="${f.points[1]}"/></pattern>`);
  if (f.lys) out.push(`<pattern id="lys${u}" width="22" height="24" patternUnits="userSpaceOnUse"><rect width="22" height="24" fill="${f.lys[0]}"/><g transform="translate(11 12) scale(.42)" fill="${f.lys[1]}"><path d="M0 -14 C4 -9 4 -2 0 2 C-4 -2 -4 -9 0 -14 Z M0 2 C6 -6 14 -4 12 4 C8 0 4 2 2 6 Z M0 2 C-6 -6 -14 -4 -12 4 C-8 0 -4 2 -2 6 Z M-8 6 H8 V9 H-8 Z M0 9 L-3 15 H3 Z"/></g></pattern>`);
  if (f.chevrons) out.push(`<pattern id="che${u}" width="16" height="10" patternUnits="userSpaceOnUse"><rect width="16" height="10" fill="${f.chevrons[0]}"/><path d="M0 8 L8 2 L16 8" fill="none" stroke="${f.chevrons[1]}" stroke-width="3"/></pattern>`);
  return out.join('');
};
const remp = (u, nom) => `url(#${nom}${u})`;

// ---------- couronnes, coiffes ----------
// Toutes posées sur la tête : bandeau à y = -30 (haut du front), largeur 52
function couronne(type, u, o = {}) {
  const or = C.or, orF = C.orF, j1 = o.joyau || C.rougeH, j2 = o.joyau2 || C.bleu;
  const bandeau = P('M-27 -26 C-14 -31 14 -31 27 -26 L28 -16 C14 -21 -14 -21 -28 -16 Z', or) + Li('M-27 -24 C-14 -28.6 14 -28.6 27 -24', .7, orF)
    + `<ellipse cx="0" cy="-22.6" rx="3.6" ry="2.8" fill="${j1}" stroke="${T}" stroke-width=".8"/><ellipse cx="-15" cy="-21.6" rx="2.6" ry="2.2" fill="${j2}" stroke="${T}" stroke-width=".8"/><ellipse cx="15" cy="-21.6" rx="2.6" ry="2.2" fill="${j2}" stroke="${T}" stroke-width=".8"/>`;
  if (type === 'lys') { // trois fleurs de lys et deux pointes perlées
    const lys = (x, k) => Gt(`translate(${x} -28) scale(${k})`, P('M0 -26 C5 -20 5 -10 0 -5 C-5 -10 -5 -20 0 -26 Z', or) + P('M0 -6 C6 -16 16 -14 14 -4 C10 -9 5 -7 3 -2 Z', or) + P('M0 -6 C-6 -16 -16 -14 -14 -4 C-10 -9 -5 -7 -3 -2 Z', or));
    return P('M-26 -27 L-24 -40 L-20 -29 M20 -29 L24 -40 L26 -27', or) + lys(-15, .62) + lys(15, .62) + lys(0, .8) + rond(-24, -41, 2.2, C.blanc) + rond(24, -41, 2.2, C.blanc) + bandeau;
  }
  if (type === 'pointes') { // cinq pointes perlées
    const pts = [[-24, -44], [-12, -49], [0, -54], [12, -49], [24, -44]];
    return P('M-27 -27 L-24 -44 L-17 -33 L-12 -49 L-6 -34 L0 -54 L6 -34 L12 -49 L17 -33 L24 -44 L27 -27 Z', or) + Li('M-24 -44 L-21 -30 M-12 -49 L-10 -31 M0 -54 V-31 M12 -49 L10 -31 M24 -44 L21 -30', .7, orF) + pts.map(([x, y]) => rond(x, y, 2.6, C.blanc)).join('') + bandeau;
  }
  if (type === 'arceaux') { // couronne fermée : arceaux, globe et croix
    return P('M-26 -27 C-26 -42 26 -42 26 -27 Z', o.bonnet || C.rougeH) + P('M-26 -27 C-24 -40 -6 -44 0 -44 C-4 -38 -8 -33 -9 -27 Z', or) + P('M26 -27 C24 -40 6 -44 0 -44 C4 -38 8 -33 9 -27 Z', or) + P('M-3 -27 C-3 -36 -2 -41 0 -44 C2 -41 3 -36 3 -27 Z', or)
      + rond(0, -46.6, 3.2, or) + P('M-1.1 -55 H1.1 V-52.4 H3.8 V-50.4 H1.1 V-49.4 H-1.1 V-50.4 H-3.8 V-52.4 H-1.1 Z', or, 'stroke-width=".8"') + bandeau;
  }
  if (type === 'laurier') { // couronne de laurier en or
    const feuilles = [];
    for (let i = 0; i < 7; i++) {
      const t = i / 6, x = -27 + t * 54, y = -26 - Math.sin(t * Math.PI) * 5.4, a = -60 + t * 120;
      feuilles.push(Gt(`translate(${n(x, 2)} ${n(y, 2)}) rotate(${n(a, 1)})`, P('M0 0 C-4 -4 -3 -11 0 -14 C3 -11 4 -4 0 0 Z', or, 'stroke-width="1"') + Li('M0 -1 V-12', .6, orF)));
    }
    return P('M-28 -24 C-14 -30 14 -30 28 -24 L28 -20 C14 -26 -14 -26 -28 -20 Z', or) + feuilles.join('') + rond(0, -25, 3, C.rougeH);
  }
  if (type === 'diademe') { // dame : diadème fin en pointe
    return P('M-24 -25 C-12 -30 12 -30 24 -25 L20 -32 L12 -30 L6 -40 L0 -32 L-6 -40 L-12 -30 L-20 -32 Z', or) + `<ellipse cx="0" cy="-30" rx="3" ry="3.6" fill="${j1}" stroke="${T}" stroke-width=".8"/>` + rond(-6, -41, 1.8, C.blanc) + rond(6, -41, 1.8, C.blanc);
  }
  if (type === 'tiare') { // dame : petite couronne à fleurons
    return P('M-22 -27 C-10 -31 10 -31 22 -27 L24 -40 L14 -33 L7 -45 L0 -34 L-7 -45 L-14 -33 L-24 -40 Z', or) + rond(-24, -41.6, 2, C.blanc) + rond(24, -41.6, 2, C.blanc) + rond(-7, -46.6, 2, C.blanc) + rond(7, -46.6, 2, C.blanc) + `<ellipse cx="0" cy="-30.6" rx="2.6" ry="2.2" fill="${j1}" stroke="${T}" stroke-width=".8"/>`;
  }
  return bandeau;
}

// ---------- objets ----------
const sceptre = (h) => P(`M-2.2 0 H2.2 V${h} H-2.2 Z`, C.or) + Gt('translate(0 0)', P('M0 -20 C6 -14 6 -6 0 -2 C-6 -6 -6 -14 0 -20 Z', C.or) + P('M0 -6 C8 -14 16 -10 14 -2 C10 -6 5 -4 2 0 Z', C.or) + P('M0 -6 C-8 -14 -16 -10 -14 -2 C-10 -6 -5 -4 -2 0 Z', C.or) + P('M-7 0 H7 V4 H-7 Z', C.orF)) + P(`M-3.4 ${h * .55} H3.4 V${h * .55 + 4} H-3.4 Z`, C.orF);
const epee = (h) => P(`M-3.2 0 L0 ${-h} L3.2 0 Z`, C.grisC) + Li(`M0 -4 V${-h + 8}`, .8, C.gris) + P('M-14 0 C-10 -3 10 -3 14 0 C10 3 -10 3 -14 0 Z', C.or) + P('M-2.6 1 H2.6 V18 H-2.6 Z', C.rougeF) + rond(0, 21, 3.6, C.or);
const hache = (h) => P(`M-2.2 0 H2.2 V${h} H-2.2 Z`, '#8A5A2B') + Li(`M0 6 V${h - 4}`, .6, '#5E3A1A', 'opacity=".6"') + P('M2 4 C14 -2 24 8 23 26 C17 21 10 21 2 25 Z', C.grisC) + Li('M6 6 C14 4 20 12 20 22', .7, C.gris) + P('M-2 7 C-9 5 -13 10 -12 17 C-8 14 -5 14 -2 16 Z', C.grisC) + P('M-3 -2 L0 -12 L3 -2 Z', C.grisC);
const hallebarde = (h) => P(`M-2 0 H2 V${h} H-2 Z`, '#8A5A2B') + P('M0 -22 L4 -6 L-4 -6 Z', C.grisC) + P('M2 -4 C16 -10 24 -2 22 12 C16 6 10 6 2 8 Z', C.grisC) + P('M-2 -2 C-10 -6 -14 0 -12 6 C-8 4 -5 4 -2 6 Z', C.grisC) + P('M-4 -6 H4 V-2 H-4 Z', C.orF);
const orbe = () => rond(0, 0, 11, C.or) + Li('M-11 0 H11 M0 -11 V11', 1.2, C.orF) + P('M-1.4 -20 H1.4 V-16 H5 V-13.4 H1.4 V-11 H-1.4 V-13.4 H-5 V-16 H-1.4 Z', C.or, 'stroke-width=".9"') + rond(-3, -3, 1.8, '#fff8', false);
const rose = (c = C.rougeH) => Li('M0 0 C2 10 1 22 -1 32', 1.6, C.vertF) + P('M1 12 C8 8 12 12 12 16 C6 16 3 15 1 12 Z', C.vert, 'stroke-width="1"') + P('M0 20 C-7 16 -11 20 -11 24 C-5 24 -2 23 0 20 Z', C.vert, 'stroke-width="1"')
  + P('M0 -11 C7 -11 10 -6 9 -1 C8 4 3 6 0 6 C-3 6 -8 4 -9 -1 C-10 -6 -7 -11 0 -11 Z', c) + Li('M-5 -3 C-3 -7 3 -7 5 -3 M-3 1 C-1 -2 3 -1 4 2 M-6 1 C-6 4 -3 5 0 5', .9);
const tulipe = (c = C.or) => Li('M0 0 C-1 12 0 24 1 34', 1.6, C.vertF) + P('M0 18 C-8 10 -12 14 -12 22 C-6 20 -3 20 0 18 Z', C.vert, 'stroke-width="1"') + P('M-8 -12 C-9 -4 -6 2 0 3 C6 2 9 -4 8 -12 C5 -8 3 -8 2 -13 C0 -9 -2 -9 -2 -13 C-3 -8 -5 -8 -8 -12 Z', c);
const eventail = () => { let s = ''; for (let i = 0; i < 9; i++) { const a = -64 + i * 16; s += Gt(`rotate(${a})`, P('M-3.2 -2 L-4.6 -30 C-1.6 -32 1.6 -32 4.6 -30 L3.2 -2 Z', i % 2 ? C.rougeH : C.blanc, 'stroke-width=".9"')); } return s + rond(0, 0, 3, C.or); };
const torche = () => P('M-3 0 L-4 30 H4 L3 0 Z', '#8A5A2B') + P('M-6 -2 H6 V3 H-6 Z', C.orF) + P('M0 -26 C7 -18 9 -10 5 -3 C3 0 -3 0 -5 -3 C-9 -10 -6 -16 -2 -20 C-1 -16 1 -15 2 -17 C3 -20 2 -23 0 -26 Z', C.or) + P('M0 -15 C3 -11 4 -7 2 -4 C1 -3 -1 -3 -2 -4 C-4 -7 -2 -11 0 -15 Z', C.rougeH, 'stroke-width=".8"');
const fleche = (h) => P(`M-1.6 0 H1.6 V${h} H-1.6 Z`, '#8A5A2B') + P('M0 -16 L5 0 H-5 Z', C.grisC) + P(`M-1.6 ${h - 16} L-7 ${h - 4} L-1.6 ${h - 8} Z M1.6 ${h - 16} L7 ${h - 4} L1.6 ${h - 8} Z`, C.blanc, 'stroke-width=".9"');

// petite enseigne posée dans le champ de la figure (comme sur les cartes françaises)
const marque = (e, x, y, t = 22) => enseigne(e, x, y, t, `fill="${couleur(e)}"`);

// ---------- les trois silhouettes ----------
// Bras et mains devant la poitrine, comme sur les cartes traditionnelles ; l'objet passe dans la main qui le tient.

// silhouette de cheveux bouclés : contour festonné autour d'une ellipse (un seul chemin, pas de cercles empilés)
function festons(cx, cy, rx, ry, nb, amp, a0 = 0, a1 = 360) {
  const pts = [];
  for (let i = 0; i <= nb; i++) {
    const a = (a0 + (a1 - a0) * i / nb) * Math.PI / 180, am = (a0 + (a1 - a0) * (i + .5) / nb) * Math.PI / 180;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, cx + Math.cos(am) * (rx + amp), cy + Math.sin(am) * (ry + amp)]);
  }
  let d = `M${n(pts[0][0], 2)} ${n(pts[0][1], 2)}`;
  for (let i = 0; i < nb; i++) { const [, , mx, my] = pts[i], [x2, y2] = pts[i + 1]; d += ` Q${n(mx, 2)} ${n(my, 2)} ${n(x2, 2)} ${n(y2, 2)}`; }
  return d + ' Z';
}
// plume d'autruche : tige courbe et barbes
function plume(x0, y0, x1, y1, cx, cy, coul) {
  const d = `M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`;
  const contour = `M${x0} ${y0} Q${cx - 4} ${cy - 10} ${x1} ${y1} Q${cx + 6} ${cy + 6} ${x0 + 2} ${y0 + 3} Z`;
  let barbes = '';
  for (let i = 1; i < 9; i++) { const t = i / 9, x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1; barbes += `M${n(x, 2)} ${n(y, 2)} l${n(-3 + t * 2, 2)} ${n(-5 + t, 2)}`; }
  return P(contour, coul, 'stroke-width="1"') + Li(d, .9) + Li(barbes, .7, T, 'opacity=".55"');
}

function roi(f, e, u) {
  const v = visage(f.visage), pe = v.pe, hx = 118, hy = 63, k = 1.1;
  const hc = CHEVEUX[f.cheveux] || CHEVEUX.brun;
  const [c1, c2, c3] = f.habit; // manteau, robe et manches, galons
  const arriere = f.chauve ? '' : P('M-24 -20 C-34 -6 -34 16 -31 32 C-28 42 -20 47 -11 45 L-12 28 C-20 22 -22 4 -20 -12 Z', hc) + P('M24 -20 C34 -6 34 16 31 32 C28 42 20 47 11 45 L12 28 C20 22 22 4 20 -12 Z', hc)
    + Li('M-28 -2 C-30 10 -29 22 -25 32 M-23 4 C-25 14 -24 24 -21 32 M28 -2 C30 10 29 22 25 32 M23 4 C25 14 24 24 21 32', .8, T, 'opacity=".45"');
  const barbes = {
    pleine: P('M-21 2 C-23 18 -16 36 -6 44 C-2 47 2 47 6 44 C16 36 23 18 21 2 C18 13 12 21 6 24 C3 21 -3 21 -6 24 C-12 21 -18 13 -21 2 Z', hc) + Li('M-15 20 C-13 28 -10 35 -6 40 M15 20 C13 28 10 35 6 40 M-6 28 C-5 34 -3 39 -1 43 M6 28 C5 34 3 39 1 43', .8, T, 'opacity=".45"'),
    longue: P('M-21 2 C-24 22 -18 46 -8 60 C-4 66 0 70 0 70 C0 70 4 66 8 60 C18 46 24 22 21 2 C18 13 12 21 6 24 C3 21 -3 21 -6 24 C-12 21 -18 13 -21 2 Z', hc) + Li('M-15 22 C-13 34 -9 46 -4 57 M15 22 C13 34 9 46 4 57 M-6 30 C-5 42 -3 52 -1 62 M6 30 C5 42 3 52 1 62', .8, T, 'opacity=".45"'),
    fourchue: P('M-21 2 C-24 20 -18 40 -10 52 L-4 60 L0 50 L4 60 L10 52 C18 40 24 20 21 2 C18 13 12 21 6 24 C3 21 -3 21 -6 24 C-12 21 -18 13 -21 2 Z', hc) + Li('M-14 22 C-12 32 -9 42 -6 50 M14 22 C12 32 9 42 6 50 M-4 30 L-3 46 M4 30 L3 46', .8, T, 'opacity=".45"'),
    courte: P('M-20 4 C-21 16 -14 28 -5 31 C-2 32 2 32 5 31 C14 28 21 16 20 4 C17 13 12 20 6 23 C3 20 -3 20 -6 23 C-12 20 -17 13 -20 4 Z', hc) + Li('M-12 22 C-10 26 -7 29 -4 30 M12 22 C10 26 7 29 4 30', .8, T, 'opacity=".4"'),
  };
  const moustache = P('M0 15.6 C-3 13.4 -9 13.4 -13 18.4 C-9 17.6 -4 17.8 0 18.6 C4 17.8 9 17.6 13 18.4 C9 13.4 3 13.4 0 15.6 Z', hc, 'stroke-width="1"');
  const tete = Gt(`translate(${hx} ${hy}) scale(${k})`, arriere + cou(pe, 10, 50) + v.oreilles + v.peau + v.traits + (barbes[f.barbe] || barbes.pleine) + moustache + couronne(f.couronne, u, f));
  // manteau, robe à motif, galons, ceinture
  const manteau = P(`M${hx - 88} 151 C${hx - 88} 126 ${hx - 76} 110 ${hx - 54} 103 C${hx - 40} 99 ${hx - 26} 98 ${hx - 14} 99 L${hx + 14} 99 C${hx + 26} 98 ${hx + 40} 99 ${hx + 54} 103 C${hx + 76} 110 ${hx + 88} 126 ${hx + 88} 151 Z`, c1)
    + Li(`M${hx - 76} 118 C${hx - 70} 128 ${hx - 68} 140 ${hx - 68} 151 M${hx + 76} 118 C${hx + 70} 128 ${hx + 68} 140 ${hx + 68} 151`, .9, T, 'opacity=".45"');
  const robe = P(`M${hx - 26} 151 L${hx - 17} 102 L${hx + 17} 102 L${hx + 26} 151 Z`, f.motif ? remp(u, f.motif) : c2) + Li(`M${hx - 17.4} 104 L${hx - 25} 151 M${hx + 17.4} 104 L${hx + 25} 151`, 3.2, c3) + Li(`M${hx - 24.6} 145 H${hx + 24.6}`, 3.6, C.orF);
  const col = P(`M${hx - 64} 110 C${hx - 52} 99 ${hx - 30} 96 ${hx - 13} 100 L${hx + 13} 100 C${hx + 30} 96 ${hx + 52} 99 ${hx + 64} 110 C${hx + 68} 118 ${hx + 64} 125 ${hx + 56} 127 C${hx + 44} 123 ${hx + 30} 125 ${hx + 17} 131 L${hx} 119 L${hx - 17} 131 C${hx - 30} 125 ${hx - 44} 123 ${hx - 56} 127 C${hx - 64} 125 ${hx - 68} 118 ${hx - 64} 110 Z`, remp(u, 'her'));
  // avant-bras : sortent de l'hermine et ramènent les mains devant la poitrine
  const manche = (s) => P(`M${hx + s * 62} 122 C${hx + s * 61} 137 ${hx + s * 50} 146 ${hx + s * 37} 145 L${hx + s * 33} 129 C${hx + s * 41} 129 ${hx + s * 48} 125 ${hx + s * 52} 118 Z`, c2) + P(`M${hx + s * 39} 128.6 L${hx + s * 33} 129.4 L${hx + s * 36.4} 145.4 L${hx + s * 42} 144.8 Z`, c3) + Li(`M${hx + s * 58} 126 C${hx + s * 56} 134 ${hx + s * 50} 140 ${hx + s * 44} 142`, .8, T, 'opacity=".45"');
  // main droite (à gauche de l'image) : l'objet levé
  let droite = '';
  if (f.objet === 'epee') droite = Gt(`translate(${hx - 28} 125)`, epee(104)) + Gt(`translate(${hx - 28} 136)`, poing(pe, 1));
  else if (f.objet === 'hache') droite = Gt(`translate(${hx - 28} 137) rotate(-16)`, Gt('translate(0 -92)', hache(112)) + poing(pe, 1));
  else droite = Gt(`translate(${hx - 28} 137) rotate(-14)`, Gt('translate(0 -82)', sceptre(104)) + poing(pe, 1));
  // main gauche : orbe, parchemin ou main posée sur la poitrine
  let gauche = '';
  if (f.gauche === 'orbe') gauche = Gt(`translate(${hx + 30} 126)`, orbe()) + Gt(`translate(${hx + 30} 138)`, paume(pe, -1));
  else if (f.gauche === 'parchemin') gauche = Gt(`translate(${hx + 30} 128) rotate(-20)`, P('M-10 -16 H10 V12 H-10 Z', C.creme) + P('M-12 -20 C-14 -20 -14 -14 -12 -14 H12 C14 -14 14 -20 12 -20 Z', C.creme) + P('M-12 10 C-14 10 -14 16 -12 16 H12 C14 16 14 10 12 10 Z', C.creme) + Li('M-6 -8 H6 M-6 -3 H6 M-6 2 H4', .8, T, 'opacity=".5"') + rond(0, 18, 3.4, C.rougeH)) + Gt(`translate(${hx + 32} 138)`, mainPosee(pe, -1));
  else gauche = Gt(`translate(${hx + 30} 132)`, mainPosee(pe, -1));
  return `<defs>${hermine(u)}${motifs(u, f.motifs || {})}</defs>${manteau}${robe}${manche(-1)}${manche(1)}${col}${tete}${droite}${gauche}`;
}

function dame(f, e, u) {
  const v = visage({ ...f.visage, cils: true, large: 21, machoire: 13.5, menton: 4 }), pe = v.pe, hx = 118, hy = 60, k = 1.1;
  const hc = CHEVEUX[f.cheveux] || CHEVEUX.brun;
  const [c1, c2, c3] = f.habit;
  const meches = (d) => Li(d, .8, T, 'opacity=".45"');
  const coiffures = {
    longs: { dos: P('M-24 -18 C-36 0 -34 30 -40 58 C-32 64 -20 62 -14 56 C-16 40 -16 24 -18 10 C-20 0 -21 -8 -19 -14 Z M24 -18 C36 0 34 30 40 58 C32 64 20 62 14 56 C16 40 16 24 18 10 C20 0 21 -8 19 -14 Z', hc) + meches('M-30 6 C-31 24 -32 40 -35 54 M-25 14 C-26 30 -24 44 -24 56 M30 6 C31 24 32 40 35 54 M25 14 C26 30 24 44 24 56'),
      front: P('M-22 -8 C-25 -26 -13 -35 0 -35 C14 -35 25 -26 22 -8 C19 -19 11 -25 1 -24 C1 -28 0 -31 -1 -33 C-2 -29 -4 -26 -6 -24 C-13 -22 -19 -17 -22 -8 Z', hc) + meches('M-1 -33 C-3 -27 -8 -24 -14 -21 M3 -30 C6 -26 12 -23 18 -18') },
    boucles: { dos: P(festons(0, 6, 36, 44, 26, 5, 0, 360), hc) + meches('M-28 -10 c-3 3 -1 7 3 6 M-31 8 c-3 3 -1 7 3 6 M-29 26 c-3 3 -1 7 3 6 M28 -10 c3 3 1 7 -3 6 M31 8 c3 3 1 7 -3 6 M29 26 c3 3 1 7 -3 6 M-12 -32 c-1 -3 3 -5 5 -2 M8 -33 c1 -3 5 -2 4 1'),
      front: P('M-22 -8 C-26 -28 -10 -38 2 -37 C17 -37 27 -26 22 -8 C19 -15 14 -20 8 -21 C6 -17 2 -16 -1 -19 C-4 -15 -9 -15 -11 -19 C-16 -17 -20 -13 -22 -8 Z', hc) + meches('M-14 -28 c-2 3 0 6 3 5 M2 -32 c-2 3 0 6 3 5 M14 -26 c-2 3 0 6 3 5') },
    chignon: { dos: P('M-14 -38 C-14 -50 14 -50 14 -38 C14 -30 -14 -30 -14 -38 Z', hc) + meches('M-10 -40 C-5 -46 5 -46 10 -40 M-8 -35 C-3 -40 4 -40 9 -35') + P('M-23 -14 C-28 0 -27 12 -22 20 L-16 16 C-20 6 -21 -4 -19 -12 Z M23 -14 C28 0 27 12 22 20 L16 16 C20 6 21 -4 19 -12 Z', hc),
      front: P('M-22 -8 C-24 -28 -10 -36 1 -36 C14 -36 24 -28 22 -8 C17 -19 10 -23 1 -22 C-8 -23 -16 -19 -22 -8 Z', hc) + meches('M-16 -22 C-10 -28 -2 -30 4 -29 M6 -28 C12 -26 16 -22 19 -16') },
    tresses: { dos: P('M-24 -14 C-30 0 -30 14 -26 22 L-18 18 C-21 6 -21 -4 -19 -12 Z M24 -14 C30 0 30 14 26 22 L18 18 C21 6 21 -4 19 -12 Z', hc)
      + P('M-27 18 C-31 32 -29 46 -31 62 C-27 64 -22 64 -20 62 C-22 46 -20 32 -18 18 Z M27 18 C31 32 29 46 31 62 C27 64 22 64 20 62 C22 46 20 32 18 18 Z', hc)
      + Li('M-30 26 L-19 31 M-30 36 L-19 41 M-30 46 L-20 51 M-30 56 L-21 60 M30 26 L19 31 M30 36 L19 41 M30 46 L20 51 M30 56 L21 60', .8, T, 'opacity=".55"') + rond(-25.6, 63, 2.6, C.or) + rond(25.6, 63, 2.6, C.or),
      front: P('M-22 -9 C-23 -27 -11 -35 1 -35 C14 -35 24 -27 22 -9 C19 -20 10 -25 1 -23 C-8 -25 -17 -20 -22 -9 Z', hc) + meches('M1 -34 C1 -30 1 -27 1 -23 M-6 -32 C-10 -28 -15 -24 -18 -18 M8 -32 C12 -28 16 -24 19 -18') },
  };
  const cf = coiffures[f.coiffure] || coiffures.longs;
  const voile = f.voile ? P('M-28 -24 C-40 2 -46 36 -54 66 L-34 62 C-30 34 -26 8 -22 -16 Z M28 -24 C40 2 46 36 54 66 L34 62 C30 34 26 8 22 -16 Z', f.voile) + Li('M-38 20 C-40 34 -42 46 -45 58 M38 20 C40 34 42 46 45 58', .8, T, 'opacity=".35"') : '';
  const perles = f.collier === false ? '' : Array.from({ length: 13 }, (_, i) => { const t = i / 12, x = -15 + t * 30, y = 40 + Math.sin(t * Math.PI) * 7; return rond(x, y, 1.75, C.blanc); }).join('') + P('M0 46 L3.4 50 L0 55 L-3.4 50 Z', f.pendentif || C.rougeH, 'stroke-width=".8"');
  const boucles = P('M-21.4 11 C-23 13 -23 17 -21.4 19 C-19.8 17 -19.8 13 -21.4 11 Z', C.or, 'stroke-width=".8"') + P('M21.4 11 C19.8 13 19.8 17 21.4 19 C23 17 23 13 21.4 11 Z', C.or, 'stroke-width=".8"');
  const derriere = Gt(`translate(${hx} ${hy}) scale(${k})`, voile + cf.dos);
  const tete = Gt(`translate(${hx} ${hy}) scale(${k})`, cou(pe, 8.6, 46) + v.oreilles + v.peau + cf.front + v.traits + boucles + perles + couronne(f.couronne || 'diademe', u, f));
  // décolleté carré : la peau de la gorge, puis la robe
  const gorge = P(`M${hx - 21} 98 L${hx + 21} 98 L${hx + 18} 114 L${hx - 18} 114 Z`, pe.p);
  const robe = P(`M${hx - 70} 151 C${hx - 70} 128 ${hx - 62} 112 ${hx - 46} 106 L${hx - 22} 101 L${hx - 18} 114 L${hx + 18} 114 L${hx + 22} 101 L${hx + 46} 106 C${hx + 62} 112 ${hx + 70} 128 ${hx + 70} 151 Z`, c1)
    + P(`M${hx - 18} 114 L${hx + 18} 114 L${hx + 11} 151 L${hx - 11} 151 Z`, f.motif ? remp(u, f.motif) : c2) + Li(`M${hx - 18} 114 L${hx - 11} 151 M${hx + 18} 114 L${hx + 11} 151`, 2.4, c3) + Li(`M${hx - 19} 113.6 H${hx + 19}`, 3, c3)
    + Li(`M${hx - 60} 124 C${hx - 56} 134 ${hx - 54} 142 ${hx - 54} 151 M${hx + 60} 124 C${hx + 56} 134 ${hx + 54} 142 ${hx + 54} 151`, .9, T, 'opacity=".45"');
  // manches bouffantes aux épaules, crevées de la couleur du galon
  const bouffant = (s) => P(`M${hx + s * 44} 104 C${hx + s * 62} 98 ${hx + s * 75} 108 ${hx + s * 73} 124 C${hx + s * 71} 133 ${hx + s * 60} 135 ${hx + s * 52} 128 C${hx + s * 47} 120 ${hx + s * 45} 112 ${hx + s * 44} 104 Z`, c2)
    + Li(`M${hx + s * 54} 104 C${hx + s * 60} 110 ${hx + s * 62} 118 ${hx + s * 60} 128 M${hx + s * 64} 104 C${hx + s * 69} 110 ${hx + s * 70} 118 ${hx + s * 67} 128`, 2.2, c3);
  // bras gauche de l'image : l'avant-bras remonte, la main tient l'objet devant la poitrine
  const brasA = P(`M${hx - 70} 128 C${hx - 66} 142 ${hx - 52} 147 ${hx - 38} 141 L${hx - 36} 128 C${hx - 46} 131 ${hx - 54} 128 ${hx - 58} 122 Z`, c1) + P(`M${hx - 41} 127 C${hx - 36} 124 ${hx - 32} 125 ${hx - 31} 129 L${hx - 33} 142 C${hx - 36} 144 ${hx - 40} 143 ${hx - 42} 141 Z`, C.blanc, 'stroke-width="1"');
  // bras droit de l'image : l'avant-bras passe devant la taille, la main se pose
  const brasB = P(`M${hx + 70} 130 C${hx + 68} 144 ${hx + 56} 150 ${hx + 40} 149 L${hx + 36} 137 C${hx + 46} 137 ${hx + 54} 133 ${hx + 58} 126 Z`, c1) + P(`M${hx + 41} 136 L${hx + 35} 137 L${hx + 36} 149.6 L${hx + 42} 149.4 Z`, C.blanc, 'stroke-width="1"');
  let objet;
  if (f.objet === 'eventail') objet = Gt(`translate(${hx - 26} 128) rotate(-14)`, Gt('translate(0 -2)', eventail()) + pince(pe, 1));
  else if (f.objet === 'sceptre') objet = Gt(`translate(${hx - 26} 134) rotate(-18)`, Gt('translate(0 -74)', sceptre(96)) + poing(pe, 1));
  else if (f.objet === 'tulipe') objet = Gt(`translate(${hx - 26} 134) rotate(-8)`, Gt('translate(0 -30)', tulipe(f.fleur)) + pince(pe, 1));
  else objet = Gt(`translate(${hx - 26} 134) rotate(-8)`, Gt('translate(0 -30)', rose(f.fleur)) + pince(pe, 1));
  const mainB = Gt(`translate(${hx + 28} 143)`, mainPosee(pe, -1));
  return `<defs>${motifs(u, f.motifs || {})}</defs>${derriere}${gorge}${robe}${bouffant(-1)}${bouffant(1)}${tete}${brasB}${mainB}${brasA}${objet}`;
}

function valet(f, e, u) {
  const v = visage({ ...f.visage, large: 21, machoire: 14, menton: 5 }), pe = v.pe, hx = 112, hy = 63, k = 1.08;
  const hc = CHEVEUX[f.cheveux] || CHEVEUX.chatain;
  const [c1, c2, c3] = f.habit;
  const meches = (d) => Li(d, .8, T, 'opacity=".45"');
  const coupes = {
    court: P('M-22 -6 C-25 -24 -12 -34 2 -33 C16 -33 25 -24 22 -6 C20 -14 16 -18 10 -19 C4 -16 -6 -16 -12 -20 C-17 -16 -20 -12 -22 -6 Z', hc) + meches('M-14 -26 C-8 -22 0 -21 6 -24 M8 -28 C12 -24 16 -20 19 -14'),
    carre: P('M-24 -10 C-27 -28 -12 -36 2 -35 C17 -35 27 -26 24 -10 C26 2 26 12 23 19 C20 16 19 10 19 4 C18 -4 16 -10 13 -15 C6 -12 -2 -14 -8 -18 C-12 -14 -16 -10 -18 -4 C-19 4 -19 12 -22 18 C-25 12 -26 2 -24 -10 Z', hc) + meches('M-21 -4 C-21 4 -21 10 -22 16 M21 -4 C21 4 21 10 22 16 M-6 -28 C-2 -24 4 -22 10 -22'),
    boucle: P(festons(0, -12, 24, 20, 14, 4.6, 180, 360), hc) + P('M-23 -10 C-26 -2 -25 6 -22 10 L-20 -2 Z M23 -10 C26 -2 25 6 22 10 L20 -2 Z', hc) + meches('M-12 -28 c-2 3 0 6 3 5 M4 -31 c-2 3 0 6 3 5 M16 -24 c-2 3 0 6 3 5'),
    long: P('M-23 -8 C-27 -27 -12 -35 2 -34 C17 -34 27 -26 23 -8 C25 8 27 24 30 34 C24 36 20 32 18 26 C20 12 18 0 14 -12 C6 -14 -5 -14 -13 -17 C-17 -8 -19 8 -16 26 C-18 32 -24 36 -30 34 C-27 24 -25 8 -23 -8 Z', hc) + meches('M-24 4 C-24 16 -25 26 -28 33 M24 4 C24 16 25 26 28 33 M-4 -30 C0 -26 6 -24 12 -24'),
  };
  // col : fraise plissée, col plat, ou capuchon rabattu sur les épaules (le visage reste libre)
  let col;
  if (f.col === 'fraise') { const pl = []; for (let i = 0; i < 10; i++) { const x = -27 + i * 6; pl.push(P(`M${x} 41 C${x + 1} 34.6 ${x + 6} 34.6 ${x + 7} 41 C${x + 6} 47.4 ${x + 1} 47.4 ${x} 41 Z`, C.blanc, 'stroke-width=".95"')); } col = pl.join(''); }
  else if (f.col === 'capuchon') col = P('M-34 34 C-34 22 -24 18 -14 24 C-8 30 8 30 14 24 C24 18 34 22 34 34 C30 46 14 52 0 52 C-14 52 -30 46 -34 34 Z', f.chapeau || c2) + Li('M-26 30 C-16 40 16 40 26 30', .9, T, 'opacity=".5"');
  else col = P('M-25 37 C-12 31 12 31 25 37 L21 47 C9 41 -9 41 -21 47 Z', C.blanc);
  const chapeaux = {
    beret: P('M-30 -24 C-30 -40 4 -50 30 -42 C40 -36 36 -26 26 -22 C10 -19 -16 -19 -30 -24 Z', f.chapeau || c1) + P('M-29 -24 C-12 -18 14 -18 28 -22 L27.4 -17 C12 -13 -12 -13 -29 -19 Z', c3) + Li('M-14 -38 C0 -44 14 -44 24 -40', .8, T, 'opacity=".45"') + plume(22, -34, 62, -52, 46, -56, f.plume || C.blanc),
    toque: P('M-24 -20 C-26 -44 24 -50 28 -22 C18 -16 -14 -16 -24 -20 Z', f.chapeau || c1) + P('M-27 -22 C-14 -16 16 -16 30 -22 L30 -16 C16 -10 -14 -10 -27 -16 Z', c3) + Li('M-8 -42 C-8 -32 -8 -26 -8 -18 M6 -44 C6 -34 6 -26 6 -18', .8, T, 'opacity=".4"') + plume(16, -40, 50, -54, 38, -58, f.plume || C.or),
    bords: P('M-44 -20 C-30 -30 30 -32 46 -20 C40 -14 -38 -14 -44 -20 Z', f.chapeau || c1) + P('M-22 -22 C-24 -40 22 -44 24 -22 Z', f.chapeau || c1) + P('M-23 -25 C-8 -21 8 -21 23 -25 L23 -21 C8 -17 -8 -17 -23 -21 Z', c3) + plume(18, -32, 54, -48, 40, -54, f.plume || C.or),
    calot: P('M-24 -22 C-24 -40 20 -44 25 -24 C14 -19 -14 -19 -24 -22 Z', f.chapeau || c1) + P('M-26 -23 C-12 -18 14 -18 27 -24 L27 -19 C14 -14 -12 -14 -26 -18 Z', c3) + plume(-14, -34, -44, -50, -30, -54, f.plume || C.rougeH),
    aucun: '',
  };
  const moustache = f.moustache ? P('M0 15.6 C-3 14 -8 14 -11 17.4 C-7 17 -4 17.2 0 18 C4 17.2 7 17 11 17.4 C8 14 3 14 0 15.6 Z', hc, 'stroke-width=".9"') : '';
  const taches = f.rousseur ? [[-12, 4], [-9, 7], [-14, 8], [11, 4], [14, 7], [9, 8]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".85" fill="#A0522D" opacity=".75"/>`).join('') : '';
  const boucleO = f.boucle ? P('M-21.4 11 C-23 13 -23 17 -21.4 19 C-19.8 17 -19.8 13 -21.4 11 Z', C.or, 'stroke-width=".8"') : '';
  const capuchonDos = f.col === 'capuchon' ? P('M-30 30 C-40 10 -34 -16 0 -18 C34 -16 40 10 30 30 Z', f.chapeau || c2) : '';
  const tete = Gt(`translate(${hx} ${hy}) scale(${k})`, capuchonDos + cou(pe, 9.4, 44) + col + v.oreilles + v.peau + taches + (coupes[f.coupe] || coupes.court) + v.traits + moustache + boucleO + (chapeaux[f.chapeauType] ?? chapeaux.beret));
  // pourpoint ajusté à boutons, manches à crevés
  const pourpoint = P(`M${hx - 72} 151 C${hx - 72} 128 ${hx - 64} 112 ${hx - 44} 106 L${hx - 15} 101 L${hx + 15} 101 L${hx + 44} 106 C${hx + 64} 112 ${hx + 72} 128 ${hx + 72} 151 Z`, f.motif ? remp(u, f.motif) : c1)
    + P(`M${hx - 15} 101 L${hx + 15} 101 L${hx + 10} 151 L${hx - 10} 151 Z`, c2) + [111, 121, 131, 141].map((y) => rond(hx, y, 2.3, C.or)).join('');
  const epaule = (s) => P(`M${hx + s * 44} 105 C${hx + s * 60} 102 ${hx + s * 70} 112 ${hx + s * 69} 124 C${hx + s * 62} 127 ${hx + s * 54} 124 ${hx + s * 49} 118 C${hx + s * 47} 113 ${hx + s * 45} 109 ${hx + s * 44} 105 Z`, c2) + Li(`M${hx + s * 52} 106 C${hx + s * 58} 112 ${hx + s * 60} 118 ${hx + s * 58} 125 M${hx + s * 61} 106 C${hx + s * 66} 112 ${hx + s * 67} 118 ${hx + s * 65} 125`, 2, c3);
  // bras droit de l'image : tient l'arme, verticale, loin du coin ; bras gauche : main sur la ceinture
  const brasArme = P(`M${hx + 72} 128 C${hx + 72} 142 ${hx + 64} 148 ${hx + 54} 146 L${hx + 50} 131 C${hx + 56} 130 ${hx + 61} 126 ${hx + 64} 120 Z`, c2) + P(`M${hx + 56} 130.2 L${hx + 50} 131 L${hx + 53} 146 L${hx + 59} 145.4 Z`, C.blanc, 'stroke-width="1"');
  const brasHanche = P(`M${hx - 72} 130 C${hx - 70} 144 ${hx - 58} 150 ${hx - 44} 149 L${hx - 40} 138 C${hx - 48} 138 ${hx - 56} 134 ${hx - 60} 126 Z`, c2) + P(`M${hx - 45} 137.4 L${hx - 39} 138 L${hx - 40} 149.6 L${hx - 46} 149.4 Z`, C.blanc, 'stroke-width="1"');
  let arme;
  const xa = hx + 46, ya = 138;
  if (f.objet === 'hache') arme = Gt(`translate(${xa} ${ya})`, Gt('translate(0 -100)', hache(118)) + poing(pe, -1));
  else if (f.objet === 'fleche') arme = Gt(`translate(${xa} ${ya})`, Gt('translate(0 -112)', fleche(126)) + poing(pe, -1));
  else if (f.objet === 'torche') arme = Gt(`translate(${xa} ${ya})`, Gt('translate(0 -44)', torche()) + poing(pe, -1));
  else arme = Gt(`translate(${xa} ${ya})`, Gt('translate(0 -110)', hallebarde(124)) + poing(pe, -1));
  const mainH = Gt(`translate(${hx - 32} 143)`, mainPosee(pe, 1));
  return `<defs>${motifs(u, f.motifs || {})}</defs>${pourpoint}${epaule(-1)}${epaule(1)}${tete}${brasHanche}${mainH}${brasArme}${arme}`;
}

// ---------- les 12 personnages ----------
export const FIGURES = {
  // Rois
  RS: { rang: 'R', visage: { peau: 'claire', yeux: 'bleu', sourcils: '#E9E5DD', age: true, severe: true, tourne: .3 }, cheveux: 'blanc', barbe: 'longue', couronne: 'pointes', objet: 'epee', gauche: 'orbe', habit: [C.bleu, C.rougeH, C.or], motif: 'los', motifs: { losanges: [C.rougeH, C.or] } },
  RH: { rang: 'R', visage: { peau: 'brune', yeux: 'brun', sourcils: '#221B17', tourne: -.3, expression: 'sourire' }, cheveux: 'noir', barbe: 'pleine', couronne: 'lys', objet: 'sceptre', gauche: 'main', habit: [C.rougeH, C.or, C.bleu], motif: 'lys', motifs: { lys: [C.bleu, C.or] } },
  RD: { rang: 'R', visage: { peau: 'olive', yeux: 'noisette', sourcils: '#7a3a1a', tourne: .4, nez: 'aquilin' }, cheveux: 'roux', barbe: 'fourchue', couronne: 'laurier', objet: 'hache', gauche: 'orbe', habit: [C.vertF, C.or, C.rougeH], motif: 'che', motifs: { chevrons: [C.or, C.rougeH] } },
  RC: { rang: 'R', visage: { peau: 'foncee', yeux: 'brun', sourcils: '#BDB7AE', age: true, tourne: -.2 }, cheveux: 'gris', barbe: 'courte', couronne: 'arceaux', objet: 'sceptre', gauche: 'parchemin', habit: [C.nuit, C.rougeH, C.or], motif: 'pts', motifs: { points: [C.rougeH, C.or] } },
  // Dames
  DS: { rang: 'D', visage: { peau: 'claire', yeux: 'vert', sourcils: '#6b2a18', tourne: .3 }, cheveux: 'auburn', coiffure: 'tresses', couronne: 'tiare', objet: 'sceptre', habit: [C.bleu, C.rougeH, C.or], motif: 'los', motifs: { losanges: [C.nuit, C.or] } },
  DH: { rang: 'D', visage: { peau: 'foncee', yeux: 'brun', sourcils: '#1a1310', tourne: -.2, expression: 'sourire' }, cheveux: 'noir', coiffure: 'boucles', couronne: 'diademe', objet: 'rose', habit: [C.nuit, C.rougeH, C.or], motif: 'lys', motifs: { lys: [C.rougeH, C.or] } },
  DD: { rang: 'D', visage: { peau: 'doree', yeux: 'noir', sourcils: '#221B17', tourne: .2 }, cheveux: 'noir', coiffure: 'longs', couronne: 'tiare', objet: 'eventail', voile: C.blanc, habit: [C.rougeH, C.or, C.vertF], motif: 'pts', motifs: { points: [C.or, C.rougeH] } },
  DC: { rang: 'D', visage: { peau: 'brune', yeux: 'noisette', sourcils: '#221B17', tourne: -.3 }, cheveux: 'brun', coiffure: 'chignon', couronne: 'diademe', objet: 'tulipe', fleur: C.or, habit: [C.vertF, C.or, C.rougeH], motif: 'ray', motifs: { rayures: [C.or, C.rougeH] }, pendentif: C.vert },
  // Valets
  VS: { rang: 'V', visage: { peau: 'rosee', yeux: 'bleu', sourcils: '#9a7a3a', tourne: .3 }, cheveux: 'blond', coupe: 'carre', chapeauType: 'beret', chapeau: C.nuit, plume: C.blanc, objet: 'hallebarde', col: 'fraise', habit: [C.bleu, C.rougeH, C.or], motif: 'ray', motifs: { rayures: [C.bleu, C.nuit] } },
  VH: { rang: 'V', visage: { peau: 'foncee', yeux: 'brun', sourcils: '#1a1310', tourne: -.3, expression: 'rire' }, cheveux: 'noir', coupe: 'court', chapeauType: 'toque', chapeau: C.rougeH, plume: C.or, objet: 'hache', col: 'plat', habit: [C.rougeH, C.or, C.nuit], motif: 'che', motifs: { chevrons: [C.rougeH, C.or] } },
  VD: { rang: 'V', visage: { peau: 'olive', yeux: 'noir', sourcils: '#221B17', tourne: .3 }, cheveux: 'noir', coupe: 'boucle', moustache: true, boucle: true, chapeauType: 'bords', chapeau: C.nuit, plume: C.or, objet: 'torche', col: 'fraise', habit: [C.vertF, C.or, C.rougeH], motif: 'pts', motifs: { points: [C.vertF, C.or] } },
  VC: { rang: 'V', visage: { peau: 'claire', yeux: 'vert', sourcils: '#8a3a1a', tourne: -.2, expression: 'sourire' }, cheveux: 'roux', coupe: 'long', rousseur: true, chapeauType: 'calot', col: 'plat', chapeau: C.vertF, plume: C.rougeH, objet: 'fleche', habit: [C.or, C.vertF, C.rougeH], motif: 'los', motifs: { losanges: [C.or, C.vertF] } },
};

export function demiFigure(def, e, u) {
  if (!def) return '';
  return def.rang === 'R' ? roi(def, e, u) : def.rang === 'D' ? dame(def, e, u) : valet(def, e, u);
}

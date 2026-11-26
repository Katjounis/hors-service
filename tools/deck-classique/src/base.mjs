// Deck « Classique » des cartes communes (S-006) : gabarit, coins, enseignes, cartes à chiffres, as et dos.
// Carte de 250 × 350 (5 × 7), comme dans l'appli. Les coins gardent la place et la taille des cartes de l'appli.
import G from './glyphes.json' with { type: 'json' };

export const L = 250, H = 350, R = 22;
export const n = (v, d = 1) => Number(Number(v).toFixed(d));

// Couleurs du deck : celles de la charte de l'appli, plus l'or et les teintes des figures
export const C = {
  papier: '#FBF7EF', encre: '#1B1814', rouge: '#C8102E',
  bleu: '#2B4C9B', nuit: '#1D2440', or: '#E7B43A', orF: '#A9771A', orC: '#F6DA86',
  rougeH: '#C42A2A', rougeF: '#8E1B1E', vert: '#2F7D4F', vertF: '#1E5A3D', blanc: '#FFFDF7', creme: '#F3E7CC',
  gris: '#8F8A82', grisC: '#D9D4CB',
};
export const ROUGE = { H: true, D: true, S: false, C: false };
export const NOM_ENSEIGNE = { H: 'cœur', D: 'carreau', S: 'pique', C: 'trèfle' };
export const NOM_RANG = { A: 'As', R: 'Roi', D: 'Dame', V: 'Valet' };
export const RANGS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'D', 'R'];
export const ENSEIGNES_ORDRE = ['S', 'H', 'D', 'C'];
export const couleur = (e) => (ROUGE[e] ? C.rouge : C.encre);

// Les quatre enseignes telles que l'appli les dessine (boîte de 24 × 24)
export const ENSEIGNES = {
  H: 'M12 21.6 C5 16 1.4 12.3 1.4 7.9 C1.4 4.6 3.9 2.4 6.8 2.4 C9 2.4 11 3.7 12 5.8 C13 3.7 15 2.4 17.2 2.4 C20.1 2.4 22.6 4.6 22.6 7.9 C22.6 12.3 19 16 12 21.6 Z',
  D: 'M12 1.2 C14.4 4.8 17.4 8.6 20.6 12 C17.4 15.4 14.4 19.2 12 22.8 C9.6 19.2 6.6 15.4 3.4 12 C6.6 8.6 9.6 4.8 12 1.2 Z',
  S: 'M12 1.4 C9.2 5.8 2.4 9.4 2.4 14 C2.4 16.9 4.6 18.7 7 18.7 C8.8 18.7 10.2 17.9 11 16.7 C10.8 19.1 10 20.8 8.2 22.6 L15.8 22.6 C14 20.8 13.2 19.1 13 16.7 C13.8 17.9 15.2 18.7 17 18.7 C19.4 18.7 21.6 16.9 21.6 14 C21.6 9.4 14.8 5.8 12 1.4 Z',
  C: 'M12 1.8 C14.6 1.8 16.6 3.8 16.6 6.4 C16.6 7.3 16.4 8.1 16 8.8 C16.6 8.6 17.2 8.5 17.8 8.5 C20.4 8.5 22.4 10.5 22.4 13.1 C22.4 15.7 20.4 17.7 17.8 17.7 C16.2 17.7 14.8 16.9 13.9 15.7 C14 18.5 14.9 20.6 16.6 22.6 L7.4 22.6 C9.1 20.6 10 18.5 10.1 15.7 C9.2 16.9 7.8 17.7 6.2 17.7 C3.6 17.7 1.6 15.7 1.6 13.1 C1.6 10.5 3.6 8.5 6.2 8.5 C6.8 8.5 7.4 8.6 8 8.8 C7.6 8.1 7.4 7.3 7.4 6.4 C7.4 3.8 9.4 1.8 12 1.8 Z',
};
// enseigne centrée en (cx, cy), dans une boîte de taille t
export const enseigne = (e, cx, cy, t, attrs = '') => `<path d="${ENSEIGNES[e]}" transform="translate(${n(cx - t / 2, 2)} ${n(cy - t / 2, 2)}) scale(${n(t / 24, 4)})" ${attrs}/>`;

// --- texte en contours (police Alfa Slab One de l'appli, devenue des chemins) ---
export const largeur = (s, taille, espace = 0) => { let w = 0; for (const ch of s) w += (G.g[ch] ? G.g[ch].a : 500); return (w * taille) / G.upm + espace * (s.length - 1); };
export function texte(s, x, y, taille, attrs = '', espace = 0) {
  const k = taille / G.upm; let x0 = x - largeur(s, taille, espace) / 2; const out = [];
  for (const ch of s) { const g = G.g[ch]; if (g && g.d) out.push(`<path transform="translate(${n(x0, 2)} ${n(y, 2)}) scale(${n(k, 4)} ${n(-k, 4)})" d="${g.d}"/>`); x0 += (g ? g.a : 500) * k + espace; }
  return `<g ${attrs}>${out.join('')}</g>`;
}

// --- coin : valeur au-dessus de l'enseigne, centrées sur le même axe (comme les cartes de l'appli) ---
export function coin(rang, e, avecOnglet = false) {
  const large = rang.length > 1, coul = couleur(e);
  const onglet = avecOnglet ? `<path d="M10 10 H${large ? 78 : 70} V108 Q${large ? 78 : 70} 122 ${large ? 64 : 56} 122 H10 Z" fill="${C.papier}"/>`
    + `<path d="M${large ? 78 : 70} 24 V108 Q${large ? 78 : 70} 122 ${large ? 64 : 56} 122 H24" fill="none" stroke="${C.encre}" stroke-width="1.4"/>` : '';
  // le « 10 » est resserré pour rester dans la largeur des autres coins (sa colonne d'enseignes passe à côté)
  return onglet + texte(rang, 41, 66, large ? 48 : 60, `fill="${coul}"`, large ? -6 : 0) + enseigne(e, 41, 98, 36, `fill="${coul}"`);
}

// --- dispositions traditionnelles des enseignes (2 à 10) ---
// Trois colonnes (gauche, centre, droite) et des rangées régulières ; la moitié basse est tournée de 180°.
export const PIP = { t: 42, xg: 90, xc: 125, xd: 160, haut: 58, bas: 292 };
export function dispositions(v) {
  const { xg, xc, xd, haut, bas } = PIP, m = (haut + bas) / 2;
  const r4 = [0, 1, 2, 3].map((i) => haut + (i * (bas - haut)) / 3); // quatre rangées égales
  const r3 = [haut, m, bas];
  const d = {
    2: [[xc, haut], [xc, bas]],
    3: [[xc, haut], [xc, m], [xc, bas]],
    4: [[xg, haut], [xd, haut], [xg, bas], [xd, bas]],
    5: [[xg, haut], [xd, haut], [xc, m], [xg, bas], [xd, bas]],
    6: r3.flatMap((y) => [[xg, y], [xd, y]]),
    7: [...r3.flatMap((y) => [[xg, y], [xd, y]]), [xc, (r3[0] + r3[1]) / 2]],
    8: [...r3.flatMap((y) => [[xg, y], [xd, y]]), [xc, (r3[0] + r3[1]) / 2], [xc, (r3[1] + r3[2]) / 2]],
    9: [...r4.flatMap((y) => [[xg, y], [xd, y]]), [xc, m]],
    10: [...r4.flatMap((y) => [[xg, y], [xd, y]]), [xc, (r4[0] + r4[1]) / 2], [xc, (r4[2] + r4[3]) / 2]],
  }[v];
  return d.map(([x, y]) => ({ x: n(x, 2), y: n(y, 2), bas: y > m + 0.5 }));
}
export function enseignes(v, e) {
  const coul = couleur(e);
  return dispositions(v).map((p) => `<g transform="translate(${p.x} ${p.y})${p.bas ? ' rotate(180)' : ''}">${enseigne(e, 0, 0, PIP.t, `fill="${coul}"`)}</g>`).join('');
}

// --- l'as : une grande enseigne ornée ---
export function as(e) {
  const coul = couleur(e), t = e === 'S' ? 156 : 150, cy = e === 'S' ? 164 : 175;
  // filet clair à l'intérieur de la grande enseigne
  const filet = enseigne(e, 125, cy, t * 0.8, `fill="none" stroke="${C.papier}" stroke-width="${n(2.6 / (t * 0.8 / 24), 3)}"`);
  const fleuron = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})" fill="${coul}"><path d="M0 -10 C4.4 -4.4 4.4 4.4 0 10 C-4.4 4.4 -4.4 -4.4 0 -10 Z"/><path d="M0 -2 C6 -10 16 -9 18 -2 C11 -5 5 -3 0 1 Z"/><path d="M0 -2 C-6 -10 -16 -9 -18 -2 C-11 -5 -5 -3 0 1 Z"/><circle cy="13" r="2.2"/></g>`;
  // l'as de pique porte le nom du jeu à la place du fleuron du bas
  const ornements = fleuron(125, cy - t / 2 - 14, 0) + (e === 'S' ? '' : fleuron(125, cy + t / 2 + 14, 180));
  const marque = e === 'S' ? texte('HORS SERVICE', 125, 262, 12, `fill="${coul}"`, 1.2) : '';
  return ornements + enseigne(e, 125, cy, t, `fill="${coul}"`) + filet + marque;
}

// --- le dos, le même pour les 52 cartes ---
export function dos(u = 'd') {
  const motif = `<pattern id="treillis-${u}" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45 125 175)"><rect width="16" height="16" fill="${C.rougeF}"/><path d="M0 8 H16 M8 0 V16" stroke="${C.rougeH}" stroke-width="3.2"/><circle cx="8" cy="8" r="2.2" fill="${C.or}"/></pattern>`;
  return `<defs>${motif}</defs><rect width="${L}" height="${H}" rx="${R}" fill="${C.papier}"/>`
    + `<rect x="12" y="12" width="226" height="326" rx="13" fill="url(#treillis-${u})"/>`
    + `<rect x="12" y="12" width="226" height="326" rx="13" fill="none" stroke="${C.rougeF}" stroke-width="2"/>`
    + `<rect x="18" y="18" width="214" height="314" rx="9" fill="none" stroke="${C.or}" stroke-width="1.2"/>`
    + `<g transform="translate(125 175)"><ellipse rx="52" ry="38" fill="${C.papier}" stroke="${C.or}" stroke-width="3"/><ellipse rx="45" ry="31" fill="none" stroke="${C.rougeF}" stroke-width="1.2"/></g>`
    + texte('HS', 125, 189, 38, `fill="${C.rougeF}"`, 1);
}

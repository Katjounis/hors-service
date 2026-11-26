// Assemble les 52 cartes du deck « Classique » (cartes communes) et le dos.
import { L, H, R, C, n, coin, enseignes, as, dos, NOM_RANG, NOM_ENSEIGNE, RANGS, ENSEIGNES_ORDRE, enseigne, couleur } from './base.mjs';
import { FIGURES, demiFigure } from './figures.mjs';

export { RANGS, ENSEIGNES_ORDRE, NOM_RANG, NOM_ENSEIGNE };
let compteur = 0;
const uid = () => 'c' + (++compteur).toString(36);

export function nomCarte(rang, e) { return `${NOM_RANG[rang] || rang} de ${NOM_ENSEIGNE[e]}`; }

// Une figure : double portrait dans un cadre, la moitié basse est la moitié haute tournée de 180°.
function figure(rang, e, u) {
  const def = FIGURES[rang + e];
  const moitie = demiFigure(def, e, u);
  const cadre = `<rect x="24" y="24" width="202" height="302" rx="10" fill="${C.papier}" stroke="${C.encre}" stroke-width="1.6"/>`;
  const clip = `<clipPath id="m${u}"><rect x="24" y="24" width="202" height="151"/></clipPath>`;
  const haut = `<g clip-path="url(#m${u})"><g transform="translate(24 24)">${moitie}</g></g>`;
  const bas = `<g transform="rotate(180 125 175)">${haut}</g>`;
  const ligne = `<path d="M24 175 H226" stroke="${C.encre}" stroke-width="1.4"/>`;
  const filet = `<rect x="24" y="24" width="202" height="302" rx="10" fill="none" stroke="${C.encre}" stroke-width="1.6"/>`;
  return `<defs>${clip}</defs>${cadre}${haut}${bas}${ligne}${filet}`;
}

// recto complet, en SVG autonome (viewBox 250 × 350)
export function recto(rang, e, { autonome = false } = {}) {
  const u = uid();
  let centre, onglet = false;
  if (rang === 'A') centre = as(e);
  else if ('VDR'.includes(rang)) { centre = figure(rang, e, u); onglet = true; }
  else centre = enseignes(Number(rang), e);
  const coins = coin(rang, e, onglet) + `<g transform="rotate(180 125 175)">${coin(rang, e, onglet)}</g>`;
  return `<svg${autonome ? ' xmlns="http://www.w3.org/2000/svg"' : ''} viewBox="0 0 ${L} ${H}" role="img" aria-label="${nomCarte(rang, e)}"><defs><clipPath id="b${u}"><rect width="${L}" height="${H}" rx="${R}"/></clipPath></defs><g clip-path="url(#b${u})"><rect width="${L}" height="${H}" fill="${C.papier}"/>${centre}${coins}</g><rect x=".6" y=".6" width="${L - 1.2}" height="${H - 1.2}" rx="${R - .6}" fill="none" stroke="#00000022" stroke-width="1.2"/></svg>`;
}
export function verso({ autonome = false } = {}) {
  const u = uid();
  return `<svg${autonome ? ' xmlns="http://www.w3.org/2000/svg"' : ''} viewBox="0 0 ${L} ${H}" role="img" aria-label="Dos de carte"><defs><clipPath id="b${u}"><rect width="${L}" height="${H}" rx="${R}"/></clipPath></defs><g clip-path="url(#b${u})">${dos(u)}</g><rect x=".6" y=".6" width="${L - 1.2}" height="${H - 1.2}" rx="${R - .6}" fill="none" stroke="#00000022" stroke-width="1.2"/></svg>`;
}
export function toutes() {
  const out = [];
  for (const e of ENSEIGNES_ORDRE) for (const r of RANGS) out.push({ rang: r, e, nom: nomCarte(r, e) });
  return out;
}

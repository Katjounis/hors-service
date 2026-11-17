// Fabrique JSX de l'appli : celle de Preact, avec deux crochets sur les textes affichés.
//   window.HS_GENRE_TXT (genre.js) : accord des cartes au masculin ou au féminin
//   window.HS_TXT (textes.js) : version tout public (gorgées → pénalités) hors Version Adulte
// Branchée par build.mjs (jsxImportSource « hs-jsx »). Les tests compilent avec Preact directement.
import { jsx as pjsx, jsxs as pjsxs, jsxDEV as pjsxDEV, Fragment } from 'preact/jsx-runtime';

function hook(props) {
  if (typeof window === 'undefined' || !props || props.children == null) return props;
  if (window.HS_GENRE_TXT) props.children = window.HS_GENRE_TXT(props.children);
  if (window.HS_TXT) props.children = window.HS_TXT(props.children);
  return props;
}

export function jsx(type, props, ...rest) { return pjsx(type, hook(props || {}), ...rest); }
export function jsxs(type, props, ...rest) { return pjsxs(type, hook(props || {}), ...rest); }
export function jsxDEV(type, props, ...rest) { return pjsxDEV(type, hook(props || {}), ...rest); }
export { Fragment };

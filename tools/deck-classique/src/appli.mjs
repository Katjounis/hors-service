// Branchement du deck « Classique » (B-007) dans l'appli : devient le visage par défaut des cartes à jouer.
// Chaque carte .pc reçoit une image du recto (ou du dos) derrière ses coins, qui sont alors masqués.
// Un skin actif (data-skin, cartes-skins.js) passe devant et reprend la main.
// Sous 46 px de large, la carte garde le dessin simple de l'appli (le deck n'y est plus lisible).
import { recto, verso } from './deck.mjs';

const RANG = { K: 'R', Q: 'D', J: 'V', T: '10' };
const ENS = { '♠': 'S', '♥': 'H', '♦': 'D', '♣': 'C' };
const cache = new Map();
const url = (cle, svg) => {
  if (!cache.has(cle)) cache.set(cle, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg()));
  return cache.get(cle);
};
const imgDos = () => url('dos', () => verso({ autonome: true }));
const imgRecto = (r, e) => url(r + e, () => recto(r, e, { autonome: true }));

const CSS = `
.pc.pc-cl-on { isolation: isolate; }
.pc > .pc-cl { position: absolute; inset: 0; z-index: -1; display: block; overflow: hidden; border-radius: inherit; pointer-events: none; }
.pc > .pc-cl > img { display: block; width: 100%; height: 100%; }
.pc.pc-cl-on:not([data-skin]) { background: #FBF7EF; }
.pc.pc-cl-on.pc-back:not([data-skin]) { background: #8E1B1E; }
.pc.pc-cl-on:not([data-skin]) > .pc-corner, .pc.pc-cl-on:not([data-skin]) > .pc-mid, .pc.pc-cl-on:not([data-skin]) > .pc-pattern { visibility: hidden; }
.pc[data-skin] > .pc-cl { display: none; }
@container (max-width: 45px) {
  .pc > .pc-cl.pc-cl-face { display: none; }
  .pc.pc-cl-on:not([data-skin]) > .pc-corner, .pc.pc-cl-on:not([data-skin]) > .pc-mid { visibility: visible; }
}
`;

function lire(el) {
  if (el.classList.contains('pc-back')) return { cle: 'dos', src: imgDos, face: false };
  const m = /^\s*(10|[2-9AKQJTRDV])\s*([♠♥♦♣])/.exec(el.getAttribute('aria-label') || '');
  if (!m) return null;
  const r = RANG[m[1]] || m[1], e = ENS[m[2]];
  return { cle: r + e, src: () => imgRecto(r, e), face: true };
}

function couche(el) {
  for (const c of el.children) if (c.classList.contains('pc-cl')) return c;
  return null;
}

function poser(el) {
  const d = lire(el);
  let c = couche(el);
  if (!d) { if (c) c.remove(); on(el, false); return; }
  if (c && c.getAttribute('data-cl') === d.cle) { on(el, true); return; }
  if (!c) {
    c = document.createElement('span');
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = '<img alt="" draggable="false" decoding="async">';
    el.insertBefore(c, el.firstChild);
  }
  c.className = 'pc-cl ' + (d.face ? 'pc-cl-face' : 'pc-cl-dos');
  c.setAttribute('data-cl', d.cle);
  c.firstChild.src = d.src();
  on(el, true);
}

function on(el, v) { if (el.classList.contains('pc-cl-on') !== v) el.classList.toggle('pc-cl-on', v); }

const enAttente = new Set();
let raf = 0;
function vider() {
  raf = 0;
  enAttente.forEach((el) => { if (el.isConnected) poser(el); });
  enAttente.clear();
}
function noter(el) {
  enAttente.add(el);
  if (!raf) raf = requestAnimationFrame(vider);
}

function demarrer() {
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  document.querySelectorAll('.pc').forEach(poser);
  new MutationObserver((liste) => {
    for (const m of liste) {
      const t = m.target;
      if (t.nodeType !== 1) continue;
      if (m.type === 'attributes') { if (t.classList.contains('pc')) noter(t); continue; }
      if (t.closest && t.closest('.pc-cl, .pc-skin')) continue;
      if (t.classList.contains('pc')) noter(t);
      for (const a of m.addedNodes) {
        if (a.nodeType !== 1 || a.classList.contains('pc-cl') || a.classList.contains('pc-skin')) continue;
        if (a.classList.contains('pc')) noter(a);
        if (a.firstElementChild) a.querySelectorAll('.pc').forEach(noter);
      }
    }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-label', 'class'] });
}

globalThis.HS_DECK = { recto: imgRecto, dos: imgDos };
if (typeof document !== 'undefined') {
  if (document.body) demarrer();
  else document.addEventListener('DOMContentLoaded', demarrer);
}

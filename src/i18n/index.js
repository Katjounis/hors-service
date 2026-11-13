// Traduction anglaise par-dessus l'interface française, sans toucher aux composants :
// chaque texte affiché (nœuds texte et attributs lisibles) est remplacé par sa traduction si elle existe.
// • Dictionnaire exact (texte français normalisé → anglais), puis gabarits « Carte {0} / {1} ».
// • Le texte d'origine est gardé : repasser en français remet tout en place sans recharger.
// • Les champs de saisie, et tout ce qui est marqué translate="no" (codes, pseudos), ne sont jamais touchés.

let DICT = null;
let PATS = [];
let lang = 'fr';
let obs = null;
const KEY = 'hs:lang';
const ATTRS = ['aria-label', 'placeholder', 'title', 'alt'];
const orig = new WeakMap(); // nœud texte → { fr, en } ; pour les attributs : élément → { attr: { fr, en } }

const norm = (s) => s.replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();

export function loadLang() {
  try { const v = localStorage.getItem(KEY); if (v === 'en' || v === 'fr') return v; } catch (e) { /* stockage bloqué */ }
  return 'fr';
}

async function ensureDict() {
  if (DICT) return;
  const m = await import('./en.js');
  DICT = new Map();
  for (const [fr, en] of m.EN) DICT.set(norm(fr), en);
  PATS = [];
  for (const [fr, en] of m.EN) {
    if (!/\{\d\}/.test(fr)) continue;
    const parts = norm(fr).split(/(\{\d\})/);
    const order = [];
    const re = parts.map((p) => { const mm = p.match(/^\{(\d)\}$/); if (mm) { order.push(Number(mm[1])); return '(.*?)'; } return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('');
    PATS.push({ re: new RegExp(`^${re}$`), order, en });
  }
  // les gabarits les plus longs (les plus précis) d'abord
  PATS.sort((a, b) => b.re.source.length - a.re.source.length);
}

// traduit une chaîne entière ; null si rien à faire
export function tr(s, depth = 0) {
  if (!DICT || depth > 3) return null;
  const k = norm(s);
  if (!k || !/[A-Za-zÀ-ÿ]/.test(k)) return null;
  const hit = DICT.get(k);
  if (hit != null && !/\{\d\}/.test(k)) return hit;
  // « 3 gorgées », « 12 cartes »
  const num = k.match(/^(\d+(?:[.,]\d+)?) (.+)$/);
  if (num) { const t = DICT.get(num[2]); if (t != null) return `${num[1]} ${t}`; }
  for (const p of PATS) {
    const m = k.match(p.re);
    if (!m) continue;
    let out = p.en;
    p.order.forEach((idx, i) => {
      const g = m[i + 1];
      const t = tr(g, depth + 1);
      out = out.split(`{${idx}}`).join(t != null ? t : g);
    });
    return out;
  }
  return null;
}

const skipEl = (el) => !el || el.closest && el.closest('[translate="no"], input, textarea, script, style');

function doText(n) {
  const p = n.parentElement;
  if (skipEl(p)) return;
  const cur = n.data;
  const o = orig.get(n);
  if (o && cur === o.en) return;
  const en = tr(cur);
  if (en == null) { if (o) orig.delete(n); return; }
  const lead = cur.match(/^\s*/)[0];
  const trail = cur.match(/\s*$/)[0];
  const val = lead + en + trail;
  orig.set(n, { fr: cur, en: val });
  if (cur !== val) n.data = val;
}
function doAttrs(el) {
  if (skipEl(el.parentElement) && !ATTRS.some((a) => el.hasAttribute && el.hasAttribute(a))) return;
  if (el.closest && el.closest('[translate="no"]')) return;
  for (const a of ATTRS) {
    if (!el.hasAttribute || !el.hasAttribute(a)) continue;
    const cur = el.getAttribute(a);
    const rec = orig.get(el) || {};
    if (rec[a] && rec[a].en === cur) continue;
    const en = tr(cur);
    if (en == null) continue;
    rec[a] = { fr: cur, en };
    orig.set(el, rec);
    el.setAttribute(a, en);
  }
}
function walk(root) {
  if (root.nodeType === 3) { doText(root); return; }
  if (root.nodeType !== 1) return;
  doAttrs(root);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = tw.nextNode();
  while (n) { if (n.nodeType === 3) doText(n); else doAttrs(n); n = tw.nextNode(); }
}
function restore(root) {
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n = tw.nextNode();
  while (n) {
    const o = orig.get(n);
    if (o) {
      if (n.nodeType === 3) { if (n.data === o.en) n.data = o.fr; }
      else for (const a of Object.keys(o)) if (n.getAttribute(a) === o[a].en) n.setAttribute(a, o[a].fr);
      orig.delete(n);
    }
    n = tw.nextNode();
  }
}

function start() {
  walk(document.body);
  if (document.title) { const t = tr(document.title); if (t) document.title = t; }
  obs = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttrs(m.target);
      else for (const n of m.addedNodes) walk(n);
    }
  });
  obs.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

export async function setLang(l, save = true) {
  lang = l === 'en' ? 'en' : 'fr';
  if (save) { try { localStorage.setItem(KEY, lang); } catch (e) { /* stockage bloqué */ } }
  document.documentElement.lang = lang;
  if (lang === 'en') {
    await ensureDict();
    if (!obs) start();
  } else if (obs) {
    obs.disconnect();
    obs = null;
    restore(document.body);
  }
  for (const f of listeners) f(lang);
}
export const getLang = () => lang;
const listeners = new Set();
export function onLang(f) { listeners.add(f); return () => listeners.delete(f); }

// Petites fonctions utilitaires partagées.

const ALNUM = 'abcdefghijkmnopqrstuvwxyz23456789';
const CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sans I ni O (confusion avec 1 et 0)

export function rid(n = 10, alphabet = ALNUM) {
  let s = '';
  const buf = new Uint32Array(n);
  (globalThis.crypto || { getRandomValues: (a) => a.map(() => Math.random() * 2 ** 32) }).getRandomValues(buf);
  for (let i = 0; i < n; i++) s += alphabet[buf[i] % alphabet.length];
  return s;
}

export const partyCode = () => rid(4, CODE_LETTERS);
export const isPartyCode = (c) => typeof c === 'string' && /^[A-HJ-NP-Z]{4}$/.test(c);
export const normalizeCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z]/g, '').replace(/[IO]/g, '').slice(0, 4);

export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const plural = (n, one, many) => `${n} ${Math.abs(n) > 1 ? many : one}`;

export function parseJSON(s, fallback = null) {
  if (typeof s !== 'string') return fallback;
  try { return JSON.parse(s); } catch (e) { return fallback; }
}

export function clone(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }

// Stockage local tolérant aux erreurs (navigation privée, stockage bloqué…)
export function createStore(ns) {
  const key = (k) => `${ns}:${k}`;
  const mem = new Map();
  return {
    get(k, d = null) {
      try {
        const v = localStorage.getItem(key(k));
        if (v != null) return JSON.parse(v);
      } catch (e) { /* stockage indisponible */ }
      return mem.has(k) ? mem.get(k) : d;
    },
    set(k, v) {
      mem.set(k, v);
      try { localStorage.setItem(key(k), JSON.stringify(v)); } catch (e) { /* ignoré */ }
    },
    del(k) {
      mem.delete(k);
      try { localStorage.removeItem(key(k)); } catch (e) { /* ignoré */ }
    },
  };
}

// Émetteur d'événements minimal
export function emitter() {
  const subs = new Set();
  return {
    on(fn) { subs.add(fn); return () => subs.delete(fn); },
    emit(...a) { subs.forEach((fn) => { try { fn(...a); } catch (e) { console.error(e); } }); },
    get size() { return subs.size; },
  };
}

// Avatar : le portrait au feutre (voir ui/avatar.jsx),
// codé « couleur.expression.tête.visage.plus.coiffure.peau.cheveux.espèce ».
// Nombre de choix pour chaque partie :
// 12 réglages : les 3 derniers (détail du visage, tenue, bijou) valent 0 dans un ancien code
export const AV_COUNTS = [10, 8, 17, 10, 6, 22, 5, 12, 9, 13, 11, 7];
const AV_RE = /^\d{1,2}(\.\d{1,2}){4,11}$/;

function avHash(s) {
  let h = 7;
  for (const ch of String(s || '')) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return h;
}
// Ancien profil (emoji, picto, code à 5 parties) ou valeur inconnue : on complète avec un personnage stable.
export function avatarId(av) {
  if (typeof av === 'string' && AV_RE.test(av)) {
    const p = av.split('.').map(Number);
    if (p.every((x, i) => x < AV_COUNTS[i])) {
      if (p.length === AV_COUNTS.length) return av;
      const h = avHash(av);
      const fill = [(h >>> 3) % 8, (h >>> 7) % 5, (h >>> 11) % 6, 0];
      while (p.length < AV_COUNTS.length) p.push(p.length >= 5 && p.length < 9 ? fill[p.length - 5] : 0);
      return p.join('.');
    }
  }
  const h = avHash(av);
  return [h % 10, (h >>> 4) % 8, (h >>> 8) % 11, 0, 0, (h >>> 3) % 8, (h >>> 7) % 5, (h >>> 11) % 6, 0, 0, 0, 0].join('.');
}

export function sanitizeNick(s) {
  // supprime les caractères de contrôle et invisibles (espaces de largeur nulle, marques de direction…)
  const bad = new RegExp('[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2066-\\u2069\\ufeff]', 'g');
  return String(s || '').replace(bad, '').replace(/\s+/g, ' ').trim().slice(0, 16);
}

// Normalisation pour comparer des mots (accents, casse, espaces)
export function norm(s) {
  const accents = new RegExp('[\\u0300-\\u036f]', 'g');
  return String(s || '').toLowerCase().normalize('NFD').replace(accents, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

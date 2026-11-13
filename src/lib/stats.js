// Profils, stats, records et gages maison, entre copains.
// Tout reste dans le localStorage du téléphone : rien n'est envoyé nulle part.
import { createStore } from './util.js';
import { sipsOf } from '../core/host.js';

const store = createStore('hs');
const MAX_SOIREES = 30;
const keyOf = (nick) => String(nick || '').trim().toLowerCase();

export function loadStats() {
  const s = store.get('stats', null);
  return s && s.v === 1 && Array.isArray(s.soirees) ? s : { v: 1, soirees: [] };
}

// résumé d'une soirée à partir de l'état publié par l'hôte
export function summarize(S) {
  const ids = (S.order || []).filter((u) => S.roster && S.roster[u]);
  const players = ids.map((u) => {
    const t = (S.tally && S.tally[u]) || {};
    const r = S.roster[u];
    return {
      uid: u, nick: r.nick, av: r.av, drink: r.drink !== false, sob: r.sob, lim: r.lim,
      sips: sipsOf(S, u), given: t.g || 0, gages: t.c || 0, points: t.p || 0, passes: t.x || 0,
      cnt: (S.cnt && S.cnt[u]) || {}, best: (S.prec && S.prec[u]) || {},
    };
  });
  const rec = {};
  for (const [k, r] of Object.entries(S.rec || {})) if (r && S.roster[r.uid]) rec[k] = { nick: S.roster[r.uid].nick, av: S.roster[r.uid].av, v: r.v };
  const t0 = S.t0 || Date.now();
  return { id: `${S.code}-${t0}`, date: t0, minutes: Math.max(1, Math.round(((S.t || Date.now()) - t0) / 60000)), players, played: S.played || [], rec };
}

export function saveEvening(S, mode) {
  if (!S || !S.roster || !Object.keys(S.roster).length) return null;
  const sum = { ...summarize(S), mode };
  if (!sum.played.length) return null; // aucune partie lancée : rien à garder
  const st = loadStats();
  const i = st.soirees.findIndex((x) => x.id === sum.id);
  if (i >= 0) st.soirees[i] = sum; else st.soirees.unshift(sum);
  st.soirees = st.soirees.slice(0, MAX_SOIREES);
  store.set('stats', st);
  return sum;
}

export function clearStats() { store.del('stats'); }

// profils : cumul par pseudo sur l'historique (réutilisables pour ajouter vite un joueur)
export function profiles(st = loadStats()) {
  const out = {};
  for (const s of st.soirees.slice().reverse()) {
    for (const p of s.players) {
      const k = keyOf(p.nick);
      const o = out[k] || (out[k] = { nick: p.nick, soirees: 0, sips: 0, given: 0, gages: 0, points: 0, best: {} });
      Object.assign(o, { nick: p.nick, av: p.av, drink: p.drink, sob: p.sob, lim: p.lim, last: s.date });
      o.soirees += 1; o.sips += p.sips; o.given += p.given; o.gages += p.gages; o.points += p.points;
      for (const [rk, v] of Object.entries(p.best || {})) {
        const low = rk === 'degaine';
        if (o.best[rk] == null || (low ? v < o.best[rk] : v > o.best[rk])) o.best[rk] = v;
      }
    }
  }
  return Object.values(out).sort((a, b) => b.last - a.last);
}

// records de tous les temps sur ce téléphone
export const RECORDS = [
  { k: 'degaine', label: 'Dégaine : réflexe le plus rapide', unit: 'ms', low: true },
  { k: 'purple', label: 'Purple : plus longue série', unit: 'cartes' },
  { k: 'ware', label: 'Hors Service Ware : meilleure rafale', unit: 'micro-jeux' },
  { k: 'soif', label: 'Le plus de gorgées en une soirée', unit: 'gorgées' },
  { k: 'genereux', label: 'Le plus de gorgées distribuées en une soirée', unit: 'gorgées' },
];
export function allRecords(st = loadStats()) {
  const best = {};
  const take = (k, nick, v, date, low = false) => {
    if (!(v > 0)) return;
    const cur = best[k];
    if (!cur || (low ? v < cur.v : v > cur.v)) best[k] = { nick, v, date };
  };
  for (const s of st.soirees) {
    for (const [k, r] of Object.entries(s.rec || {})) take(k, r.nick, r.v, s.date, k === 'degaine');
    for (const p of s.players) { take('soif', p.nick, p.sips, s.date); take('genereux', p.nick, p.given, s.date); }
  }
  return best;
}

// ---------------------------------------------------------------- titres absurdes du récap
export function titles(sum) {
  const P = sum.players;
  const out = [];
  const used = new Set();
  const top = (score, min = 1) => {
    let best = null;
    for (const p of P) { const v = score(p); if (v >= min && (!best || v > best.v)) best = { p, v }; }
    return best;
  };
  const add = (title, b, detail) => { if (b && !used.has(b.p.uid) && out.length < 5) { used.add(b.p.uid); out.push({ title, p: b.p, detail: detail(b.v) }); } };
  const c = (p, k) => (p.cnt && p.cnt[k]) || 0;
  add('Ministre de la soif', top((p) => p.sips), (v) => `${v} gorgée${v > 1 ? 's' : ''} au compteur`);
  add('Radar à couleurs', top((p) => (p.best && p.best.purple) || 0, 3), (v) => `série de ${v} cartes à Purple`);
  add('Gâchette d’or', (() => { const r = sum.rec.degaine; const p = r && P.find((x) => x.nick === r.nick); return p ? { p, v: r.v } : null; })(), (v) => `${v} ms à Dégaine`);
  add('Main de beurre', top((p) => c(p, 'early') + c(p, 'wareLost') + c(p, 'boom') + c(p, 'purpleFail')), (v) => `${v} ratés mémorables`);
  add('Livre ouvert', top((p) => c(p, 'aveux'), 3), (v) => `${v} aveux à Je n’ai jamais`);
  add('Distributeur automatique', top((p) => p.given), (v) => `${v} gorgée${v > 1 ? 's' : ''} distribuée${v > 1 ? 's' : ''}`);
  add('Cerveau en surchauffe', top((p) => (p.best && p.best.ware) || 0, 3), (v) => `${v} micro-jeux d’affilée`);
  add('Saint patron des gages', top((p) => p.gages), (v) => `${v} gage${v > 1 ? 's' : ''} relevé${v > 1 ? 's' : ''}`);
  add('Roi de l’esquive', top((p) => p.passes), (v) => `${v} tour${v > 1 ? 's' : ''} passé${v > 1 ? 's' : ''}`);
  add('Comptable de la soirée', top((p) => p.points), (v) => `${v} point${v > 1 ? 's' : ''} de pénalité`);
  return out;
}

// MVP : gorgées distribuées, records tenus, duels gagnés, micro-jeux réussis (à égalité : le plus sobre)
export function mvp(sum) {
  let best = null;
  for (const p of sum.players) {
    const records = Object.values(sum.rec || {}).filter((r) => r.nick === p.nick).length;
    const c = p.cnt || {};
    const score = p.given + records * 5 + (c.duelWon || 0) * 2 + (c.wareWin || 0) * 0.5;
    if (!best || score > best.score || (score === best.score && p.sips < best.p.sips)) best = { p, score, records };
  }
  return best;
}

// ---------------------------------------------------------------- gages maison
export function loadGages() {
  const g = store.get('gages', []);
  return Array.isArray(g) ? g.filter((x) => typeof x === 'string' && x.trim()).slice(0, 200) : [];
}
export function saveGages(list) {
  store.set('gages', [...new Set(list.map((x) => String(x).trim().slice(0, 140)).filter(Boolean))].slice(0, 200));
}
export function gagesOn() { return store.get('gagesOn', true) !== false; }
export function setGagesOn(v) { store.set('gagesOn', !!v); }

const toB64url = (bytes) => { let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64url = (str) => { const s = atob(str.replace(/-/g, '+').replace(/_/g, '/')); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; };

// lien d'export : les gages sont dans l'adresse elle-même (après #gages=), compressés si le navigateur sait le faire
export async function gagesLink(list) {
  const bytes = new TextEncoder().encode(JSON.stringify({ v: 1, g: list }));
  let data = `j.${toB64url(bytes)}`;
  if (typeof CompressionStream !== 'undefined') {
    const z = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
    data = `z.${toB64url(z)}`;
  }
  const here = typeof location !== 'undefined' ? `${location.origin}${location.pathname}` : '';
  return `${here}#gages=${data}`;
}
export async function readGagesLink(text) {
  const m = String(text || '').match(/#?gages=([jz])\.([A-Za-z0-9_-]+)/);
  if (!m) return null;
  try {
    let bytes = fromB64url(m[2]);
    if (m[1] === 'z') bytes = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    const obj = JSON.parse(new TextDecoder().decode(bytes));
    return Array.isArray(obj.g) ? obj.g.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim().slice(0, 140)).slice(0, 200) : null;
  } catch (e) { return null; }
}

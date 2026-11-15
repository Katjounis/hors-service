// Surnoms gagnés pendant la soirée : un surnom par record, au seul détenteur, au-delà d'un seuil.
import { sipsOf } from '../core/host.js';

const DEFS = [
  ['L’Éponge', (S, t, u) => sipsOf(S, u), 8],
  ['Le Bourreau', (S, t) => t.g || 0, 6],
  ['La Poule mouillée', (S, t) => t.x || 0, 2],
  ['Le Siphon', (S, t) => t.cs || 0, 2],
  ['Le Cascadeur', (S, t) => t.c || 0, 3],
];

export function surnoms(S) {
  const out = {};
  if (!S || !S.tally) return out;
  const uids = Object.keys(S.roster || {});
  for (const [name, f, min] of DEFS) {
    let best = null; let n = 0; let tie = false;
    for (const u of uids) {
      const v = f(S, S.tally[u] || {}, u);
      if (v > n) { n = v; best = u; tie = false; } else if (v === n && v > 0) tie = true;
    }
    if (best && n >= min && !tie && !out[best]) out[best] = name;
  }
  return out;
}

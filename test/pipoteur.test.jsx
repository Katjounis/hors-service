// Pipoteur : familles de mots, niveaux Soft / HARD / Cul, pas de doublon dans une soirée.
import { NIVEAUX_MOTS, combos } from '../src/content/mots.js';
import { pickWords, resetUsed, levelAllowed } from '../src/games/pipoteur.jsx';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };

for (const [lv, n] of Object.entries(NIVEAUX_MOTS)) {
  ok(n.list.length >= (lv === 'soft' ? 60 : 40), `${lv} : assez de familles (${n.list.length})`);
  for (const [h, v] of n.list) {
    ok(v.length >= 4 && v.length <= 6, `${lv} ${h} : 4 à 6 voisins`);
    ok(v.every(([w, p]) => w && w !== h && (p === 1 || p === 2)), `${lv} ${h} : voisins valides`);
  }
}
ok(!levelAllowed('hard', 3, false) && !levelAllowed('cul', 2, true) && levelAllowed('cul', 3, true) && levelAllowed('soft', 1, false), 'verrou 18+ et limites');

// tirage : les deux mots viennent toujours de la même famille et du même niveau, dans les deux sens
resetUsed();
const fam = new Map();
for (const lv of Object.keys(NIVEAUX_MOTS)) for (const [h, v] of NIVEAUX_MOTS[lv].list) fam.set(`${lv}|${h}`, v.map((x) => x[0]));
let swapped = 0;
const seen = new Set();
const total = combos('soft', 2).length;
let dup = 0;
for (let i = 0; i < total; i++) {
  const w = pickWords(['soft'], 2);
  ok(w.lv === 'soft', 'niveau soft');
  const headCivil = fam.has(`soft|${w.civil}`) && fam.get(`soft|${w.civil}`).includes(w.pipo);
  const headPipo = fam.has(`soft|${w.pipo}`) && fam.get(`soft|${w.pipo}`).includes(w.civil);
  ok(headCivil || headPipo, `même famille : ${w.civil} / ${w.pipo}`);
  if (headPipo && !headCivil) swapped++;
  const k = [w.civil, w.pipo].sort().join('|');
  if (seen.has(k)) dup++;
  seen.add(k);
}
ok(dup === 0, `aucun doublon sur ${total} tirages (${dup})`);
ok(swapped > total * 0.3, 'le mot de tête tombe aussi chez le pipoteur');
// mélange de niveaux
resetUsed();
const lvs = new Set();
for (let i = 0; i < 200; i++) lvs.add(pickWords(['hard', 'cul'], 2).lv);
ok(lvs.has('hard') && lvs.has('cul') && !lvs.has('soft'), 'HARD + Cul mélangés, sans Soft');
// proximité 1 seulement
resetUsed();
const close = new Set(combos('soft', 1).map((x) => [x.a, x.b].sort().join('|')));
let far = 0;
for (let i = 0; i < 100; i++) { const w = pickWords(['soft'], 1); if (!close.has([w.civil, w.pipo].sort().join('|'))) far++; }
ok(far === 0, 'mode « Proches » : uniquement les voisins de proximité 1');

console.log(`\n${pass} vérifications réussies, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);

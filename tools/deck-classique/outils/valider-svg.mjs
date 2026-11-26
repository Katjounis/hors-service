// Vérifie que chaque carte est un SVG autonome bien formé (comme il sera chargé en image)
// Usage : node outils/valider-svg.mjs <dossier de sortie> (puis un contrôle XML, par exemple xmllint --noout *.svg)
import fs from 'node:fs';
const { recto, verso, toutes } = await import('../src/deck.mjs');
const dossier = process.argv[2] || 'svg';
fs.mkdirSync(dossier, { recursive: true });
let i = 0;
for (const c of toutes()) fs.writeFileSync(`${dossier}/${String(i++).padStart(2, '0')}-${c.rang}${c.e}.svg`, recto(c.rang, c.e, { autonome: true }));
fs.writeFileSync(`${dossier}/dos.svg`, verso({ autonome: true }));

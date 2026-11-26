// Planches de contrôle : node outils/planche.mjs <sortie.png> <largeur carte> <liste|tout|figures|chiffres> [echelle]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const { recto, verso, RANGS, ENSEIGNES_ORDRE } = await import('../src/deck.mjs');
const [,, sortie, largeur = '200', quoi = 'tout', echelle = '1'] = process.argv;
let cartes = [];
if (quoi === 'tout') { for (const e of ENSEIGNES_ORDRE) for (const r of RANGS) cartes.push([r, e]); cartes.push(['dos']); }
else if (quoi === 'figures') { for (const e of ENSEIGNES_ORDRE) for (const r of ['R', 'D', 'V']) cartes.push([r, e]); }
else if (quoi === 'chiffres') { for (const r of ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10']) cartes.push([r, 'H']); cartes.push(['10', 'S'], ['9', 'C'], ['8', 'D'], ['A', 'S']); }
else cartes = quoi.split(',').map((s) => s === 'dos' ? ['dos'] : [s.slice(0, -1), s.slice(-1)]);
const svgs = cartes.map(([r, e]) => r === 'dos' ? verso() : recto(r, e));
const html = `<!doctype html><html><body style="margin:0;background:#1E5A3D;padding:14px;display:flex;flex-wrap:wrap;gap:12px;width:${Math.min(cartes.length, quoi === 'tout' ? 14 : 6) * (Number(largeur) + 12) + 16}px">${svgs.map((s) => `<div style="width:${largeur}px;height:${largeur * 1.4}px;filter:drop-shadow(0 3px 5px rgba(0,0,0,.35))">${s.replace('<svg', '<svg width="100%" height="100%"')}</div>`).join('')}</body></html>`;
const b = await chromium.launch();
const p = await b.newPage({ deviceScaleFactor: Number(echelle), viewport: { width: 1600, height: 1000 } });
const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
await p.setContent(html); await p.waitForTimeout(300);
await (await p.$('body')).screenshot({ path: sortie });
console.log(sortie, cartes.length, 'cartes', erreurs.length ? 'ERREURS ' + erreurs.join(' | ') : '');
await b.close();

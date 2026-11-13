// Fabrique les icônes PNG de l'appli (écran d'accueil, PWA, favicon) à partir de l'affichette « Hors service ».
//   node tools/icones.mjs  → src/icons/*.png
// Rendu par Chromium (Playwright) avec la vraie police Dela Gothic One, embarquée en base64.
import { createRequire } from 'node:module';
import { readFileSync, mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const font = readFileSync('src/fonts/dela-gothic-one-400.woff2').toString('base64');
mkdirSync('src/icons', { recursive: true });

// card : largeur de l'affichette en fraction du côté ; mini : version « HS » pour les très petites tailles
function page(size, { card = 0.8, mini = false } = {}) {
  const w = Math.round(size * card);
  const fs = mini ? Math.round(w * 0.5) : Math.round(w * 0.215);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:BS;font-weight:400;src:url(data:font/woff2;base64,${font}) format('woff2');}
html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:#1C1A17;}
.wrap{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;}
.card{position:relative;width:${w}px;background:#F2EADB;color:#22201C;border-radius:${Math.max(1, Math.round(w * 0.02))}px;
  transform:rotate(${mini ? -3 : -4}deg);padding:${Math.round(w * (mini ? 0.08 : 0.07))}px ${Math.round(w * 0.08)}px 0;box-sizing:border-box;}
.t{font:400 ${fs}px/.9 BS;text-transform:uppercase;letter-spacing:.01em;white-space:nowrap;}
.s{display:block;height:${Math.max(3, Math.round(w * (mini ? 0.16 : 0.11)))}px;margin:${Math.round(w * 0.06)}px -${Math.round(w * 0.08)}px 0;
  background:repeating-linear-gradient(-45deg,#FFD23F 0 ${Math.max(2, Math.round(w * 0.055))}px,#22201C ${Math.max(2, Math.round(w * 0.055))}px ${Math.max(4, Math.round(w * 0.11))}px);}
.tape{position:absolute;top:-${Math.round(w * 0.05)}px;width:${Math.round(w * 0.26)}px;height:${Math.round(w * 0.08)}px;background:rgba(217,208,189,.88);}
.tape.a{left:-${Math.round(w * 0.06)}px;transform:rotate(-30deg);} .tape.b{right:-${Math.round(w * 0.06)}px;transform:rotate(28deg);}
</style></head><body><div class="wrap"><div class="card">
${mini ? '' : '<i class="tape a"></i><i class="tape b"></i>'}
<div class="t">${mini ? 'HS' : 'Hors<br>service'}</div><i class="s"></i></div></div></body></html>`;
}

const OUT = [
  ['icon-512.png', 512, { card: 0.8 }],
  ['icon-192.png', 192, { card: 0.8 }],
  ['icon-maskable-512.png', 512, { card: 0.6 }], // zone sûre : l'affichette tient dans le cercle central
  ['apple-touch-icon.png', 180, { card: 0.78 }],
  ['favicon-32.png', 32, { card: 0.9, mini: true }],
];

const browser = await chromium.launch();
for (const [name, size, opt] of OUT) {
  const p = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await p.setContent(page(size, opt));
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: `src/icons/${name}`, clip: { x: 0, y: 0, width: size, height: size } });
  await p.close();
  console.log('icône', name, `${size}×${size}`);
}
await browser.close();

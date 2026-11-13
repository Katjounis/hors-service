// Vérifie la version GitHub Pages (dist/pages) comme un vrai site de projet servi sous /hors-service/ :
// console propre, aucune requête externe, manifeste + icônes, service worker, relance hors ligne,
// mémorisation de l'écran 18+, partie sur un seul téléphone sans réseau, ouverture directe du fichier.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const { chromium } = createRequire(import.meta.url)('playwright');
const SITE = process.env.HS_SITE || 'dist/pages';
const PORT = 5180;
const BASE = `http://localhost:${PORT}/hors-service/`;
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', webmanifest: 'application/manifest+json', png: 'image/png', md: 'text/markdown; charset=utf-8' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  if (!path.startsWith('/hors-service/')) { res.writeHead(404); res.end(); return; }
  let rel = path.slice('/hors-service/'.length) || 'index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  if (rel.includes('..') || !existsSync(`${SITE}/${rel}`)) { res.writeHead(404); res.end('absent'); return; }
  res.writeHead(200, { 'content-type': TYPES[rel.split('.').pop()] || 'application/octet-stream' });
  res.end(readFileSync(`${SITE}/${rel}`));
});
await new Promise((r) => server.listen(PORT, r));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
const problems = [];
const browser = await chromium.launch();

function watch(page, ctx, tag) {
  page.on('pageerror', (e) => problems.push(`${tag} erreur JS : ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') problems.push(`${tag} console ${m.type()} : ${m.text()}`); });
  page.on('requestfailed', (r) => { if (!r.url().startsWith('file:')) problems.push(`${tag} requête échouée : ${r.url()} (${r.failure() && r.failure().errorText})`); });
}

// ---------------------------------------------------------------- en ligne, sous-chemin GitHub Pages
console.log('Site GitHub Pages : chargement, manifeste, icônes');
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const external = [];
await ctx.route(/^https?:\/\/(?!localhost)/, (r) => { external.push(r.request().url()); r.abort(); });
const page = await ctx.newPage();
watch(page, ctx, '[site]');
await page.goto(BASE);
await page.getByRole('button', { name: 'J’ai 18 ans ou plus' }).waitFor();
ok(await page.title() === 'Hors Service', 'titre de la page');
const head = await page.evaluate(() => ({
  manifest: document.querySelector('link[rel=manifest]')?.getAttribute('href'),
  apple: document.querySelector('link[rel=apple-touch-icon]')?.getAttribute('href'),
  icons: [...document.querySelectorAll('link[rel=icon]')].map((l) => l.getAttribute('href')),
  abs: [...document.querySelectorAll('[src],[href]')].map((e) => e.getAttribute('src') || e.getAttribute('href')).filter((u) => /^(\/|https?:)/.test(u)),
}));
ok(head.manifest === 'manifest.webmanifest' && head.apple === 'assets/icons/apple-touch-icon.png' && head.icons.length === 2, 'balises manifeste et icônes dans le head');
ok(head.abs.length === 0, `tous les chemins sont relatifs (${head.abs.join(', ')})`);
const man = await page.evaluate(() => fetch('manifest.webmanifest').then((r) => r.json()));
ok(man.name === 'Hors Service' && man.display === 'standalone' && man.orientation === 'portrait' && man.start_url === './' && man.scope === './', 'manifeste : nom, standalone, portrait, chemins relatifs');
ok(man.background_color === '#1C1A17' && man.theme_color === '#1C1A17', 'manifeste : couleurs');
const sizes = await page.evaluate(async (list) => Promise.all(list.map((src) => new Promise((res) => {
  const im = new Image();
  im.onload = () => res(`${im.naturalWidth}x${im.naturalHeight}`);
  im.onerror = () => res('erreur');
  im.src = src;
}))), [...man.icons.map((i) => i.src), 'assets/icons/apple-touch-icon.png', 'assets/icons/favicon-32.png']);
ok(sizes.join(',') === '192x192,512x512,512x512,180x180,32x32', `icônes PNG aux bonnes tailles (${sizes.join(', ')})`);
ok(man.icons.some((i) => i.purpose === 'maskable'), 'icône « maskable » pour Android');

console.log('Service worker et hors ligne');
const swOk = await page.evaluate(() => navigator.serviceWorker.ready.then((r) => !!r.active));
ok(swOk, 'service worker actif');
await page.reload();
ok(await page.evaluate(() => !!navigator.serviceWorker.controller), 'la page est servie par le service worker après rechargement');
await page.getByRole('button', { name: 'J’ai 18 ans ou plus' }).click();
await page.getByRole('button', { name: 'Jouer sur un seul téléphone' }).waitFor();
await page.reload();
// (régression trouvée en recette : l'accueil restait bloqué sur « Redémarrage… » quand l'écran 18+ était déjà validé)
const remembered = await page.getByRole('button', { name: 'Jouer sur un seul téléphone' }).waitFor({ timeout: 5000 }).then(() => true, () => false);
ok(remembered && await page.getByRole('button', { name: 'J’ai 18 ans ou plus' }).count() === 0, 'l’écran 18+ est mémorisé (pas redemandé au rechargement) et l’accueil s’affiche');

await ctx.setOffline(true);
await page.reload();
await page.getByRole('button', { name: 'Jouer sur un seul téléphone' }).waitFor({ timeout: 8000 });
ok(true, 'hors ligne : l’appli se relance depuis le téléphone');
await page.getByRole('button', { name: 'Jouer sur un seul téléphone' }).click();
for (const nick of ['Thierry', 'Samuel']) {
  await page.locator('#local-nick').fill(nick);
  await page.getByRole('button', { name: `Ajouter ${nick}` }).click();
}
await page.getByRole('button', { name: 'Mettre en service à 2' }).click();
await page.getByRole('heading', { name: 'Soirée en service' }).waitFor();
await page.getByRole('button', { name: /^Jeu \d\d, Purple/ }).click();
await page.getByRole('button', { name: 'Lancer Purple' }).click();
await page.locator('.local-act').first().waitFor({ timeout: 8000 });
ok(await page.locator('.local-act').count() > 0, 'hors ligne : une partie de Purple démarre sur un seul téléphone');
await page.screenshot({ path: `${process.argv[2] || 'dist/shots'}/pages-hors-ligne-purple.png` }).catch(() => {});
await ctx.setOffline(false);
ok(external.length === 0, `aucune requête vers un site externe (${external.slice(0, 3).join(', ')})`);
await ctx.close();

// ---------------------------------------------------------------- fichier ouvert directement (sans serveur)
console.log('Ouverture directe du fichier index.html');
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p2 = await ctx2.newPage();
watch(p2, ctx2, '[fichier]');
await p2.goto(`file://${resolve(SITE, 'index.html')}`);
await p2.getByRole('button', { name: 'J’ai 18 ans ou plus' }).click();
await p2.getByRole('button', { name: 'Jouer sur un seul téléphone' }).waitFor();
ok(true, 'le fichier s’ouvre aussi sans serveur (écran 18+ puis accueil)');
await ctx2.close();

const real = problems.filter((m) => !/net::ERR_INTERNET_DISCONNECTED/.test(m));
ok(real.length === 0, `console propre : ${real.length} problème(s)`);
for (const m of real.slice(0, 10)) console.log('   ', m);
await browser.close();
server.close();
console.log(`\n${pass} vérifications (site GitHub Pages) réussies, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);

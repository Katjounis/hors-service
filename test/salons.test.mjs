// Bloc 4 : salons « Chacun son téléphone » + mode Écran, dans de vrais navigateurs.
// Le site (dist/pages) est servi sur http://localhost:8080 (seule origine locale acceptée par le serveur de salons).
// Le vrai serveur Cloudflare n'est pas joignable depuis l'environnement de test : on utilise test/salon-mock.mjs,
// une copie fidèle du protocole écrit (docs/PROTOCOLE.md).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { startMock } from './salon-mock.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const SHOTS = process.argv[2] || 'dist/shots';
mkdirSync(SHOTS, { recursive: true });
const SITE = 'dist/pages';
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', webmanifest: 'application/manifest+json', png: 'image/png', md: 'text/markdown' };
const site = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  if (!path.startsWith('/hors-service/')) { res.writeHead(404); res.end(); return; }
  let rel = path.slice('/hors-service/'.length) || 'index.html';
  if (rel.includes('..') || !existsSync(`${SITE}/${rel}`)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[rel.split('.').pop()] || 'application/octet-stream' });
  res.end(readFileSync(`${SITE}/${rel}`));
});
await new Promise((r) => site.listen(8080, r));
const mock = await startMock(8787);
const BASE = 'http://localhost:8080/hors-service/';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
const errors = [];
const browser = await chromium.launch();
async function device(name, viewport = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
  await ctx.addInitScript(() => { window.__HS_SALONS_URL = 'http://localhost:8787'; });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name} : ${e.message} @ ${(e.stack || '').split('\n').slice(1, 4).join(' / ')}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_CONNECTION|WebSocket|Failed to load resource/.test(m.text())) errors.push(`${name} : ${m.text()}`); });
  page.name = name;
  return page;
}
const pidOf = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('hs:pid')));
async function join(page, code, nick) {
  await page.goto(`${BASE}#${code}`);
  await page.getByRole('button', { name: 'J’ai 18 ans ou plus' }).click();
  await page.locator('#join-nick').fill(nick);
  await page.getByRole('button', { name: 'Rejoindre', exact: true }).click();
  await page.getByRole('heading', { name: 'Soirée en service' }).waitFor({ timeout: 10000 });
}

// ---------------------------------------------------------------- l'écran crée le salon
console.log('Salons : mode Écran');
const tv = await device('écran', { width: 1280, height: 720 });
await tv.goto(BASE);
await tv.getByRole('button', { name: 'J’ai 18 ans ou plus' }).click();
await tv.getByRole('button', { name: /^Chacun son téléphone/ }).click();
await tv.getByRole('button', { name: 'Mode Écran (télé, tablette)' }).click();
await tv.getByRole('button', { name: 'Créer un salon sur cet écran' }).click();
await tv.locator('.screen-view .invite .code').waitFor({ timeout: 10000 });
const code = (await tv.locator('.screen-view .invite .code').textContent()).trim();
ok(/^[A-HJ-NP-Z]{4}$/.test(code), `l’écran affiche le code du salon (${code}) et son QR code`);
ok(await tv.locator('.screen-view .qr svg').count() === 1, 'QR code généré sur place (aucun service externe)');

// ---------------------------------------------------------------- les téléphones rejoignent (QR = lien avec le code)
console.log('Salons : trois téléphones rejoignent');
const A = await device('Thierry');
await join(A, code, 'Thierry');
await tv.locator('.sv-players', { hasText: 'Thierry anime la soirée' }).waitFor({ timeout: 8000 });
ok(true, 'le premier téléphone arrivé anime la soirée (hôte)');
const B = await device('Samuel');
await join(B, code, 'Samuel');
const C = await device('Julie');
await join(C, code, 'Julie');
await tv.locator('.sv-list li', { hasText: 'Julie' }).waitFor({ timeout: 8000 });
ok(await tv.locator('.sv-list li').count() === 3, 'l’écran liste les 3 joueurs (il ne compte pas comme joueur)');
await tv.waitForTimeout(400);
await tv.screenshot({ path: `${SHOTS}/b4-01-ecran-salon.png` });

// ---------------------------------------------------------------- jeu à secret : chacun son mot sur son téléphone
console.log('Salons : Pipoteur, secrets sur chaque téléphone');
await A.getByRole('button', { name: /^Jeu \d\d, Pipoteur/ }).click();
await A.getByRole('button', { name: 'Lancer Pipoteur' }).click();
const wordOf = async (p) => { const c = p.locator('.act-word .word-card b').first(); await c.waitFor({ timeout: 8000 }); return (await c.textContent()).trim(); };
const wA = await wordOf(A); const wB = await wordOf(B); const wC = await wordOf(C);
ok(wA && wB && wC, `chaque téléphone reçoit son mot (${wA}, ${wB}, ${wC})`);
const tvText = await tv.locator('body').innerText();
ok(![wA, wB, wC].some((w) => tvText.includes(w)), 'l’écran n’affiche aucun mot secret');
ok(!(await C.locator('body').innerText()).includes(wB) || wB === wC, 'Julie ne voit pas le mot de Samuel (sauf si c’est le même)');
ok(await B.locator('.game.manette').count() === 1, 'avec un écran branché, le téléphone passe en manette (le plateau reste sur la télé)');
await B.screenshot({ path: `${SHOTS}/b4-02-telephone-mot.png` });
await tv.waitForTimeout(300);
await tv.screenshot({ path: `${SHOTS}/b4-03-ecran-jeu.png` });

console.log('Salons : coupure réseau et rechargement');
const pidB = await pidOf(B);
await fetch(`http://localhost:8787/__debug/drop/${code}/${pidB}`);
await B.waitForTimeout(200);
await B.locator('.act-word .word-card b').first().waitFor({ timeout: 8000 });
await B.waitForFunction(() => !document.querySelector('.net.is-off'), null, { timeout: 8000 });
ok((await B.locator('.act-word .word-card b').first().textContent()).trim() === wB, 'après une coupure, Samuel se reconnecte tout seul et retrouve son mot');
await B.reload();
await B.locator('.act-word .word-card b').first().waitFor({ timeout: 10000 });
ok((await B.locator('.act-word .word-card b').first().textContent()).trim() === wB, 'après rechargement de la page, même partie, même mot');
await B.screenshot({ path: `${SHOTS}/b4-04-retour-apres-coupure.png` });
for (const p of [A, B, C]) await p.getByRole('button', { name: 'J’ai retenu, cacher' }).click();
await A.reload();
try { await A.locator('.hostbar .btn', { hasText: /Commencer les indices|Tout le monde a parlé/ }).first().waitFor({ timeout: 10000 }); } catch (e) {
  await A.screenshot({ path: `${SHOTS}/debug-hote.png` });
  console.log('DEBUG hôte :', (await A.locator('body').innerText()).slice(0, 600).replace(/\n+/g, ' | '));
  throw e;
}
ok(true, 'l’hôte recharge sa page : il reprend la partie là où elle en était');
const verrou = await device('Retardataire');
await verrou.goto(`${BASE}#${code}`);
await verrou.getByRole('button', { name: 'J’ai 18 ans ou plus' }).click();
await verrou.locator('#join-nick').fill('Tard');
await verrou.getByRole('button', { name: 'Rejoindre', exact: true }).click();
await verrou.locator('.field-err, .panel-warn').first().waitFor({ timeout: 15000 });
ok(/complet|commencé/.test(await verrou.locator('.field-err, .panel-warn').first().textContent()), 'partie lancée : le salon est verrouillé pour les nouveaux venus');
await A.getByRole('button', { name: 'Quitter', exact: true }).click();
await A.getByRole('button', { name: 'Quitter le jeu' }).click();
try { await A.getByRole('heading', { name: 'Soirée en service' }).waitFor({ timeout: 8000 }); } catch (e) {
  await A.screenshot({ path: `${SHOTS}/debug-quitter.png` });
  console.log('DEBUG quitter :', JSON.stringify(errors).slice(0, 1500));
  throw e;
}

// ---------------------------------------------------------------- vote anonyme sur chaque téléphone
console.log('Salons : Qui oserait… ?, vote secret');
await A.getByRole('button', { name: /^Jeu \d\d, Qui oserait/ }).click();
await A.getByRole('button', { name: 'Lancer Qui oserait… ?' }).click();
await tv.locator('.ose-card').waitFor({ timeout: 8000 });
const votes = { Thierry: 'Samuel', Samuel: 'Julie', Julie: 'Samuel' };
for (const p of [A, B, C]) {
  await p.locator('.act .pgrid-btn', { hasText: votes[p.name] }).first().click();
}
try { await tv.locator('.screen-view .ose-lead', { hasText: 'Rapport d’incident' }).waitFor({ timeout: 8000 }); } catch (e) {
  for (const p of [A, B, C, tv]) console.log('DEBUG', p.name, ':', (await p.locator('body').innerText()).slice(0, 400).replace(/\n+/g, ' | '));
  console.log('DEBUG erreurs', JSON.stringify(errors).slice(0, 800));
  throw e;
}
ok(true, 'chacun vote sur son téléphone, l’écran affiche la révélation');
await tv.waitForTimeout(500);
await tv.screenshot({ path: `${SHOTS}/b4-05-ecran-revelation.png` });

// ---------------------------------------------------------------- fin de soirée
console.log('Salons : fin de soirée');
await A.getByRole('button', { name: 'Menu' }).click();
await A.getByRole('button', { name: 'Terminer la soirée' }).click();
await A.getByRole('button', { name: /^Confirmer : mettre la soirée hors service/ }).click();
for (const p of [B, C]) await p.getByRole('button', { name: 'Jouer sur un seul téléphone' }).waitFor({ timeout: 8000 });
await tv.getByRole('button', { name: /^Chacun son téléphone/ }).waitFor({ timeout: 8000 });
ok(true, 'l’hôte termine : tout le monde revient à l’accueil');

ok(errors.length === 0, `aucune erreur en console (${errors.slice(0, 4).join(' | ')})`);
await browser.close();
mock.close();
site.close();
console.log(`\n${pass} vérifications (salons) réussies, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);

// Bloc 5 : stats et records gardés sur le téléphone, récap « story » 1080 × 1920 avec confirmation avant partage,
// gages maison exportés par lien puis importés sur un autre téléphone (sans serveur).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const SHOTS = process.argv[2] || 'dist/shots';
mkdirSync(SHOTS, { recursive: true });
const html = readFileSync('dist/preview.html');
const server = createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise((r) => server.listen(5185, r));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, acceptDownloads: true });
await ctx.addInitScript(() => { window.__HS_FAST = true; });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png` });
const settle = async () => { for (let k = 0; k < 8; k++) { const b = page.locator('.pen .btn-main').first(); if (await b.count()) { await b.click().catch(() => {}); await page.waitForTimeout(80); } else break; } };

await page.goto('http://localhost:5185/');
await page.getByRole('button', { name: 'J’ai 18 ans ou plus' }).click();
await page.getByRole('button', { name: 'Jouer sur un seul téléphone' }).click();
for (const nick of ['Thierry Martin', 'Samuel', 'Julie']) {
  await page.locator('#local-nick').fill(nick);
  await page.getByRole('button', { name: `Ajouter ${nick}` }).click();
}
await page.getByRole('button', { name: 'Mettre en service à 3' }).click();
await page.getByRole('heading', { name: 'Soirée en service' }).waitFor();

console.log('Bloc 5 : une soirée qui compte');
await page.getByRole('button', { name: /^Jeu \d\d, Dégaine/ }).click();
await page.getByRole('button', { name: 'Lancer Dégaine' }).click();
await page.getByRole('button', { name: 'Lancer le duel' }).click();
await page.locator('.arena[data-state="go"]').waitFor({ timeout: 5000 });
await page.locator('.duel-half.b').dispatchEvent('pointerdown');
await page.locator('.duel-res').waitFor({ timeout: 5000 });
await settle();

console.log('Bloc 5 : récap de la soirée');
await page.getByRole('button', { name: 'Menu' }).click();
await page.getByRole('button', { name: 'Récap de la soirée (story)' }).click();
const img = page.locator('.wrapped-img');
await img.waitFor({ timeout: 10000 });
const size = await img.evaluate((el) => new Promise((r) => { const go = () => r(`${el.naturalWidth}x${el.naturalHeight}`); if (el.complete) go(); else el.onload = go; }));
ok(size === '1080x1920', `image au format story 1080 × 1920 (${size})`);
const dataUrl = await img.getAttribute('src');
writeFileSync(`${SHOTS}/b5-recap-story.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
await page.getByRole('button', { name: 'Partager la story' }).click();
const ask = page.getByRole('alertdialog', { name: 'Tout le monde est d’accord pour être sur la story ?' });
ok(await ask.isVisible(), 'rappel avant partage : tout le monde est d’accord pour être sur la story ?');
await shot('b5-01-confirmation-story');
const dl = page.waitForEvent('download', { timeout: 8000 });
await page.getByRole('button', { name: 'Oui, partager' }).click();
const file = await dl;
ok(file.suggestedFilename() === 'hors-service-recap.png', 'sans partage natif (ordinateur), l’image est enregistrée');
await page.locator('[aria-label="Fermer"]').first().click().catch(() => {});

console.log('Bloc 5 : gages maison');
await page.getByRole('button', { name: 'Menu' }).click();
await page.getByRole('button', { name: 'Gages maison' }).click();
for (const g of ['Chante le refrain de ton choix', 'Fais le tour de la table à cloche-pied']) {
  await page.locator('#gage-new').fill(g);
  await page.getByRole('button', { name: 'Ajouter ce gage' }).click();
}
ok(await page.locator('.gage-list li').count() === 2, 'deux gages maison écrits');
await page.waitForTimeout(500);
const link = await page.locator('.gage-link').inputValue();
ok(/#gages=[jz]\./.test(link) && await page.locator('.qr-gages svg').count() === 1, 'export par lien et QR code (données dans l’adresse)');
await page.waitForTimeout(300);
await shot('b5-02-gages-maison');

const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
const p2 = await other.newPage();
p2.on('pageerror', (e) => errors.push(e.message));
await p2.goto(link.replace(/^https?:\/\/[^/]+\//, 'http://localhost:5185/'));
await p2.getByRole('button', { name: 'J’ai 18 ans ou plus' }).click();
await p2.getByRole('dialog', { name: 'Importer des gages maison' }).waitFor({ timeout: 5000 });
await p2.getByRole('button', { name: 'Importer' }).click();
await p2.getByRole('button', { name: 'Stats, records et gages maison' }).click();
await p2.getByRole('radio', { name: 'Gages', exact: true }).click();
await p2.waitForTimeout(300);
const n2 = await p2.locator('.gage-list li').count();
if (n2 !== 2) console.log('DEBUG import :', (await p2.locator('body').innerText()).slice(0, 500).replace(/\n+/g, ' | '), await p2.evaluate(() => JSON.stringify(Object.keys(localStorage))));
ok(n2 === 2, 'sur l’autre téléphone, les gages sont importés depuis le lien');

console.log('Bloc 5 : stats et records');
await page.locator('[aria-label="Fermer"]').first().click().catch(() => {});
await page.getByRole('button', { name: 'Menu' }).click();
await page.getByRole('button', { name: 'Terminer la soirée' }).click();
await page.getByRole('button', { name: /^Confirmer/ }).click();
await page.getByRole('button', { name: 'Stats, records et gages maison' }).click();
ok(await page.locator('.soiree').count() === 1, 'la soirée apparaît dans l’historique');
await page.getByRole('radio', { name: 'Records', exact: true }).click();
ok(/Samuel/.test(await page.locator('.tbl tbody tr', { hasText: 'Dégaine' }).textContent()), 'record de Dégaine gardé');
await page.getByRole('radio', { name: 'Joueurs', exact: true }).click();
ok(await page.locator('.tbl tbody tr').count() === 3, 'profils des 3 joueurs');
await shot('b5-03-stats');
await page.getByRole('button', { name: 'Retour' }).click().catch(() => {});

console.log('Bloc 5 : récap dans le visualiseur d’artifacts (capacité « downloads »)');
const stats = await page.evaluate(() => localStorage.getItem('hs:stats'));
const art = await browser.newContext({ viewport: { width: 390, height: 844 } });
await art.addInitScript((st) => {
  localStorage.setItem('hs:age', '1');
  localStorage.setItem('hs:stats', st);
  window.claude = { use: async (n) => (n === 'downloads' ? { save: async (r) => { window.__saved = `${r.filename}:${r.data && r.data.type}`; return { status: 'saved' }; } } : null) };
}, stats);
const p3 = await art.newPage();
p3.on('pageerror', (e) => errors.push(e.message));
await p3.goto('http://localhost:5185/');
await p3.getByRole('button', { name: 'Stats, records et gages maison' }).click();
await p3.getByRole('button', { name: 'Récap' }).first().click();
await p3.locator('.wrapped-img').waitFor({ timeout: 10000 });
await p3.getByRole('button', { name: 'Partager la story' }).click();
await p3.getByRole('button', { name: 'Oui, partager' }).click();
await p3.getByRole('status').filter({ hasText: 'Image enregistrée.' }).waitFor({ timeout: 5000 }).catch(() => {});
ok(await p3.evaluate(() => window.__saved) === 'hors-service-recap.png:image/png', 'dans claude.ai, l’image passe par la confirmation de téléchargement du visualiseur');
await art.close();

ok(errors.length === 0, `aucune erreur en console (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
server.close();
console.log(`\n${pass} vérifications (bloc 5) réussies, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);

// Bloc 1 : écran 18+ avec prévention (mémorisé), paquets Cul et HARD désactivés par défaut,
// activation dans les réglages de la soirée avec confirmation. Captures pour la revue.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const SHOTS = process.argv[2] || 'dist/shots';
mkdirSync(SHOTS, { recursive: true });
const html = readFileSync('dist/preview.html');
const server = createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise((r) => server.listen(5181, r));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png` });

console.log('Bloc 1 : écran 18+');
await page.goto('http://localhost:5181/');
const h1 = await page.locator('h1').first().textContent();
ok(h1.trim() === 'Hors Service est réservé aux plus de 18 ans', `titre de l’écran 18+ (${h1})`);
const prev = await page.locator('.prevention li').allTextContents();
ok(prev.length === 3 && /dangereux pour la santé/.test(prev[0]) && /volant/.test(prev[1]) && /passer son tour/.test(prev[2]), 'rappel de prévention : santé, volant, passer son tour');
await shot('b1-01-ecran-18');
await page.getByRole('button', { name: 'J’ai 18 ans ou plus' }).click();
ok(await page.evaluate(() => localStorage.getItem('hs:age')) === '1', 'choix mémorisé dans le localStorage');
await page.reload();
ok(await page.getByRole('button', { name: 'J’ai 18 ans ou plus' }).count() === 0, 'au lancement suivant, l’écran 18+ ne revient pas');

console.log('Bloc 1 : paquets Cul et HARD');
await page.getByRole('button', { name: 'Jouer sur un seul téléphone' }).click();
for (const nick of ['Thierry', 'Samuel', 'Julie']) {
  await page.locator('#local-nick').fill(nick);
  await page.getByRole('button', { name: `Ajouter ${nick}` }).click();
}
await page.getByRole('button', { name: 'Mettre en service à 3' }).click();
await page.getByRole('heading', { name: 'Soirée en service' }).waitFor();
await page.getByRole('button', { name: /^Jeu 01, Qui oserait/ }).click();
const radio = (name) => page.getByRole('radio', { name, exact: true });
ok(await radio('Cul').isDisabled() && await radio('HARD').isDisabled(), 'par défaut, Cul et HARD sont grisés dans les options du jeu');
ok(await page.locator('.field-h', { hasText: 'Cul et HARD sont désactivés' }).count() === 1, 'le jeu explique où les activer');
await page.waitForTimeout(700);
await page.locator('.field', { hasText: 'Paquet de questions' }).scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await shot('b1-02-paquets-desactives');
await page.keyboard.press('Escape');
await page.locator('.sheet-close, [aria-label="Fermer"]').first().click().catch(() => {});

await page.getByRole('button', { name: 'Menu' }).click();
await page.getByRole('button', { name: 'Réglages de la soirée' }).click();
const field = page.locator('.adult-packs');
ok(await field.getByRole('radio', { name: 'Désactivés', exact: true }).getAttribute('aria-checked') === 'true', 'réglage « Désactivés » par défaut');
await field.getByRole('radio', { name: 'Activés', exact: true }).click();
const dlg = page.getByRole('alertdialog', { name: 'Activer les paquets Cul et HARD ?' });
ok(await dlg.isVisible(), 'activer demande une confirmation');
ok(await field.getByRole('radio', { name: 'Activés', exact: true }).getAttribute('aria-checked') === 'false', 'rien n’est activé avant la confirmation');
await dlg.scrollIntoViewIfNeeded();
await shot('b1-03-confirmation');
await dlg.getByRole('button', { name: 'Annuler' }).click();
ok(await field.getByRole('radio', { name: 'Désactivés', exact: true }).getAttribute('aria-checked') === 'true', 'Annuler laisse les paquets désactivés');
await field.getByRole('radio', { name: 'Activés', exact: true }).click();
await page.getByRole('button', { name: 'Oui, activer' }).click();
ok(await field.getByRole('radio', { name: 'Activés', exact: true }).getAttribute('aria-checked') === 'true', 'après confirmation : activés');
await field.getByRole('radio', { name: 'Désactivés', exact: true }).click();
ok(await field.getByRole('radio', { name: 'Désactivés', exact: true }).getAttribute('aria-checked') === 'true' && await dlg.count() === 0, 'désactiver se fait sans confirmation');
await field.getByRole('radio', { name: 'Activés', exact: true }).click();
await page.getByRole('button', { name: 'Oui, activer' }).click();
await page.keyboard.press('Escape');
await page.locator('.sheet-close, [aria-label="Fermer"]').first().click().catch(() => {});

await page.getByRole('button', { name: /^Jeu 01, Qui oserait/ }).click();
ok(!(await radio('Cul').isDisabled()) && !(await radio('HARD').isDisabled()), 'une fois activés, Cul et HARD se choisissent');
await radio('HARD').click();
await page.getByRole('button', { name: 'Lancer Qui oserait… ?' }).click();
await page.locator('.chip', { hasText: 'Paquet HARD' }).waitFor({ timeout: 5000 });
ok(true, 'une partie se lance avec le paquet HARD');
await page.waitForTimeout(900);
await shot('b1-04-partie-hard');

ok(errors.length === 0, `aucune erreur en console (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
server.close();
console.log(`\n${pass} vérifications (bloc 1) réussies, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);

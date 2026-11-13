// Bloc 2 : mode sans alcool par joueur (gages ou points), buveurs et non-buveurs dans la même partie,
// modifiable en cours de soirée. Un seul téléphone, dans un vrai navigateur, avec captures.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const SHOTS = process.argv[2] || 'dist/shots';
mkdirSync(SHOTS, { recursive: true });
const html = readFileSync('dist/preview.html');
const server = createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise((r) => server.listen(5182, r));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const shot = async (name) => { await page.waitForTimeout(500); await page.screenshot({ path: `${SHOTS}/${name}.png` }); };
const radio = (name) => page.getByRole('radio', { name, exact: true });

await page.goto('http://localhost:5182/');
await page.getByRole('button', { name: 'J’ai 18 ans ou plus' }).click();
await page.getByRole('button', { name: 'Jouer sur un seul téléphone' }).click();

console.log('Bloc 2 : création des joueurs');
async function addPlayer(nick, mode) {
  await page.locator('#local-nick').fill(nick);
  if (mode !== 'drink') {
    await radio('Sans alcool').click();
    await radio(mode === 'points' ? 'Des points' : 'Des gages').click();
  }
  if (nick === 'Samuel') await shot('b2-01-creation-sans-alcool');
  await page.getByRole('button', { name: `Ajouter ${nick}` }).click();
}
await addPlayer('Thierry', 'drink');
await addPlayer('Samuel', 'points');
await addPlayer('Julie', 'gage');
const metas = await page.locator('.players .player-meta').allTextContents();
ok(metas.join(',') === 'Gorgées,Points,Gages', `chaque joueur garde son mode (${metas.join(', ')})`);
await page.getByRole('button', { name: 'Mettre en service à 3' }).click();
await page.getByRole('heading', { name: 'Soirée en service' }).waitFor();

console.log('Bloc 2 : une pénalité en points');
await page.getByRole('button', { name: /^Jeu 01, Qui oserait/ }).click();
await page.getByRole('button', { name: 'Lancer Qui oserait… ?' }).click();
const target = { Thierry: 'Samuel', Julie: 'Samuel', Samuel: 'Julie' };
for (let k = 0; k < 8; k++) {
  const me = page.getByRole('button', { name: /^C’est moi, / });
  if (await me.count() && await me.first().isVisible()) {
    const who = (await me.first().textContent()).replace('C’est moi, ', '').trim();
    await me.first().click();
    await page.locator('.local-act .pgrid-btn', { hasText: target[who] }).first().click();
    await page.waitForTimeout(200);
    continue;
  }
  if (await page.locator('.pen').count()) break;
  await page.waitForTimeout(300);
}
const pen = page.locator('.pen').first();
await pen.waitFor({ timeout: 6000 });
const penTxt = await pen.textContent();
ok(/Samuel/.test(penTxt) && /2 points/.test(penTxt) && /points de pénalité/.test(penTxt), `Samuel (sans alcool, points) reçoit 2 points au lieu de 2 gorgées (${penTxt.slice(0, 80)})`);
ok(await pen.getByRole('button', { name: 'Points notés' }).count() === 1 && await pen.getByRole('button', { name: 'Un gage à la place' }).count() === 1, 'il peut noter ses points ou prendre un gage à la place');
await shot('b2-02-penalite-points');
await pen.getByRole('button', { name: 'Points notés' }).click();

await page.getByRole('button', { name: 'Menu' }).click();
await page.getByRole('button', { name: 'Compteur de la soirée' }).click();
const row = page.locator('.tbl tbody tr', { hasText: 'Samuel' });
const cells = await row.locator('td').allTextContents();
ok(cells[5] === '2' && cells[1] === '0', `compteur : 2 points pour Samuel, 0 gorgée (${cells.join(' | ')})`);
await shot('b2-03-compteur');
await page.keyboard.press('Escape');
await page.locator('[aria-label="Fermer"]').first().click().catch(() => {});

console.log('Bloc 2 : changer de mode en cours de soirée');
await page.getByRole('button', { name: 'Menu' }).click();
await page.getByRole('button', { name: 'Joueurs et ordre des places' }).click();
const samuel = page.locator('.player', { hasText: 'Samuel' }).locator('.player-mode');
ok(await samuel.getByRole('radio', { name: 'Points', exact: true }).getAttribute('aria-checked') === 'true', 'le mode de Samuel est visible dans « Joueurs et ordre des places »');
await samuel.getByRole('radio', { name: 'Gorgées', exact: true }).click();
await page.waitForTimeout(400);
ok(await samuel.getByRole('radio', { name: 'Gorgées', exact: true }).getAttribute('aria-checked') === 'true', 'Samuel repasse aux gorgées en cours de soirée');
await shot('b2-04-joueurs');

ok(errors.length === 0, `aucune erreur en console (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
server.close();
console.log(`\n${pass} vérifications (bloc 2) réussies, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);

// Bloc 3 : Dégaine, Bombe et Hors Service Ware sur un seul téléphone, dans un vrai navigateur.
// window.__HS_FAST raccourcit les délais (signal, mèche, micro-jeux) pour que le test reste court.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const SHOTS = process.argv[2] || 'dist/shots';
mkdirSync(SHOTS, { recursive: true });
const html = readFileSync('dist/preview.html');
const server = createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise((r) => server.listen(5183, r));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => { window.__HS_FAST = true; });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png` });
const sleep = (ms) => page.waitForTimeout(ms);
async function hostAct(label) {
  const b = page.locator('.hostbar .btn', { hasText: label }).first();
  await b.waitFor({ timeout: 8000 });
  await b.click();
}
async function settle() {
  for (let k = 0; k < 12; k++) {
    const b = page.locator('.pen .btn-main').first();
    if (await b.count()) { await b.click().catch(() => {}); await sleep(80); continue; }
    break;
  }
}
async function launch(name) {
  await page.getByRole('button', { name: new RegExp(`^Jeu \\d\\d, ${name}`) }).click();
  await page.getByRole('button', { name: `Lancer ${name}` }).click();
}

await page.goto('http://localhost:5183/');
await page.getByRole('button', { name: 'J’ai 18 ans ou plus' }).click();
await page.getByRole('button', { name: 'Jouer sur un seul téléphone' }).click();
for (const nick of ['Thierry', 'Samuel', 'Julie']) {
  await page.locator('#local-nick').fill(nick);
  await page.getByRole('button', { name: `Ajouter ${nick}` }).click();
}
await page.getByRole('button', { name: 'Mettre en service à 3' }).click();
await page.getByRole('heading', { name: 'Soirée en service' }).waitFor();
ok(await page.locator('.gcard.is-off', { hasText: /Dégaine|Bombe|Hors Service Ware/ }).count() === 0, 'sur un seul téléphone, les trois jeux arcade sont disponibles');

// ---------------------------------------------------------------- Dégaine
console.log('Bloc 3 : Dégaine');
await launch('Dégaine');
await page.getByRole('button', { name: 'Lancer le duel' }).click();
await page.locator('.arena[data-state="go"]').waitFor({ timeout: 5000 });
await shot('b3-01-degaine-tape');
await page.locator('.duel-half.b').dispatchEvent('pointerdown');
await page.locator('.duel-res').waitFor({ timeout: 5000 });
const r1 = await page.locator('.duel-res').textContent();
ok(/Samuel dégaine en \d+ ms/.test(r1) && /Thierry prend 2 gorgées/.test(r1), `le plus rapide gagne, l’autre prend la pénalité (${r1.slice(0, 90)})`);
ok(await page.locator('.pen', { hasText: 'Thierry' }).count() >= 1, 'la pénalité arrive dans les cartes à régler');
await shot('b3-02-degaine-resultat');
await settle();
await hostAct('Duel suivant');
await page.getByRole('button', { name: 'Lancer le duel' }).click();
await page.locator('.arena[data-state="wait"]').waitFor({ timeout: 3000 });
await page.locator('.duel-half.a').dispatchEvent('pointerdown');
await page.locator('.duel-res').waitFor({ timeout: 5000 });
const r2 = await page.locator('.duel-res').textContent();
ok(/Samuel.*a tapé avant le signal.*Julie.*gagne/.test(r2), `taper trop tôt fait perdre direct (${r2.slice(0, 90)})`);
await settle();
await hostAct('Terminer');
await hostAct('Confirmer');
await page.locator('.report').waitFor();
ok(await page.locator('.report .tbl tbody tr').count() === 3, 'Dégaine : bilan des duels');
await settle();
await page.getByRole('button', { name: 'Changer de jeu' }).click();

// ---------------------------------------------------------------- Bombe
console.log('Bloc 3 : Bombe');
await launch('Bombe');
await page.getByRole('button', { name: 'Allumer la mèche' }).click();
await page.locator('.arena[data-state="tic"]').waitFor({ timeout: 3000 });
const c1 = await page.locator('.bombe-consigne').textContent();
await page.getByRole('button', { name: 'Je passe' }).click();
await page.getByRole('button', { name: 'Je passe' }).click();
const c2 = await page.locator('.bombe-consigne').textContent();
ok(c1 !== c2 && (await page.locator('.arena .bombe-who').textContent()).includes('Julie'), 'à chaque passage : nouvelle consigne, téléphone au voisin');
await shot('b3-03-bombe-consigne');
const t0 = Date.now();
let boomSeen = false;
while (Date.now() - t0 < 9000) {
  if (await page.locator('.arena[data-state="boom"]').count()) { boomSeen = true; await sleep(150); await shot('b3-04-bombe-boum'); break; }
  if (await page.locator('.duel-res').count()) break;
  await sleep(50);
}
ok(boomSeen, 'la bombe explose avec son animation');
await page.locator('.duel-res').waitFor({ timeout: 5000 });
const r3 = await page.locator('.duel-res').textContent();
ok(/mains de Julie après 2 passages/.test(r3) && /Julie prend 3 gorgées/.test(r3), `celui qui tient le téléphone à l’explosion prend la pénalité (${r3.slice(0, 90)})`);
await settle();
await hostAct('Terminer');
await hostAct('Confirmer');
await page.locator('.report').waitFor();
await settle();
await page.getByRole('button', { name: 'Changer de jeu' }).click();

// ---------------------------------------------------------------- Hors Service Ware
console.log('Bloc 3 : Hors Service Ware');
await launch('Hors Service Ware');
await page.getByRole('button', { name: 'C’est parti' }).click();
await page.locator('.arena.ware').waitFor();
const seen = new Set();
let solved = 0;
let shotPlay = false;
for (let t = 0; t < 400; t++) {
  if (!(await page.locator('.arena.ware').count())) break;
  const play = page.locator('.ware-play');
  if (!(await play.count())) { await sleep(60); continue; }
  const id = await play.getAttribute('data-mg').catch(() => null);
  if (!id || seen.has(`${id}:${t}`)) { await sleep(40); }
  if (!shotPlay) { await shot('b3-05-ware-micro-jeu'); shotPlay = true; }
  const k = await page.locator('.ware-score').textContent().catch(() => '0');
  const solving = solved < 6;
  try {
    if (solving) {
      if (['tap', 'catch', 'big', 'odd', 'color', 'count'].includes(id)) {
        const okBtn = page.locator('.ware-play [data-ok="1"]');
        await okBtn.first().waitFor({ timeout: 1500 });
        await okBtn.first().dispatchEvent('pointerdown');
      } else if (id === 'mash') {
        const n = Number(await page.locator('[data-mash]').getAttribute('data-mash'));
        for (let i = 0; i < n; i++) await page.locator('[data-mash]').dispatchEvent('pointerdown');
      } else if (id === 'double') {
        await page.locator('[data-double]').dispatchEvent('pointerdown');
        await page.locator('[data-double]').dispatchEvent('pointerdown');
      } else if (id === 'hold') {
        await page.locator('[data-hold]').dispatchEvent('pointerdown');
      } else if (id === 'swipe') {
        const dir = await page.locator('[data-swipe]').getAttribute('data-swipe');
        const d = { droite: [100, 0], gauche: [-100, 0], haut: [0, -100], bas: [0, 100] }[dir];
        await page.locator('[data-swipe]').dispatchEvent('pointerdown', { clientX: 200, clientY: 400 });
        await page.locator('[data-swipe]').dispatchEvent('pointermove', { clientX: 200 + d[0], clientY: 400 + d[1] });
      }
      seen.add(id);
      solved += 1;
    } else if (id === 'dont' || id === 'hold') {
      // pour perdre volontairement : on touche l'écran, ou on relâche
      await page.locator('.ware-play [data-dont], .ware-play [data-hold]').first().dispatchEvent('pointerdown');
      await page.locator('.ware-play [data-hold]').first().dispatchEvent('pointerup').catch(() => {});
    }
  } catch (e) { /* micro-jeu déjà terminé */ }
  await page.locator('.ware-play').first().waitFor({ state: 'detached', timeout: 4000 }).catch(() => {});
  void k;
}
await page.locator('.duel-res').waitFor({ timeout: 8000 });
const r4 = await page.locator('.duel-res').textContent();
const score = Number((r4.match(/enchaîne (\d+)/) || [])[1] || 0);
ok(score >= 4, `des micro-jeux réussis pendant la rafale (${score} ; ${[...seen].join(', ')})`);
ok(/3 vies perdues : 3 pénalités de 1 gorgée/.test(r4), `une vie perdue = une pénalité (${r4.slice(0, 120)})`);
ok(await page.locator('.pen', { hasText: 'Hors Service Ware' }).count() >= 1, 'les pénalités de la rafale arrivent dans les cartes');
await shot('b3-06-ware-resultat');
await settle();
await hostAct('Terminer');
await hostAct('Confirmer');
await page.locator('.report').waitFor();

// ---------------------------------------------------------------- à plusieurs téléphones : barrés
console.log('Bloc 3 : jeux arcade barrés à plusieurs téléphones');
const p2 = await ctx.newPage();
p2.on('pageerror', (e) => errors.push(e.message));
await p2.goto('http://localhost:5183/');
await p2.getByRole('button', { name: 'Essayer avec 4 téléphones simulés' }).click();
await p2.getByRole('heading', { name: 'Soirée en service' }).first().waitFor({ timeout: 10000 });
ok(await p2.locator('.gcard.is-off', { hasText: /Dégaine|Bombe|Hors Service Ware/ }).count() === 3, 'en mode plusieurs téléphones, les jeux arcade sont barrés « Sur un seul téléphone »');

ok(errors.length === 0, `aucune erreur en console (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
server.close();
console.log(`\n${pass} vérifications (bloc 3) réussies, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);

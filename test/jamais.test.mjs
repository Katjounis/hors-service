// « Je n'ai jamais » dans un vrai navigateur, et le nouveau décor « appart en fin de soirée » :
// niveaux cochables (HARD et Cul verrouillés tant que les paquets adultes sont désactivés), badge de niveau,
// avatars touchés sur un seul téléphone, réglage d'un coup, réponses secrètes dans la démo à 4 téléphones,
// teinte du décor par niveau, lisibilité en portrait sur petit écran, mouvement réduit.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const SHOTS = process.argv[2] || 'dist/shots';
mkdirSync(SHOTS, { recursive: true });
const html = readFileSync('dist/preview.html');
const server = createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); });
await new Promise((r) => server.listen(5188, r));
const URL0 = 'http://localhost:5188/';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
const errors = [];
const browser = await chromium.launch();
const PAL = { soft: '255, 172, 80', hard: '150, 92, 240', cul: '238, 48, 92' };

async function newPage(w, h, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ...extra });
  await ctx.route('https://**', (r) => { errors.push(`requête externe : ${r.request().url()}`); r.abort(); });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL0);
  await page.getByRole('button', { name: 'J’ai 18 ans ou plus' }).click();
  return page;
}
async function onePhone(page, nicks) {
  await page.getByRole('button', { name: 'Jouer sur un seul téléphone' }).click();
  for (const nick of nicks) {
    await page.locator('#local-nick').fill(nick);
    await page.getByRole('button', { name: `Ajouter ${nick}` }).click();
  }
  await page.getByRole('button', { name: `Mettre en service à ${nicks.length}` }).click();
  await page.getByRole('heading', { name: 'Soirée en service' }).waitFor();
}
async function adultOn(page) {
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: /Réglages de la soirée/ }).click();
  await page.getByRole('radio', { name: 'Activés', exact: true }).click();
  await page.getByRole('button', { name: 'Oui, activer' }).click();
  await page.locator('[aria-label="Fermer"]').first().click();
}
const level = (page) => page.locator('.jn-card').getAttribute('class').then((c) => (c.match(/lv-(soft|hard|cul)/) || [])[1]);
const tint = (page) => page.evaluate(() => getComputedStyle(document.querySelector('.ambiance')).getPropertyValue('--d1').trim());
async function small(page) {
  return page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => {
    const r = b.getBoundingClientRect();
    return r.width && r.height && (r.height < 43.5 || r.width < 43.5);
  }).map((b) => (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 30)));
}

// ---------------------------------------------------------------- un seul téléphone
{
  console.log('Je n’ai jamais : niveaux et verrou des paquets adultes');
  const page = await newPage(390, 844);
  await onePhone(page, ['Thierry', 'Samuel', 'Julie', 'Léa']);
  await page.getByRole('button', { name: /^Jeu 12, Je n’ai jamais/ }).click();
  const hard = page.getByRole('button', { name: 'HARD', exact: true });
  const cul = page.getByRole('button', { name: 'Cul', exact: true });
  ok(await hard.isDisabled() && await cul.isDisabled() && await page.getByRole('button', { name: 'Soft', exact: true }).getAttribute('aria-pressed') === 'true',
    'Soft coché par défaut ; HARD et Cul verrouillés tant que les paquets adultes sont désactivés');
  ok((await page.locator('.sheet').innerText()).includes('Cul et HARD sont désactivés'), 'le verrou est expliqué');
  await page.locator('[aria-label="Fermer"]').first().click();
  await adultOn(page);
  await page.getByRole('button', { name: /^Jeu 12, Je n’ai jamais/ }).click();
  await page.getByRole('button', { name: 'Soft', exact: true }).click();
  ok(await page.getByRole('button', { name: 'Lancer Je n’ai jamais' }).isDisabled() && (await page.locator('.sheet').innerText()).includes('Coche au moins un niveau'), 'aucun niveau coché : lancement impossible');
  for (const n of ['Soft', 'HARD', 'Cul']) await page.getByRole('button', { name: n, exact: true }).click();
  ok((await small(page)).length === 0, `cases des niveaux : zones tactiles de 44 px (${await small(page)})`);
  await page.locator('.multi').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/jn-01-niveaux.png` });
  await page.getByRole('button', { name: 'Lancer Je n’ai jamais' }).click();
  await page.locator('.jn-card').waitFor();
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => window.scrollY) === 0, 'le jeu s’ouvre en haut de l’écran');

  console.log('Je n’ai jamais : badge, teinte du décor, avatars touchés');
  const lv = await level(page);
  ok(['Soft', 'HARD', 'Cul'].includes(await page.locator('.jn-badge').textContent()) && await page.locator(`.jn-badge.lv-${lv}`).count() === 1, `chaque carte affiche son niveau (${lv})`);
  ok(await tint(page) === PAL[lv], `le décor prend la teinte du niveau (${await tint(page)})`);
  const q = await page.locator('.jn-q').textContent();
  const yes = q.startsWith('Je n’ai jamais') ? 'Moi si !' : 'Moi aussi !';
  ok((await page.locator('.jn-pick').innerText()).replace(/\u00a0/g, ' ').includes(`« ${yes} »`), `consigne adaptée à la carte : « ${yes} »`);
  await page.locator('.jn-pick .pgrid-btn').nth(0).click();
  await page.locator('.jn-pick .pgrid-btn').nth(2).click();
  ok(await page.locator('.jn-pick .pgrid-btn[aria-pressed="true"]').count() === 2, 'deux avatars touchés');
  await page.getByRole('button', { name: 'Valider (2)' }).click();
  await page.locator('.verdict').waitFor({ timeout: 5000 });
  ok((await page.locator('.verdict').innerText()).includes('Thierry') && (await page.locator('.verdict').innerText()).includes('Julie'), 'les deux aveux sont révélés');
  const all = page.locator('.dock-all');
  await all.waitFor({ timeout: 4000 });
  ok((await all.textContent()).includes('valider les 2'), 'plusieurs joueurs à régler : un bouton pour tout valider');
  await page.screenshot({ path: `${SHOTS}/jn-02-aveux.png` });
  await all.click();
  await page.waitForTimeout(300);
  ok(await page.locator('.dock').count() === 0, 'les deux gorgées sont réglées d’un coup');
  await page.locator('.hostbar .btn', { hasText: 'Carte suivante' }).click();
  await page.locator('.jn-pick').waitFor();
  ok((await page.locator('.ose-top .chip').first().textContent()).includes('Carte 2'), 'carte suivante');
  // les trois niveaux, chacun avec sa teinte (on passe les cartes jusqu’à les avoir vus)
  const seen = {};
  for (let i = 0; i < 40 && Object.keys(seen).length < 3; i++) {
    const l = await level(page);
    if (!seen[l]) {
      seen[l] = await tint(page);
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${SHOTS}/jn-03-carte-${l}.png` });
    }
    const n = await page.locator('.ose-top .chip').first().textContent();
    await page.locator('.hostbar .btn', { hasText: 'Passer cette carte' }).click();
    await page.waitForFunction((t) => document.querySelector('.ose-top .chip') && document.querySelector('.ose-top .chip').textContent !== t, n);
  }
  ok(Object.keys(seen).length === 3 && Object.entries(seen).every(([l, t]) => t === PAL[l]), `les trois niveaux se mélangent, chacun avec sa teinte (${Object.keys(seen).join(', ')})`);
  await page.context().close();
}

// ---------------------------------------------------------------- petit écran, portrait
{
  console.log('Décor : petit écran en portrait, mouvement réduit');
  const page = await newPage(360, 640, { reducedMotion: 'reduce' });
  ok(await page.locator('.ambiance .amb-fenetre').count() === 1 && await page.locator('.ambiance .amb-salon').count() === 2, 'décor dessiné : fenêtre, lampe, salon et bougie');
  ok(await page.evaluate(() => getComputedStyle(document.querySelector('.amb-flamme')).animationName) === 'none', 'mouvement réduit : la bougie ne bouge plus');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'aucun défilement horizontal à 360 px');
  await page.screenshot({ path: `${SHOTS}/jn-04-accueil-360.png` });
  const note = page.locator('.mode .panel');
  if (await note.count()) ok(await note.evaluate((el) => getComputedStyle(el).color) === 'rgb(34, 32, 28)', 'la note sur papier de l’accueil est en encre foncée (lisible)');
  await onePhone(page, ['Thierry', 'Samuel']);
  await page.getByRole('button', { name: /^Jeu 12, Je n’ai jamais/ }).click();
  await page.getByRole('button', { name: 'Lancer Je n’ai jamais' }).click();
  await page.locator('.jn-card').waitFor();
  await page.waitForTimeout(300);
  const box = await page.locator('.jn-card').boundingBox();
  ok(box && box.y >= 0 && box.y + box.height <= 640 && box.x >= 0 && box.x + box.width <= 360, 'la carte tient entière dans l’écran (360 × 640)');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'en jeu : aucun défilement horizontal');
  await page.screenshot({ path: `${SHOTS}/jn-05-carte-360.png` });
  await page.context().close();
}

// ---------------------------------------------------------------- chacun son téléphone (démo à 4 téléphones)
{
  console.log('Je n’ai jamais : réponses secrètes dans la démo');
  const page = await newPage(390, 844);
  await page.getByRole('button', { name: 'Essayer avec 4 téléphones simulés' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.register .player').length >= 4, null, { timeout: 10000 });
  await page.getByRole('button', { name: /^Jeu 12, Je n’ai jamais/ }).click();
  await page.getByRole('button', { name: 'Lancer Je n’ai jamais' }).click();
  await page.locator('.jn-answer .btn-main').waitFor({ timeout: 8000 });
  ok((await page.locator('.act').innerText()).includes('Secrète jusqu’à la révélation'), 'chacun répond en secret sur son téléphone');
  await page.locator('.jn-answer .btn-main').click();
  await page.locator('.verdict, .jn-none').first().waitFor({ timeout: 12000 });
  ok(await page.locator('.verdict, .jn-none').count() >= 1, 'révélation quand tout le monde a répondu');
  await page.screenshot({ path: `${SHOTS}/jn-06-demo-revelation.png` });
  await page.context().close();
}

ok(errors.length === 0, `aucune erreur en console (${errors.slice(0, 3).join(' | ')})`);
await browser.close();
server.close();
console.log(`\n${pass} vérifications (Je n’ai jamais) réussies, ${fail} échec(s)`);
process.exit(fail ? 1 : 0);

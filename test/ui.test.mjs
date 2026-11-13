// Tests dans un vrai navigateur (Chromium) sur la version aperçu : les jeux à plusieurs téléphones, en 390 px de large.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';

const { chromium } = createRequire(import.meta.url)('playwright');
const SHOTS = process.argv[2] || 'dist/shots';
mkdirSync(SHOTS, { recursive: true });
// HS_SITE=dossier : sert la version publiée (GitHub Pages) sous /hors-service/, comme un vrai site de projet
const SITE = process.env.HS_SITE || null;
const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', webmanifest: 'application/manifest+json', json: 'application/json', png: 'image/png', md: 'text/markdown; charset=utf-8' };
const html = SITE ? null : readFileSync('dist/preview.html');
const server = createServer((req, res) => {
  if (!SITE) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(html); return; }
  const path = decodeURIComponent(req.url.split('?')[0]);
  if (!path.startsWith('/hors-service/')) { res.writeHead(404); res.end(); return; }
  let rel = path.slice('/hors-service/'.length) || 'index.html';
  if (rel.endsWith('/')) rel += 'index.html';
  if (rel.includes('..') || !existsSync(`${SITE}/${rel}`)) { res.writeHead(404); res.end('absent'); return; }
  res.writeHead(200, { 'content-type': TYPES[rel.split('.').pop()] || 'application/octet-stream' });
  res.end(readFileSync(`${SITE}/${rel}`));
});
await new Promise((r) => server.listen(5173, r));
const URL0 = SITE ? `http://localhost:${5173}/hors-service/` : `http://localhost:${5173}/`;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
const browser = await chromium.launch();
const errors = [];
const shot = (page, name, full = true) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: full });

async function phonePage() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await ctx.route('https://**', (r) => { errors.push(`requête externe : ${r.request().url()}`); r.abort(); });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(URL0);
  return page;
}

async function passAge(page) {
  await page.getByRole('button', { name: 'J’ai 18 ans ou plus' }).click();
}

// boutons visibles de moins de 44 px (zones tactiles)
async function smallTargets(page) {
  return page.evaluate(() => [...document.querySelectorAll('button, [role=button], .link, label.btn')].filter((b) => {
    const r = b.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(b).visibility === 'hidden') return false;
    return r.height < 43.5 || r.width < 43.5;
  }).map((b) => (b.getAttribute('aria-label') || b.textContent || b.className).trim().slice(0, 30)));
}
const h1count = (page) => page.locator('h1:visible').count();

// régler ce qui attend en bas de l'écran (pénalité, distribution)
async function settle(page, name = null) {
  for (let k = 0; k < 6; k++) {
    const gift = page.locator('.pen-gift');
    if (await gift.count()) {
      const plus = page.locator('.pen-gift .dist-who').first();
      for (let i = 0; i < 30 && !(await page.locator('.pen-gift .btn-main').isEnabled()); i++) await plus.click();
      if (name) { await shot(page, name, false); name = null; }
      await page.locator('.pen-gift .btn-main').click();
      await page.waitForTimeout(120);
      continue;
    }
    const pen = page.locator('.pen .btn-main');
    if (await pen.count()) {
      if (name) { await shot(page, name, false); name = null; }
      await pen.first().click();
      await page.waitForTimeout(120);
      continue;
    }
    break;
  }
}

// répète une action (voter, régler une pénalité…) jusqu'à ce que l'élément attendu apparaisse
async function drive(page, sel, act, ms = 20000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await page.locator(sel).count()) return true;
    await settle(page);
    if (act) await act();
    await page.waitForTimeout(250);
  }
  console.log('    (état du téléphone)', (await page.locator('.phone-scroll').first().innerText()).slice(0, 600).replace(/\n+/g, ' | '));
  ok(false, `délai dépassé en attendant ${sel}`);
  return false;
}
const clickIf = (page, sel) => async () => { const b = page.locator(sel); if (await b.count()) await b.first().click().catch(() => {}); };

async function launch(page, name) {
  await page.getByRole('button', { name: new RegExp(`^Jeu \\d\\d, ${name.replace(/[.?…]/g, '.')}`) }).click();
  await page.getByRole('button', { name: `Lancer ${name}` }).click();
}
async function toLobby(page) {
  await settle(page);
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Revenir à la salle d’attente' }).click();
  await page.getByRole('heading', { name: 'Soirée en service' }).waitFor();
}
async function hostAct(page, label, timeout = 8000) {
  const b = page.locator('.hostbar .btn', { hasText: label });
  await b.first().waitFor({ timeout });
  await page.waitForFunction((t) => [...document.querySelectorAll('.hostbar .btn')].some((x) => x.textContent.includes(t) && !x.disabled), label, { timeout });
  await b.first().click();
}

// ---------- âge, accueil, mode un seul téléphone : 96 à 3
{
  console.log('Navigateur : âge, accueil, un seul téléphone (Le 96)');
  const page = await phonePage();
  await shot(page, '00-age', false);
  ok(await page.getByRole('button', { name: 'J’ai 18 ans ou plus' }).count() === 1, 'l’entrée demande d’avoir 18 ans ou plus');
  ok((await page.textContent('body')).includes('L’abus d’alcool est dangereux pour la santé'), 'message sanitaire affiché');
  await passAge(page);
  await page.reload();
  ok(await page.getByRole('button', { name: 'J’ai 18 ans ou plus' }).count() === 0, 'la vérification d’âge n’est demandée qu’une fois');
  await shot(page, '01-accueil');
  ok(await h1count(page) === 1, 'accueil : un seul titre principal');
  ok((await smallTargets(page)).length === 0, `accueil : zones tactiles de 44 px (${await smallTargets(page)})`);
  await page.getByRole('button', { name: 'Jouer sur un seul téléphone' }).click();
  for (const [nick, sober] of [['Thierry', false], ['Julie', true], ['Marc', false]]) {
    await page.locator('#local-nick').fill(nick);
    if (sober) await page.getByRole('radio', { name: 'Sans alcool' }).click();
    await page.getByRole('button', { name: `Ajouter ${nick}` }).click();
  }
  await shot(page, '02-local-joueurs');
  await page.getByRole('button', { name: 'Mettre en service à 3' }).click();
  await page.getByRole('heading', { name: 'Soirée en service' }).waitFor();
  await shot(page, '03-local-salle');
  await launch(page, 'Le 96');
  await page.locator('.g96-hidden').waitFor();
  ok(!/\d/.test(await page.locator('.g96-hidden').textContent()), 'le 96 n’affiche pas le total');
  let plays = 0;
  for (let i = 0; i < 200 && plays < 12; i++) {
    // on règle d'abord ce qui attend en bas de l'écran
    if (await page.locator('.pen-gift, .pen .btn-main').count()) { await settle(page); continue; }
    const passBtn = page.getByRole('button', { name: /^C’est moi/ });
    if (await passBtn.count()) {
      if (plays === 0) await shot(page, '04-local-passe', false);
      await passBtn.click();
      const cards = page.locator('.act-hand .pc-btn:not([disabled])');
      await cards.first().waitFor({ timeout: 3000 });
      await cards.first().click();
      try {
        for (const k of String(10 + plays * 7)) await page.locator('.keypad .key', { hasText: new RegExp(`^${k}$`) }).click({ timeout: 5000 });
      } catch (e) {
        await shot(page, 'echec-clavier');
        console.log('    (écran)', (await page.locator('main').innerText()).slice(0, 400).replace(/\n+/g, ' | '));
        throw e;
      }
      if (plays === 0) await shot(page, '05-local-annonce');
      await page.locator('.keypad .key-ok').click();
      plays++;
      await page.waitForTimeout(120);
      continue;
    }
    if (await page.locator('.pen-gift, .pen .btn-main').count()) { await settle(page); continue; }
    const bus = page.locator('.bus-btns .btn').first();
    if (await bus.count()) { await bus.click(); await page.waitForTimeout(150); continue; }
    await page.waitForTimeout(150);
  }
  ok(plays >= 12, `12 cartes posées en passant le téléphone (${plays})`);
  await shot(page, '06-local-96-table');
  const lastTxt = await page.locator('.g96-last').first().textContent();
  await page.waitForTimeout(500);
  await page.reload();
  await page.getByRole('button', { name: 'Reprendre la partie sur ce téléphone' }).click();
  await page.locator('.g96-last').first().waitFor();
  ok(await page.locator('.g96-last').first().textContent() === lastTxt, 'après rechargement, la partie reprend exactement où elle en était');
  await page.context().close();
}

// ---------- démo : 4 téléphones simulés, les 8 jeux
{
  const page = await phonePage();
  await passAge(page);
  await page.getByRole('button', { name: 'Essayer avec 4 téléphones simulés' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.register .player').length >= 4, null, { timeout: 10000 });
  ok(await page.locator('.register .player').count() === 4, 'les 4 téléphones sont dans le registre');
  await shot(page, '07-demo-salle');
  ok(await h1count(page) === 1, 'salle d’attente : un seul titre principal');
  ok((await smallTargets(page)).length === 0, `salle d’attente : zones tactiles de 44 px (${await smallTargets(page)})`);

  console.log('Navigateur : Qui oserait… ?');
  await page.getByRole('button', { name: /^Jeu 01, Qui oserait/ }).click();
  await shot(page, '08-regles', false);
  await page.getByRole('button', { name: 'Lancer Qui oserait… ?' }).click();
  await page.locator('.ose-card').waitFor();
  await shot(page, '09-oserait-vote');
  ok(await h1count(page) === 1, 'en jeu : un seul titre principal');
  for (let r = 0; r < 2; r++) {
    await drive(page, '.reveal', clickIf(page, '.act .pgrid-btn:not([disabled])'));
    if (r === 0) { await page.waitForTimeout(500); await shot(page, '10-oserait-rapport'); }
    await settle(page, r === 0 ? '11-penalite' : null);
    await hostAct(page, 'Question suivante');
    await page.locator('.act .pgrid-btn').first().waitFor({ timeout: 8000 });
  }
  ok(true, 'Qui oserait : 2 questions jouées avec révélation');
  await page.getByRole('tab', { name: 'Hugo' }).click();
  await page.locator('.ose-card').waitFor();
  await shot(page, '12-oserait-telephone-hugo');
  await page.getByRole('tab', { name: 'Toi (hôte)' }).click();
  await page.locator('.act .pgrid-btn').first().click();
  await hostAct(page, 'Arrêter là');
  await hostAct(page, 'Confirmer');
  await page.locator('.report').waitFor({ timeout: 8000 });
  ok((await page.locator('.report').textContent()).includes('Rapport d’incident'), 'fin de partie : rapport d’incident');
  await settle(page);
  await shot(page, '13-oserait-rapport-fin');
  await page.getByRole('button', { name: 'Changer de jeu' }).click();

  console.log('Navigateur : Le 96');
  await launch(page, 'Le 96');
  await page.locator('.g96-hidden').waitFor();
  let played = 0;
  const tEnd = Date.now() + 120000;
  while (Date.now() < tEnd && played < 6) {
    const card = page.locator('.act-hand .pc-btn:not([disabled])');
    if (await card.count()) {
      await card.first().click();
      if (played === 0) await shot(page, '14-96-main');
      for (const k of '42') await page.locator('.keypad .key', { hasText: new RegExp(`^${k}$`) }).click();
      await page.locator('.keypad .key-ok').click();
      played++;
    }
    await settle(page, played === 1 ? '15-96-avis' : null);
    const bus = page.locator('.bus-btns .btn');
    if (await bus.count()) { await shot(page, '16-96-bus'); await bus.first().click(); }
    await page.waitForTimeout(250);
  }
  ok(played >= 6, `Le 96 : 6 cartes posées par l’hôte avec 3 joueurs automatiques (${played})`);
  await shot(page, '17-96-table');
  await hostAct(page, 'Terminer la partie');
  await hostAct(page, 'Confirmer');
  await page.locator('.report').waitFor();
  await settle(page);
  await shot(page, '17b-96-rapport');
  await page.getByRole('button', { name: 'Changer de jeu' }).click();

  console.log('Navigateur : Pipoteur');
  await launch(page, 'Pipoteur');
  await page.locator('.act-word').waitFor();
  await shot(page, '20-pipo-mot');
  await page.getByRole('button', { name: 'J’ai retenu, cacher' }).click();
  await hostAct(page, 'Commencer les indices');
  await page.locator('.pipo-order').waitFor();
  await shot(page, '21-pipo-indices');
  await hostAct(page, 'Tout le monde a parlé');
  await drive(page, '.pipo-out, .report', clickIf(page, '.act .pgrid-btn:not([disabled])'));
  await page.waitForTimeout(300);
  await shot(page, '22-pipo-hors-service');
  // l'élimination est tamponnée ; si c'était le pipoteur, la partie se termine directement sur le rapport
  ok(await page.locator('.pipo-out .tampon').count() === 1 || await page.locator('.report').count() === 1 || (await page.locator('.pipo-out').textContent()).includes('personne'), 'Pipoteur : élimination tamponnée « Mis hors service » (ou fin de partie)');
  await toLobby(page);

  console.log('Navigateur : Purple');
  await launch(page, 'Purple');
  await page.locator('.purple-pile').waitFor();
  let calls = 0;
  const tP = Date.now() + 25000;
  while (Date.now() < tP && calls < 3) {
    const btn = page.locator('.act-purple .purple-btns .btn:not([disabled])');
    if (await btn.count()) {
      if (calls === 0) await shot(page, '23-purple-annonce');
      await btn.first().click();
      calls++;
    }
    await settle(page);
    await page.waitForTimeout(250);
  }
  ok(calls >= 2, `Purple : l’hôte a annoncé (${calls})`);
  await shot(page, '24-purple-table');
  await toLobby(page);

  console.log('Navigateur : Hippodrome');
  await launch(page, 'Hippodrome');
  await page.locator('.horse-btn').first().click();
  await page.getByRole('button', { name: /^Parier/ }).click();
  await hostAct(page, 'Lancer la course');
  await page.waitForTimeout(5200);
  await shot(page, '25-hippodrome-course');
  await hostAct(page, 'Voir l’arrivée');
  await page.locator('.hippo-res').waitFor();
  await page.waitForTimeout(300);
  await shot(page, '26-hippodrome-resultat');
  await settle(page);
  await hostAct(page, 'Terminer');
  await hostAct(page, 'Confirmer');
  await page.locator('.report').waitFor();
  await shot(page, '27-hippodrome-rapport');
  await page.getByRole('button', { name: 'Changer de jeu' }).click();

  console.log('Navigateur : Toutankhamon');
  await launch(page, 'Toutankhamon');
  await page.getByRole('button', { name: 'J’ai mémorisé' }).waitFor();
  await shot(page, '28-tomb-memo');
  await page.getByRole('button', { name: 'J’ai mémorisé' }).click();
  await hostAct(page, 'Retourner la première carte', 12000);
  await page.locator('.tomb-flip').waitFor();
  await page.waitForTimeout(2500);
  await settle(page);
  await shot(page, '29-tomb-jeu');
  ok(await page.locator('.tomb .tomb-cell > .pc-back').count() === 9 && await page.locator('.tomb .flip3d').count() === 1, 'Toutankhamon : une carte retournée (en 3D), 9 encore cachées');
  await toLobby(page);

  console.log('Navigateur : Quiz sur les autres');
  await launch(page, 'Quiz sur les autres');
  await page.locator('.qo-card').waitFor();
  if (await page.locator('.qo-input').count()) {
    await page.locator('.qo-input').fill('Il dort au bureau depuis 2019');
    await shot(page, '30-quiz-ecrire');
    await page.getByRole('button', { name: 'Envoyer' }).click();
  }
  let votedShot = false;
  await drive(page, '.qo-list.is-reveal', async () => {
    const v = page.locator('.qo-vote:not([disabled])');
    if (await v.count()) {
      if (!votedShot) { await shot(page, '31-quiz-vote'); votedShot = true; }
      await v.first().click().catch(() => {});
    }
  }, 30000);
  await page.waitForTimeout(300);
  await shot(page, '32-quiz-revelation');
  ok(true, 'Quiz sur les autres : écriture, vote, révélation');
  await toLobby(page);
  ok((await smallTargets(page)).length === 0, `après les jeux : zones tactiles de 44 px (${await smallTargets(page)})`);

  console.log('Navigateur : Trouve la carte');
  await launch(page, 'Trouve la carte');
  await page.locator('.tc-table').waitFor();
  // l'hôte commence croupier : il voit sa carte ; dès qu'il peut, il passe le jeu puis devine à son tour
  let guesses = 0;
  let sawCard = false;
  let passed = false;
  const tT = Date.now() + 90000;
  while (Date.now() < tT && guesses < 2) {
    if (!sawCard && await page.locator('.tc-mine').count()) { sawCard = true; await shot(page, '37a-trouve-croupier'); }
    if (await page.locator('.act-tc').count()) {
      await page.locator('.act-tc .rank-grid .key').nth(6).click();
      if (guesses === 0) await shot(page, '37-trouve-essai');
      await page.locator('.act-tc .btn-main').click();
      guesses++;
    }
    if (await page.locator('.act .btn:has-text("Je passe le jeu")').count()) { await shot(page, '37b-trouve-passer'); await page.locator('.act .btn:has-text("Je passe le jeu")').click(); passed = true; }
    if (await page.locator('.hostbar .btn-main:has-text("Carte suivante")').count() && Math.random() < 0.3) await page.locator('.hostbar .btn-main').first().click().catch(() => {});
    await settle(page);
    await page.waitForTimeout(250);
  }
  ok(sawCard, 'Trouve la carte : le croupier voit sa carte sur son téléphone');
  ok(passed && guesses >= 1, `Trouve la carte : le croupier passe le jeu après 2 victoires, puis devine à son tour (${guesses} essais)`);
  await page.locator('.tc-verdict').first().waitFor({ timeout: 15000 }).catch(() => {});
  await shot(page, '38-trouve-resultat');
  await toLobby(page);

  // coupure réseau d'un joueur simulé
  await page.getByRole('tab', { name: 'Inès' }).click();
  await page.getByRole('button', { name: 'Couper le réseau' }).click();
  await page.waitForTimeout(400);
  await shot(page, '36-hors-ligne', false);
  ok(await page.locator('.banner-warn').count() > 0 && await page.getByRole('button', { name: 'Réessayer' }).count() === 1, 'le téléphone coupé affiche la perte de connexion avec « Réessayer »');
  await page.getByRole('button', { name: 'Réessayer' }).click();
  await page.waitForTimeout(700);
  ok(await page.locator('.banner-warn').count() === 0, '« Réessayer » rétablit la connexion sans perdre la partie');
  await page.context().close();
}

// ---------- démo sur grand écran
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 950 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(URL0);
  await passAge(page);
  await page.getByRole('button', { name: 'Essayer avec 4 téléphones simulés' }).click();
  await page.waitForFunction(() => document.querySelectorAll('.phone').length === 4, null, { timeout: 8000 });
  await page.waitForTimeout(800);
  await shot(page, '19-demo-ordinateur', false);
  ok(await page.locator('.phone').count() === 4, 'sur ordinateur, les 4 téléphones sont visibles côte à côte');
  await ctx.close();
}

ok(errors.length === 0, `aucune erreur JavaScript ni requête externe (${errors.slice(0, 3).join(' | ')})`);
console.log(`\n${pass} vérifications navigateur réussies, ${fail} échec(s)`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);

// Mode « un seul téléphone » dans un vrai navigateur : Pipoteur, Purple, Hippodrome, Toutankhamon et Quiz,
// avec l'écran « Passe le téléphone » pour tout ce qui est secret.
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
await new Promise((r) => server.listen(5174, r));
const URL0 = SITE ? `http://localhost:${5174}/hors-service/` : `http://localhost:${5174}/`;

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('  ✗', m); } };
const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
const has = async (sel) => (await page.locator(sel).count()) > 0;
const click = async (sel) => { const l = page.locator(sel).first(); if (await l.count()) { await l.click().catch(() => {}); return true; } return false; };

await page.goto(URL0);
await page.getByRole('button', { name: 'J’ai 18 ans ou plus' }).click();
await page.getByRole('button', { name: 'Jouer sur un seul téléphone' }).click();
for (const nick of ['Thierry', 'Julie', 'Marc']) {
  await page.locator('#local-nick').fill(nick);
  await page.getByRole('button', { name: `Ajouter ${nick}` }).click();
}
await page.getByRole('button', { name: 'Mettre en service à 3' }).click();
await page.getByRole('heading', { name: 'Soirée en service' }).waitFor();

async function launch(name) {
  await page.getByRole('button', { name: new RegExp(`^Jeu \\d\\d, ${name}`) }).click();
  await page.getByRole('button', { name: `Lancer ${name}` }).click();
}
async function toLobby() {
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByRole('button', { name: 'Revenir à la salle d’attente' }).click();
  await page.getByRole('heading', { name: 'Soirée en service' }).waitFor();
}
// pénalités et distributions de tous les joueurs du téléphone
async function settle() {
  for (let k = 0; k < 8; k++) {
    if (await has('.pen-gift')) {
      const plus = page.locator('.pen-gift .dist-who').first();
      for (let i = 0; i < 30 && !(await page.locator('.pen-gift .btn-main').isEnabled()); i++) await plus.click();
      await page.locator('.pen-gift .btn-main').click();
      await page.waitForTimeout(80);
      continue;
    }
    if (await click('.pen .btn-main')) { await page.waitForTimeout(80); continue; }
    break;
  }
}
async function hostAct(label) { return click(`.hostbar .btn:not([disabled]):has-text("${label}")`); }
// boucle générique : passer le téléphone, régler les pénalités, puis l'action propre au jeu
async function drive(doneSel, step, ms = 30000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await has(doneSel)) return true;
    const passBtn = page.getByRole('button', { name: /^C’est moi/ });
    if (await passBtn.count()) { await passBtn.click(); await page.waitForTimeout(60); }
    await settle();
    await step();
    await page.waitForTimeout(120);
  }
  console.log('    (écran)', (await page.locator('main').innerText()).slice(0, 500).replace(/\n+/g, ' | '));
  return false;
}

// ---------- Pipoteur
console.log('Un seul téléphone : Pipoteur');
await launch('Pipoteur');
let words = 0;
ok(await drive('.pipo-order', async () => {
  if (await has('.act-word')) { await click('.act-word .btn-main'); words++; }
}), 'Pipoteur : chacun découvre son mot en passant le téléphone');
ok(words === 3, `Pipoteur : 3 mots découverts (${words})`);
await shot('40-local-pipo-indices');
await hostAct('Tout le monde a parlé');
ok(await drive('.pipo-out, .report', async () => { await click('.local-act .pgrid-btn:not([disabled])'); }), 'Pipoteur : vote secret de chacun, puis élimination');
await shot('41-local-pipo-vote');
await toLobby();

// ---------- Purple
console.log('Un seul téléphone : Purple');
await launch('Purple');
let passed = false;
let calls = 0;
ok(await drive('.purple-last:has-text("passe la main")', async () => {
  if (await has('.purple-pass')) {
    if (!passed) await shot('42-local-purple-passer');
    passed = true;
    if (calls % 2 === 0) { await click('.purple-pass .btn'); return; }
  }
  if (await click('.act-purple .purple-btns .btn:not([disabled])')) calls++;
}, 60000), 'Purple : après 2 cartes réussies, le joueur peut passer la main');
ok(passed, 'Purple : le bouton « Je passe la main » apparaît après une série de 2');
await toLobby();

// ---------- Hippodrome
console.log('Un seul téléphone : Hippodrome');
await launch('Hippodrome');
let bets = 0;
ok(await drive('.hostbar .btn:not([disabled]):has-text("Lancer la course (3 paris)")', async () => {
  if (await has('.act-bet')) {
    await page.locator('.act-bet .horse-btn').nth(bets % 4).click();
    await page.locator('.act-bet .btn-main').click();
    bets++;
  }
}), 'Hippodrome : chacun parie à son tour');
await hostAct('Lancer la course');
await page.waitForTimeout(3500);
await hostAct('Voir l’arrivée');
await page.locator('.hippo-podium').waitFor({ timeout: 5000 });
ok(await page.locator('.hippo-podium li').count() === 4, 'Hippodrome : les quatre chevaux sont classés');
await shot('43-local-hippodrome-arrivee');
await settle();
await toLobby();

// ---------- Toutankhamon
console.log('Un seul téléphone : Toutankhamon');
await launch('Toutankhamon');
let memos = 0;
let reordered = false;
ok(await drive('.hostbar .btn:has-text("Retourner la première carte")', async () => {
  if (await has('.act-memo')) {
    const cards = page.locator('.act-memo .hand .pc-btn');
    const before = await cards.first().getAttribute('aria-label');
    const last = await cards.last().getAttribute('aria-label');
    await cards.first().click();
    await cards.last().click();
    const after = await cards.first().getAttribute('aria-label');
    if (memos === 0) { reordered = after === last && before !== after; await shot('44-local-tomb-memo'); }
    await page.getByRole('button', { name: 'J’ai mémorisé' }).click();
    memos++;
  }
}), 'Toutankhamon : chacun mémorise ses cartes en passant le téléphone');
ok(reordered, 'Toutankhamon : toucher deux cartes les échange');
await hostAct('Retourner la première carte');
await page.waitForTimeout(300);
let claimed = false;
ok(await drive('.claim', async () => {
  if (await has('.panel:has-text("Celui qui l’annonce")')) { await click('.panel .chips .btn'); return; }
  if (await has('.panel .pgrid-btn')) { await click('.panel .pgrid-btn'); claimed = true; }
}), 'Toutankhamon : annonce faite depuis le téléphone commun');
ok(await drive('.claim.is-ok, .claim.is-true, .claim.is-liar', async () => { await click('.local-act .act-judge .btn-main'); }), 'Toutankhamon : le joueur visé répond (il croit et boit)');
await shot('45-local-tomb-annonce');
let flips = 0;
ok(await drive('.act-recall, .pass', async () => {
  if (await hostAct('Retourner la carte suivante')) { flips++; return; }
  if (await hostAct('test de mémoire')) { await page.waitForTimeout(100); await hostAct('Confirmer'); }
}, 40000), 'Toutankhamon : tout le tombeau est retourné');
let recalls = 0;
ok(await drive('.report', async () => {
  if (await has('.act-recall')) {
    const need = await page.locator('.act-recall .recall-slot').count();
    for (let i = 0; i < need; i++) await page.locator('.act-recall .rank-grid .key').nth(i).click();
    await page.locator('.act-recall .btn-main').click();
    recalls++;
  }
}), 'Toutankhamon : test de mémoire de chaque joueur, puis rapport');
ok(recalls === 3, `Toutankhamon : 3 tests de mémoire (${recalls})`);
await shot('46-local-tomb-rapport');
await settle();
await page.getByRole('button', { name: 'Changer de jeu' }).click();

// ---------- Quiz sur les autres
console.log('Un seul téléphone : Quiz sur les autres');
await launch('Quiz sur les autres');
let writes = 0;
ok(await drive('.qo-list.is-reveal', async () => {
  if (await has('.local-act .qo-input')) {
    await page.locator('.local-act .qo-input').fill(`Réponse ${writes + 1}`);
    await page.locator('.local-act .btn-main').click();
    writes++;
    return;
  }
  await click('.local-act .qo-vote:not([disabled])');
}), 'Quiz : réponses écrites puis votes, en passant le téléphone');
ok(writes === 2, `Quiz : les 2 joueurs non visés écrivent (${writes})`);
await shot('47-local-quiz');
await settle();

ok(errors.length === 0, `aucune erreur JavaScript (${errors.slice(0, 3).join(' | ')})`);
console.log(`\n${pass} vérifications (un seul téléphone) réussies, ${fail} échec(s)`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);

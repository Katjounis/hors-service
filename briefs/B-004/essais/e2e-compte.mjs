// B-004 (S-003) : essais de bout en bout dans un vrai navigateur, sur la copie cb8efdb modifiée (index.html, compte.js,
// cartes-skins.js, sw.js), avec le serveur des comptes en local (base SQLite au schéma de D1, mode essai @essai.test)
// et le serveur de salons SIMULÉ des essais précédents (pas le vrai serveur de Samuel).
// node --no-warnings e2e-compte.mjs <racine du site> <fichier résultat>
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync('vues', { recursive: true }); mkdirSync('resultats', { recursive: true });
import { createRequire } from 'node:module';
import { servir } from './outils/serveur.mjs';
import { Salons } from './outils/salon.mjs';
import { Releve, clic, attendre } from './outils/releve.mjs';
import { demarrer } from '../serveur-comptes/test/local.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const [,, racine = new URL('../site', import.meta.url).pathname, sortie = 'resultats/e2e-compte.txt'] = process.argv;
const PORT = 5410, PORT_API = 8793, API = `http://localhost:${PORT_API}`;
const R = new Releve();
const server = await servir(racine, PORT); const srv = await demarrer(PORT_API); const browser = await chromium.launch(); const salons = new Salons();
const appelsApi = [];
async function telephone(nom, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', deviceScaleFactor: opts.dpr || 1, reducedMotion: opts.reduit ? 'reduce' : 'no-preference' });
  await ctx.route('https://**', (r) => r.abort()); await salons.brancher(ctx);
  await ctx.addInitScript((api) => { window.HS_COMPTES_URL = api; }, API);
  await ctx.addInitScript(() => { let vrai; Object.defineProperty(window, 'HS_GENRE_MAJ', { configurable: true, get() { return vrai && ((app) => { window.__app = app; return vrai(app); }); }, set(f) { vrai = f; } }); });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(nom + ' pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errs.push(nom + ' console: ' + m.text()); });
  page.on('request', (q) => { if (q.url().startsWith(API)) appelsApi.push([nom, q.method(), new URL(q.url()).pathname]); });
  await page.goto(`http://localhost:${PORT}/${opts.hash || ''}`); await page.waitForTimeout(900);
  return { page, ctx, errs, nom };
}
const vue = (t, n) => t.page.screenshot({ path: `vues/e2e-${n}.png` });
const lireLS = (t, k) => t.page.evaluate((k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return localStorage.getItem(k); } }, k);
const texteFeuille = (t) => t.page.evaluate(() => { const f = document.querySelector('.hsc-sheet'); return f ? f.innerText.replace(/\s+/g, ' ').trim() : ''; });
async function connecter(t, email, depuis = 'accueil') {
  if (depuis === 'accueil') await t.page.locator('.hsc-accueil').click(); else if (depuis === 'menu') await clic(t.page, 'Mon compte', { dans: '.menu' }); else await t.page.locator('.hsc-rejoindre button').click();
  await t.page.waitForTimeout(300);
  await t.page.fill('#hsc-email', email); await clic(t.page, 'Recevoir un code', { dans: '.hsc-sheet' }); await t.page.waitForTimeout(500);
  const code = await t.page.evaluate(() => ((document.querySelector('.hsc-sheet .panel b') || {}).textContent || '').match(/\d{6}/));
  await t.page.fill('#hsc-code', code[0]); await t.page.waitForTimeout(1300);
}
const fermerFeuille = async (t) => { await t.page.keyboard.press('Escape'); await t.page.waitForTimeout(250); };
async function table(t, joueurs) {
  await t.page.getByRole('button', { name: 'Jouer sur un seul téléphone' }).click(); await t.page.waitForTimeout(500);
  for (const n of joueurs) { await t.page.fill('#local-nick', n); await t.page.getByRole('button', { name: 'Ajouter ' + n, exact: true }).click(); await t.page.waitForTimeout(200); }
  await t.page.getByRole('button', { name: `Mettre en service à ${joueurs.length}` }).click(); await t.page.waitForTimeout(900);
}
async function lancerJeu(t, bouton) {
  await clic(t.page, /^Tous \d+$/, { pause: 200 });
  await t.page.getByRole('button', { name: bouton, exact: true }).click(); await t.page.waitForTimeout(300);
  await clic(t.page, /^Lancer /, { pause: 200 });
  await attendre(t.page, () => { const a = window.__app; return a && a.S && a.S.game; });
  await t.page.waitForTimeout(900);
}
async function quitterJeu(t) {
  await clic(t.page, 'Quitter', { facultatif: true, pause: 200 }); await clic(t.page, 'Quitter le jeu', { facultatif: true, pause: 200 });
  await attendre(t.page, () => { const a = window.__app; return a && a.S && !a.S.game; }); await t.page.waitForTimeout(300);
}
const compteServeur = async (t) => { const s = await lireLS(t, 'hs:compte'); const r = await fetch(API + '/compte', { headers: { authorization: 'Bearer ' + s.jeton } }); return r.ok ? (await r.json()).compte : { statut: r.status }; };
const cartesEcran = (t) => t.page.evaluate(() => { const pcs = [...document.querySelectorAll('.pc')]; return { n: pcs.length, habillees: pcs.filter((p) => p.hasAttribute('data-skin')).length, animees: document.querySelectorAll('.pc-skin:not(.hsc-fige)').length, dos: pcs.filter((p) => p.classList.contains('pc-back')).length }; });

try {
  // --- A. Sans compte, rien ne change ---
  const SA = 'sans compte, l’appli marche comme avant';
  const A = await telephone('A');
  await vue(A, 'a1-accueil');
  R.ok(SA, await A.page.locator('.hsc-accueil').count() === 1, 'bouton « Mon compte » absent de l’accueil');
  R.egal(SA, await A.page.locator('.hsc-accueil').getAttribute('aria-label'), 'Mon compte', 'nom du bouton de l’accueil');
  await table(A, ['Alice', 'Bob', 'Chloé']);
  await lancerJeu(A, 'Jeu 08, Trouve la carte');
  const c0 = await cartesEcran(A);
  R.ok(SA, c0.n > 0 && c0.habillees === 0, `cartes de l’appli sans habillage : ${JSON.stringify(c0)}`);
  R.ok(SA, !(await A.page.evaluate(() => !!window.HS_CARTES)), 'cartes-skins.js chargé sans compte');
  R.ok(SA, appelsApi.length === 0, 'appels au serveur des comptes sans compte : ' + JSON.stringify(appelsApi));
  R.ok(SA, !!(await lireLS(A, 'hs:plays'))._last, 'hs:plays non écrit au début de partie');
  // menu de droite pendant la soirée
  await A.page.getByRole('button', { name: 'Menu', exact: true }).click(); await A.page.waitForTimeout(300);
  const menu = await A.page.evaluate(() => [...document.querySelectorAll('.menu .menu-item')].map((b) => b.textContent));
  R.egal(SA, menu[0], 'Mon compte', 'première entrée du menu de droite');
  R.ok(SA, menu.length >= 6 && menu.includes('Compteur de la soirée'), 'entrées de l’appli toujours là : ' + menu.join(' | '));
  await vue(A, 'a2-menu');
  await quitterJeu(A).catch(() => {});

  // --- B. Connexion par code (mode essai) ---
  const SB = 'connexion par e-mail et code';
  await A.page.keyboard.press('Escape'); await A.page.waitForTimeout(200);
  await clic(A.page, 'Mon compte', { dans: '.menu', facultatif: true }); await A.page.waitForTimeout(300);
  if (!(await A.page.locator('.hsc-sheet').count())) { await A.page.getByRole('button', { name: 'Menu', exact: true }).click(); await A.page.waitForTimeout(300); await clic(A.page, 'Mon compte', { dans: '.menu' }); await A.page.waitForTimeout(300); }
  R.ok(SB, await A.page.locator('.hsc-sheet[role="dialog"][aria-modal="true"]').count() === 1, 'feuille « Mon compte » ouverte depuis le menu');
  R.ok(SB, await A.page.evaluate(() => document.activeElement && document.activeElement.id === 'hsc-email'), 'le champ e-mail n’a pas le focus à l’ouverture');
  await A.page.fill('#hsc-email', 'pas-une-adresse'); await clic(A.page, 'Recevoir un code', { dans: '.hsc-sheet' }); await A.page.waitForTimeout(200);
  R.ok(SB, (await texteFeuille(A)).includes('Vérifie l’adresse e-mail.'), 'adresse invalide sans message');
  await A.page.fill('#hsc-email', 'bit@essai.test'); await clic(A.page, 'Recevoir un code', { dans: '.hsc-sheet' }); await A.page.waitForTimeout(600);
  const tB = await texteFeuille(A);
  R.ok(SB, /Code envoyé à bit@essai\.test/.test(tB) && /Mode essai, aucun e-mail envoyé\s?:\s?le code est \d{6}/.test(tB), 'étape du code : ' + tB.slice(0, 200));
  await vue(A, 'b1-code');
  await A.page.fill('#hsc-code', '00000'); await clic(A.page, 'Me connecter', { dans: '.hsc-sheet' }); await A.page.waitForTimeout(200);
  R.ok(SB, (await texteFeuille(A)).includes('Code à 6 chiffres'), 'code à 5 chiffres envoyé quand même');
  const bon = tB.match(/le code est (\d{6})/)[1]; const faux = bon === '000000' ? '111111' : '000000';
  await A.page.fill('#hsc-code', faux); await A.page.waitForTimeout(900);
  R.ok(SB, (await texteFeuille(A)).includes('Code incorrect.'), 'mauvais code sans message');
  await A.page.fill('#hsc-code', bon); await A.page.waitForTimeout(1300);
  const tB2 = await texteFeuille(A);
  R.ok(SB, tB2.includes('Connecté avec bit@essai.test') && tB2.includes('1 sur 100'), 'vue du compte après connexion : ' + tB2.slice(0, 160));
  R.ok(SB, !!(await lireLS(A, 'hs:compte')).jeton, 'jeton non gardé sur le téléphone');
  await vue(A, 'b2-compte');
  await fermerFeuille(A);
  R.ok(SB, (await A.page.locator('.hsc-sheet').count()) === 0 && (await A.page.locator('.sheet .menu').count()) === 1, 'Échap ferme « Mon compte » sans fermer le menu de l’appli');
  await A.page.keyboard.press('Escape'); await A.page.waitForTimeout(200);

  // --- C. Déblocage en jouant ---
  const SC = 'cartes débloquées en jouant';
  const avant = (await compteServeur(A)).parties;
  await lancerJeu(A, 'Jeu 04, Purple'); await quitterJeu(A);
  await lancerJeu(A, 'Jeu 08, Trouve la carte');
  await A.page.waitForTimeout(800);
  const toastTxt = await A.page.evaluate(() => [...document.querySelectorAll('.hsc-toasts .toast')].map((x) => x.textContent).join(' | '));
  const cs = await compteServeur(A);
  R.egal(SC, cs.parties, avant + 2, 'parties comptées sur le serveur');
  R.ok(SC, cs.cartes.length === 2, 'cartes après 2 parties : ' + cs.cartes.join(', '));
  R.ok(SC, /Nouvelle carte\s?:/.test(toastTxt) && /Voir/.test(toastTxt), 'annonce de la nouvelle carte : « ' + toastTxt + ' »');
  await vue(A, 'c1-annonce');
  await quitterJeu(A);
  // hors ligne : la partie attend et part au retour du réseau
  await A.ctx.setOffline(true);
  await lancerJeu(A, 'Jeu 04, Purple'); await quitterJeu(A);
  const attente = await lireLS(A, 'hs:compte-attente');
  R.ok(SC, Array.isArray(attente) && attente.length === 1, 'hors ligne : partie mise de côté : ' + JSON.stringify(attente));
  await A.ctx.setOffline(false); await A.page.evaluate(() => window.dispatchEvent(new Event('online'))); await A.page.waitForTimeout(1200);
  R.egal(SC, (await compteServeur(A)).parties, avant + 3, 'partie hors ligne comptée au retour du réseau');
  R.egal(SC, JSON.stringify(await lireLS(A, 'hs:compte-attente')), '[]', 'file d’attente vidée');
  // même partie vue deux fois (rechargement pendant la partie) : comptée une fois
  await lancerJeu(A, 'Jeu 04, Purple'); const p1 = (await compteServeur(A)).parties; await A.page.reload(); await A.page.waitForTimeout(1500);
  const repr = A.page.getByRole('button', { name: /Reprendre la partie/ }); if (await repr.count()) { await repr.first().click(); await A.page.waitForTimeout(1200); }
  R.egal(SC, (await compteServeur(A)).parties, p1, 'partie reprise après rechargement comptée deux fois');
  await quitterJeu(A);

  // --- D. Collection et choix des cartes ---
  const SD = 'collection et cartes en jeu';
  // pour voir toutes les raretés, le compte reçoit 60 parties de plus (directement sur le serveur local)
  const s = await lireLS(A, 'hs:compte');
  for (let i = 0; i < 60; i++) await fetch(API + '/compte/partie', { method: 'POST', headers: { authorization: 'Bearer ' + s.jeton, 'content-type': 'application/json' }, body: JSON.stringify({ jeu: 'le96', cle: 'essai:' + i }) });
  const cs2 = await compteServeur(A); const nb = (r) => cs2.cartes.filter((x) => x[0] === r).length;
  R.ok(SD, nb('L') === 1 && nb('E') === 2, `après 64 parties : ${cs2.cartes.length} cartes (L ${nb('L')}, E ${nb('E')}, R ${nb('R')}, C ${nb('C')})`);
  await A.page.locator('.topbar').count();
  await A.page.getByRole('button', { name: 'Menu', exact: true }).click(); await A.page.waitForTimeout(300); await clic(A.page, 'Mon compte', { dans: '.menu' }); await A.page.waitForTimeout(800);
  R.ok(SD, (await texteFeuille(A)).includes(`${cs2.cartes.length} sur 100`), 'compteur à jour à l’ouverture');
  await clic(A.page, 'Voir ma collection', { dans: '.hsc-sheet' }); await A.page.waitForTimeout(1800);
  const vign = await A.page.evaluate(() => ({ n: document.querySelectorAll('.hsc-vignette[data-id]').length, dessinees: [...document.querySelectorAll('[data-dos]')].filter((x) => x.querySelector('svg')).length, animees: [...document.querySelectorAll('.hsc-v-carte')].filter((x) => x.getAnimations({ subtree: true }).length).length }));
  R.egal(SD, vign.n, cs2.cartes.length, 'vignettes de « Toutes » = cartes du compte');
  R.ok(SD, vign.dessinees > 0 && vign.animees === 0, 'vignettes dessinées et immobiles : ' + JSON.stringify(vign));
  await vue(A, 'd1-collection');
  await clic(A.page, /^Légendaires/, { dans: '.hsc-filtres' }); await A.page.waitForTimeout(600);
  const leg = await A.page.evaluate(() => ({ a: document.querySelectorAll('.hsc-vignette[data-id]').length, v: document.querySelectorAll('.hsc-verrou').length }));
  R.ok(SD, leg.a === 1 && leg.v === 4, 'filtre Légendaires : 1 débloquée, 4 à débloquer : ' + JSON.stringify(leg));
  await vue(A, 'd2-legendaires');
  const idLeg = await A.page.locator('.hsc-vignette[data-id]').first().getAttribute('data-id');
  await A.page.locator('.hsc-vignette[data-id]').first().click(); await A.page.waitForTimeout(1000);
  const anim = await A.page.evaluate(() => document.querySelector('.hsc-grande').getAnimations({ subtree: true }).length);
  R.ok(SD, anim > 0, 'la grande carte légendaire ne bouge pas (' + anim + ' animations)');
  await A.page.locator('.hsc-grande').click(); await A.page.waitForTimeout(800);
  R.ok(SD, await A.page.evaluate(() => document.querySelector('.hsc-grande').classList.contains('is-recto')), 'la carte ne se retourne pas au toucher');
  await vue(A, 'd3-detail');
  await clic(A.page, 'Utiliser pour mes cartes', { dans: '.hsc-sheet' }); await A.page.waitForTimeout(1200);
  R.egal(SD, await lireLS(A, 'hs:skin-actif'), idLeg, 'skin choisi gardé sur le téléphone');
  R.egal(SD, (await compteServeur(A)).skin, idLeg, 'skin choisi enregistré sur le compte');
  await vue(A, 'd4-choisi');
  await A.page.keyboard.press('Escape'); await A.page.waitForTimeout(200); await A.page.keyboard.press('Escape'); await A.page.waitForTimeout(200);
  // en jeu : Toutankhamon (beaucoup de dos), Trouve la carte (grande carte), Hippodrome (petites cartes)
  for (const [bouton, court] of [['Jeu 06, Toutankhamon', 'tout'], ['Jeu 08, Trouve la carte', 'trouve'], ['Jeu 05, Hippodrome', 'hippo']]) {
    await lancerJeu(A, bouton); await A.page.waitForTimeout(3500);
    const c = await cartesEcran(A);
    R.ok(SD, c.n > 0 && c.habillees === c.n && c.animees <= 6, `${court} : ${JSON.stringify(c)}`);
    // les dos ne dépendent pas de la carte : tous identiques à l'écran
    const dos = await A.page.evaluate(() => [...new Set([...document.querySelectorAll('.pc-back > .pc-skin')].map((o) => o.innerHTML.replace(/\b(c|k)k?[0-9a-z]+\b/g, 'ID').replace(/(id="|url\(#)[^")]+/g, '$1ID')))].length);
    R.ok(SD, c.dos === 0 || dos === 1, `${court} : dos différents entre eux (${dos} versions)`);
    // les faces gardent la valeur de l'appli (aria-label) et la face de l'appli reste visible sous 44 px
    const lisible = await A.page.evaluate(() => [...document.querySelectorAll('.pc:not(.pc-back)')].map((p) => { const o = p.querySelector(':scope > .pc-skin'), w = p.getBoundingClientRect().width, coin = p.querySelector('.pc-corner'); return { label: p.getAttribute('aria-label'), w: Math.round(w), skinVisible: !!o && getComputedStyle(o).display !== 'none', coinVisible: !!coin && getComputedStyle(coin).visibility === 'visible' }; }));
    R.ok(SD, lisible.every((x) => /^(10|[2-9AVDR]) [♠♥♦♣]$/.test(x.label) && (x.w <= 46 ? !x.skinVisible && x.coinVisible : x.skinVisible)), `${court} : faces : ${JSON.stringify(lisible.slice(0, 6))}`);
    await vue(A, 'd5-' + court);
    await quitterJeu(A);
  }
  // dimensions des cartes identiques avec et sans skin
  await lancerJeu(A, 'Jeu 06, Toutankhamon'); await A.page.waitForTimeout(3500);
  const tailles = () => A.page.evaluate(() => [...document.querySelectorAll('.pc')].map((p) => p.offsetWidth + 'x' + p.offsetHeight + '@' + p.offsetLeft + ',' + p.offsetTop).join(' '));
  const avecSkin = await tailles(); await A.page.evaluate(() => window.HS_CARTES.activer(null)); await A.page.waitForTimeout(300); const sansSkin = await tailles();
  R.egal(SD, avecSkin, sansSkin, 'tailles et places des cartes avec et sans skin');
  await A.page.evaluate((id) => window.HS_CARTES.activer(id), idLeg); await A.page.waitForTimeout(400);
  // fluidité : images par seconde pendant 2 s, avec le skin légendaire, puis sans
  const ips = () => A.page.evaluate(() => new Promise((ok) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else ok(Math.round(n / ((performance.now() - t0) / 1000))); }; requestAnimationFrame(f); }));
  const ipsAvec = await ips(); await A.page.evaluate(() => window.HS_CARTES.activer(null)); const ipsSans = await ips(); await A.page.evaluate((id) => window.HS_CARTES.activer(id), idLeg);
  R.ok(SD, ipsAvec >= 50, `images par seconde avec le skin : ${ipsAvec} (sans : ${ipsSans})`);
  R.note(`fluidité dans Toutankhamon (Chromium sans carte graphique) : ${ipsAvec} images/s avec le skin légendaire, ${ipsSans} sans`);
  // (la fluidité des skins lourds, cartes animées comprises, est mesurée à part : perf-skins.mjs)
  // réglage « Animer mes cartes : Non »
  await A.page.getByRole('button', { name: 'Menu', exact: true }).click(); await A.page.waitForTimeout(300); await clic(A.page, 'Mon compte', { dans: '.menu' }); await A.page.waitForTimeout(500);
  await clic(A.page, 'Non', { dans: '.hsc-sheet' }); await A.page.waitForTimeout(400);
  R.egal(SD, (await cartesEcran(A)).animees, 0, 'cartes animées après « Animer mes cartes : Non »');
  await clic(A.page, 'Oui', { dans: '.hsc-sheet' }); await A.page.waitForTimeout(400);
  await A.page.keyboard.press('Escape'); await A.page.waitForTimeout(200); await A.page.keyboard.press('Escape'); await A.page.waitForTimeout(200);
  await quitterJeu(A);

  // --- E. Deuxième téléphone : perso et cartes retrouvés ---
  const SE = 'autre téléphone, perso retrouvé, rejoindre par QR code';
  // A crée un salon avec le perso « Bit » (le profil part sur le compte)
  await A.page.goto(`http://localhost:${PORT}/`); await A.page.waitForTimeout(1200);
  await A.page.getByRole('button', { name: /Chacun son téléphone/ }).click(); await A.page.waitForTimeout(400);
  await A.page.getByRole('button', { name: /Créer un salon/ }).click(); await A.page.waitForTimeout(400);
  await A.page.fill('#create-nick', 'Bit'); await A.page.getByRole('radio', { name: 'Masculin', exact: true }).click();
  await A.page.getByRole('button', { name: 'Mettre la soirée en service', exact: true }).click(); await A.page.waitForTimeout(2600);
  const persoServeur = (await compteServeur(A)).perso;
  R.ok(SE, persoServeur && persoServeur.nick === 'Bit', 'perso de A enregistré sur le compte : ' + JSON.stringify(persoServeur));
  // B arrive par le lien du QR code (#ESSA), sans rien sur le téléphone
  const B = await telephone('B', { hash: '#ESSA' });
  R.ok(SE, await B.page.locator('#join-code').count() === 1, 'écran « Rejoindre » ouvert par le lien');
  const pj = await B.page.evaluate(() => (document.querySelector('.hsc-rejoindre') || {}).innerText || '');
  R.ok(SE, /Tu as un compte\s?\?/.test(pj), 'invitation à se connecter sur l’écran Rejoindre : « ' + pj + ' »');
  await vue(B, 'e1-rejoindre');
  await connecter(B, 'bit@essai.test', 'rejoindre');
  await B.page.waitForTimeout(1800);
  R.egal(SE, await B.page.inputValue('#join-code').catch(() => ''), 'ESSA', 'code du salon gardé après le rechargement');
  R.egal(SE, await B.page.inputValue('#join-nick').catch(() => ''), 'Bit', 'pseudo du compte dans le formulaire');
  R.egal(SE, JSON.stringify(await lireLS(B, 'hs:profile')), JSON.stringify(persoServeur), 'perso du compte écrit sur B');
  const toastB = await B.page.evaluate(() => [...document.querySelectorAll('.hsc-toasts .toast')].map((x) => x.textContent).join(' | '));
  R.ok(SE, /Perso repris/.test(toastB), 'annonce « Perso repris » : ' + toastB);
  R.ok(SE, /Connecté\s?:/.test(await B.page.evaluate(() => document.querySelector('.hsc-rejoindre').innerText)), 'panneau Rejoindre en mode connecté');
  await vue(B, 'e2-rejoindre-connecte');
  await B.page.getByRole('button', { name: 'Rejoindre', exact: true }).click(); await B.page.waitForTimeout(1800);
  const profils = salons.journal.filter((x) => x.m.t === 'profile').map((x) => x.m.name);
  R.ok(SE, profils.filter((n) => n === 'Bit').length >= 2, 'B entre dans le salon avec le perso du compte : ' + JSON.stringify(profils));
  R.egal(SE, await lireLS(B, 'hs:skin-actif'), idLeg, 'skin du compte repris sur B');
  // C a déjà un perso « Julie » : on lui demande lequel garder
  const C = await telephone('C');
  await C.page.evaluate(() => localStorage.setItem('hs:profile', JSON.stringify({ nick: 'Julie', av: 1, drink: false, lim: 2 })));
  await C.page.reload(); await C.page.waitForTimeout(900);
  await connecter(C, 'bit@essai.test');
  const tC = await texteFeuille(C);
  R.ok(SE, /Ce téléphone a un autre perso, «\s?Julie\s?»/.test(tC) && /Reprendre «\s?Bit\s?»/.test(tC) && /Garder «\s?Julie\s?»/.test(tC), 'choix entre les deux persos : ' + tC.slice(0, 240));
  await vue(C, 'e3-deux-persos');
  await clic(C.page, /^Reprendre/, { dans: '.hsc-sheet' }); await C.page.waitForTimeout(1600);
  R.egal(SE, ((await lireLS(C, 'hs:profile')) || {}).nick, 'Bit', 'perso du compte repris sur C');

  // --- F. Anglais ---
  const SF = 'anglais';
  await C.page.getByRole('button', { name: 'English', exact: true }).click(); await C.page.waitForTimeout(900);
  R.egal(SF, await C.page.locator('.hsc-accueil').getAttribute('aria-label'), 'My account', 'bouton de l’accueil en anglais');
  await C.page.locator('.hsc-accueil').click(); await C.page.waitForTimeout(600);
  const tF = await texteFeuille(C);
  R.ok(SF, /My account/.test(tF) && /Signed in as bit@essai\.test/.test(tF) && /See my collection/.test(tF) && !/Connecté|Voir ma/.test(tF), 'feuille en anglais : ' + tF.slice(0, 220));
  await clic(C.page, 'See my collection', { dans: '.hsc-sheet' }); await C.page.waitForTimeout(1600);
  const nomsEn = await C.page.evaluate(() => [...document.querySelectorAll('.hsc-v-nom')].map((x) => x.textContent.trim()).slice(0, 4));
  R.ok(SF, nomsEn.length > 0 && !nomsEn.some((x) => /Service d’origine|Roi du Chaos|Jackpot Infini|Trou Noir|Dieu du Purple|Hors Service Ultime/.test(x)), 'noms des cartes en anglais : ' + nomsEn.join(', '));
  await vue(C, 'f1-anglais');
  await fermerFeuille(C);
  await C.page.getByRole('button', { name: /Privacy/ }).first().click(); await C.page.waitForTimeout(600);
  const conf = await C.page.evaluate(() => (document.querySelector('.legal') || document.body).innerText);
  R.ok(SF, /Optional account, no ads/.test(conf) && /With an account \(optional\)/.test(conf) && /If you sign in under “My account”/.test(conf), 'confidentialité en anglais');
  await vue(C, 'f2-privacy');

  // --- G. Confidentialité en français ---
  const SG = 'confidentialité';
  const Dp = await telephone('D');
  await Dp.page.getByRole('button', { name: /Confidentialité/ }).first().click(); await Dp.page.waitForTimeout(600);
  const confFr = await Dp.page.evaluate(() => (document.querySelector('.legal') || document.body).innerText);
  R.ok(SG, /Compte facultatif, pas de publicité/.test(confFr) && /Avec un compte \(facultatif\)/.test(confFr) && /Supprimer mon compte/.test(confFr) && !/Pas de compte, pas de publicité/.test(confFr), 'texte de confidentialité à jour');
  await vue(Dp, 'g1-confidentialite');

  // --- H. Moins d'animations demandé par le téléphone ---
  const SH = 'moins d’animations';
  const E = await telephone('E', { reduit: true });
  await connecter(E, 'bit@essai.test');
  await fermerFeuille(E);
  await table(E, ['Alice', 'Bob', 'Chloé']); await lancerJeu(E, 'Jeu 06, Toutankhamon'); await E.page.waitForTimeout(2500);
  const cE = await cartesEcran(E);
  R.ok(SH, cE.habillees > 0 && cE.animees === 0, 'cartes habillées mais immobiles : ' + JSON.stringify(cE));
  const animsE = await E.page.evaluate(() => [...document.querySelectorAll('.pc-skin')].reduce((n, o) => n + o.getAnimations({ subtree: true }).length, 0));
  R.egal(SH, animsE, 0, 'animations en cours dans les cartes');

  // --- I. Déconnexion et suppression ---
  const SI = 'déconnexion et suppression';
  await E.page.getByRole('button', { name: 'Menu', exact: true }).click(); await E.page.waitForTimeout(300); await clic(E.page, 'Mon compte', { dans: '.menu' }); await E.page.waitForTimeout(600);
  await clic(E.page, 'Me déconnecter', { dans: '.hsc-sheet' }); await E.page.waitForTimeout(900);
  R.ok(SI, !(await lireLS(E, 'hs:compte')) && !(await lireLS(E, 'hs:skin-actif')), 'jeton et skin effacés du téléphone');
  R.egal(SI, (await cartesEcran(E)).habillees, 0, 'cartes revenues à l’origine après déconnexion');
  R.ok(SI, /Déconnecté/.test(await texteFeuille(E)), 'message de déconnexion');
  const jetonC = (await lireLS(C, 'hs:compte')).jeton;
  await C.page.goto(`http://localhost:${PORT}/`); await C.page.waitForTimeout(900);
  await C.page.locator('.hsc-accueil').click(); await C.page.waitForTimeout(500);
  await clic(C.page, 'Delete my account', { dans: '.hsc-sheet' }); await C.page.waitForTimeout(300);
  R.ok(SI, /Confirm: delete everything/.test(await texteFeuille(C)), 'demande de confirmation avant suppression');
  await vue(C, 'i1-confirmer');
  await clic(C.page, 'Confirm: delete everything', { dans: '.hsc-sheet' }); await C.page.waitForTimeout(900);
  const apres = await fetch(API + '/compte', { headers: { authorization: 'Bearer ' + jetonC } });
  R.egal(SI, apres.status, 401, 'compte supprimé sur le serveur');
  R.ok(SI, ((await lireLS(C, 'hs:profile')) || {}).nick === 'Bit', 'le perso reste sur le téléphone après suppression');
  R.ok(SI, /Account deleted/.test(await texteFeuille(C)), 'message de suppression');

  // --- erreurs ---
  const tous = [A, B, C, Dp, E].flatMap((t) => t.errs);
  R.ok('erreurs dans la console', tous.length === 0, tous.slice(0, 5).join(' | '));
} catch (e) {
  R.ok('déroulé', false, 'arrêt : ' + (e.stack || e.message).split('\n').slice(0, 3).join(' '));
}
await browser.close(); server.close(); srv.fermer();
const texte = [`Essais de bout en bout B-004 (${new Date().toISOString()})`, ...R.bilan(), '', 'Échecs :', ...(R.echecs.length ? R.echecs : ['aucun']), '', 'Notes :', ...R.notes].join('\n');
writeFileSync(sortie, texte); console.log(texte);
process.exit(R.nbEchecs ? 1 : 0);

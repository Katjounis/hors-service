// Essai de l'aperçu dans Chromium : chargement, nombre de cartes, carte en grand, retournement, main, moins d'animations.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const page = process.argv[2], dossier = process.argv[3] || '/tmp';
const b = await chromium.launch();
const res = [];
const ok = (nom, v, detail = '') => { res.push((v ? 'OK  ' : 'ÉCHEC ') + nom + (detail ? ' (' + detail + ')' : '')); };
for (const [nomVue, vp, ech] of [['ordinateur', { width: 1280, height: 900 }, 1], ['telephone', { width: 390, height: 844 }, 2]]) {
  const p = await b.newPage({ viewport: vp, deviceScaleFactor: ech });
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message)); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()); });
  await p.goto('file://' + page); await p.waitForTimeout(2500);
  const n = await p.$$eval('#jeu .carte', (l) => l.length);
  ok(nomVue + ' : 52 cartes dans le jeu', n === 52, String(n));
  const imgsOk = await p.$$eval('#jeu .carte img', (l) => l.filter((i) => i.complete && i.naturalWidth > 0).length);
  ok(nomVue + ' : images des cartes chargées', imgsOk === 104, imgsOk + ' sur 104');
  const largeurPage = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(nomVue + ' : pas de défilement horizontal', largeurPage <= 0, largeurPage + ' px');
  await p.screenshot({ path: `${dossier}/apercu-${nomVue}.png`, fullPage: false });
  // carte en grand
  await p.click('#jeu .carte >> nth=24');
  await p.waitForTimeout(400);
  const vueOuverte = await p.$eval('#vue', (v) => !v.hidden);
  const titre = await p.$eval('#vue-titre', (t) => t.textContent);
  ok(nomVue + ' : la carte s’ouvre en grand', vueOuverte && /Dame de cœur/.test(titre), titre);
  await p.screenshot({ path: `${dossier}/apercu-${nomVue}-grand.png` });
  await p.click('#vue-retourner'); await p.waitForTimeout(700);
  const ret = await p.$eval('#vue-carte .carte', (c) => c.classList.contains('retournee'));
  const angle = await p.$eval('#vue-carte .pivot', (e) => getComputedStyle(e).transform);
  ok(nomVue + ' : retournement', ret && angle !== 'none', angle.slice(0, 40));
  await p.screenshot({ path: `${dossier}/apercu-${nomVue}-dos.png` });
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200);
  ok(nomVue + ' : flèche droite, carte suivante', /Roi de cœur/.test(await p.$eval('#vue-titre', (t) => t.textContent)));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  ok(nomVue + ' : Échap ferme', await p.$eval('#vue', (v) => v.hidden));
  // main
  const nMain = await p.$$eval('#eventail .carte', (l) => l.length);
  ok(nomVue + ' : main de 7 cartes', nMain === 7, String(nMain));
  await p.click('#eventail .carte >> nth=3', { force: true }); await p.waitForTimeout(500);
  const choisie = await p.$$eval('#eventail .carte.choisie', (l) => l.length);
  ok(nomVue + ' : choisir une carte de la main', choisie === 1);
  await p.click('#nouvelle-main'); await p.waitForTimeout(900);
  ok(nomVue + ' : nouvelle main', (await p.$$eval('#eventail .carte', (l) => l.length)) === 7);
  await p.click('.taille button[data-l="130"]'); await p.waitForTimeout(500);
  await (await p.$('.tapis')).screenshot({ path: `${dossier}/apercu-${nomVue}-main.png` });
  // tout retourner
  await p.click('#tout-retourner'); await p.waitForTimeout(1600);
  const nRet = await p.$$eval('#jeu .carte.retournee', (l) => l.length);
  ok(nomVue + ' : tout retourner', nRet === 52, String(nRet));
  await p.click('#tout-retourner'); await p.waitForTimeout(1600);
  // moins d'animations
  await p.click('#moins-anim'); await p.waitForTimeout(200);
  const anim = await p.$eval('#eventail .carte .flotte', (e) => getComputedStyle(e).animationName);
  ok(nomVue + ' : moins d’animations coupe le flottement', anim === 'none', anim);
  await p.reload(); await p.waitForTimeout(800);
  ok(nomVue + ' : réglage gardé après rechargement', await p.evaluate(() => document.documentElement.hasAttribute('data-moins-anim')));
  await p.click('#moins-anim');
  ok(nomVue + ' : aucune erreur dans la console', erreurs.length === 0, erreurs.join(' | ').slice(0, 200));
  await p.close();
}
// survol : l'inclinaison suit la souris
{
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('file://' + page); await p.waitForTimeout(800);
  const c = await p.$('#jeu .carte >> nth=11'); const bb = await c.boundingBox();
  await p.mouse.move(bb.x + bb.width * 0.9, bb.y + bb.height * 0.1); await p.waitForTimeout(250);
  const rx = await c.evaluate((e) => e.style.getPropertyValue('--rx')), ry = await c.evaluate((e) => e.style.getPropertyValue('--ry'));
  ok('survol : la carte s’incline', parseFloat(rx) > 3 && parseFloat(ry) > 3, `rx ${rx}, ry ${ry}`);
  await p.mouse.move(5, 5); await p.waitForTimeout(250);
  ok('survol : elle revient à plat', (await c.evaluate((e) => e.style.getPropertyValue('--rx'))) === '0deg');
  await p.close();
}
// téléphone qui demande moins d'animations
{
  const ctx = await b.newContext({ reducedMotion: 'reduce', viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage(); await p.goto('file://' + page); await p.waitForTimeout(800);
  const anim = await p.$eval('#eventail .carte .flotte', (e) => getComputedStyle(e).animationName);
  ok('téléphone en « réduire les animations » : pas de flottement', anim === 'none', anim);
  await ctx.close();
}
await b.close();
console.log(res.join('\n'));
console.log(res.filter((r) => r.startsWith('OK')).length + ' sur ' + res.length);

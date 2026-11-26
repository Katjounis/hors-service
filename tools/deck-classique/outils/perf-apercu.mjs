// Fluidité de l'aperçu, processeur ralenti 4 fois : carte en grand qui flotte et s'incline, main qui flotte, survol du jeu.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const page = process.argv[2];
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await p.goto('file://' + page); await p.waitForTimeout(2000);
const cdp = await p.context().newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
async function mesurer(nom, action) {
  await p.evaluate(() => { window.__f = []; const t = (ts) => { window.__f.push(ts); if (window.__f.length < 100000) requestAnimationFrame(t); }; requestAnimationFrame(t); });
  await action();
  const f = await p.evaluate(() => { const f = window.__f; window.__f = [10e9]; return f; });
  const d = []; for (let i = 1; i < f.length; i++) d.push(f[i] - f[i - 1]);
  const duree = (f[f.length - 1] - f[0]) / 1000, ips = (f.length - 1) / duree, lentes = d.filter((x) => x > 50).length;
  console.log(`${nom} : ${ips.toFixed(1)} images/s sur ${duree.toFixed(1)} s, images de plus de 50 ms : ${lentes}, la plus longue : ${Math.max(...d).toFixed(0)} ms`);
}
// 1. la main qui flotte, sans rien toucher
await p.locator('#eventail').scrollIntoViewIfNeeded();
await mesurer('main qui flotte', async () => { await p.waitForTimeout(3000); });
// 2. survol du jeu complet : la souris passe sur 13 cartes
await p.locator('#jeu').scrollIntoViewIfNeeded();
const box = await (await p.$('#jeu .rangee >> nth=1')).boundingBox();
await mesurer('survol du jeu (inclinaison)', async () => { for (let i = 0; i < 120; i++) { await p.mouse.move(box.x + 90 + (i % 60) * ((box.width - 100) / 60), box.y + 30 + (i % 7) * 10); await p.waitForTimeout(25); } });
// 3. carte en grand : flotte, s'incline, se retourne
await p.click('#jeu .carte >> nth=24'); await p.waitForTimeout(500);
const cb = await (await p.$('#vue-carte .carte')).boundingBox();
await mesurer('carte en grand (flottement, inclinaison, retournement)', async () => {
  for (let i = 0; i < 80; i++) { await p.mouse.move(cb.x + cb.width * (0.2 + 0.6 * ((i % 20) / 20)), cb.y + cb.height * (0.3 + 0.4 * ((i % 9) / 9))); await p.waitForTimeout(25); }
  await p.click('#vue-retourner'); await p.waitForTimeout(700); await p.click('#vue-retourner'); await p.waitForTimeout(700);
});
await p.keyboard.press('Escape');
// 4. tout retourner (52 cartes en vague)
await mesurer('tout retourner (52 cartes)', async () => { await p.click('#tout-retourner'); await p.waitForTimeout(1800); });
await b.close();

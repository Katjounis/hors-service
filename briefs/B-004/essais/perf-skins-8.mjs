// Fluidité dans le vrai CSS de l'appli : 28 cartes (tailles l, m, s, xs) habillées, 6 animées au plus.
// Mesure les images par seconde pour chaque skin lourd, sans puis avec un processeur ralenti 4 fois (téléphone moyen).
import { ouvrir } from './outils/flux.mjs';
const o = await ouvrir(new URL('../site', import.meta.url).pathname, 5431);
await o.ctx.addInitScript(() => { Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 }); });
await o.page.reload(); await o.page.waitForTimeout(800);
const { page } = o;
await page.addScriptTag({ path: new URL('../site/cartes-skins.js', import.meta.url).pathname });
await page.evaluate(() => {
  const SYM = { S: '♠', H: '♥', D: '♦', C: '♣' };
  const carte = (r, e, t, dos) => dos ? `<span class="pc pc-${t} pc-back" role="img" aria-label="Carte cachée"><span class="pc-pattern"></span></span>` : `<span class="pc pc-${t} ${'HD'.includes(e) ? 'pc-red' : 'pc-black'}" role="img" aria-label="${r} ${SYM[e]}"><span class="pc-corner">${r}</span><span class="pc-mid">${SYM[e]}</span><span class="pc-corner pc-corner-b">${r}</span></span>`;
  const z = document.createElement('div'); z.id = 'planche';
  z.innerHTML = `<style>#planche{position:fixed;inset:0;z-index:9999;overflow:auto;background:#1F4D38;padding:10px;display:flex;flex-wrap:wrap;gap:8px;align-content:flex-start}</style>` + ['l', 'm', 's', 'xs'].map((t) => carte(0, 0, t, true) + [['R', 'S'], ['D', 'H'], ['V', 'C'], ['A', 'D'], ['10', 'H'], ['7', 'S']].map(([r, e]) => carte(r, e, t)).join('')).join('');
  document.body.appendChild(z);
});
const ips = () => page.evaluate(() => new Promise((ok) => { let nb = 0, pire = 0, av = performance.now(); const t0 = av; (function f(t) { nb++; pire = Math.max(pire, t - av); av = t; if (t - t0 < 2500) requestAnimationFrame(f); else ok({ ips: Math.round(nb / ((t - t0) / 1000)), pire: Math.round(pire) }); })(av); }));
const cdp = await page.context().newCDPSession(page);
const lignes = [];
for (const lent of [4, 6]) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: lent });
  for (const id of [null, 'C-001', 'R-012', 'L-001', 'L-003', 'L-004', 'L-005', 'E-001', 'E-002', 'E-007']) {
    await page.evaluate((x) => window.HS_CARTES.activer(x), id); await page.waitForTimeout(lent > 1 ? 9000 : 2500);
    const a = await page.evaluate(() => ({ animees: document.querySelectorAll('.pc-skin:not(.hsc-fige)').length, anims: [...document.querySelectorAll('.pc-skin')].reduce((n, o) => n + o.getAnimations({ subtree: true }).length, 0) }));
    const m = await ips();
    lignes.push(`processeur ÷${lent} · ${id || 'sans skin'} : ${m.ips} i/s (pire image ${m.pire} ms), ${a.animees} cartes animées, ${a.anims} animations, budget ${await page.evaluate(() => window.HS_CARTES.budget())}`);
  }
}
console.log(lignes.join('\n')); console.log('erreurs', o.errs.length ? o.errs : 'aucune'); await o.fermer();

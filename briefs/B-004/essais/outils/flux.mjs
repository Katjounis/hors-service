// Outils communs aux essais dans un vrai navigateur (mode « un seul téléphone »).
import { createRequire } from 'node:module';
import { servir } from './serveur.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

export async function ouvrir(racine, port = 5301, opts = {}) {
  const server = await servir(racine, port);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: opts.dpr || 1, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  await ctx.route('https://**', (r) => r.abort());
  // Capture de l'objet de l'app au passage de HS_GENRE_MAJ (lecture seule), pour comparer l'écran à l'état du jeu.
  await ctx.addInitScript(() => {
    let vrai;
    window.__apps = new Set();
    Object.defineProperty(window, 'HS_GENRE_MAJ', {
      configurable: true,
      get() { return vrai && ((app) => { window.__apps.add(app); if (app.isHost || app.mode !== 'local') window.__app = app; return vrai(app); }); },
      set(f) { vrai = f; },
    });
  });
  // Depuis les réglages du 18/11, l'atelier d'avatar est replié sous « Personnaliser » sur un seul téléphone.
  // Les essais écrits avant ouvrent ce repli d'office ; l'essai du repli lui-même passe { pliFerme: true }.
  if (!opts.pliFerme) await ctx.addInitScript(() => {
    const ouvrir = () => document.querySelectorAll('details.maker-pli:not([open])').forEach((d) => { d.open = true; });
    new MutationObserver(ouvrir).observe(document, { subtree: true, childList: true });
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_/.test(m.text())) errs.push('console: ' + m.text()); });
  await page.goto(`http://localhost:${port}/`);
  await page.waitForTimeout(1000);
  const fermer = async () => { await browser.close(); server.close(); };
  return { page, ctx, browser, server, errs, fermer };
}
export const boutons = (page) => page.locator('button').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => (e.getAttribute('aria-label') || e.innerText || '').replace(/\s+/g, ' ').trim() + (e.disabled ? ' (inactif)' : '')).filter(Boolean));
export const texte = (page, sel = '#app') => page.locator(sel).first().evaluate((e) => e.innerText.replace(/\n{2,}/g, '\n').trim()).catch(() => '');
export async function cliquer(page, nom, opts = {}) {
  const l = page.getByRole('button', { name: nom, exact: opts.exact !== false }).first();
  await l.click({ timeout: opts.timeout || 4000 });
  await page.waitForTimeout(opts.pause ?? 350);
}
export async function ajouterJoueur(page, nick, genre) {
  await page.fill('#local-nick', nick);
  if (genre && genre !== 'x') {
    await page.getByRole('radio', { name: genre === 'f' ? 'Féminin' : 'Masculin', exact: true }).click();
    await page.waitForTimeout(120);
  }
  await page.getByRole('button', { name: 'Ajouter ' + nick, exact: true }).click();
  await page.waitForTimeout(250);
}
export async function table(page, joueurs) {
  await page.getByRole('button', { name: 'Jouer sur un seul téléphone' }).click();
  await page.waitForTimeout(500);
  for (const [nick, g] of joueurs) await ajouterJoueur(page, nick, g);
  await page.getByRole('button', { name: `Mettre en service à ${joueurs.length}` }).click();
  await page.waitForTimeout(900);
}
export const etat = (page) => page.evaluate(() => {
  const a = window.__app; if (!a) return null;
  const S = a.S || {};
  return { mode: a.mode, uid: a.uid, hote: !!a.isHost, gn: a.profile && a.profile.gn, rev: S.rev, roster: Object.fromEntries(Object.entries(S.roster || {}).map(([u, r]) => [u, { nick: r.nick, gn: r.gn }])), ordre: S.order, jeu: S.game && S.game.id, g: S.game && S.game.g };
});
// Impose une carte : le test modifie l'état du moteur de l'hôte puis le fait diffuser par le moteur lui-même (commit).
export const imposer = (page, fn, arg) => page.evaluate(([src, a]) => {
  const app = window.__app, eng = app && app.engine;
  if (!eng || !eng.S || !eng.S.game) return 'pas de moteur';
  const priv = (eng.priv.games && eng.priv.games[eng.S.game.seq]) || {};
  (0, eval)('(' + src + ')')(eng.S.game.g, a, { eng, priv, S: eng.S });
  eng.commit();
  return 'ok';
}, [fn.toString(), arg]).then(async (r) => { await page.waitForTimeout(250); return r; });

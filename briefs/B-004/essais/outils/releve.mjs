// Outils de relevé pour les essais B-004 (repris des essais précédents, sans l'oracle des cartes au féminin).
export class Releve {
  constructor() { this.sections = {}; this.echecs = []; this.notes = []; }
  ok(section, cond, detail) {
    const s = (this.sections[section] = this.sections[section] || { ok: 0, ko: 0 });
    if (cond) s.ok++; else { s.ko++; this.echecs.push(`[${section}] ${detail}`); }
    return cond;
  }
  egal(section, obtenu, attendu, quoi) { return this.ok(section, obtenu === attendu, `${quoi} : attendu « ${attendu} », obtenu « ${obtenu} »`); }
  note(t) { this.notes.push(t); }
  bilan() { return Object.entries(this.sections).map(([k, v]) => `${k} : ${v.ok} réussis${v.ko ? `, ${v.ko} ÉCHECS` : ''}`); }
  get nbEchecs() { return this.echecs.length; }
}

// Clic sur le premier bouton visible et actif dont le libellé (aria-label ou texte) correspond
export async function clic(page, motif, opts = {}) {
  const src = motif instanceof RegExp ? motif.source : '^' + motif.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$';
  const r = await page.evaluate(([s, dans]) => {
    const re = new RegExp(s); const racine = dans ? document.querySelector(dans) : document;
    if (!racine) return null;
    for (const b of racine.querySelectorAll('button')) {
      if (b.disabled || b.offsetParent === null) continue;
      const noms = [(b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(), (b.innerText || '').replace(/\s+/g, ' ').trim()];
      const n = noms.find((x) => x && re.test(x));
      if (n) { b.click(); return n; }
    }
    return null;
  }, [src, opts.dans || null]);
  if (r === null && !opts.facultatif) throw new Error('bouton introuvable : ' + motif);
  await page.waitForTimeout(opts.pause ?? 140);
  return r;
}
export const lire = (page, sel) => page.evaluate((s) => [...document.querySelectorAll(s)].filter((e) => e.offsetParent !== null).map((e) => e.textContent), sel);
export const un = async (page, sel) => (await lire(page, sel))[0];
export const attendre = (page, fn, arg, ms = 4000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 40 }).catch(() => null);

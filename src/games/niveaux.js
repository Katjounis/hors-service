// Niveaux communs aux jeux de questions (Tu préfères, Action ou vérité, Paranoïa).
// need : niveau minimum de la table (1 tranquille, 2 drôle, 3 piquant) ; adult : à activer dans les réglages de la soirée.
export const NIV = {
  soft: { label: 'Soft', need: 1 },
  hard: { label: 'HARD', need: 3, adult: true },
  cul: { label: 'Cul', need: 3, adult: true },
};

// niveaux demandés, filtrés selon les réglages et les limites de la table (Soft reste toujours possible)
export function pickLevels(c, want, avail) {
  const adult = !!(c.S.cfg && c.S.cfg.adult);
  const asked = (Array.isArray(want) ? want : ['soft']).filter((l) => avail.includes(l));
  let lv = asked.filter((l) => NIV[l] && NIV[l].need <= c.level() && (!NIV[l].adult || adult));
  const dropped = asked.filter((l) => !lv.includes(l));
  if (!lv.length) lv = ['soft'];
  return { lv, dropped };
}

// pioche sans remise dans un paquet { soft: [...], cul: [...] } ; renvoie { lv, i }
export function drawFrom(c, store, key, pack, lvls) {
  const p = c.priv;
  p[store] = p[store] || {};
  let d = p[store][key];
  if (!d || !d.list.length) {
    const all = [];
    for (const l of lvls) (pack[l] || []).forEach((_, i) => all.push(`${l}:${i}`));
    d = p[store][key] = { list: c.shuffle(all) };
  }
  const k = d.list.pop();
  const [lv, i] = k.split(':');
  return { lv, i: Number(i) };
}

// Mentions légales et confidentialité.
// HEBERGEUR : à changer si le site est publié ailleurs que sur GitHub Pages (ex. 'hostinger').
export const HEBERGEUR = 'github';

export const HEBERGEURS = {
  github: { nom: 'GitHub, Inc.', adresse: '88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis', site: 'https://github.com' },
  hostinger: { nom: 'Hostinger International Limited', adresse: '61 Lordou Vironos Street, 6023 Larnaca, Chypre', site: 'https://www.hostinger.fr' },
};
export const HEBERGEUR_SALONS = { nom: 'Cloudflare, Inc.', adresse: '101 Townsend Street, San Francisco, CA 94107, États-Unis', site: 'https://www.cloudflare.com' };
// index.html peut fixer var HEBERGEUR = "hostinger" (sans recompiler l'appli)
export const hebergeur = () => {
  const k = typeof window !== 'undefined' && typeof window.HEBERGEUR === 'string' ? window.HEBERGEUR : HEBERGEUR;
  return HEBERGEURS[k] || HEBERGEURS.github;
};
// le serveur de salons efface tout seul un salon resté inactif
export const SALON_EFFACE_APRES = '6 heures';

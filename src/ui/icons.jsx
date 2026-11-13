// Pictogrammes maison « Hors Service » : une seule famille, dessinée sur une grille de 24,
// trait de 2 (épaissi à l'affichage pour les avatars), extrémités arrondies, monochrome.
// Ils remplacent tous les emojis de l'interface.

export const ICON_PATHS = {
  // ---------------------------------------------------------------- avatars (16)
  verre: '<path d="M3 12.5v7"/><path d="M3 16h4.5"/><path d="M18.5 10H15c-4.2 0-7.5 2.6-7.5 6s3.3 6 7.5 6h3.5"/><ellipse cx="18.5" cy="16" rx="2" ry="6"/><path d="M20.5 18.5c.6 1.6 1.4 2.8 2.5 3.5"/>',
  prise: '<path d="M9 2.5v4.5M15 2.5v4.5"/><path d="M6.5 7h11v4a5.5 5.5 0 0 1-11 0z"/><path d="M12 16.5v1.5a3 3 0 0 0 3 3h3.5"/><path d="M20.5 18.5l1.5-1.5M21 21.5l1.5.3"/>',
  ampoule: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.4.3.6.8.6 1.3V18h6v-2.9c0-.5.2-1 .6-1.3A6 6 0 0 0 12 3z"/><path d="M9.5 10.5l1.2-1.6 1 1.6M13.3 10.5l1.2-1.6"/>',
  cle: '<g transform="rotate(45 12 12)"><rect x="10.5" y="10" width="3" height="12" rx="1.5"/><path d="M8 10V5.5C8 3.6 9 2 10 2v4h4V2c1 0 2 1.6 2 3.5V10z"/></g>',
  cone: '<path d="M3.5 20.5h17"/><path d="M7.5 20.5L10.8 3.5h2.4l3.3 17"/><path d="M9.2 14.5h5.6M10.1 9.5h3.8"/>',
  tel: '<rect x="6.5" y="2" width="11" height="20" rx="2"/><path d="M10.5 18.5h3"/><path d="M9.5 5.5l2.5 3-1.8 2.4 3 3.6"/>',
  pile: '<rect x="2.5" y="7.5" width="17" height="9" rx="1.5"/><path d="M22 10.5v3"/><path d="M5.5 10.5v3"/>',
  fusible: '<rect x="6" y="7.5" width="12" height="9" rx="1.5"/><path d="M2.5 12H6M18 12h3.5"/><path d="M8 12h2.5l1-1.5M13.5 13.5l1 -1.5H16"/>',
  marteau: '<g transform="rotate(35 12 12)"><path d="M5 4.5h11.5l2 2.5-2 2.5H5z"/><rect x="9.5" y="9.5" width="3.5" height="12" rx="1.5"/></g>',
  tournevis: '<g transform="rotate(45 12 12)"><rect x="8.5" y="1.5" width="7" height="9" rx="2.5"/><path d="M10 10.5h4v1.5h-4z"/><path d="M12 12v7.5"/><path d="M10.6 19.5h2.8L12 22.5z"/></g>',
  scotch: '<circle cx="10" cy="11" r="7"/><circle cx="10" cy="11" r="2.5"/><path d="M10 18h11.5l-1.3-1.4 .8-1.3"/>',
  extincteur: '<rect x="7.5" y="9" width="9" height="12.5" rx="3"/><path d="M10 9V6h4v3"/><path d="M11 6V4.5h4.5l2 1.5"/><path d="M10 6.5C7 6.5 5 8.5 5 12v4"/><path d="M10 14.5h4"/>',
  casque: '<path d="M4 16.5a8 8 0 0 1 16 0"/><path d="M2 16.5h20v2.5H2z"/><path d="M12 8.5V13M8.5 10v3.5M15.5 10v3.5"/>',
  reveil: '<circle cx="12" cy="13" r="7"/><path d="M12 9.5V13l2.5 2"/><path d="M3.5 6.5l3-3M20.5 6.5l-3-3"/><path d="M7 19l-1.5 2.5M17 19l1.5 2.5"/>',
  jauge: '<path d="M3.5 17a8.5 8.5 0 1 1 17 0z"/><path d="M12 17l4-6"/><path d="M6.6 12l1.1.8M12 8.5v1.4M17.4 12l-1.1.8"/>',
  aimant: '<path d="M5 3.5h5v8a2 2 0 0 0 4 0v-8h5v8a7 7 0 0 1-14 0z"/><path d="M5 7.5h5M14 7.5h5"/>',

  // ---------------------------------------------------------------- jeux (8)
  'g-oserait': '<circle cx="8.5" cy="8" r="3.5"/><path d="M2.5 20.5a6 6 0 0 1 12 0"/><path d="M22 8.5h-6M18.5 5.5L15.5 8.5l3 3"/>',
  'g-96': '<rect x="3" y="5" width="10" height="14" rx="1.5" transform="rotate(-10 8 12)"/><rect x="11" y="4.5" width="10" height="14" rx="1.5" transform="rotate(8 16 11.5)"/><path d="M16 9v5M13.5 11.5h5"/>',
  'g-pipo': '<path d="M2.5 9.5c3.2-1.7 6.3-1.7 9.5 0 3.2-1.7 6.3-1.7 9.5 0v1.5c0 3.8-2.4 6.5-5 6.5-2.2 0-3.2-2-4.5-2s-2.3 2-4.5 2c-2.6 0-5-2.7-5-6.5z"/><path d="M6.5 12.5h3M14.5 12.5h3"/>',
  'g-purple': '<rect x="5.5" y="2.5" width="13" height="19" rx="1.5"/><path d="M5.5 19.5l13-15"/><path d="M11 21.5l7.5-8.5M15 21.5l3.5-4"/>',
  'g-hippo': '<path d="M6.5 3.5C4.3 5.5 3 8.4 3 11.8a9 9 0 0 0 18 0c0-3.4-1.3-6.3-3.5-8.3h-3.3c2.3 2 3.3 4.6 3.3 8.3a5.5 5.5 0 0 1-11 0c0-3.7 1-6.3 3.3-8.3z"/><path d="M5.8 10.5v.01M18.2 10.5v.01M7.5 16.5v.01M16.5 16.5v.01"/>',
  'g-tomb': '<rect x="2" y="15.5" width="5.5" height="6" rx="1"/><rect x="9.25" y="15.5" width="5.5" height="6" rx="1"/><rect x="16.5" y="15.5" width="5.5" height="6" rx="1"/><rect x="5.6" y="9" width="5.5" height="6" rx="1"/><rect x="12.9" y="9" width="5.5" height="6" rx="1"/><rect x="9.25" y="2.5" width="5.5" height="6" rx="1"/>',
  'g-autres': '<path d="M3.5 4.5h17v11.5H11l-4.5 4v-4h-3z"/><path d="M10 8.5a2 2 0 1 1 2.9 1.8c-.6.3-.9.8-.9 1.4v.3"/><path d="M12 14v.01"/>',
  'g-trouve': '<rect x="3" y="2.5" width="12.5" height="17.5" rx="1.5"/><path d="M6.5 7h5M6.5 10.5h3"/><circle cx="15.5" cy="15" r="4.6"/><path d="M18.9 18.4L22 21.5"/>',
  'g-degaine': '<path d="M13.5 2.5L5 13.5h6.2l-1.2 8 8.5-11.2h-6.3z"/>',
  'g-bombe': '<circle cx="10" cy="14.5" r="6.5"/><path d="M14.6 9.9l2.4-2.4M17 7.5c.6-1.6 1.9-2.6 3.5-2.8M20.5 2.5v1.2M22 4.7h-1.2"/>',
  'g-ware': '<rect x="2.5" y="7" width="19" height="10.5" rx="4.5"/><path d="M7.5 10.3v4.4M5.3 12.5h4.4M15.5 11.3v.01M18 13.7v.01"/>',
  'g-jamais': '<path d="M3.5 4.5h17v11.5h-9l-4.5 4v-4h-3.5z"/><path d="M9.2 7.7l5.6 5.6M14.8 7.7l-5.6 5.6"/>',

  // ---------------------------------------------------------------- interface
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  menu: '<path d="M4 6.5h16M4 12h16M4 17.5h16"/>',
  back: '<path d="M14.5 5l-7 7 7 7"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  check: '<path d="M4.5 12.5l5 5L19.5 7"/>',
  arrow: '<path d="M4 12h15M13.5 6.5L19 12l-5.5 5.5"/>',
  erase: '<path d="M9 5h11.5v14H9l-6.5-7z"/><path d="M12 9.5l5 5M17 9.5l-5 5"/>',
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  retry: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 3.5V8h-4.5"/>',
  alert: '<path d="M12 3L2 20.5h20z"/><path d="M12 9.5v5M12 17.5v.01"/>',
};

export const AVATAR_IDS = ['verre', 'prise', 'ampoule', 'cle', 'cone', 'tel', 'pile', 'fusible', 'marteau', 'tournevis', 'scotch', 'extincteur', 'casque', 'reveil', 'jauge', 'aimant'];
export const AVATAR_NAMES = {
  verre: 'Verre renversé', prise: 'Prise débranchée', ampoule: 'Ampoule grillée', cle: 'Clé à molette',
  cone: 'Cône de chantier', tel: 'Téléphone fissuré', pile: 'Pile à plat', fusible: 'Fusible grillé',
  marteau: 'Marteau', tournevis: 'Tournevis', scotch: 'Rouleau de scotch', extincteur: 'Extincteur',
  casque: 'Casque de chantier', reveil: 'Réveil', jauge: 'Jauge dans le rouge', aimant: 'Aimant',
};

export const hasIcon = (name) => Object.prototype.hasOwnProperty.call(ICON_PATHS, name);

export function Icon({ name, size = 24, stroke = 2, label = null, cls = '' }) {
  const body = ICON_PATHS[name] || ICON_PATHS.alert;
  return (
    <svg class={`ico ${cls}`} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      stroke-width={stroke} stroke-linecap="round" stroke-linejoin="round"
      role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : 'true'}
      focusable="false" dangerouslySetInnerHTML={{ __html: body }} />
  );
}

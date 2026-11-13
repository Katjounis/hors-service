// Catalogue des jeux disponibles. Un jeu n'apparaît ici que lorsqu'il est complet et testé.
// Chaque jeu est identifié par un numéro d'étiquette (« Jeu 01 ») et un picto, pas par une couleur.
import OSERAIT from './oserait.jsx';
import PIPOTEUR from './pipoteur.jsx';
import G96 from './g96.jsx';
import PURPLE from './purple.jsx';
import HIPPODROME from './hippodrome.jsx';
import TOUTANKHAMON from './toutankhamon.jsx';
import AUTRES from './autres.jsx';
import TC from './trouve.jsx';
import DEGAINE from './degaine.jsx';
import BOMBE from './bombe.jsx';
import WARE from './ware.jsx';
import JAMAIS from './jamais.jsx';

export const GAME_LIST = [OSERAIT, G96, PIPOTEUR, PURPLE, HIPPODROME, TOUTANKHAMON, AUTRES, TC, DEGAINE, BOMBE, WARE, JAMAIS];
export const GAMES = Object.fromEntries(GAME_LIST.map((G) => [G.id, G]));

// numéro, picto et teinte du papier de la tuile (crème, kraft ou rose de facture)
const PAPERS = ['', 'kraft', 'rose'];
const TILTS = ['tilt-a', 'tilt-b', 'tilt-c', 'tilt-d'];
// couleur propre à chaque jeu (r, g, b) : liseré de la tuile et halo de l'icône
const COLORS = { oserait: '238, 98, 74', '96': '255, 196, 64', pipoteur: '108, 201, 168', purple: '168, 112, 240', hippodrome: '232, 160, 72', toutankhamon: '214, 182, 92', autres: '92, 160, 240', trouve: '240, 120, 160', degaine: '250, 84, 64', bombe: '255, 140, 40', ware: '120, 220, 220', jamais: '238, 72, 120' };
const ICONS = { oserait: 'g-oserait', '96': 'g-96', pipoteur: 'g-pipo', purple: 'g-purple', hippodrome: 'g-hippo', toutankhamon: 'g-tomb', autres: 'g-autres', trouve: 'g-trouve', degaine: 'g-degaine', bombe: 'g-bombe', ware: 'g-ware', jamais: 'g-jamais' };
export const GAME_META = Object.fromEntries(GAME_LIST.map((G, i) => [G.id, {
  no: String(i + 1).padStart(2, '0'),
  icon: ICONS[G.id] || 'alert',
  paper: PAPERS[i % 3],
  tilt: TILTS[i % 4],
  color: COLORS[G.id] || '255, 210, 63',
}]));

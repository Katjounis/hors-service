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
import GAROU from './garou.jsx';
import COINCHE from './coinche.jsx';
import BUZZER from './buzzer.jsx';
import DESSIN from './dessin.jsx';
import PRESIDENT from './president.jsx';
import CERCLE from './cercle.jsx';
import PERUDO from './perudo.jsx';
import PARANOIA from './paranoia.jsx';
import AVG from './actionverite.jsx';
import TUPREF from './tupref.jsx';

export const GAME_LIST = [OSERAIT, G96, PIPOTEUR, PURPLE, HIPPODROME, TOUTANKHAMON, AUTRES, TC, DEGAINE, BOMBE, WARE, JAMAIS, GAROU, COINCHE, BUZZER, DESSIN, PRESIDENT, CERCLE, PERUDO, PARANOIA, AVG, TUPREF];
export const GAMES = Object.fromEntries(GAME_LIST.map((G) => [G.id, G]));

// numéro, picto et teinte du papier de la tuile (crème, kraft ou rose de facture)
const PAPERS = ['', 'kraft', 'rose'];
const TILTS = ['tilt-a', 'tilt-b', 'tilt-c', 'tilt-d'];
// couleur propre à chaque jeu (r, g, b) : liseré de la tuile et halo de l'icône
const COLORS = { oserait: '238, 98, 74', '96': '255, 196, 64', pipoteur: '108, 201, 168', purple: '168, 112, 240', hippodrome: '232, 160, 72', toutankhamon: '214, 182, 92', autres: '92, 160, 240', trouve: '240, 120, 160', degaine: '250, 84, 64', bombe: '255, 140, 40', ware: '120, 220, 220', jamais: '238, 72, 120', garou: '120, 150, 210', coinche: '90, 180, 120', buzzer: '255, 120, 60', dessin: '92, 180, 240', president: '232, 196, 80', cercle: '240, 96, 48', perudo: '200, 120, 72', paranoia: '150, 110, 220', actionverite: '238, 84, 110', tupref: '96, 190, 200' };
const ICONS = { oserait: 'g-oserait', '96': 'g-96', pipoteur: 'g-pipo', purple: 'g-purple', hippodrome: 'g-hippo', toutankhamon: 'g-tomb', autres: 'g-autres', trouve: 'g-trouve', degaine: 'g-degaine', bombe: 'g-bombe', ware: 'g-ware', jamais: 'g-jamais', garou: 'g-pipo', coinche: 'g-trouve', buzzer: 'g-autres', dessin: 'g-oserait', president: 'g-trouve', cercle: 'g-trouve', perudo: 'g-tomb', paranoia: 'g-pipo', actionverite: 'g-oserait', tupref: 'g-jamais' };
// catégories pour filtrer la liste des jeux dans le salon (un jeu peut être dans plusieurs)
export const CATS = [
  ['cartes', 'Jeux de cartes'],
  ['alcool', 'Jeux à boire'],
  ['coquin', 'Coquins (paquets Cul et HARD)'],
  ['bluff', 'Bluff et déduction'],
  ['ambiance', 'Ambiance et questions'],
  ['reflexe', 'Réflexes et arcade'],
  ['culture', 'Culture et quiz'],
  ['equipe', 'En équipes'],
  ['ecran', 'Avec la télé (mode Écran)'],
  ['solo', 'Sur un seul téléphone'],
];
const GAME_CATS = {
  oserait: ['alcool', 'ambiance', 'coquin'], '96': ['cartes', 'alcool'], pipoteur: ['bluff', 'ambiance', 'coquin'], purple: ['cartes', 'alcool'],
  hippodrome: ['cartes', 'alcool'], toutankhamon: ['cartes', 'bluff', 'alcool'], autres: ['ambiance'], trouve: ['cartes', 'alcool'],
  degaine: ['reflexe'], bombe: ['reflexe', 'alcool'], ware: ['reflexe'], jamais: ['alcool', 'ambiance', 'coquin'],
  garou: ['bluff', 'alcool', 'ecran'], coinche: ['cartes', 'equipe', 'ecran'], buzzer: ['culture', 'reflexe', 'ecran'], dessin: ['ambiance', 'ecran'],
  president: ['cartes', 'alcool'], cercle: ['cartes', 'alcool', 'ambiance'], perudo: ['bluff', 'alcool'], paranoia: ['ambiance', 'alcool', 'coquin'],
  actionverite: ['ambiance', 'coquin', 'alcool'], tupref: ['ambiance', 'alcool', 'coquin'],
};
export const catsOf = (G) => [...(GAME_CATS[G.id] || []), ...(G.local !== false ? ['solo'] : [])];

export const GAME_META = Object.fromEntries(GAME_LIST.map((G, i) => [G.id, {
  no: String(i + 1).padStart(2, '0'),
  icon: ICONS[G.id] || 'alert',
  paper: PAPERS[i % 3],
  tilt: TILTS[i % 4],
  color: COLORS[G.id] || '255, 210, 63',
}]));

// Cartes à jouer : codes du type "TH" (10 de cœur), "QS" (Dame de pique)…
// Rangs : A 2 3 4 5 6 7 8 9 T J Q K — Couleurs : S pique, H cœur, D carreau, C trèfle.

import { shuffle } from './util.js';

export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
export const SUITS = ['S', 'H', 'D', 'C'];
export const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' };
export const SUIT_NAME = { S: 'pique', H: 'cœur', D: 'carreau', C: 'trèfle' };
export const RANK_LABEL = { A: 'A', T: '10', J: 'V', Q: 'D', K: 'R' };
export const RANK_NAME = {
  A: 'As', 2: 'Deux', 3: 'Trois', 4: 'Quatre', 5: 'Cinq', 6: 'Six', 7: 'Sept', 8: 'Huit', 9: 'Neuf',
  T: 'Dix', J: 'Valet', Q: 'Dame', K: 'Roi',
};

export function newDeck(decks = 1) {
  const d = [];
  for (let n = 0; n < decks; n++) for (const s of SUITS) for (const r of RANKS) d.push(r + s);
  return shuffle(d);
}

export const rankOf = (c) => c[0];
export const suitOf = (c) => c[1];
export const isRed = (c) => c[1] === 'H' || c[1] === 'D';
export const label = (c) => (RANK_LABEL[c[0]] || c[0]);
export const cardName = (c) => `${RANK_NAME[c[0]]} de ${SUIT_NAME[c[1]]}`;
export const shortName = (c) => `${label(c)}${SUIT_SYMBOL[c[1]]}`;
export const withArticle = (c) => `${c[0] === 'Q' ? 'une' : 'un'} ${cardName(c)}`;

// Ordre classique pour « plus / moins » : 2 < … < 10 < V < D < R < As
export const ORDER = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, T: 10, J: 11, Q: 12, K: 13, A: 14 };
export const order = (c) => ORDER[c[0]];

export function isCard(c) {
  return typeof c === 'string' && c.length === 2 && RANKS.includes(c[0]) && SUITS.includes(c[1]);
}

// Chambrage : phrases affichées en grand sur tous les écrans quand quelqu'un se fait avoir.
// {0} = la victime, {1} = un nombre ou un deuxième joueur.
export const CHAMBRE = {
  cs: ['{0} a vidé son verre. Respect.', 'Cul sec validé pour {0}.', '{0} : le verre n’a rien vu venir.', 'Quelqu’un remplit le verre de {0} ?', '{0} descend ça comme de l’eau.'],
  pass: ['{0} se dégonfle.', '{0} passe son tour. Poule mouillée.', 'Refus de {0}. On s’en souviendra.', '{0} joue la carte de l’eau plate.', '{0} a eu peur.'],
  big: ['{1} gorgées pour {0}. Ça va piquer.', '{0} encaisse {1} gorgées.', '{1} gorgées d’un coup pour {0}. Courage.'],
  serie3: ['Triplé pour {0} !', '{0} enchaîne. Quelqu’un a pitié ?', 'Troisième d’affilée pour {0}.'],
  serie5: ['{0} a pris un abonnement aux pénalités.', 'Cinq de suite pour {0}. On appelle quelqu’un ?', '{0} ne quitte plus son verre.'],
  roi: ['Nouveau roi de la soirée : {0}.', '{0} passe en tête des assoiffés.', '{0} prend la tête. Personne n’est surpris.'],
  cible: ['{1} s’acharne sur {0}.', '{1} a une dent contre {0}.', '{0} prend tout de la part de {1}. Vengeance ?'],
};
// petites phrases sur la carte de pénalité du joueur qui boit
export const PIQUE = {
  base: ['Allez, on regarde.', 'Le verre t’attend.', 'Sans grimacer, si possible.', 'Tout le monde est témoin.', 'Ça t’apprendra.', 'C’est le jeu, ma pauvre Lucette.'],
  big: ['Ça pique un peu, non ?', 'Prends ton souffle.', 'Mange un truc après.'],
  cs: ['Cul levé, on regarde.', 'D’une traite, pas en trois fois.', 'Les autres comptent jusqu’à cinq.'],
  from: ['Quelqu’un t’a dans le viseur.', 'Vengeance autorisée au prochain tour.', 'Tu vas laisser passer ça ?'],
};
export function pickLine(list, seed) {
  let h = 0;
  for (const ch of String(seed)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
export const fill = (t, a, b) => t.replace('{0}', a).replace('{1}', b == null ? '' : String(b));

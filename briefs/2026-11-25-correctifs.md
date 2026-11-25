# Brief Théo : correctifs (25/11/2026)

Fait dans le fichier publié. **À reporter dans ton code source**, sinon ta prochaine version l'écrase.

1. **Quiz sur les autres** : la carte question (`.qo-card.paper.rose`) était sombre avec un texte sombre. La règle `.paper.rose { background: var(--surface) }` écrasait le papier. Correctif en fin de CSS : `.app .qo-card.paper` (et ose, jn, word) en `var(--papier)`.
2. **Décor sur téléphone** : hors accueil, le verre et les cartes passaient sous les boutons et les textes. En fin de CSS, sous 760 px : `.app:has(> .screen)` et `.app:has(> .party)` mettent `.ambiance .obj` à 0.18.
3. **Le 96** : le premier joueur sans 10 lisait « Pars de la dernière annonce que tu as entendue ». Maintenant si `g.last` est vide : « Tu commences : pose la carte de ton choix et annonce sa valeur. » (traduction anglaise ajoutée).
4. **GlouGlou Garou** : la puce « Classique + alcool » restait affichée sans Version Adulte. Réglé dans `textes.js` (devient « Classique »).
5. **Cartes à jouer** : chaque jeu réduisait la carte sans réduire les coins, donc chiffres et signes se chevauchaient (Président, Coinche, Purple…). En fin de CSS : `.pc` devient un conteneur (`container-type: inline-size`) et coins + signe central sont en `cqw` (24 et 38 % de la largeur). Sous 46 px de large : un seul coin en haut à gauche, signe en bas à droite. Tu peux supprimer les anciens réglages de taille de `.pc-corner` et `.pc-mid` par jeu.
6. **Retournement des cartes** (`@keyframes hs-flip`) : la carte en attente ne remonte plus de 14 px, elle reste à plat dans son emplacement (avant, elle débordait sur la rangée du dessus pendant la distribution).

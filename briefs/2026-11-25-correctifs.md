# Brief Théo : correctifs (25/11/2026)

Fait dans le fichier publié. **À reporter dans ton code source**, sinon ta prochaine version l'écrase.

1. **Quiz sur les autres** : la carte question (`.qo-card.paper.rose`) était sombre avec un texte sombre. La règle `.paper.rose { background: var(--surface) }` écrasait le papier. Correctif en fin de CSS : `.app .qo-card.paper` (et ose, jn, word) en `var(--papier)`.
2. **Décor sur téléphone** : hors accueil, le verre et les cartes passaient sous les boutons et les textes. En fin de CSS, sous 760 px : `.app:has(> .screen)` et `.app:has(> .party)` mettent `.ambiance .obj` à 0.18.
3. **Le 96** : le premier joueur sans 10 lisait « Pars de la dernière annonce que tu as entendue ». Maintenant si `g.last` est vide : « Tu commences : pose la carte de ton choix et annonce sa valeur. » (traduction anglaise ajoutée).
4. **GlouGlou Garou** : la puce « Classique + alcool » restait affichée sans Version Adulte. Réglé dans `textes.js` (devient « Classique »).

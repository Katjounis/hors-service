# Brief Théo : correctifs (25/11/2026)

Fait dans le fichier publié. **À reporter dans ton code source**, sinon ta prochaine version l'écrase.

1. **Quiz sur les autres** : la carte question (`.qo-card.paper.rose`) était sombre avec un texte sombre. La règle `.paper.rose { background: var(--surface) }` écrasait le papier. Correctif en fin de CSS : `.app .qo-card.paper` (et ose, jn, word) en `var(--papier)`.
2. **Décor sur téléphone** : hors accueil, le verre et les cartes passaient sous les boutons et les textes. En fin de CSS, sous 760 px : `.app:has(> .screen)` et `.app:has(> .party)` mettent `.ambiance .obj` à 0.18.
3. **Le 96** : le premier joueur sans 10 lisait « Pars de la dernière annonce que tu as entendue ». Maintenant si `g.last` est vide : « Tu commences : pose la carte de ton choix et annonce sa valeur. » (traduction anglaise ajoutée).
4. **GlouGlou Garou** : la puce « Classique + alcool » restait affichée sans Version Adulte. Réglé dans `textes.js` (devient « Classique »).
5. **Cartes à jouer** : chaque jeu réduisait la carte sans réduire les coins, donc chiffres et signes se chevauchaient (Président, Coinche, Purple…). En fin de CSS : `.pc` devient un conteneur (`container-type: inline-size`) et coins + signe central sont en `cqw` (24 et 38 % de la largeur). Sous 46 px de large : un seul coin en haut à gauche, signe en bas à droite. Tu peux supprimer les anciens réglages de taille de `.pc-corner` et `.pc-mid` par jeu.
6. **Retournement des cartes** (`@keyframes hs-flip`) : la carte en attente ne remonte plus de 14 px, elle reste à plat dans son emplacement (avant, elle débordait sur la rangée du dessus pendant la distribution).
7. **Atelier d'avatar** (fin de CSS + composant du maker) :
   - Aperçu et onglets collés en haut pendant qu'on fait défiler les choix (`.maker > .maker-top` et `.maker > .maker-tabs` en sticky), boutons Gagne / Pénalité / Rigole sur une ligne, 5 onglets sans défilement.
   - Vignettes cadrées sur la partie modifiée (zoom CSS par `aria-label` de `.maker-grid` : visage, tête, tenue).
   - Vignettes Coiffure sans couvre-chef (`g[2]=0`) et vignettes Expression sans lunettes (`g[3]=0`), sinon on ne voit pas la différence.
   - Fluidité : les vignettes passent par `HsVig` (juste avant `function ht`), qui les dessine au fil des images (file `hsQ`) et ne redessine que celles qui changent. Changement d'onglet mesuré de 100 à 220 ms à 40 à 60 ms sur un téléphone moyen simulé.
   - `textes.js` : le bouton « Boit » devient « Pénalité » en tout public.
8. **Couvre-chefs ajustés à chaque tête** : avant, tous les chapeaux étaient dessinés pour la tête humaine, donc trop petits sur l'alien et le fantôme, trop bas sur le robot et le cube. `hsChapeau(p,i)` (juste avant `function Ts`) recale et met à l'échelle le couvre-chef selon la tête du perso (`hsTete` : haut, largeur, centre) et l'empêche de sortir du rond. Branché par `a("g",{transform:hsChapeau(p,i),children:a(Pp,...)})`. Sur Big, le mot « BIG » disparaît quand il porte un couvre-chef.

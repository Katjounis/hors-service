# Deck « Classique » (B-007, résultat de S-006)

Dessin des 52 cartes communes et du dos, par le Claude de Bit. `src/appli.mjs` le branche dans l'appli : chaque carte `.pc` reçoit le recto ou le dos du deck, un skin actif passe devant, sous 46 px la carte garde le dessin simple.

Recompiler `src/pages/js/deck-classique.js` :

    npx esbuild tools/deck-classique/src/appli.mjs --bundle --format=iife --minify --target=es2019 --outfile=src/pages/js/deck-classique.js

(puis remettre les deux lignes d'en-tête). `apercu/` et `outils/` : page de démonstration et essais de Bit.

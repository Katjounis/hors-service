# Brief Théo : tri des jeux et catégories (16/11/2026)

Déjà fait par Claude dans le fichier publié (index.html). **À reporter dans ton code source**, sinon ta prochaine version l'écrase.

## Catégories de l'accueil (onglets, dans cet ordre)

1. **Nos jeux phares** (onglet ouvert par défaut) : Le 96, Pipoteur, Qui oserait… ?
2. **Pour lancer la soirée** : tag ambiance ou culture
3. **Cartes et bluff** : tag cartes ou bluff
4. **Réflexes et chaos** : tag reflexe
5. **Cul et hard** (si le mode est activé)
6. **Tous** (en dernier)

Dans le code : `ni` (liste des onglets), `zc` (onglet vers tags), tag `phare` ajouté à 96, pipoteur et oserait dans `ib`, ces trois jeux en tête de `qd`.

## Masqués (code gardé, plus affichés dans la liste)

Dégaine, Hors Service Ware, Dessine et devine, Le Cercle de feu, Le Ring, La Tournée (`HS_MASQUES`, juste avant le composant du lobby).

## Confidentialité

Le texte parle maintenant du compteur anonyme (install.js). Garder ce passage.

## À ne pas casser

`<script src="install.js" defer></script>` juste avant `</body>`, et `./install.js` dans le service worker.

# Version store (16/11/2026, aussi faite dans le fichier publié)

- Plus d'écran 18+ à l'ouverture : la vérification se fait quand l'hôte active la **Version Adulte** (ex « Mode Cul et HARD »), avec le message de prévention alcool.
- Profil : « Sans alcool » par défaut, l'autre choix s'appelle « Gorgées (Version Adulte) ».
- Gorgées seulement si `cfg.adult` est activé : sinon le joueur prend gages ou points, même s'il a choisi Gorgées (dans les deux fonctions de pénalité).
- Reste à faire pour les stores : réécrire les règles et textes des jeux qui parlent de boire quand la Version Adulte est coupée, et renommer Poker et Blackjack « des gorgées ».

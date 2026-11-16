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
- Textes tout public : `textes.js` (chargé avant l'app) réécrit à l'affichage tout ce qui parle de boire tant que `cfg.adult` est coupé. Deux branchements dans l'app : `HS_TXT` appelé au début de la fonction JSX `n`, et `window.HS_ADULTE` mis à jour dans `changed()`.
- Roulette russe et paquet « Alcool » de Qui oserait visibles seulement en Version Adulte.
- Reste à faire pour les stores : relire les paquets de cartes Soft (quelques cartes parlent encore d'alcool, ex. « Je n'ai jamais bu dans une chaussure »).

# Cartes et répétitions (16/11/2026, fait dans le fichier publié)

- `contenus.js` (dans le head, avant l'app) : environ 180 cartes en plus (Je n'ai jamais Soft, Qui oserait Classique, Quiz sur les autres, gages). À intégrer dans tes paquets sources.
- Tirage sans répétition : `shuffle` de l'API des jeux passe par `HS_MELANGE`, et les gages par `HS_TIRE` (au lieu de `$n`).
- `cartes.js` : environ 480 cartes de plus dans tous les niveaux (Soft, HARD, Cul, Alcool) pour Je n'ai jamais, Qui oserait, Tu préfères, Paranoïa, Action ou vérité, Quiz sur les autres et Pipoteur. Branchées en tête de chaque paquet avec `...HS_X("nom")`. À intégrer dans tes sources.

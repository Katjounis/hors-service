# Hors Service : consignes pour Claude

PWA de jeux de soirée (surtout des jeux à boire), sur un seul téléphone qu'on se passe ou chacun sur le sien dans un salon (code à 4 caractères). 27 jeux. Projet de Samuel (GitHub Katjounis) et Théo.

## Façon de travailler

- Réponses en français, courtes, directes, sans préambule ni récap.
- Chaque modif terminée et testée est poussée directement sur GitHub (sources et site), sans demander.
- Avant de pousser : `git fetch` et vérifier que l'autre n'a rien poussé sur `sources` entre-temps. Si oui, récupérer et fusionner d'abord.
- Les règles anti-look IA ci-dessous s'appliquent d'office, sans qu'on les rappelle.
- Montrer des captures quand l'apparence change.

## Repos et déploiement

| Repo | Branche | Contenu |
| --- | --- | --- |
| `Katjounis/hors-service` | `sources` | Code source (ce dossier), sans `node_modules` ni `dist` |
| `Katjounis/hors-service` | `main` | Site compilé (`dist/pages`) servi par GitHub Pages, avec `.nojekyll` |
| `Katjounis/hors-service-salons` | `main` | Serveur des salons : Cloudflare Worker + Durable Objects (privé) |

Le serveur de salons est sur `https://hors-service-salons.chaux-samuel.workers.dev` (`SALONS_URL` dans `src/net/salons.js`). Il refuse les origines non autorisées (403).

Pas de CI : on compile en local et on pousse `dist/pages` à la main sur `main`. Les deux branches avancent ensemble.

```
npm install
node build.mjs pages     # dist/pages : le site, PWA hors ligne
node build.mjs preview   # dist/preview.html pour tester en local
```

Pousser le site : vider le clone de `main`, copier `dist/pages/.` dedans, `touch .nojekyll`, commit, push.

Commits en français, courts, qui disent ce qui change pour le joueur (ex. « Personnages : atelier en onglets, chapka, kippa »).

## Architecture

Preact + esbuild, un seul `src/styles.css`, aucune autre lib UI. Moteur « host-authoritative » : le téléphone de l'hôte fait tourner la logique (`src/core/host.js`), les autres envoient des entrées et reçoivent l'état.

| Dossier | Rôle |
| --- | --- |
| `src/core/` | Moteur (`host.js`), appareil local (`device.js`), appareil en salon (`salon-device.js`) |
| `src/net/` | Client du serveur de salons, transport mémoire pour les tests |
| `src/games/` | Un fichier par jeu, `index.js` (catalogue, couleurs, icônes, catégories), `bref.js` (règles en 3 lignes), `niveaux.js` (paquets Soft, HARD, Cul) |
| `src/content/` | Textes des jeux (cartes, mots, défis) |
| `src/ui/` | `app.jsx`, `screens.jsx` (accueil, créer, rejoindre, atelier perso), `party.jsx` (salon, fiche jeu, jeu en cours), `avatar.jsx`, `fx.jsx` (ambiance, animations), `gameart.jsx`, `wrapped.jsx` (bilan) |
| `src/i18n/` | Traduction EN par paires `['FR','EN']`, `{0}` pour les variables |
| `src/jeux/` | Photos des jeux (webp 600 x 400) |
| `test/` | Tests logique (`*.test.jsx`) et navigateur Playwright (`*.test.mjs`) |
| `tools/` | Icônes, thème clair, rendus 3D des illustrations (`rendu-table/`) |

### Ajouter un jeu

Objet exporté par défaut, puis à déclarer dans `src/games/index.js` (import, `GAME_LIST`, `COLORS`, `ICONS`, `GAME_CATS`), dans `src/games/bref.js` et dans `ORDER` de `src/ui/party.jsx`.

- `id`, `name`, `tagline`, `min`, `rules`, `options`.
- `local: false` si un téléphone par joueur est obligatoire ; `solo: true` = un seul téléphone uniquement (refusé en salon).
- Logique : `start(c)`, `request({g, uid, local})`, `input(c, uid, k, v)`, `actions`, `act`, `tick(c)`, `turnOf`, `tintOf`, `bot` (joueur fantôme des tests), `cleanup`.
- Vues : `Table` (écran commun) et `Act` (zone du joueur).
- Contexte `c` : `pen(uid, n, why)` (faire boire), `penCS` (cul sec), `gift(uid, n, why)` (distribuer), `setSecret`, `priv`, `shuffle`, `roster`, `online(uid)`, `isLocal`, `opts`, `ev`, `name`, `activeUids`. Les pénalités passent toujours par `pen`/`gift` (stats et bilan).
- Toute chaîne affichée doit avoir sa traduction dans `src/i18n/`.

## Direction artistique

« Table de jeu vue de dessus » : tapis de feutre, cartes en papier posées dessus, vrais objets de soirée autour (verre sur sous-bock, cartes étalées, pyramide de cartes à plat, boîte de pizza). Une table de soirée entre potes, pas un casino (pas de jetons ni de tapis de casino).

`styles.css` empile plusieurs couches de thème ; la dernière (« THÈME TABLE DE JEU », règles préfixées `:root`) est celle qui compte. On modifie dans cette couche ou après.

| Élément | Valeur |
| --- | --- |
| Titres | Alfa Slab One |
| Texte | Familjen Grotesk (400, 600, 700) |
| Texte des cartes | Literata 600 |
| Fond par défaut | feutre vert `#133A28` |
| Cartes | papier `#FBF6EA`, encre `#22201C` |
| Accent unique | jaune `#FFD23F` |
| Rouge | `#C8301E`, réservé aux pénalités |
| Arrondis | 8 à 12 px |

Le feutre change selon le jeu (`FEUTRES` dans `src/ui/fx.jsx`). En mode « Cul et HARD », tout le fond bascule (feutre rouge, autres objets) avec une transition.

Illustrations des jeux : vrais rendus 3D d'objets sur table (`tools/rendu-table/`), exportés en webp, jamais d'images IA. Avatars : personnages SVG style feutre dessiné à la main, trait fin (`src/ui/avatar.jsx`). Pas d'avatars 3D, pas de formes trop géométriques.

### Anti-look IA

Interdits :
- Polices Inter, Roboto, Open Sans, Poppins, Montserrat, Space Grotesk, DM Sans, Geist.
- Dégradés violet ou bleu, texte en dégradé, glassmorphism, blobs flous, néons.
- Boutons pilule, halos, boutons qui s'élèvent au survol.
- Icônes Lucide partout, emoji dans l'interface, images IA ou banque d'images.
- Rangées de trois cartes icône-titre-texte, cartes dans des cartes, étiquettes en capitales espacées.
- Animations de plus de 250 ms, rebonds, fade-in au scroll.

Obligatoire :
- Animations en `transform` et `opacity`, 150 à 250 ms, `prefers-reduced-motion` respecté.
- Zones cliquables d'au moins 44 px (testé).
- Contraste 4,5:1 pour le texte, calculé.
- Téléphone d'abord (390 px), une colonne.

## Ton et contenu

- Ton de soirée entre potes : familier, drôle, un peu trash, jamais corporate. Textes d'interface courts qui disent quoi faire.
- Jamais de tiret cadratin (—) ni demi-cadratin (–) comme ponctuation. Pas de tics d'IA, pas d'emoji.
- Espaces insécables avant `! ? : ;` et dans les guillemets quand une coupure gêne.
- Public adulte et consentant uniquement : porte d'âge, mode « Cul et HARD » désactivé par défaut, activé par l'hôte.
- Rien d'illégal. La clope du perso « Big » reste clairement du tabac.
- Toujours jouable sans alcool. Plafond de pénalités réglable par l'hôte.
- Pas de marques ni de personnages protégés dans les visuels.

## Tests

Rien ne part en ligne sans que toute la suite passe.

```
# logique : bundle puis exécution
for t in vague2 games logic newgames; do
  npx esbuild test/$t.test.jsx --bundle --platform=node --format=esm \
    --jsx=automatic --jsx-import-source=preact --external:playwright --external:ws \
    --outfile=/tmp/$t.mjs && node /tmp/$t.mjs
done

# navigateur
node build.mjs pages
node test/harness-build.mjs
for t in ui ui-local jamais pages salons bloc1 bloc2 bloc3 bloc5 bloc6; do node test/$t.test.mjs; done
```

`ui` et `logic` dépendent du hasard et du minutage : un échec isolé se relance une fois avant de chercher un bug. Les tests repèrent les jeux par « Jeu NN, Nom » : `m.no` est l'identité du jeu, il ne change pas avec l'ordre d'affichage.

## Pièges connus

- Un contenu CSS `::before` fuit dans le nom accessible et casse les tests : écrire `content: 'X' / ''`.
- Tout nouveau fichier statique (image, police) doit être ajouté au précache du service worker (`build.mjs`, `src/pages/sw.js`), sinon le test `pages` échoue.
- Dans les grilles de l'atelier perso, `min-width: 0` sur les enfants, sinon ça déborde sur téléphone.

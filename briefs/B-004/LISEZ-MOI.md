# B-004 Carte custom (résultat de S-003)

Commit de départ : **cb8efdb** (synchro du 18/11/2026 à 08:17).
Rien n'est publié ni déployé : c'est à importer quand vous l'aurez décidé à deux.

## En trois lignes

- **Ce qui change** : « Mon compte » (connexion par un code reçu par e-mail) dans le menu de droite, sur l'accueil et sur l'écran Rejoindre ; le perso et les cartes suivent le compte d'un téléphone à l'autre ; 100 cartes custom à débloquer en jouant, une collection par rareté, et les épiques et légendaires refaites (flammes, foudre, fumée, pièces, à la charte du Drive).
- **Comment essayer** : `node --no-warnings serveur-comptes/test/essai.mjs` (serveur), puis `cd essais && node --no-warnings e2e-compte.mjs` (appli, avec Playwright) ; à la main : voir « Essayer à la main » plus bas.
- **Ce qui n'a pas été essayé** : le vrai Cloudflare (Worker et base D1 pas déployés), le vrai envoi d'e-mails, de vrais téléphones (seulement Chromium en mode mobile), Safari, le vrai serveur de salons (un serveur simulé a servi pour le QR code).

## Ce que S-003 demandait, ce qui est fait

| Demande | Fait |
|---|---|
| De vraies cartes custom, épiques et légendaires incroyables, animées (flammes et autres), pas de formes « vibe codées » | Les 15 épiques et légendaires ont des effets dessinés et animés par thème : vraies flammes à l'encre (Roi du Chaos, Dragon de feu, Phénix, flammes violettes du Dieu du Purple), foudre en zigzag avec éclair (Tempête, Roi du Chaos, Trou Noir, Hors Service Ultime), fumée en bouffées, pluie de pièces (Jackpot), bulles, étoiles, pluie néon, vent. Les cartes à chiffres des épiques ont un décor pâle derrière les enseignes. |
| Reprendre toutes les cartes déjà faites, à la charte du Drive | Les 100 skins repassés : plus aucun dégradé (contrôle automatique), plus de filtre, aplats, trait d'encre et trames ; style « or » refait en trois tons ; un cartouche sous chaque coin pour que la valeur reste lisible sur les figures et les décors. La galerie est passée sur fond de feutre vert, sans dégradé ni flou. |
| Se connecter avec une adresse e-mail, « Mon compte » dans l'onglet de droite | `compte.js` : « Mon compte » en tête du menu de droite, un bouton rond sur l'accueil, un encart sur l'écran Rejoindre. Pas de mot de passe : un code à 6 chiffres arrive par e-mail. |
| Rejoindre par QR code avec son compte et son perso déjà créé | Sur l'écran Rejoindre (ouvert par le QR code), « Mon compte » ; après connexion, le perso du compte revient et le code du salon est gardé. Essayé de bout en bout avec un serveur de salons simulé. |
| Chacun garde les cartes débloquées | Le serveur compte chaque partie lancée (une seule fois par partie) et débloque les cartes ; une annonce « Nouvelle carte » s'affiche. |
| Une collection par catégorie dans Mon compte | « Ma collection » : mes cartes, puis un filtre par rareté (commune, rare, épique, légendaire) avec les cartes encore à débloquer ; chaque carte s'ouvre en grand, se retourne, montre ses figures, et « Utiliser pour mes cartes » habille les cartes en jeu. |
| Toute l'infrastructure | `serveur-comptes/` : Worker Cloudflare et base D1 (offres gratuites), à part du serveur de salons. Voir son LISEZ-MOI. |

Les cartes restent des dessins faits en code (vectoriel). Je n'ai pas d'outil pour peindre de vraies illustrations ; si vous en voulez (figures peintes, par exemple), le système accepte des images avec les mêmes calques animés par-dessus, mais il faudra un illustrateur ou un outil d'image.

## Contenu du dossier

- `site/` : les fichiers complets, à poser à la racine du site.
  - `index.html` : cb8efdb avec les 4 remplacements de `Modifications de index.html.md`.
  - `compte.js` : nouveau, « Mon compte » (autonome, chargé en `defer` comme `anim.js`).
  - `cartes-skins.js` : nouveau, construit à partir de `sources-cartes.zip`, chargé seulement quand il sert (383 Ko, 112 Ko compressé).
  - `sw.js` : `./compte.js` ajouté à la liste des fichiers, nouveau nom de cache.
- `Modifications de index.html.md` : les 4 remplacements (texte exact avant et après, présent une seule fois).
- `serveur-comptes/` : le Worker (`src/index.js`), le schéma de la base (`schema.sql`), `wrangler.toml`, les essais, son LISEZ-MOI.
- `sources-cartes.zip` : le kit de dessin et les 100 skins, pour reconstruire `cartes-skins.js`, la galerie et les exports.
- `cartes/` : la galerie des 100 skins (une page), les SVG exportés par rareté (zip), le catalogue (JSON, CSV), les planches d'aperçu et trois films (légendaires, épiques, rares).
- `essais/` : les essais de bout en bout, de fluidité, et leurs résultats.

## Importer (Samuel)

1. `site/compte.js` et `site/cartes-skins.js` sont des fichiers à part, recopiés tels quels : dans sources, ils vont dans `src/pages/js/` (comme `anim.js`), et à la racine du site compilé.
2. Reporter les 4 remplacements de `Modifications de index.html.md` dans `src/` (écran Confidentialité, tableau des traductions, balise de script). `site/index.html` est cb8efdb avec ces 4 remplacements, pour comparer.
3. Dans la fabrication de `sw.js` (`src/pages/sw.js` ou `build.mjs`), ajouter `./compte.js` à la liste des fichiers mis en cache (le nom du cache se recalcule au build). Ne pas y mettre `cartes-skins.js` : il est mis en cache à sa première utilisation par la stratégie « réseau d'abord » déjà en place, sans alourdir l'installation de ceux qui n'ont pas de compte.
4. Déployer le serveur des comptes : `serveur-comptes/LISEZ-MOI.md` (5 commandes).
5. Si l'adresse du Worker n'est pas `https://hors-service-comptes.chaux-samuel.workers.dev`, changer `HS_COMPTES_URL` en haut de `compte.js`.

## Ce que garde le téléphone (localStorage)

`hs:compte` (jeton et adresse), `hs:compte-cache` (dernier état du compte), `hs:compte-attente` (parties jouées hors ligne, envoyées au retour du réseau), `hs:skin-actif` (cartes en jeu), `hs:cartes-anim` (réglage « Animer mes cartes »). `compte.js` lit aussi `hs:profile`, `hs:plays` et `hs:lang` sans rien y changer, sauf `hs:profile` quand on reprend le perso du compte.

## Règles respectées

- Les règles ne changent pas. Valeur et enseigne redessinées à la place et à la taille des coins de l'appli ; sous 44 px de large, la face de l'appli reste affichée (plus lisible), seul le dos est habillé.
- Le dos ne dépend jamais de la carte : tous les dos d'un écran sont identiques (vérifié dans Toutankhamon, Trouve la carte, Hippodrome).
- Tailles et places des cartes identiques avec et sans skin (vérifié).
- Animations : les plus grandes cartes à l'écran d'abord, 6 au plus et une quarantaine d'éléments animés en tout (16 sur un petit appareil) ; si l'écran ralentit, mesuré en direct, le budget baisse tout seul jusqu'à zéro. Rien ne bouge si le téléphone demande moins d'animations, ou avec « Animer mes cartes : Non ».
- Pas de boutique, pas de paiement, pas de tirage payant : tout se débloque en jouant.
- Toutes les chaînes affichées ont leur anglais (noms des 100 skins compris). Textes sans tiret long.
- Rien n'est supprimé : les anciennes cartes du dossier « SKIN CARTE » sont intactes.

## Ce qui a été essayé

- Serveur des comptes : 53 vérifications (base SQLite au schéma de D1, e-mails simulés) : code, erreurs, limites, blocage, expiration, second téléphone, déblocage jusqu'à 400 parties (100 cartes), suppression, ménage.
- Appli, de bout en bout (Chromium, téléphone 390 × 844) : 72 vérifications, aucune erreur dans la console. Sans compte rien ne change ; connexion ; déblocage en jouant, hors ligne puis retour du réseau ; collection et choix des cartes ; cartes habillées dans trois jeux ; second téléphone par le lien du QR code ; choix entre deux persos ; anglais ; confidentialité ; moins d'animations ; déconnexion et suppression.
- Non-régression (essai des réglages précédents) : 55 écrans comparés à cb8efdb, seuls changent le menu (« Mon compte » en tête) et le texte de confidentialité ; les 19 jeux jouables sur un seul téléphone se lancent sans erreur.
- Fluidité (Chromium sans carte graphique, 28 cartes à l'écran, `essais/resultats/perf-*.txt`) : 52 à 61 images par seconde pour les skins les plus lourds, processeur normal, ralenti 4 fois et 6 fois (le moins bon : Dragon de feu à 52 avec le processeur ralenti 6 fois). Avant le budget d'animations, les légendaires tombaient à 18 images par seconde avec le processeur ralenti 4 fois : c'est corrigé.
- Galerie : grille à 60 images par seconde (ordinateur et iPhone simulé), visionneuse à 52 (ordinateur) et 58 (iPhone simulé), animations réduites, aucune erreur.

## Ce qui n'a pas été essayé

- Cloudflare pour de vrai (Worker et D1 non déployés) et l'envoi réel d'un e-mail (Resend ou Brevo).
- De vrais téléphones, Safari et Firefox. Les cartes sous 44 px utilisent les « container queries » (Safari 16 et plus) ; sur un navigateur plus ancien, le skin reste affiché sur les petites faces.
- Le vrai serveur de salons : le parcours QR code a été joué avec le serveur simulé des essais.
- Le service worker hors ligne avec `compte.js` (bloqué pendant les essais).
- La Coinche et le Quiz buzzer (un téléphone par joueur) avec des cartes habillées.

## À décider entre Bit et Samuel

1. Le service d'e-mails (Resend ou Brevo, offre gratuite) et l'adresse d'expédition (il faut un domaine vérifié).
2. Le rythme de déblocage (proposition : une commune toutes les 2 parties, une rare toutes les 6, une épique toutes les 25, légendaires à 50, 120, 200, 300 et 400 parties).
3. Le texte de confidentialité proposé (« Compte facultatif », nouvelle partie « Avec un compte »).
4. Plus tard : montrer ses cartes aux autres joueurs. Aujourd'hui, chacun voit son skin sur son téléphone seulement ; le montrer aux autres demande une modification du serveur de salons.

## Limites connues

- Une partie compte dès qu'elle est lancée (une partie lancée puis quittée compte aussi).
- Les cartes sont décoratives : en bricolant la mémoire du navigateur, on peut afficher un skin non débloqué sur son propre téléphone. Sans enjeu (rien n'est payant), et le serveur refuse d'enregistrer un skin non débloqué.
- Offre gratuite de D1 : 100 000 écritures par jour (environ une par partie lancée et par joueur connecté).

# Étape 2 de Hors Service — plan de travail et décisions (Thierry : « fais tous les blocs »)

Ordre : blocs 1 → 6, sans pause entre les blocs. Aucune régression : tous les tests existants doivent rester verts.

## Fait
- Bloc 1 : écran 18+ sobre (AgeGate, prévention en 3 lignes, mémorisé `hs:age`), paquets Cul/HARD
  désactivés par défaut (`S.cfg.adult`), interrupteur avec confirmation dans Menu › Réglages (AdultPacks).
- Noms : Qui oserait… ? (oserait), Pipoteur (pipoteur, rôles pipo/bb, Blanc-Bec), Hippodrome (hippodrome),
  Toutankhamon (toutankhamon, « tombeau »), Balance ta galerie (galerie). Purple, Le 96, Quiz, Trouve la carte inchangés.
- Trouve la carte : un seul joueur face au croupier, rotation dans le sens des aiguilles d'une montre (ordre des places).
- Zip GitHub Pages (build `node build.mjs pages` → dist/pages) : PWA hors ligne, sans Firebase.

## Bloc 2 — sans alcool par joueur
- Profil : `drink` (bool) + `sob` ('gage' | 'points'). Choix à la création (ProfileFields) et modifiable ensuite
  (Mon profil en salon ; Joueurs et places pour l'hôte en mode un téléphone).
- host.pen : buveur → gorgées ; sans alcool + gage → `sober:true, def` ; sans alcool + points → `pts:n` (cul sec = csValue points).
- Compteur : colonnes Gages et Points. Vocabulaire « gage » (et plus « défi ») dans l'interface.

## Bloc 3 — jeux arcade (un seul téléphone) : Dégaine, Bombe, Hors Service Ware
- `solo: true` : jouables seulement en mode « un téléphone qui tourne » (barrés en salon).
- La mini-partie tourne dans l'interface (timings en performance.now), le résultat part au moteur (pénalités, stats).
- Ware : 12 à 15 micro-jeux, 3 vies par tour, vitesse croissante, capteurs avec bouton d'autorisation iOS
  (DeviceMotionEvent.requestPermission) ; micro-jeux à capteur retirés si pas de capteur.

## Bloc 4 — salons (serveur existant, docs/PROTOCOLE.md)
- `SALONS_URL = "https://hors-service-salons.chaux-samuel.workers.dev"` en haut du code. Aucun backend à écrire.
- Origines acceptées par le serveur : https://katjounis.github.io et http://localhost:8080 (tests locaux sur 8080).
- Deux modes au lancement : « Un téléphone qui tourne » / « Chacun son téléphone ». Rôle « screen » = mode Écran + QR (qrcode-generator, local).
- Reconnexion : 1 s, 2 s, 4 s, max 10 s, sauf code 4001 ; aussi sur visibilitychange. Reconstruire depuis welcome (state + private).
- Message max 16 Ko : garder l'état public compact. Rien de sensible dans state (secrets via `private`).
- Réflexes : comparer les `at` serveur.
- Balance ta galerie en salon : photos JAMAIS par le serveur. Choix par défaut annoncé à Thierry : WebRTC direct
  téléphone → téléphone (même Wi-Fi, sans STUN/TURN). À retirer du mode salon si Thierry préfère.

## Bloc 5 — entre copains
- Profils + stats en localStorage (historique des soirées, gorgées données/reçues, records : Dégaine, série Purple, Ware…).
- Gages maison : écrire, exporter/importer par lien ou QR (données dans l'URL, sans serveur).
- Récap « Wrapped » : canvas 1080×1920, avatars, MVP, titres absurdes, chiffres clés ; Web Share API ;
  pas de photo ni de nom de famille ; confirmation « tout le monde est d'accord pour être sur la story ? ».

## Bloc 6 — juridique
- Pages Mentions légales + Confidentialité depuis le menu. Éditeurs non professionnels anonymes.
- Hébergeurs : GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA (app) ;
  Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, USA (salons). Constante HEBERGEUR (option Hostinger).
- Données : tout reste sur le téléphone, sauf échanges temporaires des salons (pseudos, avatars, actions), effacés après 6 h d'inactivité.
- Balance ta galerie : message clair dans l'écran du jeu.
- Relire le paquet HARD : aucune consigne d'infraction ; lister les reformulations.

## Hébergement
- GitHub Pages (compte katjounis) ou Hostinger : même dossier. Hostinger → Samuel doit autoriser le domaine dans le Worker.

## Avancement (13/11)
- Bloc 2 fait : sob gage/points, compteur Gages + Points, modif en cours de soirée (Joueurs et ordre des places).
- Bloc 3 fait : degaine.jsx, bombe.jsx, ware.jsx (14 micro-jeux), arcade.jsx ; solo: true (barrés en salon/démo).
- Balance ta galerie SUPPRIMÉ (demande de Thierry), Firebase supprimé.
- Bloc 4 fait : src/net/salons.js + src/core/salon-device.js + src/ui/screen.jsx ; test/salon-mock.mjs (doublure de test
  du protocole : le vrai serveur est bloqué par le proxy de l'environnement) ; test/salons.test.mjs (14 vérifs).
- Bloc 5 fait : src/lib/stats.js, src/ui/stats.jsx, src/ui/wrapped.jsx ; tests bloc5 (10) + testStats.
- Bloc 6 fait : src/content/legal.js (HEBERGEUR "github" | "hostinger", lu aussi depuis `var HEBERGEUR` en haut d'index.html),
  src/ui/legal.jsx (Mentions légales, Confidentialité + « Effacer toutes mes données »), liens sur l'accueil et dans le menu ;
  paquet HARD relu : 28 cartes reformulées ; test/bloc6.test.mjs (8) + vérif « anciennes formulations absentes » dans games.test.
- Recette (13/11) : le moteur refuse aussi les jeux arcade en salon (pas seulement l'interface) ; test d'endurance adapté
  (résultats arcade au hasard, parfois périmés). Deux régressions trouvées et corrigées :
  1. site publié : accueil bloqué sur « Redémarrage… » au rechargement quand l'écran 18+ était déjà validé
     (le mode salons démarre instantanément, avant l'abonnement de l'écran) → useDevice redessine après abonnement ;
  2. pages ouvertes depuis le bas de l'accueil (Mentions, Stats) affichées déjà défilées → retour en haut à chaque écran.
- README du site : 11 jeux, deux modes, GitHub Pages (compte katjounis), Hostinger, SALONS_URL, test local sur 8080.

## Étape 3 (13/11) — « Je n’ai jamais » et nouveau décor
- Jeu 12 « Je n’ai jamais » (src/games/jamais.jsx, src/content/jamais.js) : Soft 92, HARD 92 (hors sexe), Cul 109 cartes.
  Niveaux cochables ensemble (option `multi` : GameSheet + validation dans host.startGame), cartes mélangées sans répétition,
  HARD et Cul = paquets adultes (cfg.adult + limites « Piquant »), badge et liseré de couleur par niveau.
  Règle : « Je n’ai jamais… » → « Moi si ! » ; « Je pourrais… » / « Je l’ai déjà fait pour… » → « Moi aussi ! » ; pénalité 1 à 3 gorgées.
  Compteur (choix de Thierry) : en salon réponses secrètes puis noms révélés ; sur un téléphone, on touche les avatars.
  Un seul téléphone : bouton « Tout le monde a bu : valider les N » dans le dock (gorgées et points ; gages et culs secs un par un).
- Décor « appart en fin de soirée » partout (choix de Thierry) : guirlande (SVG en motif répété, 2 calques qui scintillent),
  halos colorés, bokeh, table + verres + bougie qui vacille, grain, vignette ; teinte par jeu et, dans Je n’ai jamais,
  par niveau de carte (Soft chaud, HARD violet/orange, Cul rouge/rose). Barre du haut translucide.
- Lisibilité : boutons secondaires, puces et grilles de joueurs sur fond sombre semi-opaque ; note de l’aperçu sur papier
  corrigée (texte foncé sur fond foncé) ; espaces insécables avant ; : ! ? dans les textes de l’interface.
- Écran de jeu ouvert en haut de page au lancement (avant : restait défilé comme la liste des jeux).
- Tests : games.test testJamais (22), stress (Je n’ai jamais en salon et sur un téléphone), test/jamais.test.mjs (23).

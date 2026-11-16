# Hors Service

Jeux de soirée sur téléphone, pour adultes (18 ans et plus), avec ou sans alcool : chaque joueur choisit des gorgées, des gages ou des points de pénalité. Appli web installable (PWA) : le mode « un téléphone qui tourne » marche sans réseau une fois l’appli ouverte.

## Deux façons de jouer

- **Un téléphone qui tourne** : sans réseau, on se passe le téléphone ; les infos secrètes s’affichent chacun son tour.
- **Chacun son téléphone** : un salon (code de 4 lettres ou QR code), chacun garde ses secrets sur son écran. Un **mode Écran** (télé, tablette) affiche le plateau et les scores ; les téléphones servent de manettes.

## Les jeux

| # | Jeu | Le principe | Joueurs |
|---|-----|-------------|---------|
| 01 | Qui oserait… ? | Une question, un vote secret. Le plus désigné boit autant de gorgées que de votes reçus. | 3+ |
| 02 | Le 96 | On additionne les cartes de tête sans dépasser 96. Le total n’est jamais affiché, sauf quelques secondes en grand quand l’annonce est juste. Mauvaise annonce : cul sec. | 2+ |
| 03 | Pipoteur | Tout le monde a le même mot, sauf le pipoteur, qui a un mot voisin et ne le sait pas. Familles de mots (un mot, plusieurs voisins possibles), niveaux Soft, HARD et Cul. | 3+ |
| 04 | Purple | Rouge, noir ou purple. Deux bonnes réponses d’affilée pour passer la main, sinon tu bois la pile. Bouton « Purple jusqu’à la mort » : l’appli tire jusqu’au purple, une gorgée par carte avant. | 2+ |
| 05 | Hippodrome | Quatre As en course. Tu paries des gorgées sur l’un d’eux : le classement décide qui distribue et qui boit. | 2+ |
| 06 | Toutankhamon | Tu mémorises tes cartes, puis tu donnes ou tu bluffes à chaque carte retournée. Test de mémoire à la fin. | 2+ |
| 07 | Quiz sur les autres | Une question sur un joueur. Chacun écrit une réponse en secret, puis on vote pour la meilleure. | 3+ |
| 08 | Trouve la carte | Le croupier tire une carte, tu as deux essais pour la trouver. Plus ou moins entre les deux. | 2+ |
| 09 | Dégaine | Duel de réflexes à deux, le téléphone posé entre vous. Au signal « TAPE ! », le plus rapide gagne. | 2+ · un seul téléphone |
| 10 | Bombe | Le téléphone passe de main en main avec une consigne. Mèche cachée : celui qui le tient quand ça explose prend la pénalité. | 2+ · un seul téléphone |
| 11 | Hors Service Ware | Une rafale de micro-jeux de 3 à 5 secondes, consigne d’un mot, de plus en plus vite. Chaque vie perdue est une pénalité. | 2+ · un seul téléphone |
| 12 | Je n’ai jamais | Une carte, et tous ceux pour qui c’est vrai boivent. Trois niveaux à mélanger : Soft, HARD et Cul. | 2+ |

Je n’ai jamais et Pipoteur : trois niveaux à cocher, seuls ou ensemble (Soft, HARD hors sexe, Cul). HARD et Cul sont des paquets adultes, désactivés par défaut (Menu › Réglages de la soirée).

Aussi : stats et records gardés sur le téléphone, gages maison (partage par lien ou QR code), récap « story » de fin de soirée.

## Publier sur GitHub Pages (compte katjounis)

1. Sur GitHub : **New repository**, par exemple `hors-service`, en **Public**.
2. **Add file › Upload files** : glisse tout le contenu du zip (`index.html`, `manifest.webmanifest`, `sw.js`, `README.md`, le dossier `assets`), puis **Commit changes**.
3. `.nojekyll` est un fichier caché : s’il n’a pas suivi, crée-le avec **Add file › Create new file**, nom `.nojekyll`, contenu vide.
4. **Settings › Pages** : Source **Deploy from a branch**, branche **main**, dossier **/ (root)**, **Save**.
5. Une à deux minutes plus tard : `https://katjounis.github.io/hors-service/`.

## Publier sur Hostinger (au lieu de GitHub)

1. hPanel › **Gestionnaire de fichiers** › dossier `public_html` : dépose tout le contenu du zip (ou le zip, puis **Extraire**).
2. Dans `index.html`, tout en haut : remplace `var HEBERGEUR = "github";` par `var HEBERGEUR = "hostinger";` (mentions légales).
3. **Important** : le serveur de salons n’accepte que `https://katjounis.github.io` et `http://localhost:8080`. Sur un domaine Hostinger, Samuel doit ajouter ce domaine dans le Worker, sinon « Chacun son téléphone » sera refusé (le mode un téléphone, lui, marche partout).

## Serveur de salons

L’adresse est en haut de `index.html` : `var SALONS_URL = "https://hors-service-salons.chaux-samuel.workers.dev";`. Le site reste statique : seul ce serveur (Cloudflare) relaie les parties, sans rien garder (un salon s’efface après 6 h d’inactivité).

Tester en local : dans ce dossier, `python3 -m http.server 8080`, puis ouvrir `http://localhost:8080/`.

## Installer sur le téléphone

- iPhone (Safari) : bouton Partager › **Sur l’écran d’accueil**.
- Android (Chrome) : menu ⋮ › **Installer l’application**.

## Invitation à installer et compteur (install.js)

`install.js` est séparé du reste de l’app : il propose d’ajouter Hors Service à l’écran d’accueil (une minute après l’écran 18+, trois fois maximum, une semaine entre deux) et envoie au serveur de salons, une fois par jour, un identifiant aléatoire pour compter les téléphones actifs. À chaque nouvelle version, garder la ligne `<script src="install.js" defer></script>` juste avant `</body>` et `./install.js` dans la liste du service worker. Chiffres du mois : `https://hors-service-salons.chaux-samuel.workers.dev/stats`.

## Mettre à jour

Remplace les fichiers : les téléphones prennent la nouvelle version à l’ouverture suivante (avec du réseau).

L’abus d’alcool est dangereux pour la santé. Après avoir bu, on ne prend pas le volant. On a toujours le droit de passer son tour.

# Hors Service : protocole des salons

Serveur de salons multi-téléphones déjà écrit et déployé sur Cloudflare (Worker + Durable Objects). L'app n'a qu'à suivre ce protocole, il ne faut pas réécrire le serveur.

Adresse du serveur : `https://hors-service-salons.<sous-domaine>.workers.dev` (Samuel te donnera l'adresse exacte après déploiement). Mets-la dans une seule constante `SALONS_URL` en haut du code.

## Principe

Le serveur ne connaît aucune règle de jeu : il relaie. C'est le téléphone de l'**hôte** qui fait tourner la partie (tirage des cartes, rôles, scores) et publie l'état. Les **joueurs** envoient leurs actions. L'**écran** (TV, tablette ou téléphone posé au milieu) affiche l'état et reçoit aussi les actions, mais ne joue pas.

Un salon s'efface tout seul après 6 h sans activité. 16 connexions maximum par salon. Message de 16 Ko maximum.

## Routes HTTP

- `POST /new` : crée un salon, renvoie `{ "code": "KGCD" }` (4 lettres, sans I ni O).
- `GET /room/KGCD` : renvoie `{ "existe": true, "joueurs": 3, "verrouille": false }` ou `{ "existe": false }`.

## Connexion WebSocket

`wss://<serveur>/room/KGCD/ws?pid=<id>&name=<pseudo>&role=<host|player|screen>`

- `pid` : identifiant stable du joueur, généré une fois (ex. `crypto.randomUUID()` sans tirets) et gardé en localStorage. C'est lui qui permet de revenir dans la partie après une coupure.
- Le premier qui se connecte en `host` devient l'hôte. Un deuxième `host` est rétrogradé en `player`.
- Si le salon est verrouillé (partie lancée), seuls les pid déjà inscrits et les écrans peuvent entrer.

Codes de refus à l'ouverture : 404 salon inexistant, 409 salon plein, 423 partie déjà lancée, 403 origine non autorisée.

## Messages envoyés par l'app (JSON)

| `t` | Qui | Contenu | Effet |
|---|---|---|---|
| `profile` | tous | `name`, `avatar` (objet JSON de personnalisation, moins de 2 Ko) | met à jour la liste des joueurs chez tout le monde |
| `state` | hôte | `data` : état public de la partie | stocké et diffusé à tous, renvoyé à chaque reconnexion |
| `private` | hôte | `to` : pid, `data` | envoyé à ce joueur seul (mot d'Imposteur, mission secrète), renvoyé s'il se reconnecte |
| `lock` | hôte | `value` : true / false | verrouille le salon quand la partie démarre |
| `host` | hôte | `to` : pid | passe le rôle d'hôte à un autre joueur |
| `action` | tous | `data` : vote, tap, réponse... | transmis à l'hôte et aux écrans, avec l'heure serveur `at` |
| `broadcast` | tous | `data` | diffusé à tous les autres (réactions, petites animations) |
| `time` | tous | `ref` (optionnel) | répond avec l'heure serveur, pour caler les comptes à rebours |
| `ping` | tous | rien | répond `pong` (à envoyer toutes les 20 à 30 s) |

## Messages reçus

| `t` | Contenu |
|---|---|
| `welcome` | `you`, `host`, `players`, `state`, `private`, `locked` : tout ce qu'il faut pour (re)construire l'écran |
| `players` | `players` (liste `{pid, name, role, avatar}`), `host` |
| `state` | `data` |
| `private` | `data` |
| `action` | `from`, `at` (horodatage serveur en ms), `data` |
| `broadcast` | `from`, `data` |
| `locked` | `value` |
| `time` | `now`, `ref` |
| `pong` | rien |
| `error` | `erreur` |

## Règles côté app

- Reconnexion automatique avec délai progressif (1 s, 2 s, 4 s, max 10 s) dès que la socket se ferme, sauf code 4001 (salon expiré). Reconnecter aussi au retour au premier plan (`visibilitychange`).
- Après `welcome`, reconstruire l'écran uniquement à partir de `state` et `private` : un joueur qui revient doit retrouver exactement sa partie.
- Pour départager des réflexes (Dégaine, course au tap), l'hôte compare les `at` des actions, pas l'heure des téléphones.
- Les photos de Photo roulette ne passent JAMAIS par le salon : elles restent sur le téléphone qui les affiche.
- Rien de sensible dans `state` : il est visible par tous les appareils du salon.

# Serveur des comptes (B-004)

Un Worker Cloudflare à part, à côté du serveur de salons, avec une base D1. Offres gratuites de Cloudflare.
Il sert à « Mon compte » dans l'appli : connexion par un code reçu par e-mail, perso gardé, cartes débloquées, cartes choisies.

## Ce qu'il fait

| Adresse | Rôle |
|---|---|
| `GET /sante` | répond `{ ok: true }` |
| `POST /code` `{ email, langue }` | envoie un code à 6 chiffres (valable 15 min) |
| `POST /connexion` `{ email, code }` | vérifie le code, crée le compte la première fois, rend un jeton |
| `GET /compte` | le compte : cartes, skin, perso, parties, prochaine carte |
| `PUT /compte/perso` `{ perso }` | garde le perso de l'appli (le contenu de `hs:profile`) |
| `PUT /compte/skin` `{ skin }` | cartes choisies (`null` = cartes d'origine), seulement parmi les cartes débloquées |
| `POST /compte/partie` `{ jeu, cle }` | une partie lancée : compte une fois par clé (`code:numéro`), débloque des cartes |
| `POST /deconnexion` | efface le jeton de ce téléphone |
| `DELETE /compte` | efface tout le compte |

Sécurité : pas de mot de passe ; le code et les jetons sont gardés en empreinte (SHA-256 avec le secret `SEL`), jamais en clair.
5 essais par code, 5 codes par heure et par adresse, 30 demandes par heure et par réseau, adresse bloquée 24 h après 20 erreurs.
`POST /code` répond pareil que l'adresse ait un compte ou non. Le site seul peut l'appeler (CORS : `ORIGINES`).

Déblocage (réglable en haut de `src/index.js`) : 1 commune au départ (C-001), puis une commune toutes les 2 parties,
une rare toutes les 6, une épique toutes les 25, les légendaires à 50, 120, 200, 300 et 400 parties.
Tout est débloqué à 400 parties. L'ordre des cartes est propre à chaque compte. Gratuit : ni boutique, ni tirage payant.

## Mise en place (à faire par Samuel, rien n'est déployé)

```
cd serveur-comptes
npx wrangler d1 create hors-service-comptes          # recopier l'identifiant donné dans wrangler.toml (database_id)
npx wrangler d1 execute hors-service-comptes --remote --file schema.sql
npx wrangler secret put SEL                          # une longue phrase au hasard, à garder secrète
npx wrangler deploy
```

L'adresse du Worker sera `https://hors-service-comptes.<ton sous-domaine>.workers.dev`.
Si elle diffère de `https://hors-service-comptes.chaux-samuel.workers.dev`, changer `HS_COMPTES_URL` en haut de `compte.js`.

### Envoi des e-mails (à décider entre Bit et Samuel)

Deux services prévus, au choix, chacun avec une offre gratuite : Resend ou Brevo.

```
npx wrangler secret put RESEND_CLE      # ou : npx wrangler secret put BREVO_CLE
```

puis `EXPEDITEUR` dans `wrangler.toml` (ex. `Hors Service <compte@domaine-verifie.fr>`). Il faut un domaine (ou une adresse)
vérifié chez le service choisi. Sans service, les vraies adresses reçoivent une erreur claire (« L'e-mail n'a pas pu partir »).

### Mode essai

`MODE_ESSAI = "1"` : pour les adresses en `@essai.test` seulement (domaine réservé, qui ne peut exister nulle part),
le code s'affiche dans l'appli au lieu d'être envoyé. Les vraies adresses passent toujours par l'e-mail, même en mode essai.
On peut donc essayer tout le parcours avant d'avoir choisi le service d'e-mails. Mettre `"0"` pour le couper.

## Essais

```
node --no-warnings test/essai.mjs        # 53 vérifications, base SQLite au schéma de D1, e-mails simulés (Node 22.5 ou plus)
node --no-warnings test/local.mjs 8787   # le serveur en local pour essayer l'appli (mode essai)
```

Pour essayer l'appli avec le serveur local : dans une copie locale de index.html, ajouter
`<script>window.HS_COMPTES_URL = "http://localhost:8787"</script>` juste avant la balise de `compte.js`,
puis se connecter avec une adresse en `@essai.test` (le code s'affiche).

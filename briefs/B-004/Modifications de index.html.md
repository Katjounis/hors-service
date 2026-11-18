# Modifications de index.html (B-004)

Commit de départ : cb8efdb (synchro du 18/11/2026 à 08:17). Quatre remplacements. Chaque texte « avant » est présent une seule fois dans index.html de cb8efdb.
À reporter aussi dans les sources (branche sources) pour que le prochain build les garde.

## 1. Charge compte.js (« Mon compte ») après l’appli, comme anim.js et install.js.

Où : Tout en bas du fichier, juste avant </body>.

Texte exact avant :

```
<script src="install.js" defer></script>
```

Texte exact après :

```
<script src="install.js" defer></script>
<script src="compte.js" defer></script>
```

## 2. Traductions anglaises : le nouveau texte de « L’essentiel », puis le titre et le paragraphe de la nouvelle partie « Avec un compte (facultatif) ».

Où : Dans le tableau des traductions (début du script de l’appli), à la ligne « L’essentiel ».

Texte exact avant :

```
["Pas de compte, pas de publicit\xE9, pas de traceur publicitaire. Tout ce que l\u2019appli garde reste sur ce t\xE9l\xE9phone, sauf les \xE9changes temporaires d\u2019une partie en salon.","No account, no ads, no ad trackers. Everything the app keeps stays on this phone, except the temporary exchanges of a game in a room."]
```

Texte exact après :

```
["Compte facultatif, pas de publicit\xE9, pas de traceur publicitaire. Sans compte, tout ce que l\u2019appli garde reste sur ce t\xE9l\xE9phone, sauf les \xE9changes temporaires d\u2019une partie en salon.","Optional account, no ads, no ad trackers. Without an account, everything the app keeps stays on this phone, except the temporary exchanges of a game in a room."],["Avec un compte (facultatif)","With an account (optional)"],["Si tu te connectes dans \xAB\xA0Mon compte\xA0\xBB, le serveur des comptes (Cloudflare) garde ton adresse e-mail, ton perso (pseudo, avatar, avec ou sans alcool, limites de contenu), les cartes d\xE9bloqu\xE9es, les cartes choisies et le nombre de parties lanc\xE9es par jeu. L\u2019adresse sert seulement \xE0 t\u2019envoyer un code de connexion, valable 15 minutes, par un service d\u2019envoi d\u2019e-mails. Sur ce t\xE9l\xE9phone, l\u2019appli garde alors ton adresse et un jeton de connexion. Rien n\u2019est revendu ni utilis\xE9 pour de la publicit\xE9. \xAB\xA0Supprimer mon compte\xA0\xBB, dans Mon compte, efface tout du serveur tout de suite.","If you sign in under \u201CMy account\u201D, the accounts server (Cloudflare) keeps your e-mail address, your character (nickname, avatar, with or without alcohol, content limits), your unlocked cards, your chosen cards and how many games you started of each game. The address is only used to send you a sign-in code, valid for 15 minutes, through an e-mail sending service. On this phone, the app then keeps your address and a sign-in token. Nothing is sold or used for advertising. \u201CDelete my account\u201D, under My account, erases everything from the server right away."]
```

## 3. Confidentialité, « L’essentiel » : « Pas de compte » n’est plus vrai, le compte est facultatif.

Où : Dans l’écran Confidentialité (composant qui commence par class:"legal").

Texte exact avant :

```
a("p",{children:"Pas de compte, pas de publicit\xE9, pas de traceur publicitaire. Tout ce que l\u2019appli garde reste sur ce t\xE9l\xE9phone, sauf les \xE9changes temporaires d\u2019une partie en salon."})
```

Texte exact après :

```
a("p",{children:"Compte facultatif, pas de publicit\xE9, pas de traceur publicitaire. Sans compte, tout ce que l\u2019appli garde reste sur ce t\xE9l\xE9phone, sauf les \xE9changes temporaires d\u2019une partie en salon."})
```

## 4. Confidentialité : nouvelle partie « Avec un compte (facultatif) », qui dit ce que le serveur des comptes garde et comment tout effacer.

Où : Dans l’écran Confidentialité, juste avant la partie « Dans un salon ».

Texte exact avant :

```
a("h3",{children:"Dans un salon (\xAB Chacun son t\xE9l\xE9phone \xBB)"})
```

Texte exact après :

```
a("h3",{children:"Avec un compte (facultatif)"}),a("p",{children:"Si tu te connectes dans \xAB\xA0Mon compte\xA0\xBB, le serveur des comptes (Cloudflare) garde ton adresse e-mail, ton perso (pseudo, avatar, avec ou sans alcool, limites de contenu), les cartes d\xE9bloqu\xE9es, les cartes choisies et le nombre de parties lanc\xE9es par jeu. L\u2019adresse sert seulement \xE0 t\u2019envoyer un code de connexion, valable 15 minutes, par un service d\u2019envoi d\u2019e-mails. Sur ce t\xE9l\xE9phone, l\u2019appli garde alors ton adresse et un jeton de connexion. Rien n\u2019est revendu ni utilis\xE9 pour de la publicit\xE9. \xAB\xA0Supprimer mon compte\xA0\xBB, dans Mon compte, efface tout du serveur tout de suite."}),a("h3",{children:"Dans un salon (\xAB Chacun son t\xE9l\xE9phone \xBB)"})
```

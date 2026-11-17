// Hors Service : cartes en plus et tirage sans répétition.
// Chargé AVANT le script de l'app. Les cartes ci-dessous s'ajoutent aux paquets d'origine.
// Le tirage garde en mémoire (sur le téléphone de l'hôte) les cartes déjà sorties, et les remet en fin de pile
// jusqu'à ce que tout le paquet ait été vu.
(function () {
  "use strict";

  window.HS_PLUS = {
    // Je n'ai jamais, niveau Soft (tout public)
    jamais: [
      "Je n’ai jamais menti sur mon âge.",
      "Je n’ai jamais fait semblant d’être malade pour éviter une sortie.",
      "Je n’ai jamais mangé un plat tombé par terre en appliquant la règle des trois secondes.",
      "Je n’ai jamais oublié l’anniversaire d’un proche.",
      "Je n’ai jamais chanté sous la douche en pensant que personne n’écoutait.",
      "Je n’ai jamais googlé mon propre nom.",
      "Je n’ai jamais dormi plus de quatorze heures d’affilée.",
      "Je n’ai jamais eu peur du noir après l’âge de dix ans.",
      "Je n’ai jamais cassé l’écran de mon téléphone.",
      "Je n’ai jamais appelé un prof « maman » ou « papa ».",
      "Je n’ai jamais fait une crise de fou rire en public sans pouvoir m’arrêter.",
      "Je n’ai jamais regifté un cadeau.",
      "Je n’ai jamais fait semblant d’aimer un cadeau.",
      "Je n’ai jamais perdu mes clés plus de trois fois dans la même année.",
      "Je n’ai jamais parlé à un animal comme à un humain pendant plus de cinq minutes.",
      "Je n’ai jamais raté une marche devant plein de monde.",
      "Je n’ai jamais fait un régime qui a duré moins de deux jours.",
      "Je n’ai jamais fini un pot de glace entier tout(e) seul(e).",
      "Je n’ai jamais eu une coupe de cheveux que j’ai regrettée aussitôt.",
      "Je n’ai jamais menti dans un CV.",
      "Je n’ai jamais caché un mauvais bulletin à mes parents.",
      "Je n’ai jamais fait la queue plus d’une heure pour quelque chose.",
      "Je n’ai jamais écrit à mon ex à deux heures du matin.",
      "Je n’ai jamais stalké quelqu’un sur les réseaux jusqu’à ses photos d’il y a cinq ans.",
      "Je n’ai jamais liké une vieille photo par erreur en stalkant.",
      "Je n’ai jamais fait semblant de rire à une blague que je n’avais pas comprise.",
      "Je n’ai jamais eu un surnom que je détestais.",
      "Je n’ai jamais été le dernier ou la dernière choisi(e) en sport.",
      "Je n’ai jamais gagné quelque chose à un tirage au sort.",
      "Je n’ai jamais pleuré en coupant un oignon devant quelqu’un qui a cru que c’était pour de vrai.",
      "Je n’ai jamais pris une photo de moi en faisant semblant de ne pas poser.",
      "Je n’ai jamais été pris(e) en flagrant délit de parler de quelqu’un dans son dos.",
      "Je n’ai jamais dit « je t’aime » en premier.",
      "Je n’ai jamais fait un vœu en soufflant sur une bougie qui s’est réalisé.",
      "Je n’ai jamais été fan d’un boys band ou d’un girls band.",
      "Je n’ai jamais connu toutes les paroles d’une chanson que je n’aime pas.",
      "Je n’ai jamais fait de l’accrobranche.",
      "Je n’ai jamais vu un film d’horreur en entier sans me cacher les yeux.",
      "Je n’ai jamais goûté de la nourriture pour animaux.",
      "Je n’ai jamais été réveillé(e) par mon propre ronflement.",
      "Je n’ai jamais fait semblant de dormir pour éviter une corvée.",
      "Je n’ai jamais claqué une porte après une dispute.",
      "Je n’ai jamais eu des billets pour un concert que j’ai raté.",
      "Je n’ai jamais été invité(e) à un mariage où je ne connaissais presque personne.",
      "Je n’ai jamais écouté la même chanson plus de vingt fois dans la journée.",
      "Je n’ai jamais fait un selfie avec une célébrité.",
      "Je n’ai jamais mangé un truc périmé depuis plus d’une semaine.",
      "Je n’ai jamais fait un gâteau complètement raté.",
      "Je n’ai jamais été plus de 24 heures sans dormir.",
      "Je n’ai jamais acheté un vêtement que je n’ai jamais porté.",
      "Je n’ai jamais eu un fou rire pendant un enterrement ou une cérémonie.",
      "Je n’ai jamais fait semblant de connaître quelqu’un qui me disait bonjour.",
      "Je n’ai jamais fait de camping sauvage.",
      "Je n’ai jamais été le ou la dernier(e) à comprendre une blague.",
      "Je n’ai jamais imité la voix de quelqu’un au téléphone.",
      "Je n’ai jamais été arrêté(e) à l’aéroport pour un objet oublié dans mon sac.",
    ],

    // Qui oserait… ? paquet Classique ([niveau, fin de phrase])
    oserait: [
      [1, "chanter l’hymne national devant un stade plein"],
      [1, "manger un insecte grillé"],
      [1, "partir vivre à l’autre bout du monde sur un coup de tête"],
      [1, "se teindre les cheveux en bleu demain"],
      [1, "faire un tatouage choisi par la table"],
      [1, "participer à une émission de télé-réalité"],
      [1, "dormir une nuit seul(e) dans une maison hantée"],
      [1, "demander une augmentation dès le premier mois"],
      [1, "faire du stand-up devant cent personnes"],
      [1, "se raser la tête pour une bonne cause"],
      [1, "traverser la France à vélo"],
      [1, "passer une semaine sans râler"],
      [1, "adopter un serpent"],
      [1, "manger épicé au point de pleurer, juste pour prouver qu’il tient"],
      [1, "parler à un inconnu dans le métro pendant tout le trajet"],
      [1, "faire un saut à l’élastique"],
      [1, "apprendre le chinois en un an"],
      [1, "monter un groupe de musique avec ses voisins"],
      [1, "partir en vacances sans réserver aucun logement"],
      [1, "défiler sur un podium en pyjama"],
      [1, "se lancer dans un marathon sans entraînement"],
      [1, "aller seul(e) au cinéma un samedi soir"],
      [1, "manger uniquement des pâtes pendant un mois"],
      [1, "ouvrir une chaîne YouTube de cuisine ratée"],
      [2, "envoyer un message vocal chanté à son ou sa chef(fe)"],
      [2, "relire à voix haute ses messages d’il y a dix ans"],
      [2, "mettre une chaussette dépareillée exprès à un entretien d’embauche"],
      [2, "danser seul(e) au milieu d’un supermarché"],
      [2, "répondre « d’accord maman » à un prof"],
      [2, "faire une déclaration publique sur le groupe de la famille"],
      [2, "s’inventer un accent pendant toute une soirée"],
      [2, "mettre sa photo de classe de CM2 en photo de profil"],
      [2, "faire un discours au mariage de quelqu’un qu’il connaît à peine"],
      [2, "demander le numéro de quelqu’un dans une file d’attente"],
      [2, "liker une photo de son ex datant de 2018"],
      [2, "répondre au téléphone par « Allô, la pizzeria ? »"],
      [2, "rendre visite à ses parents sans prévenir, avec un sac de linge sale"],
      [2, "lire son journal intime d’ado devant toute la table"],
      [2, "aller à une soirée déguisée dans le mauvais thème"],
      [2, "se faire passer pour un touriste dans sa propre ville"],
      [2, "faire une vidéo de danse et la poster sans filtre"],
      [2, "commander en parlant uniquement avec des gestes"],
      [2, "essayer de négocier le prix d’une baguette"],
      [2, "s’inscrire à un cours de salsa sans connaître personne"],
      [2, "raconter sa pire rupture en détail"],
      [2, "porter le même pull une semaine entière sans que personne le remarque"],
    ],

    // Quiz sur les autres ([niveau, question avec {A}])
    autres: [
      [1, "La destination de rêve de {A} :"],
      [1, "Le plat que {A} pourrait manger tous les jours :"],
      [1, "Le prénom du futur animal de compagnie de {A} :"],
      [1, "La série que {A} a déjà vue trois fois :"],
      [1, "Le métier que {A} voulait faire à huit ans :"],
      [1, "L’objet que {A} perd tout le temps :"],
      [1, "Le surnom de {A} dans une cour de récré :"],
      [1, "Ce que {A} commande toujours au restaurant :"],
      [1, "Le personnage de dessin animé qui ressemble le plus à {A} :"],
      [1, "La chanson de karaoké de {A} :"],
      [1, "Le défaut le plus attachant de {A} :"],
      [1, "Ce que {A} ferait d’une journée sans aucune obligation :"],
      [1, "Le premier achat de {A} avec un million d’euros :"],
      [1, "La phrase que {A} dira dans vingt ans :"],
      [1, "Le sport olympique que {A} gagnerait sans entraînement :"],
      [1, "Le titre du podcast que {A} lancerait :"],
      [1, "Ce que {A} met dans sa valise en premier :"],
      [1, "La couleur qui décrit le mieux {A} :"],
      [2, "L’excuse de {A} pour annuler une soirée à la dernière minute :"],
      [2, "Ce que {A} googlerait à trois heures du matin :"],
      [2, "Le message que {A} enverrait à son ex après une soirée :"],
      [2, "La raison pour laquelle {A} arrive toujours en retard :"],
      [2, "Le talk-show que {A} animerait, et son invité rêvé :"],
      [2, "La dernière chose que {A} a achetée sans en avoir besoin :"],
      [2, "Ce que {A} dit quand il ou elle a faim :"],
      [2, "Le gros mot préféré de {A} :"],
      [2, "Ce que {A} ferait s’il ou elle devenait invisible une journée :"],
      [2, "L’appli que {A} ouvre en premier le matin :"],
      [2, "Ce qui ferait pleurer {A} devant un film :"],
      [2, "La règle que {A} imposerait s’il ou elle dirigeait le pays :"],
      [2, "Le mensonge que {A} raconte le plus souvent :"],
      [2, "La spécialité de {A} en cuisine, et pourquoi c’est raté :"],
      [2, "Le genre de vidéos que {A} regarde au lit :"],
      [2, "Le pire conseil que {A} pourrait donner :"],
    ],

    // Gages ([niveau, gage]) : 1 bon enfant, 2 chambrage, 3 un peu plus gênant
    gages: [
      [1, "Fais le tour de la table en serrant la main de tout le monde, très sérieusement."],
      [1, "Dis l’alphabet à l’envers jusqu’à la lettre P."],
      [1, "Mime ton film préféré sans parler : la table devine."],
      [1, "Fais une révérence à chaque personne qui te parle jusqu’à ton prochain tour."],
      [1, "Chante « Joyeux anniversaire » à la personne de ton choix, même si ce n’est pas le sien."],
      [1, "Raconte comment s’est passée ta journée en une seule phrase très longue."],
      [1, "Fais 10 pompes, ou 20 sur les genoux."],
      [1, "Imite la sonnerie de ton téléphone."],
      [1, "Dis le prénom de chaque joueur en commençant par la fin."],
      [1, "Trouve trois points communs avec la personne en face de toi."],
      [1, "Parle comme un robot jusqu’au prochain tour."],
      [1, "Fais ta meilleure imitation d’un présentateur de journal télévisé."],
      [1, "Tiens une position de gainage pendant 20 secondes."],
      [1, "Dessine le portrait de ta voisine ou de ton voisin en 30 secondes."],
      [1, "Fais un compliment différent à chaque joueur."],
      [1, "Tape dans les mains de tout le monde, façon fin de match."],
      [1, "Cite cinq pays en moins de dix secondes."],
      [1, "Fais semblant d’être un guide touristique et présente la pièce."],
      [1, "Raconte une histoire de 30 secondes qui commence par « Il était une fois un grille-pain »."],
      [1, "Échange de place avec la personne de ton choix."],
      [2, "Parle uniquement en chuchotant jusqu’à ton prochain tour."],
      [2, "Fais une interview de la personne à ta gauche comme un journaliste sportif."],
      [2, "Chante ta dernière phrase comme dans une comédie musicale."],
      [2, "Fais le bruit de dix animaux différents en 20 secondes."],
      [2, "Invente une chorégraphie de 8 temps et apprends-la à la table."],
      [2, "Raconte ton souvenir d’enfance le plus ridicule."],
      [2, "Fais une pub de 15 secondes pour la personne à ta droite."],
      [2, "Imite la démarche d’un mannequin jusqu’à la porte et reviens."],
      [2, "Ajoute « mon capitaine » à la fin de chaque phrase jusqu’au prochain jeu."],
      [2, "Fais une prière solennelle au dieu des chips."],
      [2, "Tiens un débat de 20 secondes avec toi-même : pour ou contre les chaussettes."],
      [2, "Commente la partie comme un match de foot jusqu’au prochain tour."],
      [2, "Montre ton meilleur pas de danse des années 80."],
      [2, "Écris un poème de quatre vers sur la personne en face de toi et lis-le."],
      [2, "Parle à la troisième personne jusqu’à ton prochain tour."],
      [2, "Fais semblant d’être en direct sur Twitch et salue tes abonnés."],
      [2, "Raconte la dernière fois que tu as eu vraiment honte."],
      [2, "Laisse la table choisir ton surnom pour le reste de la soirée."],
      [3, "Montre l’avant-dernière photo de ta galerie."],
      [3, "Lis à voix haute la dernière recherche de ton navigateur."],
      [3, "Laisse la personne à ta droite écrire ta prochaine story (sans la publier)."],
      [3, "Raconte ton pire râteau."],
      [3, "Dis quelle personne de la table tu appellerais en cas de galère, et pourquoi."],
      [3, "Montre ton emoji le plus utilisé et explique pourquoi."],
    ],
  };

  // ---------- Tirage sans répétition ----------
  var PREFIXE = "hs:vus:";
  var PAQUETS_DE_CARTES = { 32: 1, 52: 1, 54: 1, 104: 1 }; // jeux de cartes : on ne touche pas au hasard

  function lire(cle) {
    try { var v = JSON.parse(localStorage.getItem(cle) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; }
  }
  function ecrire(cle, v) {
    try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) {}
  }
  function cle(x) { return typeof x === "string" || typeof x === "number" ? String(x) : null; }

  function estPaquetDeCartes(t) {
    if (!PAQUETS_DE_CARTES[t.length] || typeof t[0] !== "number") return false;
    var tri = t.slice().sort(function (a, b) { return a - b; });
    for (var i = 0; i < tri.length; i++) if (tri[i] !== i) return false;
    return true;
  }

  // jeu : identifiant du jeu ; t : tableau à mélanger ; melange : le mélange d'origine de l'app
  window.HS_MELANGE = function (jeu, t, melange) {
    if (!Array.isArray(t) || t.length < 15 || estPaquetDeCartes(t)) return melange(t);
    for (var i = 0; i < t.length; i++) if (cle(t[i]) === null) return melange(t);

    var k = PREFIXE + jeu + ":" + t.length;
    var vus = lire(k), dejaVu = {};
    for (var j = 0; j < vus.length; j++) dejaVu[vus[j]] = 1;

    var neufs = [], anciens = [];
    for (var n = 0; n < t.length; n++) (dejaVu[cle(t[n])] ? anciens : neufs).push(t[n]);

    // Tout le paquet a été vu : on repart de zéro
    if (neufs.length < 30) { neufs = t.slice(); anciens = []; vus = []; }

    // Certains jeux piochent au début du tableau, d'autres à la fin : les cartes neuves vont aux deux bouts,
    // les cartes déjà vues au milieu, et on note comme vues les 15 premières et les 15 dernières.
    var m = melange(neufs), moitie = Math.ceil(m.length / 2);
    var resultat = m.slice(0, moitie).concat(melange(anciens), m.slice(moitie));
    var marques = resultat.slice(0, 15).concat(resultat.slice(-15)).map(cle);
    ecrire(k, vus.concat(marques).slice(-1200));
    return resultat;
  };

  // Gages : on évite les 25 derniers sortis
  window.HS_TIRE = function (liste) {
    if (!Array.isArray(liste) || !liste.length) return liste && liste[0];
    var recents = lire("hs:gages-vus");
    var libres = liste.filter(function (g) { return recents.indexOf(Array.isArray(g) ? g[1] : g) < 0; });
    var choix = (libres.length ? libres : liste)[Math.floor(Math.random() * (libres.length || liste.length))];
    recents.push(Array.isArray(choix) ? choix[1] : choix);
    ecrire("hs:gages-vus", recents.slice(-25));
    return choix;
  };
})();

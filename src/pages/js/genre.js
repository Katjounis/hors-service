// Hors Service : accord des textes au masculin ou au féminin.
// Chargé dans le <head> après cartes.js, AVANT le script de l'app.
//
// Les cartes ne sont pas réécrites dans les paquets. Ce fichier connaît, pour chaque carte concernée, sa version
// « avec accords », et choisit la bonne forme au moment de l'affichage :
//   [masculin|féminin]   s'accorde avec le joueur concerné par la carte
//   {masculin|féminin}   s'accorde avec les joueurs dont on parle
//   une troisième forme, [m|f|x] ou {m|f|x}, sert quand on ne sait pas
// Le genre de chaque joueur vient de son profil (champ gn : "m", "f" ou "x" pour « Ne pas préciser »).
// En anglais rien n'est touché : le dictionnaire retrouve la phrase d'origine.
//
// Branchements dans l'app : HS_GENRE_TXT au début de la fabrique JSX n(), HS_GENRE_MAJ dans changed(),
// HS_GENRE_NOM dans l'atelier d'avatar, HS_GENRE_CARTE dans la liste de fin de Paranoïa.
(function () {
  "use strict";

  // [texte d'origine, texte avec accords]
  var CARTES = [
    ["avoir toujours un chargeur, un mouchoir et un pansement sur lui", "avoir toujours un chargeur, un mouchoir et un pansement sur {lui|elle}"],
    ["dire « je suis en route » alors qu’il est encore sous la douche", "dire « je suis en route » alors qu’{il|elle} est encore sous la douche"],
    ["écrire un post LinkedIn sur ce qu’il a appris ce soir", "écrire un post LinkedIn sur ce qu’{il|elle} a appris ce soir"],
    ["devenir influenceur sur un sujet complètement absurde", "devenir {influenceur|influenceuse} sur un sujet complètement absurde"],
    ["être éliminé en premier d’une téléréalité", "être {éliminé|éliminée} en premier d’une téléréalité"],
    ["envoyer ce soir un message qu’il regrettera demain", "envoyer ce soir un message qu’{il|elle} regrettera demain"],
    ["faire le pire patron du monde", "faire {le pire patron|la pire patronne} du monde"],
    ["être le plus mauvais perdant de la table", "être {le plus mauvais perdant|la plus mauvaise perdante} de la table"],
    ["faire le pire colocataire", "faire {le|la} pire colocataire"],
    ["être fier de blagues que personne ne comprend", "être {fier|fière} de blagues que personne ne comprend"],
    ["jurer qu’il ne boira plus jamais, et recommencer le lendemain", "jurer qu’{il|elle} ne boira plus jamais, et recommencer le lendemain"],
    ["s’endormir assis sur les toilettes", "s’endormir {assis|assise} sur les toilettes"],
    ["chanter faux au karaoké en étant sûr de chanter juste", "chanter faux au karaoké en étant {sûr|sûre} de chanter juste"],
    ["se réveiller chez quelqu’un sans savoir comment il est arrivé là", "se réveiller chez quelqu’un sans savoir comment {il est arrivé|elle est arrivée} là"],
    ["annoncer qu’il ne boit pas ce soir, puis faire la fermeture", "annoncer qu’{il|elle} ne boit pas ce soir, puis faire la fermeture"],
    ["dire « je ne suis pas bourré » en articulant beaucoup trop", "dire « je ne suis pas {bourré|bourrée} » en articulant beaucoup trop"],
    ["appeler sa mère en pleine soirée pour lui dire qu’il l’aime", "appeler sa mère en pleine soirée pour lui dire qu’{il|elle} l’aime"],
    ["proposer un after chez lui sans avoir prévenu ses colocataires", "proposer un after chez {lui|elle} sans avoir prévenu ses colocataires"],
    ["avoir déjà été surpris en pleine action", "avoir déjà été {surpris|surprise} en pleine action"],
    ["tomber amoureux de son plan d’un soir", "tomber {amoureux|amoureuse} de son plan d’un soir"],
    ["être le plus bruyant de l’immeuble", "être {le plus bruyant|la plus bruyante} de l’immeuble"],
    ["avoir déjà fait l’amour avec quelqu’un dont il ne connaissait pas le prénom", "avoir déjà fait l’amour avec quelqu’un dont {il|elle} ne connaissait pas le prénom"],
    ["avoir déjà été attaché au lit", "avoir déjà été {attaché|attachée} au lit"],
    ["simuler plus souvent qu’il ne l’avoue", "simuler plus souvent qu’{il|elle} ne l’avoue"],
    ["tester un club libertin s’il était invité", "tester un club libertin {s’il était invité|si elle était invitée}"],
    ["avoir déjà été surpris par ses parents", "avoir déjà été {surpris|surprise} par ses parents"],
    ["avoir déjà été dominé et adoré ça", "avoir déjà été {dominé|dominée} et adoré ça"],
    ["se faire prendre pour un braqueur en brandissant une baguette", "se faire prendre pour {un braqueur|une braqueuse} en brandissant une baguette"],
    ["être recherché par Interpol pour une histoire de parking", "être {recherché|recherchée} par Interpol pour une histoire de parking"],
    ["se faire arrêter déguisé en mascotte", "se faire arrêter {déguisé|déguisée} en mascotte"],
    ["être le premier suspect quand la machine à café du bureau tombe en panne", "être {le premier suspect|la première suspecte} quand la machine à café du bureau tombe en panne"],
    ["se faire expulser d’un mariage où il n’était pas invité", "se faire expulser d’un mariage où {il n’était pas invité|elle n’était pas invitée}"],
    ["finir trempé dans une fontaine publique après un pari", "finir {trempé|trempée} dans une fontaine publique après un pari"],
    ["se faire sortir du jacuzzi d’un hôtel où il ne dort pas", "se faire sortir du jacuzzi d’un hôtel où {il|elle} ne dort pas"],
    ["finir attaché à un lampadaire après un pari", "finir {attaché|attachée} à un lampadaire après un pari"],
    ["rentrer chez lui dans un caddie de supermarché", "rentrer chez {lui|elle} dans un caddie de supermarché"],
    ["arriver bourré au boulot", "arriver {bourré|bourrée} au boulot"],
    ["mentir sur le nombre de personnes avec qui il a couché", "mentir sur le nombre de personnes avec qui {il|elle} a couché"],
    ["poster une story bourré et la supprimer en panique", "poster une story {bourré|bourrée} et la supprimer en panique"],
    ["dormir une nuit seul(e) dans une maison hantée", "dormir une nuit {seul|seule|seul(e)} dans une maison hantée"],
    ["aller seul(e) au cinéma un samedi soir", "aller {seul|seule|seul(e)} au cinéma un samedi soir"],
    ["danser seul(e) au milieu d’un supermarché", "danser {seul|seule|seul(e)} au milieu d’un supermarché"],
    ["manger épicé au point de pleurer, juste pour prouver qu’il tient", "manger épicé au point de pleurer, juste pour prouver qu’{il|elle} tient"],
    ["faire un discours au mariage de quelqu’un qu’il connaît à peine", "faire un discours au mariage de quelqu’un qu’{il|elle} connaît à peine"],
    ["se faire passer pour un touriste dans sa propre ville", "se faire passer pour {un|une} touriste dans sa propre ville"],
    ["danser seul(e) au milieu de la piste en premier", "danser {seul|seule|seul(e)} au milieu de la piste en premier"],
    ["tomber amoureux ou amoureuse d’un plan cul", "tomber {amoureux|amoureuse|amoureux ou amoureuse} d’un plan cul"],
    ["dire à sa belle-mère ce qu’il pense vraiment", "dire à sa belle-mère ce qu’{il|elle} pense vraiment"],
    ["Je n’ai jamais été collé(e) à l’école.", "Je n’ai jamais été [collé|collée] à l’école."],
    ["Je n’ai jamais parlé tout(e) seul(e) dans la rue.", "Je n’ai jamais parlé [tout seul|toute seule] dans la rue."],
    ["Je n’ai jamais été surpris(e) en train de danser seul(e) devant le miroir.", "Je n’ai jamais été [surpris|surprise] en train de danser [seul|seule] devant le miroir."],
    ["Je n’ai jamais été le dernier ou la dernière à comprendre une blague.", "Je n’ai jamais été [le dernier|la dernière] à comprendre une blague."],
    ["Je n’ai jamais été largué(e) par texto.", "Je n’ai jamais été [largué|larguée] par texto."],
    ["Je n’ai jamais voyagé seul(e) à l’étranger.", "Je n’ai jamais voyagé [seul|seule] à l’étranger."],
    ["Je n’ai jamais été coincé(e) dans un ascenseur.", "Je n’ai jamais été [coincé|coincée] dans un ascenseur."],
    ["Je n’ai jamais été viré(e) d’un cours pour un fou rire.", "Je n’ai jamais été [viré|virée] d’un cours pour un fou rire."],
    ["Je n’ai jamais appelé mon ex complètement bourré(e).", "Je n’ai jamais appelé mon ex complètement [bourré|bourrée]."],
    ["Je n’ai jamais fait une déclaration d’amour bourré(e) avant de tout nier le lendemain.", "Je n’ai jamais fait une déclaration d’amour [bourré|bourrée] avant de tout nier le lendemain."],
    ["Je n’ai jamais été au travail encore bourré(e) de la veille.", "Je n’ai jamais été au travail encore [bourré|bourrée] de la veille."],
    ["Je n’ai jamais été refoulé(e) d’une boîte parce que j’étais trop bourré(e).", "Je n’ai jamais été [refoulé|refoulée] d’une boîte parce que j’étais trop [bourré|bourrée]."],
    ["Je n’ai jamais été sorti(e) d’un bar par la sécurité.", "Je n’ai jamais été [sorti|sortie] d’un bar par la sécurité."],
    ["Je n’ai jamais laissé un message vocal bourré que j’ai regretté toute la semaine.", "Je n’ai jamais laissé un message vocal [bourré|bourrée] que j’ai regretté toute la semaine."],
    ["Je n’ai jamais été jaloux ou jalouse de quelqu’un présent ce soir.", "Je n’ai jamais été [jaloux|jalouse] de quelqu’un présent ce soir."],
    ["Je n’ai jamais été surpris(e) en train de chanter à tue-tête à un feu rouge.", "Je n’ai jamais été [surpris|surprise] en train de chanter à tue-tête à un feu rouge."],
    ["Je n’ai jamais été surpris(e) aux toilettes parce que je n’avais pas fermé le verrou.", "Je n’ai jamais été [surpris|surprise] aux toilettes parce que je n’avais pas fermé le verrou."],
    ["Je n’ai jamais été pris(e) en train de fouiller dans la salle de bain de quelqu’un.", "Je n’ai jamais été [pris|prise] en train de fouiller dans la salle de bain de quelqu’un."],
    ["Je n’ai jamais été pris(e) en flagrant délit de mensonge, les yeux dans les yeux.", "Je n’ai jamais été [pris|prise] en flagrant délit de mensonge, les yeux dans les yeux."],
    ["Je n’ai jamais été l’amant ou la maîtresse de quelqu’un en couple.", "Je n’ai jamais été [l’amant|la maîtresse] de quelqu’un en couple."],
    ["Je n’ai jamais été viré(e) d’un boulot.", "Je n’ai jamais été [viré|virée] d’un boulot."],
    ["Je n’ai jamais été bourré(e) à un entretien d’embauche ou au travail.", "Je n’ai jamais été [bourré|bourrée] à un entretien d’embauche ou au travail."],
    ["Je n’ai jamais posté une story bourré(e) que j’ai supprimée en panique le lendemain.", "Je n’ai jamais posté une story [bourré|bourrée] que j’ai supprimée en panique le lendemain."],
    ["Je n’ai jamais été attaché(e) au lit.", "Je n’ai jamais été [attaché|attachée] au lit."],
    ["Je n’ai jamais été dominé(e) au lit… et adoré ça.", "Je n’ai jamais été [dominé|dominée] au lit… et adoré ça."],
    ["Je n’ai jamais été surpris(e) en pleine action par un(e) colocataire.", "Je n’ai jamais été [surpris|surprise] en pleine action par un(e) colocataire."],
    ["Je n’ai jamais fait un rêve coquin sur une célébrité au point de me réveiller gêné(e).", "Je n’ai jamais fait un rêve coquin sur une célébrité au point de me réveiller [gêné|gênée]."],
    ["Je n’ai jamais été déçu(e) par la taille… en faisant semblant que non.", "Je n’ai jamais été [déçu|déçue] par la taille… en faisant semblant que non."],
    ["Je n’ai jamais été regardé(e) pendant que je faisais l’amour, et ça m’a plu.", "Je n’ai jamais été [regardé|regardée] pendant que je faisais l’amour, et ça m’a plu."],
    ["Je n’ai jamais été tenu(e) en laisse.", "Je n’ai jamais été [tenu|tenue] en laisse."],
    ["Je n’ai jamais été pris(e) en flagrant délit de plaisir solitaire.", "Je n’ai jamais été [pris|prise] en flagrant délit de plaisir solitaire."],
    ["Je n’ai jamais fini un pot de glace entier tout(e) seul(e).", "Je n’ai jamais fini un pot de glace entier [tout seul|toute seule]."],
    ["Je n’ai jamais été le dernier ou la dernière choisi(e) en sport.", "Je n’ai jamais été [le dernier choisi|la dernière choisie] en sport."],
    ["Je n’ai jamais été pris(e) en flagrant délit de parler de quelqu’un dans son dos.", "Je n’ai jamais été [pris|prise] en flagrant délit de parler de quelqu’un dans son dos."],
    ["Je n’ai jamais été réveillé(e) par mon propre ronflement.", "Je n’ai jamais été [réveillé|réveillée] par mon propre ronflement."],
    ["Je n’ai jamais été invité(e) à un mariage où je ne connaissais presque personne.", "Je n’ai jamais été [invité|invitée] à un mariage où je ne connaissais presque personne."],
    ["Je n’ai jamais été le ou la dernier(e) à comprendre une blague.", "Je n’ai jamais été [le dernier|la dernière] à comprendre une blague."],
    ["Je n’ai jamais été arrêté(e) à l’aéroport pour un objet oublié dans mon sac.", "Je n’ai jamais été [arrêté|arrêtée] à l’aéroport pour un objet oublié dans mon sac."],
    ["Je n’ai jamais dormi tout habillé(e) avec mes chaussures.", "Je n’ai jamais dormi tout [habillé|habillée] avec mes chaussures."],
    ["Je n’ai jamais été mis(e) dehors d’une soirée.", "Je n’ai jamais été [mis|mise] dehors d’une soirée."],
    ["Je n’ai jamais oublié comment j’étais rentré(e) chez moi.", "Je n’ai jamais oublié comment j’étais [rentré|rentrée] chez moi."],
    ["Je n’ai jamais été le ou la dernier(e) debout à une soirée.", "Je n’ai jamais été [le dernier|la dernière] debout à une soirée."],
    ["Je n’ai jamais été éjecté(e) d’un groupe WhatsApp.", "Je n’ai jamais été [éjecté|éjectée] d’un groupe WhatsApp."],
    ["Je n’ai jamais été pris(e) en train de mentir le soir même.", "Je n’ai jamais été [pris|prise] en train de mentir le soir même."],
    ["Je n’ai jamais été filmé(e) à mon insu en train de faire n’importe quoi.", "Je n’ai jamais été [filmé|filmée] à mon insu en train de faire n’importe quoi."],
    ["Je n’ai jamais été surpris(e) en pleine action.", "Je n’ai jamais été [surpris|surprise] en pleine action."],
    ["Je n’ai jamais été réveillé(e) par les bruits de mes voisins.", "Je n’ai jamais été [réveillé|réveillée] par les bruits de mes voisins."],
    ["Je n’ai jamais été le ou la voisin(e) bruyant(e).", "Je n’ai jamais été [le voisin bruyant|la voisine bruyante]."],
    ["beau et fauché", "[beau|belle] et [fauché|fauchée]"],
    ["être le plus drôle de la soirée", "être [le|la] plus drôle de la soirée"],
    ["le plus beau de la soirée", "[le plus beau|la plus belle] de la soirée"],
    ["être coincé dans un ascenseur avec ton ex", "être [coincé|coincée] dans un ascenseur avec ton ex"],
    ["un idiot adoré de tous", "[un idiot adoré|une idiote adorée] de tous"],
    ["ne jamais être fatigué", "ne jamais être [fatigué|fatiguée]"],
    ["être trompé", "être [trompé|trompée]"],
    ["être largué en public", "être [largué|larguée] en public"],
    ["être pris en train de pleurer bourré", "être [pris|prise] en train de pleurer [bourré|bourrée]"],
    ["de chanter bourré", "de chanter [bourré|bourrée]"],
    ["être le pote toujours bourré", "être [le pote toujours bourré|la pote toujours bourrée]"],
    ["le pote toujours sobre qui ramène tout le monde", "[le|la] pote toujours sobre qui ramène tout le monde"],
    ["être grillé en train de stalker ton ex", "être [grillé|grillée] en train de stalker ton ex"],
    ["être dominé", "être [dominé|dominée]"],
    ["être viré(e) en public", "être [viré|virée] en public"],
    ["être filmé(e) en train de danser seul(e)", "être [filmé|filmée] en train de danser [seul|seule]"],
    ["être le plus drôle de la table", "être [le|la] plus drôle de la table"],
    ["être le plus intelligent de la table", "être [le plus intelligent|la plus intelligente] de la table"],
    ["être riche et malheureux", "être riche et [malheureux|malheureuse]"],
    ["pauvre et heureux", "pauvre et [heureux|heureuse]"],
    ["dormir 12 heures et être fatigué", "dormir 12 heures et être [fatigué|fatiguée]"],
    ["être le meilleur à un jeu vidéo", "être [le meilleur|la meilleure] à un jeu vidéo"],
    ["le meilleur à un sport", "[le meilleur|la meilleure] à un sport"],
    ["Qui ici t’a le plus énervé cette année ?", "Qui ici t’a le plus [énervé|énervée] cette année ?"],
    ["Quel métier tu voulais faire petit ?", "Quel métier tu voulais faire [petit|petite] ?"],
    ["Tu as déjà été viré de quelque part ? D’où ?", "Tu as déjà été [viré|virée] de quelque part ? D’où ?"],
    ["Quel est le pire truc que tu aies fait bourré ?", "Quel est le pire truc que tu aies fait [bourré|bourrée] ?"],
    ["Qui ici t’a déjà déçu ?", "Qui ici t’a déjà [déçu|déçue] ?"],
    ["Quel truc dégueu tu fais quand tu es seul ?", "Quel truc dégueu tu fais quand tu es [seul|seule] ?"],
    ["Qui ici est le plus radin ?", "Qui ici est {le plus radin|la plus radine} ?"],
    ["Qui ici tu trouves le plus attirant ?", "Qui ici tu trouves {le plus attirant|la plus attirante} ?"],
    ["Tu as déjà été surpris en pleine action ?", "Tu as déjà été [surpris|surprise] en pleine action ?"],
    ["Tu préfères dominer ou être dominé ?", "Tu préfères dominer ou être [dominé|dominée] ?"],
    ["Mime ta position préférée (habillé).", "Mime ta position préférée ([habillé|habillée])."],
    ["Quelle est la chose dont tu es le plus fier ou la plus fière ?", "Quelle est la chose dont tu es [le plus fier|la plus fière] ?"],
    ["Quel est le compliment qui t’a le plus touché(e) ?", "Quel est le compliment qui t’a le plus [touché|touchée] ?"],
    ["Qui ici trouves-tu le plus attirant(e) ?", "Qui ici trouves-tu {le plus attirant|la plus attirante|le plus attirant(e)} ?"],
    ["As-tu déjà été surpris(e) en plein acte ?", "As-tu déjà été [surpris|surprise] en plein acte ?"],
    ["Fais deviner une position en la mimant, tout habillé(e).", "Fais deviner une position en la mimant, tout [habillé|habillée]."],
    ["Fais un discours de candidat aux élections du quartier.", "Fais un discours de [candidat|candidate] aux élections du quartier."],
    ["Qui ici est le plus susceptible de finir en prison ?", "Qui ici est {le|la} plus susceptible de finir en prison ?"],
    ["Qui ici serait le pire coloc ?", "Qui ici serait {le|la} pire coloc ?"],
    ["Qui ici est le plus beau ou la plus belle ?", "Qui ici est {le plus beau|la plus belle|le plus beau ou la plus belle} ?"],
    ["Qui ici est le plus jaloux ?", "Qui ici est {le plus jaloux|la plus jalouse} ?"],
    ["Qui ici est secrètement amoureux de quelqu’un d’ici ?", "Qui ici est secrètement {amoureux|amoureuse} de quelqu’un d’ici ?"],
    ["Qui ici vomit le premier ce soir ?", "Qui ici vomit {le premier|la première} ce soir ?"],
    ["Qui ici est le plus hypocrite ?", "Qui ici est {le|la} plus hypocrite ?"],
    ["Avec qui ici tu ne voudrais jamais être coincé dans un ascenseur ?", "Avec qui ici tu ne voudrais jamais être [coincé|coincée] dans un ascenseur ?"],
    ["Qui ici est le plus collant ?", "Qui ici est {le plus collant|la plus collante} ?"],
    ["Qui ici serait le premier à mourir dans un film d’horreur ?", "Qui ici serait {le premier|la première} à mourir dans un film d’horreur ?"],
    ["Qui ici est le plus fêtard ?", "Qui ici est {le plus fêtard|la plus fêtarde} ?"],
    ["Qui ici serait le meilleur président ?", "Qui ici serait {le meilleur président|la meilleure présidente} ?"],
    ["Qui ici est le plus peureux ?", "Qui ici est {le plus peureux|la plus peureuse} ?"],
    ["Qui ici est le plus chiant quand il a bu ?", "Qui ici est {le plus chiant quand il|la plus chiante quand elle} a bu ?"],
    ["Qui ici serait le meilleur partenaire de braquage ?", "Qui ici serait {le meilleur|la meilleure} partenaire de braquage ?"],
    ["Qui ici t’a déjà dragué ?", "Qui ici t’a déjà [dragué|draguée] ?"],
    ["Qui ici est le plus susceptible de partir sans payer ?", "Qui ici est {le|la} plus susceptible de partir sans payer ?"],
    ["Qui ici est le plus fayot ?", "Qui ici est {le plus fayot|la plus fayote} ?"],
    ["Qui ici est le plus nul au lit, à ton avis ?", "Qui ici est {le plus nul|la plus nulle} au lit, à ton avis ?"],
    ["Qui ici as-tu déjà imaginé tout nu ?", "Qui ici as-tu déjà {imaginé tout nu|imaginée toute nue} ?"],
    ["Qui ici ferait le meilleur sex friend ?", "Qui ici ferait {le meilleur|la meilleure} sex friend ?"],
    ["Qui ici serait partant pour un plan à trois ?", "Qui ici serait {partant|partante} pour un plan à trois ?"],
    ["Qui ici aurait le plus de followers s’il ou elle se lançait ?", "Qui ici aurait le plus de followers {s’il|si elle|s’il ou elle} se lançait ?"],
    ["Qui ici est le plus jaloux ou la plus jalouse ?", "Qui ici est {le plus jaloux|la plus jalouse|le plus jaloux ou la plus jalouse} ?"],
    ["Qui ici serait le meilleur président de la République ?", "Qui ici serait {le meilleur président|la meilleure présidente} de la République ?"],
    ["Qui ici serait le pire chauffeur de taxi ?", "Qui ici serait {le pire chauffeur|la pire chauffeuse} de taxi ?"],
    ["Qui ici est le plus mauvais perdant ?", "Qui ici est {le plus mauvais perdant|la plus mauvaise perdante} ?"],
    ["Qui ici est le plus têtu ?", "Qui ici est {le plus têtu|la plus têtue} ?"],
    ["Qui ici ferait le meilleur espion ?", "Qui ici ferait {le meilleur espion|la meilleure espionne} ?"],
    ["Qui ici est le plus maladroit ?", "Qui ici est {le plus maladroit|la plus maladroite} ?"],
    ["Qui ici serait le plus nul en camping ?", "Qui ici serait {le plus nul|la plus nulle} en camping ?"],
    ["Qui ici est le plus en retard dans la vie ?", "Qui ici est {le|la} plus en retard dans la vie ?"],
    ["Qui ici ferait le pire prof ?", "Qui ici ferait {le|la} pire prof ?"],
    ["Qui ici serait le plus nul à cache-cache ?", "Qui ici serait {le plus nul|la plus nulle} à cache-cache ?"],
    ["Qui ici est le plus romantique ?", "Qui ici est {le|la} plus romantique ?"],
    ["Qui ici est le plus coquin ou la plus coquine en secret ?", "Qui ici est {le plus coquin|la plus coquine|le plus coquin ou la plus coquine} en secret ?"],
    ["Qui ici as-tu déjà trouvé attirant(e) sans le dire ?", "Qui ici as-tu déjà {trouvé attirant|trouvée attirante|trouvé attirant(e)} sans le dire ?"],
    ["Qui ici serait le meilleur au jeu de la séduction ?", "Qui ici serait {le meilleur|la meilleure} au jeu de la séduction ?"],
    ["Qui ici est le plus doué de ses mains, à ton avis ?", "Qui ici est {le plus doué|la plus douée} de ses mains, à ton avis ?"],
    ["Qui ici serait le plus à l’aise tout nu sur une plage ?", "Qui ici serait {le|la} plus à l’aise {tout nu|toute nue} sur une plage ?"],
    ["Qui ici serait le meilleur partenaire de jacuzzi ?", "Qui ici serait {le meilleur|la meilleure} partenaire de jacuzzi ?"],
  ];

  // Quiz sur les autres : [avant le prénom, après le prénom, texte avec accords]
  var AVEC_PRENOM = [
    ["La raison pour laquelle ", " a vraiment été embauché(e) :", "La raison pour laquelle {A} a vraiment été {embauché|embauchée} :"],
    ["Ce que ", " dit quand il ou elle a faim :", "Ce que {A} dit quand {il|elle} a faim :"],
    ["Ce que ", " ferait s’il ou elle devenait invisible une journée :", "Ce que {A} ferait {s’il|si elle|s’il ou elle} devenait invisible une journée :"],
    ["La règle que ", " imposerait s’il ou elle dirigeait le pays :", "La règle que {A} imposerait {s’il|si elle|s’il ou elle} dirigeait le pays :"],
  ];

  // Noms des expressions de l'avatar, au féminin
  var EXPRESSIONS = { "Content": "Contente", "Blas\u00e9": "Blas\u00e9e", "Surpris": "Surprise", "Bourr\u00e9": "Bourr\u00e9e", "Amoureux": "Amoureuse", "Endormi": "Endormie" };

  // Écran de vote de Qui oserait : « de » s'élide devant une voyelle (« d'être », pas « de être »)
  var AMORCE = "Qui est le plus susceptible de ";
  var VOYELLE = /^(?:[aeiou\u00e0\u00e2\u00e4\u00e9\u00e8\u00ea\u00eb\u00ee\u00ef\u00f4\u00f6\u00f9\u00fb\u00fc\u0153\u00e6]|y(?![a-z\u00e0-\u00ff])|h(?:abi|\u00e9b|\u00e9ri|\u00e9si|ono|umi|ibe|ypn|all|arm|osp))/i;

  var BLOC = /\{([^{}|]*)\|([^{}|]*)(?:\|([^{}|]*))?\}|\[([^\[\]|]*)\|([^\[\]|]*)(?:\|([^\[\]|]*))?\]/g;

  var table = new Map();
  for (var i = 0; i < CARTES.length; i++) table.set(CARTES[i][0], CARTES[i][1]);
  table.set(AMORCE, "Qui est {le|la} plus susceptible de ");
  table.set("Qui est le plus susceptible de\u2026", "Qui est {le|la} plus susceptible de\u2026");

  // L'appareil affiché : l'objet de l'app, donné par changed(). Son état est lu au moment d'accorder.
  var appli = null;
  function etatS() { return (appli && appli.S) || null; }
  function unTelephone() { return !!appli && appli.mode === "local"; }
  function monGenre() { return genre(appli && appli.profile && appli.profile.gn); }

  // Derniers accords affichés : texte à l'écran → texte d'origine (sert au changement de langue, voir plus bas)
  var rendus = new Map();

  function genre(g) { return g === "m" || g === "f" ? g : "x"; }

  function anglais() { return typeof document !== "undefined" && document.documentElement.lang === "en"; }

  function genreDe(uid) {
    var S = etatS(), r = S && S.roster && S.roster[uid];
    var g = genre(r && r.gn);
    // Si l'hôte a une ancienne version, la table ne connaît pas les genres : on garde au moins le sien
    if (g === "x" && !unTelephone() && uid && appli && uid === appli.uid) return monGenre();
    return g;
  }

  // Un groupe n'est « féminin » ou « masculin » que si tout le monde l'est
  function genreDuGroupe(uids) {
    var g = null;
    for (var i = 0; i < uids.length; i++) {
      var x = genreDe(uids[i]);
      if (x === "x" || (g && g !== x)) return "x";
      g = x;
    }
    return g || "x";
  }

  function partie() { var S = etatS(); return (S && S.game) || null; }

  // Les joueurs de la partie en cours, sinon ceux de la table
  function joueurs() {
    var S = etatS(), p = partie(), g = (p && p.g) || {};
    var liste = Array.isArray(g.pl) && g.pl.length ? g.pl : (S && S.order) || [];
    return liste.filter(function (u) { return typeof u === "string" && S && S.roster && S.roster[u]; });
  }

  // moi : le joueur concerné par la carte ; groupe : les joueurs dont on parle ; seul : on parle d'une seule personne.
  // uid (facultatif) : le joueur concerné, quand ce n'est pas celui du tour en cours (historique d'une partie).
  function contexte(uid) {
    var p = partie(), jeu = p && p.id, g = (p && p.g) || {}, tous = joueurs();
    var c = { moi: unTelephone() ? genreDuGroupe(tous) : monGenre(), groupe: genreDuGroupe(tous), seul: false };
    var tour = uid || ((jeu === "actionverite" || jeu === "paranoia") && g.cur) || null;
    if (tour) {
      c.moi = genreDe(tour);
      c.groupe = genreDuGroupe(tous.filter(function (u) { return u !== tour; }));
    } else if (jeu === "autres") {
      c.groupe = g.target ? genreDe(g.target) : "x";
      c.seul = true;
    }
    return c;
  }

  function resoudre(texte, c) {
    return texte.replace(BLOC, function (tout, m1, f1, x1, m2, f2, x2) {
      var parle = m1 !== undefined, M = parle ? m1 : m2, F = parle ? f1 : f2, X = parle ? x1 : x2;
      var g = parle ? c.groupe : c.moi;
      if (g === "m") return M;
      if (g === "f") return F;
      if (X !== undefined) return X;
      if (parle && !c.seul) return M; // table mixte : forme générique
      return F.indexOf(M) === 0 ? M + "(" + F.slice(M.length) + ")" : M + " ou " + F;
    });
  }

  // Quiz sur les autres : la phrase contient déjà le prénom du joueur visé
  function avecPrenom(s) {
    for (var i = 0; i < AVEC_PRENOM.length; i++) {
      var a = AVEC_PRENOM[i];
      if (s.length > a[0].length + a[1].length && s.indexOf(a[0]) === 0 && s.slice(s.length - a[1].length) === a[1]) {
        var prenom = s.slice(a[0].length, s.length - a[1].length);
        var c = contexte(), p = partie(), g = (p && p.g) || {}, S = etatS(), r = (S && S.roster) || {}, trouve = null, nb = 0;
        for (var u in r) if (r[u] && r[u].nick === prenom) { trouve = u; nb++; }
        // On s'accorde avec le joueur qui porte ce prénom (la liste de fin de partie reprend d'anciennes questions).
        // Deux joueurs du même prénom : on ne sait trancher que pour la question en cours.
        if (nb === 1) c.groupe = genreDe(trouve);
        else if (g.q !== s) c.groupe = "x";
        return resoudre(a[2], c).replace("{A}", function () { return prenom; });
      }
    }
    return null;
  }

  // Une phrase affichée par l'app → la même, accordée. En anglais on ne touche à rien.
  function accorder(s) {
    var t = table.get(s);
    if (t !== undefined) return anglais() ? s : resoudre(t, contexte());
    if (s.length > 20) {
      var p = partie();
      if (p && p.id === "autres" && !anglais()) return avecPrenom(s) || s;
    }
    return s;
  }

  function apresTextes(s) { return typeof window.HS_TXT === "function" ? window.HS_TXT(s) : s; }

  function noter(rendu, origine) {
    if (rendus.size > 500) rendus.clear();
    rendus.set(apresTextes(rendu), apresTextes(origine));
  }

  function transformer(enfants) {
    if (typeof enfants === "string") {
      var seul = accorder(enfants);
      if (seul !== enfants) noter(seul, enfants);
      return seul;
    }
    if (!Array.isArray(enfants)) return enfants;
    var copie = null;
    for (var i = 0; i < enfants.length; i++) {
      var e = enfants[i];
      if (typeof e !== "string") continue;
      var n = accorder(e);
      // « de » devient « d’ » devant une voyelle : la question qui suit commence-t-elle par une voyelle ?
      if (e === AMORCE && typeof enfants[i + 1] === "string" && !anglais() && VOYELLE.test(accorder(enfants[i + 1]))) n = n.slice(0, -3) + "d\u2019";
      if (n !== e) { if (!copie) copie = enfants.slice(); copie[i] = n; noter(n, e); }
    }
    return copie || enfants;
  }

  // Changement de langue pendant qu'une carte est à l'écran. L'app ne redessine pas l'écran : elle traduit les textes
  // déjà affichés, et son dictionnaire ne connaît que les phrases d'origine. Juste avant qu'elle le fasse, on remet donc
  // la phrase d'origine à l'écran. Au retour au français, on réaccorde ce qui est affiché.
  function relire() {
    if (!document.body) return;
    var en = anglais(), w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), nd;
    while ((nd = w.nextNode())) {
      var s = nd.data, t;
      if (en) t = rendus.get(s);
      else {
        t = accorder(s);
        var suite = nd.nextSibling;
        if (s === AMORCE && suite && suite.nodeType === 3 && VOYELLE.test(accorder(suite.data))) t = t.slice(0, -3) + "d\u2019";
        if (t !== s) noter(t, s);
      }
      if (t !== undefined && t !== s) nd.data = t;
    }
  }
  if (typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
    new MutationObserver(function () { try { relire(); } catch (e) {} }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
  }

  window.HS_GENRE_TXT = function (enfants) {
    try { return transformer(enfants); } catch (e) { return enfants; }
  };
  window.HS_GENRE_MAJ = function (app) {
    // Sur un seul téléphone, l'app fait vivre un appareil par joueur et affiche celui de l'hôte : on ne suit que lui.
    if (appli && appli !== app && app.mode === "local" && !app.isHost && appli.mode === "local" && appli.isHost && appli.S) return;
    appli = app;
  };
  // Nom d'une expression de l'avatar (« Surpris » ou « Surprise »)
  window.HS_GENRE_NOM = function (nom, gn) {
    return gn === "f" && !anglais() && Object.prototype.hasOwnProperty.call(EXPRESSIONS, nom) ? EXPRESSIONS[nom] : nom;
  };
  // Pour une liste qui réaffiche d'anciennes cartes (fin de Paranoïa) : on dit quel joueur chaque carte concernait.
  // Rend un tableau d'un seul texte : la fabrique JSX ne réaccorde que les textes posés directement.
  window.HS_GENRE_CARTE = function (texte, uid) {
    try {
      var t = typeof texte === "string" ? table.get(texte) : undefined;
      if (t === undefined || anglais()) return texte;
      return [apresTextes(resoudre(t, contexte(uid)))];
    } catch (e) { return texte; }
  };
  // Pour les tests : accorder un texte dans un contexte donné
  window.HS_GENRE_ESSAI = function (texte, c) {
    var t = table.get(texte);
    return t === undefined ? texte : resoudre(t, c);
  };
})();

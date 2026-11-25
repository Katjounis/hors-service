// Hors Service : textes de la version tout public.
// Tant que l'hôte n'a pas activé la Version Adulte, les textes affichés parlent de pénalités au lieu de gorgées.
// L'app met window.HS_ADULTE à jour à chaque changement d'état ; ce fichier doit être chargé AVANT le script de l'app.
(function () {
  "use strict";

  // Textes qui doivent rester tels quels (choix et avertissements liés à la Version Adulte)
  var INTOUCHABLES = /Version Adulte|questions coquines|18 ans|majeurs|abus d.alcool|avoir bu/;

  // Limites de mot qui tiennent compte des lettres accentuées (\b ne les connaît pas)
  var L = "A-Za-z0-9_\u00C0-\u017F";
  var AVANT = "(^|[^" + L + "])";
  var APRES = "(?![" + L + "])";
  var FIN = "(?=\\s*(?:[.,;:!?)\\]\u00BB]|$))";

  function mot(m, remplacement, fin) {
    return [new RegExp(AVANT + m + (fin ? FIN : APRES), "g"), "$1" + remplacement];
  }

  var REGLES = [
    [/Poker des gorgées/g, "Poker de soirée"],
    [/Blackjack des gorgées/g, "Blackjack de soirée"],
    [/Classique \+ alcool/g, "Classique"],
    [/^Boit$/, "Pénalité"],
    mot("du cul sec", "de la grosse pénalité"),
    mot("cul sec", "grosse pénalité"),
    mot("Cul sec", "Grosse pénalité"),
    mot("CUL SEC", "GROSSE PÉNALITÉ"),
    mot("gorgées", "pénalités"),
    mot("Gorgées", "Pénalités"),
    mot("GORGÉES", "PÉNALITÉS"),
    mot("gorgée", "pénalité"),
    mot("Gorgée", "Pénalité"),
    mot("GORGÉE", "PÉNALITÉ"),
    mot("se boit", "se prend en pénalités"),
    mot("fait boire", "donne une pénalité à"),
    // Verbe seul en fin de proposition : on précise ce qui est pris
    mot("boit", "prend une pénalité", true),
    mot("boivent", "prennent une pénalité", true),
    mot("bois", "prends une pénalité", true),
    mot("Boit", "Prend une pénalité", true),
    mot("Bois", "Prends une pénalité", true),
    // « boit 3 gorgées », « tu bois la pile », « tu la bois »… : le verbe suffit
    mot("boit", "prend"),
    mot("boivent", "prennent"),
    mot("bois", "prends"),
    mot("Boit", "Prend"),
    mot("Bois", "Prends"),
    mot("trinquent", "prennent une pénalité"),
  ];

  function neutre(texte) {
    if (INTOUCHABLES.test(texte)) return texte;
    for (var i = 0; i < REGLES.length; i++) texte = texte.replace(REGLES[i][0], REGLES[i][1]);
    return texte;
  }

  function transformer(enfants) {
    if (window.HS_ADULTE) return enfants;
    if (typeof enfants === "string") return neutre(enfants);
    if (Array.isArray(enfants)) {
      var change = false, copie = enfants.map(function (e) {
        if (typeof e === "string") { var n = neutre(e); if (n !== e) change = true; return n; }
        return e;
      });
      return change ? copie : enfants;
    }
    return enfants;
  }

  window.HS_ADULTE = false;
  window.HS_TXT = transformer;
})();

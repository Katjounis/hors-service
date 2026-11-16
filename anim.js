// Hors Service : révélation des cartes.
// Chaque carte qui apparaît (ou qui change de valeur) se retourne. Quand plusieurs cartes
// arrivent en même temps, elles se retournent une par une, dans l'ordre de l'écran,
// donc joueur par joueur. Marche pour tous les jeux et sur tous les écrans, sans toucher aux jeux.
(function () {
  "use strict";

  // Cartes qui ont déjà leur propre animation
  var DEJA_ANIMEES = ".flip3d, .pk-thrown, .pk-jet";
  // Ce qui donne le résultat : attend que les cartes soient retournées avant d'apparaître
  var RESULTATS = ".verdict, .duel-res, .tc-verdict, .hippo-res, .bus-res, .co-result, .tampon, .dock, .pk-hand, .pk-res-l, .bj-tot";

  function delai(n) {
    // 5 cartes : environ 300 ms d'écart ; une main de 13 : environ 180 ms
    return Math.max(110, Math.min(320, 2400 / Math.max(1, n)));
  }

  function retourner(el, ms) {
    el.style.setProperty("--hs-d", Math.round(ms) + "ms");
    el.classList.remove("hs-flip", "hs-donne");
    void el.offsetWidth; // relance l'animation
    el.classList.add(el.classList.contains("pc-back") ? "hs-donne" : "hs-flip");
  }

  function plusTard(el, ms) {
    el.style.visibility = "hidden";
    setTimeout(function () {
      if (!el.isConnected) return;
      el.style.visibility = "";
      var anim = getComputedStyle(el).animationName;
      if (anim && anim !== "none") { el.style.animation = "none"; void el.offsetWidth; el.style.animation = ""; }
      else { el.classList.remove("hs-apres"); void el.offsetWidth; el.classList.add("hs-apres"); }
    }, ms);
  }

  function ajouter(liste, n) {
    if (!n || n.nodeType !== 1) return;
    if (n.classList && n.classList.contains("pc")) liste.push(n);
    if (n.querySelectorAll) {
      var sous = n.querySelectorAll(".pc");
      for (var i = 0; i < sous.length; i++) liste.push(sous[i]);
    }
  }

  var obs = new MutationObserver(function (mutations) {
    var nouvelles = [], ajouts = [];
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type === "childList") {
        for (var j = 0; j < m.addedNodes.length; j++) { ajouter(nouvelles, m.addedNodes[j]); ajouts.push(m.addedNodes[j]); }
      } else if (m.type === "attributes" && m.target.classList && m.target.classList.contains("pc") &&
                 m.oldValue !== m.target.getAttribute("aria-label")) {
        nouvelles.push(m.target); // carte retournée ou remplacée au même endroit
      }
    }
    if (!nouvelles.length) return;
    var vues = [];
    nouvelles = nouvelles.filter(function (el) {
      if (vues.indexOf(el) >= 0 || !el.isConnected || el.closest(DEJA_ANIMEES)) return false;
      vues.push(el);
      return true;
    });
    nouvelles.sort(function (a, b) {
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
    var pas = delai(nouvelles.length);
    for (var k = 0; k < nouvelles.length; k++) retourner(nouvelles[k], k * pas);
    // Plusieurs cartes d'un coup : le verdict et les gorgées attendent la dernière carte
    if (nouvelles.length < 2) return;
    var fin = (nouvelles.length - 1) * pas + 500;
    for (var a = 0; a < ajouts.length; a++) {
      var n = ajouts[a];
      if (n.nodeType !== 1) continue;
      if (n.matches(RESULTATS)) plusTard(n, fin);
      var r = n.querySelectorAll(RESULTATS);
      for (var b = 0; b < r.length; b++) plusTard(r[b], fin);
    }
  });

  function demarrer() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    obs.observe(document.body, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ["aria-label"], attributeOldValue: true
    });
  }

  if (document.body) demarrer();
  else document.addEventListener("DOMContentLoaded", demarrer);
})();

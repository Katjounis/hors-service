// Hors Service : révélation des cartes.
// Chaque carte (ou dé) qui apparaît (ou qui change de valeur) se retourne. Quand plusieurs cartes
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
    el.classList.remove("hs-flip", "hs-donne", "hs-roule");
    void el.offsetWidth; // relance l'animation
    if (el.classList.contains("die")) {
      el.style.setProperty("--hs-x", (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 40) + "px");
      el.style.setProperty("--hs-t", (Math.random() < 0.5 ? -1 : 1) * (540 + Math.round(Math.random() * 360)) + "deg");
      el.classList.add("hs-roule");
      brasser(el, ms);
    } else {
      el.classList.add(el.classList.contains("pc-back") ? "hs-donne" : "hs-flip");
    }
  }

  // Pendant qu'un dé roule, ses faces défilent, puis il retombe sur la vraie
  var FACES = [[4], [0, 8], [0, 4, 8], [0, 2, 6, 8], [0, 2, 4, 6, 8], [0, 2, 3, 5, 6, 8]];
  function brasser(el, ms) {
    var points = el.querySelectorAll("i");
    if (points.length !== 9) return;
    clearInterval(el._hsT);
    var debut = Date.now() + ms, fin = debut + 380;
    el._hsT = setInterval(function () {
      var now = Date.now();
      if (now < debut) return;
      var f;
      if (now >= fin || !el.isConnected) {
        clearInterval(el._hsT);
        // la vraie face, lue sur le dé tel qu'il est maintenant (« dé 4 »)
        var v = parseInt((el.getAttribute("aria-label") || "").replace(/\D+/g, ""), 10);
        f = FACES[v - 1];
        if (!f) return;
      } else {
        f = FACES[Math.floor(Math.random() * 6)];
      }
      for (var j = 0; j < 9; j++) points[j].className = f.indexOf(j) >= 0 ? "on" : "";
    }, 75);
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
    if (n.classList && (n.classList.contains("pc") || n.classList.contains("die"))) liste.push(n);
    if (n.querySelectorAll) {
      var sous = n.querySelectorAll(".pc, .die");
      for (var i = 0; i < sous.length; i++) liste.push(sous[i]);
    }
  }

  var obs = new MutationObserver(function (mutations) {
    var nouvelles = [], ajouts = [];
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      if (m.type === "childList") {
        for (var j = 0; j < m.addedNodes.length; j++) { ajouter(nouvelles, m.addedNodes[j]); ajouts.push(m.addedNodes[j]); }
      } else if (m.type === "attributes" && m.target.classList && (m.target.classList.contains("pc") || m.target.classList.contains("die")) &&
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
    // Les dés (fin de manche) arrivent presque d'un coup ; les cartes une par une
    var des = nouvelles.filter(function (el) { return el.classList.contains("die"); }).length;
    var pas = des > nouvelles.length / 2 ? Math.min(45, 400 / nouvelles.length) : delai(nouvelles.length);
    for (var k = 0; k < nouvelles.length; k++) retourner(nouvelles[k], k * pas);
    // Plusieurs cartes d'un coup : le verdict et les gorgées attendent la dernière carte
    if (nouvelles.length < 2) return;
    var fin = (nouvelles.length - 1) * pas + (des > nouvelles.length / 2 ? 350 : 500);
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

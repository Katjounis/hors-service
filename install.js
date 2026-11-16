// Hors Service : invitation à installer l'app sur l'écran d'accueil + compteur anonyme.
// Fichier séparé du reste de l'app : il faut garder la ligne <script src="install.js" defer>
// en bas de index.html à chaque nouvelle version.
(function () {
  "use strict";

  var CLE_ID = "hs_id";
  var CLE_PING = "hs_ping_jour";
  var CLE_INVIT = "hs_invit";          // { vues: n, prochaine: timestamp }
  var DELAI_PREMIERE_MS = 60 * 1000;   // laisser jouer une minute avant de proposer
  var DELAI_RELANCE_MS = 7 * 24 * 3600 * 1000;
  var MAX_INVITATIONS = 3;

  function lire(cle, defaut) {
    try { var v = localStorage.getItem(cle); return v === null ? defaut : JSON.parse(v); } catch (e) { return defaut; }
  }
  function ecrire(cle, valeur) {
    try { localStorage.setItem(cle, JSON.stringify(valeur)); } catch (e) {}
  }

  var installee = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

  // ---------- Compteur : un identifiant aléatoire par téléphone, un envoi par jour au maximum ----------
  function identifiant() {
    var id = lire(CLE_ID, null);
    if (!id) {
      var o = new Uint8Array(16);
      crypto.getRandomValues(o);
      id = Array.prototype.map.call(o, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      ecrire(CLE_ID, id);
    }
    return id;
  }

  function compter() {
    if (!window.SALONS_URL || !window.fetch) return;
    var jour = new Date().toISOString().slice(0, 10);
    if (lire(CLE_PING, "") === jour) return;
    fetch(window.SALONS_URL.replace(/\/$/, "") + "/hit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: identifiant(), installe: installee }),
      keepalive: true,
    }).then(function (r) { if (r.ok) ecrire(CLE_PING, jour); }).catch(function () {});
  }

  // ---------- Invitation à installer ----------
  var demandeAndroid = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    demandeAndroid = e;
  });
  window.addEventListener("appinstalled", function () {
    ecrire(CLE_INVIT, { vues: MAX_INVITATIONS, prochaine: 8.64e15 });
    fermer();
  });

  var ua = navigator.userAgent || "";
  var iphone = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var telephone = window.matchMedia("(pointer: coarse)").matches;

  function peutInviter() {
    if (installee || !telephone) return false;
    var etat = lire(CLE_INVIT, { vues: 0, prochaine: 0 });
    return etat.vues < MAX_INVITATIONS && Date.now() >= etat.prochaine;
  }

  // Bouton Partager d'iOS dessiné à la main (carré ouvert + flèche vers le haut)
  var ICONE_PARTAGER =
    '<svg class="hsi-picto" viewBox="0 0 20 24" width="16" height="19" aria-hidden="true">' +
    '<path d="M6 9H3.5v13h13V9H14" fill="none" stroke="currentColor" stroke-width="1.8"/>' +
    '<path d="M10 15V2M6 6l4-4 4 4" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

  var STYLE =
    ".hsi-fond{position:fixed;inset:0;z-index:9999;background:rgba(28,26,23,.62);display:flex;align-items:flex-end;justify-content:center;padding:16px;padding-bottom:calc(16px + env(safe-area-inset-bottom))}" +
    ".hsi-carte{position:relative;width:100%;max-width:420px;background:var(--carte,#FBF6EA);color:var(--encre,#22201C);border:1px solid var(--encre,#22201C);border-radius:4px;padding:24px 20px 20px;font-family:var(--f-texte,'Familjen Grotesk',sans-serif);transform:rotate(-.6deg);animation:hsi-pose .2s ease-out}" +
    ".hsi-carte::before{content:'';position:absolute;top:-10px;left:50%;width:88px;height:22px;margin-left:-44px;background:var(--scotch) center/100% 100% no-repeat}" +
    ".hsi-coin{position:absolute;top:10px;left:12px;font-family:var(--f-carte,Georgia,serif);font-size:15px;line-height:1;color:var(--jeton,#C8301E)}" +
    ".hsi-carte .hsi-titre{color:var(--encre,#22201C);margin:4px 0 8px;font-family:var(--f-titre,Georgia,serif);font-size:24px;line-height:1.1;font-weight:400}" +
    ".hsi-texte{margin:0 0 16px;font-size:16px;line-height:1.45}" +
    ".hsi-etapes{margin:0 0 16px;padding:0;list-style:none;counter-reset:e}" +
    ".hsi-etapes li{counter-increment:e;display:flex;gap:12px;align-items:center;padding:8px 0;border-top:1px solid rgba(34,32,28,.18);font-size:16px;line-height:1.35}" +
    ".hsi-etapes li::before{content:counter(e);flex:none;width:28px;height:28px;display:grid;place-items:center;border-radius:50%;background:var(--jeton,#C8301E);color:var(--carte,#FBF6EA);font-weight:700;font-size:14px}" +
    ".hsi-picto{vertical-align:-3px;margin:0 2px;color:#2B4C9B}" +
    ".hsi-actions{display:flex;flex-direction:column;gap:8px}" +
    ".hsi-plustard{min-height:44px;background:none;border:0;color:var(--encre,#22201C);font:inherit;font-size:15px;text-decoration:underline;text-underline-offset:3px;cursor:pointer}" +
    "@keyframes hsi-pose{from{opacity:0;transform:translateY(12px) rotate(-.6deg)}to{opacity:1;transform:rotate(-.6deg)}}" +
    "@media (prefers-reduced-motion:reduce){.hsi-carte{animation:none}}";

  var fond = null;

  function fermer() {
    if (fond && fond.parentNode) fond.parentNode.removeChild(fond);
    fond = null;
  }

  function plusTard() {
    var etat = lire(CLE_INVIT, { vues: 0, prochaine: 0 });
    ecrire(CLE_INVIT, { vues: etat.vues, prochaine: Date.now() + DELAI_RELANCE_MS });
    fermer();
  }

  function ageValide() {
    try { return localStorage.getItem("hs:age") === "1"; } catch (e) { return false; }
  }

  function afficher() {
    if (!peutInviter() || fond) return;
    // Pas par-dessus l'écran 18+ : on attend que la personne l'ait validé
    if (!ageValide()) { setTimeout(afficher, 15000); return; }
    if (!iphone && !demandeAndroid) return; // navigateur qui ne sait pas installer : on ne propose rien

    var etat = lire(CLE_INVIT, { vues: 0, prochaine: 0 });
    ecrire(CLE_INVIT, { vues: etat.vues + 1, prochaine: Date.now() + DELAI_RELANCE_MS });

    if (!document.getElementById("hsi-style")) {
      var s = document.createElement("style");
      s.id = "hsi-style";
      s.textContent = STYLE;
      document.head.appendChild(s);
    }

    var corps = iphone
      ? '<p class="hsi-texte">Deux gestes et Hors Service s’ouvre en plein écran, comme une vraie app, même sans réseau.</p>' +
        '<ol class="hsi-etapes">' +
        "<li><span>Touche " + ICONE_PARTAGER + " <b>Partager</b> en bas de Safari</span></li>" +
        "<li><span>Choisis <b>Sur l’écran d’accueil</b>, puis <b>Ajouter</b></span></li>" +
        "</ol>" +
        '<div class="hsi-actions"><button type="button" class="btn btn-main btn-wide hsi-ok">Compris</button></div>'
      : '<p class="hsi-texte">Hors Service s’ouvre en plein écran, comme une vraie app, même sans réseau. Rien à télécharger sur un store.</p>' +
        '<div class="hsi-actions"><button type="button" class="btn btn-main btn-wide hsi-installer">Installer</button>' +
        '<button type="button" class="hsi-plustard">Plus tard</button></div>';

    fond = document.createElement("div");
    fond.className = "hsi-fond";
    fond.innerHTML =
      '<div class="hsi-carte" role="dialog" aria-modal="true" aria-labelledby="hsi-titre">' +
      '<span class="hsi-coin" aria-hidden="true">A&#9829;&#xFE0E;</span>' +
      '<h2 class="hsi-titre" id="hsi-titre">Garde la table à portée de main</h2>' +
      corps +
      "</div>";

    fond.addEventListener("click", function (e) { if (e.target === fond) plusTard(); });
    document.addEventListener("keydown", function echap(e) {
      if (e.key === "Escape" && fond) { plusTard(); document.removeEventListener("keydown", echap); }
    });

    var ok = fond.querySelector(".hsi-ok");
    if (ok) ok.addEventListener("click", plusTard);
    var pt = fond.querySelector(".hsi-plustard");
    if (pt) pt.addEventListener("click", plusTard);
    var inst = fond.querySelector(".hsi-installer");
    if (inst) inst.addEventListener("click", function () {
      if (!demandeAndroid) return plusTard();
      demandeAndroid.prompt();
      demandeAndroid.userChoice.then(function (choix) {
        if (choix && choix.outcome === "accepted") ecrire(CLE_INVIT, { vues: MAX_INVITATIONS, prochaine: 8.64e15 });
        else plusTard();
      }).catch(plusTard);
      demandeAndroid = null;
      fermer();
    });

    document.body.appendChild(fond);
    var premier = fond.querySelector("button");
    if (premier) premier.focus({ preventScroll: true });
  }

  compter();
  setTimeout(afficher, DELAI_PREMIERE_MS);
})();

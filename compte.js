// Hors Service : « Mon compte ».
// Fichier autonome, chargé après l'appli (defer). Sans compte, rien ne change dans l'appli. Il ajoute :
// - « Mon compte » dans le menu de droite (pendant une soirée), sur l'accueil et sur l'écran « Rejoindre » ;
// - la connexion par identifiant et mot de passe (sans e-mail) ;
// - le perso gardé sur le compte et repris sur un autre téléphone (donc aussi en rejoignant par QR code) ;
// - les cartes débloquées en jouant, la collection par rareté et le choix des cartes en jeu
//   (le dessin des cartes est dans cartes-skins.js, chargé seulement quand on en a besoin).
// Le serveur des comptes est à part (dossier serveur-comptes). Son adresse : HS_COMPTES_URL ci-dessous.
(function () {
  "use strict";

  var HS_COMPTES_URL = "https://hors-service-comptes.chaux-samuel.workers.dev";
  var API = String(window.HS_COMPTES_URL || HS_COMPTES_URL).replace(/\/+$/, "");
  var FICHIER_CARTES = "cartes-skins.js";
  // Partie cartes à collectionner (skins, collection, cartes débloquées) en pause depuis le 26/11/2026 :
  // un seul jeu de cartes pour tous, le deck Classique (deck-classique.js). Le code reste là, repasser à true pour la rallumer.
  var TCG = false;
  var CLE = { compte: "hs:compte", cache: "hs:compte-cache", attente: "hs:compte-attente", skin: "hs:skin-actif", anim: "hs:cartes-anim", plays: "hs:plays", profil: "hs:profile", lang: "hs:lang" };

  // --- textes (français, anglais) ---
  var T = {
    compte: ["Mon compte", "My account"],
    fermer: ["Fermer", "Close"],
    retour: ["Retour", "Back"],
    intro: ["Crée ton compte avec un identifiant et un mot de passe pour retrouver ton perso sur n’importe quel téléphone.", "Create an account with a username and a password to get your character back on any phone."],
    identifiant: ["Identifiant", "Username"],
    identifiantEx: ["ex. sam_du_96", "e.g. sam_the_king"],
    identifiantFaux: ["Identifiant : 3 à 24 caractères, lettres sans accent, chiffres, point ou tiret.", "Username: 3 to 24 characters, letters without accents, digits, dot or dash."],
    mdp: ["Mot de passe", "Password"],
    mdpFaux: ["Mot de passe : 6 caractères au moins.", "Password: at least 6 characters."],
    mdpConseil: ["Note-le bien : sans e-mail, il ne peut pas être récupéré.", "Keep it safe: without an e-mail, it cannot be recovered."],
    creerCompte: ["Créer mon compte", "Create my account"],
    dejaCompte: ["J’ai déjà un compte", "I already have an account"],
    pasCompte: ["Pas encore de compte ? En créer un", "No account yet? Create one"],
    creation: ["Création…", "Creating…"],
    email: ["Adresse e-mail", "E-mail address"],
    emailEx: ["toi@exemple.fr", "you@example.com"],
    emailFaux: ["Vérifie l’adresse e-mail.", "Check the e-mail address."],
    recevoir: ["Recevoir un code", "Get a code"],
    envoi: ["Envoi…", "Sending…"],
    codeEnvoye: ["Code envoyé à {0}. Il est valable 15 minutes. Pense à regarder dans les indésirables.", "Code sent to {0}. It is valid for 15 minutes. Check your spam folder too."],
    codeEssai: ["Mode essai, aucun e-mail envoyé : le code est {0}.", "Test mode, no e-mail sent: the code is {0}."],
    code: ["Code à 6 chiffres", "6-digit code"],
    connecter: ["Me connecter", "Sign in"],
    connexion: ["Connexion…", "Signing in…"],
    autreAdresse: ["Changer d’adresse", "Use another address"],
    renvoyer: ["Renvoyer un code", "Send a new code"],
    reseau: ["Pas de réseau. Réessaie quand tu es connecté.", "No network. Try again when you are online."],
    serveur: ["Le serveur des comptes ne répond pas. Réessaie dans un moment.", "The accounts server is not answering. Try again in a moment."],
    connecteAvec: ["Connecté avec {0}", "Signed in as {0}"],
    monPerso: ["Mon perso", "My character"],
    persoGarde: ["« {0} » est gardé sur ton compte : il revient quand tu te connectes sur un autre téléphone, et quand tu rejoins une soirée par QR code.", "“{0}” is kept on your account: it comes back when you sign in on another phone, and when you join a party with a QR code."],
    persoAucun: ["Pas encore de perso sur ton compte. Crée-le en rejoignant ou en lançant une soirée : il sera gardé ici.", "No character on your account yet. Create one when you join or start a party: it will be kept here."],
    persoAutre: ["Ce téléphone a un autre perso, « {0} ». Lequel garder ?", "This phone has another character, “{0}”. Which one do you keep?"],
    prendreCompte: ["Reprendre « {0} »", "Use “{0}”"],
    garderTel: ["Garder « {0} »", "Keep “{0}”"],
    persoRepris: ["Perso repris : « {0} ».", "Character restored: “{0}”."],
    persoProchaine: ["Perso repris sur ce téléphone : il servira à la prochaine soirée.", "Character restored on this phone: it will be used at the next party."],
    sansNom: ["sans pseudo", "no nickname"],
    mesCartes: ["Mes cartes", "My cards"],
    surCent: ["{0} sur 100", "{0} of 100"],
    prochaine: ["Prochaine carte dans {0} partie{1}.", "Next card in {0} game{1}."],
    toutes: ["Toutes les cartes sont débloquées.", "All cards are unlocked."],
    commentDebloquer: ["Chaque partie lancée compte, dans tous les jeux. Pas de boutique : tout se débloque en jouant.", "Every game you start counts, in every game. No shop: everything unlocks by playing."],
    enJeu: ["Cartes en jeu : {0}", "Cards in play: {0}"],
    origine: ["celles d’origine", "the original ones"],
    voirCollection: ["Voir ma collection", "See my collection"],
    animer: ["Animer mes cartes", "Animate my cards"],
    oui: ["Oui", "Yes"],
    non: ["Non", "No"],
    animerAide: ["Six cartes au plus bougent en même temps. Coupé d’office si ton téléphone demande moins d’animations.", "At most six cards move at once. Turned off automatically if your phone asks for less motion."],
    deconnecter: ["Me déconnecter", "Sign out"],
    supprimer: ["Supprimer mon compte", "Delete my account"],
    supprimerOk: ["Confirmer : tout supprimer", "Confirm: delete everything"],
    supprimerAide: ["Tout est effacé du serveur tout de suite : l’identifiant, le perso. Ton perso reste sur ce téléphone.", "Everything is erased from the server right away: the username, the character. Your character stays on this phone."],
    annuler: ["Annuler", "Cancel"],
    supprime: ["Compte supprimé.", "Account deleted."],
    deconnecte: ["Déconnecté. Ton perso reste sur ce téléphone.", "Signed out. Your character stays on this phone."],
    collection: ["Ma collection", "My collection"],
    toutesR: ["Toutes", "All"],
    rarete: [["Commune", "Rare", "Épique", "Légendaire"], ["Common", "Rare", "Epic", "Legendary"]],
    raretes: [["Communes", "Rares", "Épiques", "Légendaires"], ["Common", "Rare", "Epic", "Legendary"]],
    aDebloquer: ["À débloquer", "Locked"],
    resteVoir: ["Encore {0} cartes à débloquer en jouant. Choisis une rareté pour les voir.", "{0} more cards to unlock by playing. Pick a rarity to see them."],
    chargement: ["Chargement des cartes…", "Loading the cards…"],
    chargementRate: ["Les cartes n’ont pas pu se charger. Vérifie le réseau.", "The cards could not load. Check your network."],
    reessayer: ["Réessayer", "Try again"],
    utiliser: ["Utiliser pour mes cartes", "Use for my cards"],
    utilisee: ["Ce sont tes cartes en jeu, sur ce téléphone.", "These are your cards in play, on this phone."],
    revenir: ["Revenir aux cartes d’origine", "Back to the original cards"],
    toucher: ["Touche la carte pour la retourner.", "Tap the card to flip it."],
    nouvelle: ["Nouvelle carte : {0} ({1})", "New card: {0} ({1})"],
    nouvelles: ["{0} nouvelles cartes débloquées", "{0} new cards unlocked"],
    voir: ["Voir", "See"],
    joinTexte: ["Tu as un compte ? Connecte-toi pour rejoindre avec ton perso.", "Got an account? Sign in to join with your character."],
    joinConnecte: ["Connecté : tu rejoins avec le perso de ton compte.", "Signed in: you join with your account’s character."],
    enJeuBadge: ["en jeu", "in play"],
    verrou: ["Carte à débloquer", "Locked card"],
    sessionFinie: ["Session expirée. Reconnecte-toi.", "Session expired. Sign in again."],
  };
  function langue() {
    try { var l = JSON.parse(localStorage.getItem(CLE.lang)); if (l === "en" || l === "fr") return l; } catch (e) {}
    return /^en/i.test(document.documentElement.lang || "") ? "en" : "fr";
  }
  function t(cle) {
    var v = T[cle], en = langue() === "en", s = v ? v[en ? 1 : 0] : cle, args = arguments;
    if (!en && typeof s === "string") s = s.replace(/« /g, "«\u00A0").replace(/ ([»:?!;])/g, "\u00A0$1"); // espaces insécables à la française
    return typeof s === "string" ? s.replace(/\{(\d)\}/g, function (m, i) { return args[Number(i) + 1] != null ? String(args[Number(i) + 1]) : ""; }) : s;
  }
  var nomRarete = function (n) { return t("rarete")[n]; };
  var nomRaretes = function (n) { return t("raretes")[n]; };
  var NIV = { C: 0, R: 1, E: 2, L: 3 };
  var echap = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  // --- mémoire du téléphone ---
  function lire(cle, defaut) { try { var v = localStorage.getItem(cle); return v == null ? defaut : JSON.parse(v); } catch (e) { return defaut; } }
  var interne = false; // nos propres écritures ne repartent pas vers le serveur
  function ecrire(cle, v) { interne = true; try { if (v == null) localStorage.removeItem(cle); else localStorage.setItem(cle, JSON.stringify(v)); } catch (e) {} interne = false; }
  var session = lire(CLE.compte, null);           // { jeton, email }
  var compte = lire(CLE.cache, null);             // dernier état connu du compte
  var connecte = function () { return !!(session && session.jeton); };

  // --- serveur ---
  function appel(methode, chemin, corps) {
    var ctl = typeof AbortController === "function" ? new AbortController() : null;
    var minuteur = ctl ? setTimeout(function () { ctl.abort(); }, 12000) : 0;
    var entetes = { "content-type": "application/json" };
    if (session && session.jeton) entetes.authorization = "Bearer " + session.jeton;
    var envoi = corps ? Object.assign({ langue: langue() }, corps) : undefined;
    return fetch(API + chemin, { method: methode, headers: entetes, body: envoi ? JSON.stringify(envoi) : undefined, signal: ctl ? ctl.signal : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, statut: r.status, j: j || {} }; }); })
      .catch(function () { return { ok: false, statut: 0, j: { erreur: navigator.onLine === false ? t("reseau") : t("serveur") } }; })
      .then(function (r) {
        clearTimeout(minuteur);
        if (r.statut === 401 && session) { session = null; ecrire(CLE.compte, null); etat.message = t("sessionFinie"); rafraichir(); }
        if (r.ok && r.j.compte) majCompte(r.j.compte);
        return r;
      });
  }
  function majCompte(c) { compte = c; ecrire(CLE.cache, c); }

  // --- le perso de l'appli (« hs:profile ») ---
  function profilLocal() { var p = lire(CLE.profil, null); return p && typeof p === "object" ? p : null; }
  var aUnNom = function (p) { return !!(p && typeof p.nick === "string" && p.nick.trim()); };
  function trie(o) { if (!o || typeof o !== "object" || Array.isArray(o)) return o; var r = {}; Object.keys(o).sort().forEach(function (k) { r[k] = trie(o[k]); }); return r; }
  var memePerso = function (a, b) { return JSON.stringify(trie(a)) === JSON.stringify(trie(b)); };
  var enSoiree = function () { return !!document.querySelector(".topbar"); };
  var minuteurPerso = 0;
  function envoyerPerso(p) {
    clearTimeout(minuteurPerso);
    minuteurPerso = setTimeout(function () { if (connecte() && aUnNom(p)) appel("PUT", "/compte/perso", { perso: p }); }, 1200);
  }
  // reprend le perso du compte sur ce téléphone ; l'appli le relit au démarrage, donc on recharge si on n'est pas en soirée
  function reprendrePerso(p) {
    ecrire(CLE.profil, p);
    if (enSoiree()) { toast(t("persoProchaine")); return; }
    try { sessionStorage.setItem("hs:compte-msg", t("persoRepris", p.nick)); } catch (e) {}
    location.reload();
  }

  // --- parties lancées : l'appli note chaque début de partie dans « hs:plays » ---
  var plays = lire(CLE.plays, {}) || {};
  function surPlays(valeur) {
    var avant = plays, apres; try { apres = JSON.parse(valeur) || {}; } catch (e) { return; }
    plays = apres;
    if (!connecte() || !apres._last || apres._last === avant._last) return;
    var jeu = Object.keys(apres).filter(function (k) { return k !== "_last" && (apres[k] || 0) > (avant[k] || 0); })[0] || "";
    var file = lire(CLE.attente, []) || [];
    file.push({ jeu: jeu, cle: String(apres._last) }); ecrire(CLE.attente, file.slice(-50));
    viderAttente();
  }
  var envoiEnCours = false;
  function viderAttente() {
    if (envoiEnCours || !connecte()) return;
    var file = lire(CLE.attente, []) || [];
    if (!file.length) return;
    envoiEnCours = true;
    appel("POST", "/compte/partie", file[0]).then(function (r) {
      envoiEnCours = false;
      if (!r.ok && r.statut !== 400) return; // hors ligne ou serveur muet : on réessaiera
      ecrire(CLE.attente, (lire(CLE.attente, []) || []).slice(1));
      if (TCG && r.ok && r.j.nouvelles && r.j.nouvelles.length) annoncer(r.j.nouvelles);
      rafraichir();
      viderAttente();
    });
  }
  window.addEventListener("online", viderAttente);
  // on regarde passer les écritures de l'appli (sans rien changer à ce qu'elle écrit)
  try {
    var ecrireOrigine = Storage.prototype.setItem;
    Storage.prototype.setItem = function (cle, valeur) {
      ecrireOrigine.call(this, cle, valeur);
      if (cle === CLE.lang) { planifier(); return; } // l'appli change de langue : nos libellés suivent
      if (interne || (cle !== CLE.plays && cle !== CLE.profil)) return;
      try {
        if (this !== window.localStorage) return;
        if (cle === CLE.plays) surPlays(valeur);
        else if (connecte()) { var p = JSON.parse(valeur); if (aUnNom(p)) envoyerPerso(p); }
      } catch (e) {}
    };
  } catch (e) {}

  // --- cartes : cartes-skins.js, chargé à la demande ---
  var chargementCartes = null;
  function cartes() {
    if (window.HS_CARTES) return Promise.resolve(window.HS_CARTES);
    if (chargementCartes) return chargementCartes;
    chargementCartes = new Promise(function (ok, ko) {
      var s = document.createElement("script"); s.src = FICHIER_CARTES; s.async = true;
      s.onload = function () { window.HS_CARTES ? ok(window.HS_CARTES) : ko(new Error("cartes")); };
      s.onerror = function () { chargementCartes = null; s.remove(); ko(new Error("cartes")); };
      document.head.appendChild(s);
    });
    chargementCartes.then(function (C) { C.animer(lire(CLE.anim, true) !== false); });
    return chargementCartes;
  }
  var possede = function (id) { return !!(compte && compte.cartes && compte.cartes.indexOf(id) >= 0); };
  function skinActif() { var s = lire(CLE.skin, null); return TCG && connecte() && s && possede(s) ? s : null; }
  function appliquerSkin() {
    var s = skinActif();
    if (s) cartes().then(function (C) { C.activer(s); }).catch(function () {});
    else if (window.HS_CARTES) window.HS_CARTES.activer(null);
  }
  function choisirSkin(id) {
    ecrire(CLE.skin, id);
    appliquerSkin();
    if (connecte()) appel("PUT", "/compte/skin", { skin: id });
  }
  var nomDemande = false;
  function nomSkin(id) {
    var C = window.HS_CARTES, s = C && C.liste.filter(function (x) { return x.id === id; })[0];
    if (!C && !nomDemande) { nomDemande = true; cartes().then(rafraichir, function () {}); } // les noms sont dans cartes-skins.js
    return s ? (langue() === "en" ? s.nomEn : s.nom) : "…";
  }

  // --- connexion ---
  var etat = { vue: "compte", etape: "email", email: "", code: "", essai: null, mode: "creer", identifiant: "", mdp: "", erreur: "", message: "", occupe: false, filtre: "tout", detail: null, recto: null, confirmer: false };
  function entrer() {
    var id = (etat.identifiant || "").trim().toLowerCase(), mdp = etat.mdp || "", creer = etat.mode === "creer";
    if (!/^[a-z0-9._-]{3,24}$/.test(id)) { etat.erreur = t("identifiantFaux"); rendre(); focaliser("#hsc-id"); return; }
    if (mdp.length < 6) { etat.erreur = t("mdpFaux"); rendre(); focaliser("#hsc-mdp"); return; }
    etat.occupe = true; etat.erreur = ""; rendre();
    appel("POST", "/connexion", { identifiant: id, mdp: mdp, creer: creer }).then(function (r) {
      etat.occupe = false;
      if (!r.ok) { etat.erreur = r.j.erreur || t("serveur"); rendre(); focaliser(r.j.cle === "mauvais" || r.j.cle === "mdp" ? "#hsc-mdp" : "#hsc-id"); return; }
      etat.mdp = "";
      apresConnexion(r);
    });
  }
  function demanderCode() {
    var email = (etat.email || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { etat.erreur = t("emailFaux"); rendre(); return; }
    etat.occupe = true; etat.erreur = ""; rendre();
    appel("POST", "/code", { email: email }).then(function (r) {
      etat.occupe = false;
      if (r.ok) { etat.etape = "code"; etat.code = ""; etat.essai = r.j.essai ? r.j.code : null; }
      else etat.erreur = r.j.erreur || t("serveur");
      rendre(); focaliser(etat.etape === "code" ? "#hsc-code" : "#hsc-email");
    });
  }
  function seConnecter() {
    var code = (etat.code || "").replace(/\D/g, "");
    if (code.length !== 6) { focaliser("#hsc-code"); return; }
    etat.occupe = true; etat.erreur = ""; rendre();
    appel("POST", "/connexion", { email: etat.email.trim(), code: code }).then(function (r) {
      etat.occupe = false;
      if (!r.ok) { etat.erreur = r.j.erreur || t("serveur"); rendre(); focaliser("#hsc-code"); return; }
      apresConnexion(r);
    });
  }
  function apresConnexion(r) {
      session = { jeton: r.j.jeton, email: r.j.compte.email }; ecrire(CLE.compte, session);
      etat.etape = "email"; etat.code = ""; etat.essai = null; etat.message = "";
      if (compte && compte.skin && possede(compte.skin)) ecrire(CLE.skin, compte.skin);
      // le perso : celui du compte revient sur ce téléphone, ou celui du téléphone part sur le compte
      var local = profilLocal(), duCompte = compte && compte.perso;
      if (aUnNom(duCompte) && !aUnNom(local)) { reprendrePerso(duCompte); return; }
      if (!aUnNom(duCompte) && aUnNom(local)) appel("PUT", "/compte/perso", { perso: local }).then(rafraichir);
      appliquerSkin(); viderAttente(); rendre(); focaliser(".hsc-fermer");
  }
  function seDeconnecter(supprimer) {
    etat.occupe = true; rendre();
    appel(supprimer ? "DELETE" : "POST", supprimer ? "/compte" : "/deconnexion", supprimer ? undefined : {}).then(function (r) {
      etat.occupe = false;
      if (supprimer && !r.ok) { etat.erreur = r.j.erreur || t("serveur"); rendre(); return; }
      session = null; compte = null;
      [CLE.compte, CLE.cache, CLE.attente, CLE.skin].forEach(function (k) { ecrire(k, null); });
      appliquerSkin();
      etat.vue = "compte"; etat.confirmer = false; etat.message = supprimer ? t("supprime") : t("deconnecte");
      rendre();
    });
  }

  // --- la feuille « Mon compte » (mêmes classes que les feuilles de l'appli) ---
  var feuille = null, ouvreur = null;
  function ouvrir(vue) {
    if (!TCG && (vue === "collection" || vue === "detail")) vue = undefined;
    ouvreur = document.activeElement;
    etat.vue = vue || "compte"; etat.erreur = ""; etat.confirmer = false;
    if (!feuille) {
      feuille = document.createElement("div");
      feuille.className = "sheet-wrap is-side hsc-wrap";
      feuille.addEventListener("click", function (e) { if (e.target === feuille) fermer(); });
      feuille.addEventListener("click", surClic);
      feuille.addEventListener("input", surSaisie);
      feuille.addEventListener("keydown", function (e) {
        if (e.key !== "Enter") return;
        if (e.target.id === "hsc-email") { e.preventDefault(); demanderCode(); }
        if (e.target.id === "hsc-id") { e.preventDefault(); focaliser("#hsc-mdp"); }
        if (e.target.id === "hsc-mdp") { e.preventDefault(); entrer(); }
        if (e.target.id === "hsc-code") { e.preventDefault(); seConnecter(); }
      });
      document.body.appendChild(feuille);
    }
    rendre();
    if (connecte()) appel("GET", "/compte").then(rafraichir);
    focaliser(connecte() ? ".hsc-fermer" : "#hsc-id");
  }
  function fermer() {
    if (!feuille) return;
    feuille.remove(); feuille = null; etat.message = ""; etat.erreur = "";
    if (ouvreur && ouvreur.isConnected && ouvreur.focus) ouvreur.focus();
  }
  document.addEventListener("keydown", function (e) { if (feuille && e.key === "Escape") { e.stopPropagation(); fermer(); } }, true);
  function focaliser(sel) { setTimeout(function () { var el = feuille && feuille.querySelector(sel); if (el) el.focus(); }, 30); }
  function rafraichir() { if (feuille) rendre(); injecter(); }

  function reperer(el) {
    if (!el || !feuille || !feuille.contains(el)) return null;
    if (el.id) return "#" + el.id;
    var a = el.getAttribute("data-action"); if (!a) return null;
    var sel = '[data-action="' + a + '"]';
    ["data-id", "data-f", "data-r", "data-e"].forEach(function (k) { if (el.hasAttribute(k)) sel += "[" + k + '="' + el.getAttribute(k) + '"]'; });
    return sel;
  }
  function rendre() {
    if (!feuille) return;
    var focus = reperer(document.activeElement), ancienne = feuille.querySelector(".sheet"), defile = ancienne ? ancienne.scrollTop : 0, memeVue = feuille.getAttribute("data-vue") === etat.vue;
    feuille.setAttribute("data-vue", etat.vue);
    var titre = etat.vue === "collection" ? t("collection") : etat.vue === "detail" ? nomSkin(etat.detail) : t("compte");
    var retour = etat.vue === "collection" || etat.vue === "detail";
    feuille.innerHTML = '<div class="sheet hsc-sheet" role="dialog" aria-modal="true" aria-label="' + echap(titre) + '">'
      + '<div class="sheet-head">' + (retour ? '<button type="button" class="icon-btn" data-action="retour" aria-label="' + echap(t("retour")) + '">' + ICONES.retour + "</button>" : "")
      + '<h2 class="hsc-titre">' + echap(titre) + '</h2><button type="button" class="icon-btn hsc-fermer" data-action="fermer" aria-label="' + echap(t("fermer")) + '">' + ICONES.fermer + "</button></div>"
      + '<div class="sheet-body">' + (etat.vue === "collection" ? vueCollection() : etat.vue === "detail" ? vueDetail() : connecte() ? vueCompte() : vueConnexion()) + "</div></div>";
    if (etat.vue === "collection") dessinerVignettes();
    if (etat.vue === "detail") dessinerDetail();
    var nouvelle = feuille.querySelector(".sheet");
    if (nouvelle && memeVue) nouvelle.scrollTop = defile;
    if (focus) { var el = feuille.querySelector(focus); if (el && !el.disabled) el.focus({ preventScroll: true }); }
  }
  function vueConnexion() {
    var h = (etat.message ? '<p class="panel" role="status">' + echap(etat.message) + "</p>" : "") + '<p class="muted">' + echap(t("intro")) + "</p>";
    var creer = etat.mode === "creer", inval = etat.erreur ? ' aria-invalid="true" aria-describedby="hsc-err"' : "";
    h += '<label class="field" for="hsc-id"><span class="field-l">' + echap(t("identifiant")) + '</span><input id="hsc-id" class="input" type="text" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="24" placeholder="' + echap(t("identifiantEx")) + '" value="' + echap(etat.identifiant) + '"' + inval + "></label>"
      + '<label class="field" for="hsc-mdp"><span class="field-l">' + echap(t("mdp")) + '</span><input id="hsc-mdp" class="input" type="password" autocomplete="' + (creer ? "new-password" : "current-password") + '" maxlength="128" value="' + echap(etat.mdp) + '"' + inval + "></label>"
      + (creer ? '<p class="muted small">' + echap(t("mdpConseil")) + "</p>" : "")
      + (etat.erreur ? '<p class="field-err" id="hsc-err" role="alert">' + echap(etat.erreur) + "</p>" : "")
      + '<button type="button" class="btn btn-main btn-wide" data-action="entrer"' + (etat.occupe ? " disabled" : "") + ">" + echap(etat.occupe ? (creer ? t("creation") : t("connexion")) : (creer ? t("creerCompte") : t("connecter"))) + "</button>"
      + '<div class="hsc-ligne"><button type="button" class="btn btn-ghost btn-small" data-action="mode">' + echap(creer ? t("dejaCompte") : t("pasCompte")) + "</button></div>";
    return h;
    if (etat.etape === "email") {
      h += '<label class="field" for="hsc-email"><span class="field-l">' + echap(t("email")) + '</span><input id="hsc-email" class="input" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" maxlength="254" placeholder="' + echap(t("emailEx")) + '" value="' + echap(etat.email) + '"' + (etat.erreur ? ' aria-invalid="true" aria-describedby="hsc-err"' : "") + "></label>"
        + (etat.erreur ? '<p class="field-err" id="hsc-err" role="alert">' + echap(etat.erreur) + "</p>" : "")
        + '<button type="button" class="btn btn-main btn-wide" data-action="code"' + (etat.occupe ? " disabled" : "") + ">" + echap(etat.occupe ? t("envoi") : t("recevoir")) + "</button>";
    } else {
      h += '<p class="panel" role="status">' + echap(t("codeEnvoye", etat.email.trim())) + (etat.essai ? "<br><b>" + echap(t("codeEssai", etat.essai)) + "</b>" : "") + "</p>"
        + '<label class="field" for="hsc-code"><span class="field-l">' + echap(t("code")) + '</span><input id="hsc-code" class="input hsc-code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]*" maxlength="6" value="' + echap(etat.code) + '"' + (etat.erreur ? ' aria-invalid="true" aria-describedby="hsc-err"' : "") + "></label>"
        + (etat.erreur ? '<p class="field-err" id="hsc-err" role="alert">' + echap(etat.erreur) + "</p>" : "")
        + '<button type="button" class="btn btn-main btn-wide" data-action="connexion"' + (etat.occupe ? " disabled" : "") + ">" + echap(etat.occupe ? t("connexion") : t("connecter")) + "</button>"
        + '<div class="hsc-ligne"><button type="button" class="btn btn-ghost btn-small" data-action="autre">' + echap(t("autreAdresse")) + '</button><button type="button" class="btn btn-ghost btn-small" data-action="code"' + (etat.occupe ? " disabled" : "") + ">" + echap(t("renvoyer")) + "</button></div>";
    }
    return h;
  }
  function compteParRarete(liste) {
    var n = { C: 0, R: 0, E: 0, L: 0 }; (liste || []).forEach(function (id) { if (n[id[0]] != null) n[id[0]]++; }); return n;
  }
  function vueCompte() {
    var c = compte || { cartes: ["C-001"], parties: 0 }, n = compteParRarete(c.cartes), local = profilLocal(), perso = c.perso;
    var h = (etat.message ? '<p class="panel" role="status">' + echap(etat.message) + "</p>" : "")
      + '<p class="muted small">' + echap(t("connecteAvec", (session && session.email) || c.email || "")) + "</p>";
    // perso
    h += '<section class="panel hsc-bloc"><h3 class="hsc-h3">' + echap(t("monPerso")) + "</h3>";
    if (aUnNom(perso)) {
      h += '<p class="small">' + echap(t("persoGarde", perso.nick)) + "</p>";
      if (aUnNom(local) && !memePerso(local, perso)) {
        h += '<p class="small">' + echap(t("persoAutre", local.nick)) + '</p><div class="hsc-ligne">'
          + '<button type="button" class="btn btn-small" data-action="perso-compte">' + echap(t("prendreCompte", perso.nick)) + "</button>"
          + '<button type="button" class="btn btn-small" data-action="perso-tel">' + echap(t("garderTel", local.nick)) + "</button></div>";
      }
    } else h += '<p class="small">' + echap(t("persoAucun")) + "</p>";
    h += "</section>";
    // cartes (en pause : voir TCG)
    if (TCG) {
    var total = (c.cartes || []).length, p = c.prochaine;
    h += '<section class="panel hsc-bloc"><div class="hsc-titre-ligne"><h3 class="hsc-h3">' + echap(t("mesCartes")) + '</h3><span class="hsc-compteur">' + echap(t("surCent", total)) + "</span></div>"
      + '<div class="chips">' + ["L", "E", "R", "C"].map(function (r) { return '<span class="chip hsc-r' + NIV[r] + '"><b class="hsc-pastille"></b>' + echap(nomRaretes(NIV[r])) + " " + n[r] + "/" + { C: 55, R: 30, E: 10, L: 5 }[r] + "</span>"; }).join("") + "</div>"
      + '<p class="small">' + echap(p ? t("prochaine", p.dans, p.dans > 1 ? "s" : "") : p === null ? t("toutes") : "") + " " + echap(t("commentDebloquer")) + "</p>"
      + '<p class="small"><b>' + echap(t("enJeu", skinActif() ? nomSkin(skinActif()) : t("origine"))) + "</b></p>"
      + '<button type="button" class="btn btn-main btn-wide" data-action="collection">' + echap(t("voirCollection")) + "</button></section>";
    // animations
    var anim = lire(CLE.anim, true) !== false;
    h += '<div class="field"><span class="field-l" id="hsc-anim-l">' + echap(t("animer")) + '</span><div class="seg" role="group" aria-labelledby="hsc-anim-l">'
      + '<button type="button" class="seg-btn' + (anim ? " is-on" : "") + '" aria-pressed="' + anim + '" data-action="anim-oui">' + echap(t("oui")) + "</button>"
      + '<button type="button" class="seg-btn' + (anim ? "" : " is-on") + '" aria-pressed="' + !anim + '" data-action="anim-non">' + echap(t("non")) + "</button></div>"
      + '<span class="field-h">' + echap(t("animerAide")) + "</span></div>";
    }
    // sortie
    if (etat.erreur) h += '<p class="field-err" role="alert">' + echap(etat.erreur) + "</p>";
    if (etat.confirmer) {
      h += '<div class="panel panel-warn"><p class="small">' + echap(t("supprimerAide")) + '</p><div class="hsc-ligne">'
        + '<button type="button" class="btn btn-small btn-danger" data-action="supprimer-ok"' + (etat.occupe ? " disabled" : "") + ">" + echap(t("supprimerOk")) + "</button>"
        + '<button type="button" class="btn btn-small" data-action="annuler">' + echap(t("annuler")) + "</button></div></div>";
    } else {
      h += '<div class="hsc-ligne"><button type="button" class="btn btn-small" data-action="deconnecter"' + (etat.occupe ? " disabled" : "") + ">" + echap(t("deconnecter")) + "</button>"
        + '<button type="button" class="btn btn-small btn-danger" data-action="supprimer">' + echap(t("supprimer")) + "</button></div>";
    }
    return h;
  }

  // --- collection ---
  var ORDRE = ["L", "E", "R", "C"];
  function vueCollection() {
    var C = window.HS_CARTES;
    if (!C) {
      if (!etat.erreur && !etat.charge) { etat.charge = true; cartes().then(function () { etat.charge = false; rendre(); }, function () { etat.charge = false; etat.erreur = t("chargementRate"); rendre(); }); }
      return etat.erreur ? '<p class="field-err" role="alert">' + echap(etat.erreur) + '</p><button type="button" class="btn" data-action="recharger">' + echap(t("reessayer")) + "</button>"
        : '<p class="muted" role="status">' + echap(t("chargement")) + "</p>";
    }
    var en = langue() === "en", actif = skinActif(), mes = (compte && compte.cartes) || [], n = compteParRarete(mes), f = etat.filtre;
    var TOTAL = { C: 55, R: 30, E: 10, L: 5 };
    var vignette = function (s) {
      var nom = en ? s.nomEn : s.nom;
      return '<button type="button" class="hsc-vignette hsc-r' + s.niveau + (s.id === actif ? " is-actif" : "") + '" data-action="detail" data-id="' + s.id + '" aria-label="' + echap(nom + ", " + nomRarete(s.niveau) + (s.id === actif ? ", " + t("enJeuBadge") : "")) + '">'
        + '<span class="hsc-v-carte hsc-fige" data-dos="' + s.id + '"></span><span class="hsc-v-nom"><b class="hsc-pastille"></b> ' + echap(nom) + "</span>" + (s.id === actif ? '<span class="hsc-v-badge">' + echap(t("enJeuBadge")) + "</span>" : "") + "</button>";
    };
    var verrou = '<div class="hsc-vignette hsc-verrou" role="img" aria-label="' + echap(t("verrou")) + '"><span class="hsc-v-carte"><b aria-hidden="true">?</b></span><span class="hsc-v-nom">' + echap(t("aDebloquer")) + "</span></div>";
    // filtres : toutes mes cartes, ou une rareté (avec les cartes encore à débloquer)
    var h = '<div class="chips hsc-filtres" role="group" aria-label="' + echap(t("collection")) + '">'
      + [["tout", t("toutesR"), mes.length + "/100", ""]].concat(ORDRE.map(function (r) { return [r, nomRaretes(NIV[r]), n[r] + "/" + TOTAL[r], " hsc-r" + NIV[r]]; })).map(function (o) {
        return '<button type="button" class="chip-btn' + o[3] + (f === o[0] ? " is-on" : "") + '" aria-pressed="' + (f === o[0]) + '" data-action="filtre" data-f="' + o[0] + '">' + (o[0] === "tout" ? "" : '<b class="hsc-pastille"></b>') + echap(o[1]) + ' <span class="hsc-compte-f">' + o[2] + "</span></button>";
      }).join("") + "</div>";
    if (f === "tout") {
      var a = []; ORDRE.forEach(function (r) { C.liste.forEach(function (s) { if (s.id[0] === r && possede(s.id)) a.push(s); }); });
      h += '<div class="hsc-grille">' + a.map(vignette).join("") + "</div>"
        + (a.length < 100 ? '<p class="muted small">' + echap(t("resteVoir", 100 - a.length)) + "</p>" : "");
    } else {
      var l = C.liste.filter(function (s) { return s.id[0] === f; });
      var a2 = l.filter(function (s) { return possede(s.id); });
      h += '<section class="hsc-section hsc-r' + NIV[f] + '"><div class="hsc-titre-ligne"><h3 class="hsc-h3"><b class="hsc-pastille"></b>' + echap(nomRaretes(NIV[f])) + '</h3><span class="hsc-compteur">' + a2.length + " / " + l.length + "</span></div>"
        + '<div class="hsc-grille">' + a2.map(vignette).join("") + new Array(l.length - a2.length + 1).join(verrou) + "</div></section>";
    }
    return h;
  }
  var muet = function (el) { var svg = el.querySelector("svg"); if (svg) { svg.setAttribute("aria-hidden", "true"); svg.removeAttribute("role"); } };
  function dessinerVignettes() {
    var C = window.HS_CARTES; if (!C || !feuille) return;
    var cases = feuille.querySelectorAll("[data-dos]");
    var dessiner = function (el) { if (!el.firstChild) { el.innerHTML = C.dos(el.getAttribute("data-dos")); muet(el); } };
    if (typeof IntersectionObserver !== "function") { cases.forEach(dessiner); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { dessiner(e.target); io.unobserve(e.target); } }); }, { root: feuille.querySelector(".sheet"), rootMargin: "300px 0px" });
    cases.forEach(function (el) { io.observe(el); });
  }
  var FAMILLE = [["R", "S"], ["D", "H"], ["V", "C"], ["A", "D"], ["10", "H"], ["7", "S"]];
  var SYMBOLE = { S: "♠", H: "♥", D: "♦", C: "♣" };
  function vueDetail() {
    var C = window.HS_CARTES, s = C && C.liste.filter(function (x) { return x.id === etat.detail; })[0];
    if (!s) return "";
    var en = langue() === "en", actif = skinActif() === s.id, r = etat.recto;
    var famille = en ? s.familleEn : s.famille;
    var h = '<p class="hsc-v-r hsc-r' + s.niveau + '"><b class="hsc-pastille"></b>' + echap(nomRarete(s.niveau)) + (s.niveau === 3 ? "" : " · " + echap(famille)) + "</p>"
      + '<button type="button" class="hsc-grande' + (r ? " is-recto" : "") + '" data-action="retourner" aria-label="' + echap(t("toucher")) + '"><span class="hsc-grande-in">'
      + '<span class="hsc-face hsc-face-dos"></span><span class="hsc-face hsc-face-recto"></span></span></button>'
      + '<p class="muted small hsc-centre">' + echap(t("toucher")) + "</p>"
      + '<div class="hsc-minis">' + FAMILLE.map(function (f) { return '<button type="button" class="hsc-mini" data-action="face" data-r="' + f[0] + '" data-e="' + f[1] + '" aria-pressed="' + (!!r && r[0] === f[0] && r[1] === f[1]) + '" aria-label="' + echap(f[0] + " " + SYMBOLE[f[1]]) + '"><span class="hsc-v-carte hsc-fige" data-r="' + f[0] + '" data-e="' + f[1] + '"></span></button>'; }).join("") + "</div>";
    h += actif ? '<p class="panel small" role="status">' + echap(t("utilisee")) + '</p><button type="button" class="btn btn-wide" data-action="origine">' + echap(t("revenir")) + "</button>"
      : '<button type="button" class="btn btn-main btn-wide" data-action="utiliser" data-id="' + s.id + '">' + echap(t("utiliser")) + "</button>";
    return h;
  }
  function dessinerDetail() {
    var C = window.HS_CARTES; if (!C || !feuille) return;
    var id = etat.detail, r = etat.recto || ["R", "S"];
    var dos = feuille.querySelector(".hsc-face-dos"), recto = feuille.querySelector(".hsc-face-recto");
    if (dos) { dos.innerHTML = C.dos(id); muet(dos); }
    if (recto) { recto.innerHTML = C.recto(id, r[0], r[1]); muet(recto); }
    feuille.querySelectorAll(".hsc-mini [data-r]").forEach(function (el) { el.innerHTML = C.recto(id, el.getAttribute("data-r"), el.getAttribute("data-e")); muet(el); });
    var grande = feuille.querySelector(".hsc-grande");
    var calme = lire(CLE.anim, true) === false || (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (grande) grande.classList.toggle("hsc-fige", calme);
  }

  // --- actions ---
  function surSaisie(e) {
    if (e.target.id === "hsc-email") etat.email = e.target.value;
    if (e.target.id === "hsc-id") etat.identifiant = e.target.value;
    if (e.target.id === "hsc-mdp") etat.mdp = e.target.value;
    if (e.target.id === "hsc-code") {
      etat.code = e.target.value.replace(/\D/g, "").slice(0, 6);
      if (e.target.value !== etat.code) e.target.value = etat.code;
      if (etat.code.length === 6 && !etat.occupe) seConnecter();
    }
  }
  function surClic(e) {
    var b = e.target.closest && e.target.closest("[data-action]");
    if (!b || !feuille || !feuille.contains(b) || b.disabled) return;
    var a = b.getAttribute("data-action");
    if (a === "fermer") return fermer();
    if (a === "code") return demanderCode();
    if (a === "entrer") return entrer();
    if (a === "mode") { etat.mode = etat.mode === "creer" ? "connexion" : "creer"; etat.erreur = ""; rendre(); return focaliser("#hsc-id"); }
    if (a === "connexion") return seConnecter();
    if (a === "autre") { etat.etape = "email"; etat.erreur = ""; etat.essai = null; rendre(); return focaliser("#hsc-email"); }
    if (a === "perso-compte") return reprendrePerso(compte.perso);
    if (a === "perso-tel") { var p = profilLocal(); if (p) appel("PUT", "/compte/perso", { perso: p }).then(rendre); return; }
    if (TCG && a === "collection") { etat.vue = "collection"; etat.erreur = ""; rendre(); return focaliser(".hsc-filtres .is-on"); }
    if (a === "recharger") { etat.erreur = ""; rendre(); return; }
    if (a === "filtre") { etat.filtre = b.getAttribute("data-f"); rendre(); return focaliser('.hsc-filtres [data-f="' + etat.filtre + '"]'); }
    if (TCG && a === "detail") { etat.vue = "detail"; etat.detail = b.getAttribute("data-id"); etat.recto = null; rendre(); return focaliser(".hsc-grande"); }
    if (a === "retour") { etat.vue = etat.vue === "detail" ? "collection" : "compte"; rendre(); return focaliser(etat.vue === "collection" ? '[data-id="' + etat.detail + '"]' : ".hsc-fermer"); }
    if (a === "retourner") { etat.recto = etat.recto ? null : ["R", "S"]; b.classList.toggle("is-recto", !!etat.recto); var rr = etat.recto || ["R", "S"], rec = feuille.querySelector(".hsc-face-recto"); if (rec && window.HS_CARTES) { rec.innerHTML = window.HS_CARTES.recto(etat.detail, rr[0], rr[1]); muet(rec); } return; }
    if (a === "face") { etat.recto = [b.getAttribute("data-r"), b.getAttribute("data-e")]; rendre(); return focaliser(".hsc-grande"); }
    if (TCG && a === "utiliser") { choisirSkin(b.getAttribute("data-id")); rendre(); return focaliser('[data-action="origine"]'); }
    if (a === "origine") { choisirSkin(null); rendre(); return focaliser('[data-action="utiliser"]'); }
    if (a === "anim-oui" || a === "anim-non") { ecrire(CLE.anim, a === "anim-oui"); if (window.HS_CARTES) window.HS_CARTES.animer(a === "anim-oui"); rendre(); return focaliser('[data-action="' + a + '"]'); }
    if (a === "deconnecter") return seDeconnecter(false);
    if (a === "supprimer") { etat.confirmer = true; rendre(); return focaliser('[data-action="annuler"]'); }
    if (a === "annuler") { etat.confirmer = false; rendre(); return focaliser('[data-action="supprimer"]'); }
    if (a === "supprimer-ok") return seDeconnecter(true);
  }

  // --- annonces : nouvelles cartes ---
  var boite = null;
  function toast(texte, action) {
    if (!boite || !boite.isConnected) { boite = document.createElement("div"); boite.className = "toasts hsc-toasts"; boite.setAttribute("role", "status"); document.body.appendChild(boite); }
    var el = document.createElement("div"); el.className = "toast toast-game";
    el.innerHTML = "<span>" + echap(texte) + "</span>" + (action ? '<button type="button">' + echap(t("voir")) + "</button>" : "");
    if (action) el.querySelector("button").addEventListener("click", function () { el.remove(); action(); });
    boite.appendChild(el);
    setTimeout(function () { el.remove(); }, action ? 7000 : 4000);
  }
  function annoncer(ids) {
    var voir = function () { ouvrir("collection"); };
    if (ids.length > 1) { toast(t("nouvelles", ids.length), voir); return; }
    var id = ids[0];
    cartes().then(function () { toast(t("nouvelle", nomSkin(id), nomRarete(NIV[id[0]])), function () { etat.detail = id; etat.recto = null; ouvrir("detail"); }); })
      .catch(function () { toast(t("nouvelle", id, nomRarete(NIV[id[0]])), voir); });
  }

  // --- entrées « Mon compte » dans l'appli ---
  var ICONES = {
    compte: '<svg class="ico" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="2.5" width="15" height="19" rx="1.5"/><circle cx="12" cy="9.5" r="3"/><path d="M7.5 18c.8-2.6 2.4-4 4.5-4s3.7 1.4 4.5 4"/></svg>',
    fermer: '<svg class="ico" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    retour: '<svg class="ico" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5l-7 7 7 7"/></svg>',
  };
  function injecter() {
    var titre = t("compte");
    // accueil : bouton rond à côté de « Stats »
    var haut = document.querySelector(".home-top");
    if (haut) {
      var b = haut.querySelector(".hsc-accueil");
      if (!b) {
        b = document.createElement("button"); b.type = "button"; b.className = "icon-btn icon-round hsc-accueil"; b.innerHTML = ICONES.compte;
        b.addEventListener("click", function () { ouvrir(); });
        var stats = haut.querySelector(".icon-btn"); haut.insertBefore(b, stats || null);
      }
      if (b.getAttribute("aria-label") !== titre) b.setAttribute("aria-label", titre);
    }
    // menu de droite, pendant une soirée : en tête de liste
    var menu = document.querySelector(".sheet .menu");
    if (menu) {
      var m = menu.querySelector(".hsc-menu");
      if (!m) {
        m = document.createElement("button"); m.type = "button"; m.className = "menu-item hsc-menu";
        m.addEventListener("click", function () { ouvrir(); });
        menu.insertBefore(m, menu.querySelector(".menu-item"));
      }
      if (m.textContent !== titre) m.textContent = titre;
    }
    // écran « Rejoindre » (code tapé ou QR code)
    var code = document.getElementById("join-code"), ecran = code && code.closest(".screen");
    if (ecran) {
      var j = ecran.querySelector(".hsc-rejoindre"), texte = connecte() ? t("joinConnecte") : t("joinTexte");
      if (!j) {
        j = document.createElement("div"); j.className = "panel hsc-rejoindre";
        j.innerHTML = '<p class="small"></p><button type="button" class="btn btn-small"></button>';
        j.querySelector("button").addEventListener("click", function () { ouvrir(); });
        var haut2 = ecran.querySelector(".topback"); ecran.insertBefore(j, haut2 ? haut2.nextSibling : ecran.firstChild);
      }
      var pj = j.querySelector("p"), bj = j.querySelector("button");
      if (pj.textContent !== texte) pj.textContent = texte;
      if (bj.textContent !== titre) bj.textContent = titre;
    }
  }
  var attente = 0;
  function planifier() { if (!attente) attente = requestAnimationFrame(function () { attente = 0; injecter(); }); }
  new MutationObserver(planifier).observe(document.body, { childList: true, subtree: true });

  // --- styles propres à « Mon compte » (le reste vient de l'appli) ---
  var css = document.createElement("style");
  css.textContent = [
    ".hsc-wrap { z-index: 55; }",
    ".hsc-sheet { max-width: 520px; }",
    ".hsc-sheet .sheet-head h2 { flex: 1; margin: 0; }",
    ".hsc-accueil { margin-left: auto; }",
    ".hsc-ligne { display: flex; flex-wrap: wrap; gap: 8px; }",
    ".hsc-bloc { gap: 10px; }",
    ".hsc-bloc p { margin: 0; }",
    ".hsc-h3 { margin: 0; font: 400 1.15rem/1.2 var(--f-titre); display: flex; align-items: center; gap: 8px; }",
    ".hsc-titre-ligne { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }",
    ".hsc-compteur { font-weight: 700; color: var(--poussiere); white-space: nowrap; }",
    ".hsc-code { font-size: 1.6rem; letter-spacing: .3em; font-variant-numeric: tabular-nums; }",
    ".hsc-r0 { --rc: #B9B1A3; } .hsc-r1 { --rc: #8DBBFF; } .hsc-r2 { --rc: #C99BFF; } .hsc-r3 { --rc: #FFD23F; }",
    ".hsc-pastille { display: inline-block; width: 10px; height: 10px; flex: none; background: var(--rc); transform: rotate(45deg); }",
    ".chip .hsc-pastille { margin-right: 2px; }",
    ".hsc-filtres .chip-btn { padding: 4px 12px; gap: 6px; font-size: .9rem; }",
    ".hsc-filtres .chip-btn.is-on { background: var(--papier); color: var(--encre); }",
    ".hsc-compte-f { font-weight: 600; opacity: .8; font-variant-numeric: tabular-nums; }",
    ".hsc-section { display: flex; flex-direction: column; gap: 10px; }",
    ".hsc-grille { display: grid; grid-template-columns: repeat(auto-fill, minmax(78px, 1fr)); gap: 12px 10px; }",
    ".hsc-vignette { display: grid; align-content: start; gap: 4px; padding: 0; border: 0; background: none; color: inherit; text-align: left; font: inherit; cursor: pointer; -webkit-tap-highlight-color: transparent; }",
    ".hsc-v-carte { position: relative; display: block; aspect-ratio: 5 / 7; border-radius: 6px; overflow: hidden; background: #26211C; box-shadow: 0 0 0 1px rgba(0, 0, 0, .6); }",
    ".hsc-v-carte svg { display: block; width: 100%; height: 100%; }",
    ".hsc-vignette:focus-visible { outline: 3px solid var(--jaune); outline-offset: 2px; }",
    ".hsc-vignette.is-actif .hsc-v-carte { box-shadow: 0 0 0 3px var(--jaune); }",
    ".hsc-v-nom { font-weight: 700; font-size: .8rem; line-height: 1.2; }",
    ".hsc-v-nom .hsc-pastille { width: 7px; height: 7px; margin: 0 2px 1px 1px; vertical-align: middle; }",
    ".hsc-v-badge { justify-self: start; padding: 1px 6px; background: var(--jaune); color: var(--encre); font-weight: 700; font-size: .7rem; border-radius: 2px; }",
    ".hsc-verrou { cursor: default; }",
    ".hsc-verrou .hsc-v-carte { display: grid; place-items: center; background: #1B1714; box-shadow: inset 0 0 0 1.5px rgba(242, 234, 219, .18); }",
    ".hsc-verrou .hsc-v-carte b { font: 400 1.7rem/1 var(--f-titre); color: rgba(242, 234, 219, .35); }",
    ".hsc-verrou .hsc-v-nom { color: var(--poussiere); font-weight: 600; }",
    ".hsc-v-r { margin: 0; display: flex; align-items: center; gap: 8px; font-weight: 700; color: var(--rc); }",
    ".hsc-centre { text-align: center; margin: -6px 0 0; }",
    ".hsc-grande { display: block; align-self: center; width: min(230px, 64vw); aspect-ratio: 5 / 7; padding: 0; border: 0; background: none; perspective: 900px; cursor: pointer; -webkit-tap-highlight-color: transparent; }",
    ".hsc-grande:focus-visible { outline: 3px solid var(--jaune); outline-offset: 6px; }",
    ".hsc-grande-in { position: relative; display: block; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform .6s cubic-bezier(.3, .75, .3, 1); }",
    ".hsc-grande.is-recto .hsc-grande-in { transform: rotateY(180deg); }",
    ".hsc-face { position: absolute; inset: 0; display: block; border-radius: 10px; overflow: hidden; backface-visibility: hidden; -webkit-backface-visibility: hidden; box-shadow: 0 10px 24px rgba(0, 0, 0, .5), 0 0 0 1px rgba(0, 0, 0, .6); }",
    ".hsc-face svg { display: block; width: 100%; height: 100%; }",
    ".hsc-face-recto { transform: rotateY(180deg); }",
    ".hsc-minis { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 6px; }",
    ".hsc-mini { padding: 0; border: 0; background: none; cursor: pointer; min-height: 44px; }",
    ".hsc-mini[aria-pressed=\"true\"] .hsc-v-carte { box-shadow: 0 0 0 2px var(--papier); }",
    ".hsc-fige, .hsc-fige * { animation: none !important; }",
    ".hsc-toasts { top: calc(64px + env(safe-area-inset-top, 0px)); }",
    ".hsc-toasts .toast { pointer-events: auto; display: flex; align-items: center; justify-content: space-between; gap: 10px; }",
    ".hsc-toasts .toast button { flex: none; min-height: 40px; padding: 4px 12px; border: 1.5px solid var(--encre); border-radius: var(--r-s, 2px); background: transparent; color: var(--encre); font: inherit; font-weight: 700; cursor: pointer; }",
    ".hsc-rejoindre { gap: 8px; }",
    ".hsc-rejoindre p { margin: 0; }",
    ".hsc-rejoindre .btn { align-self: flex-start; }",
    "@media (prefers-reduced-motion: reduce) { .hsc-grande-in { transition: none; } }",
  ].join("\n");
  document.head.appendChild(css);

  // --- au démarrage ---
  injecter();
  try { var msg = sessionStorage.getItem("hs:compte-msg"); if (msg) { sessionStorage.removeItem("hs:compte-msg"); setTimeout(function () { toast(msg); }, 600); } } catch (e) {}
  if (connecte()) {
    appliquerSkin();
    appel("GET", "/compte").then(function (r) { if (r.ok) { appliquerSkin(); viderAttente(); } rafraichir(); });
  }
  window.HS_COMPTE = { ouvrir: ouvrir };
})();

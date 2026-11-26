// Aperçu du deck Classique : le jeu complet, une main, la carte en grand, les animations des communes.
(function () {
  'use strict';
  var D = window.HSDeck;

  // ---------- les raretés : une seule architecture, des niveaux d'effets distincts ----------
  // Seule la commune est animée pour l'instant. Les autres raretés sont prévues : leurs effets s'ajouteront dans EFFETS
  // (une fonction par effet, qui reçoit la carte et ses réglages), sans toucher au reste.
  var RARETES = {
    commune: { nom: 'Commune', active: true, flottement: { amplitude: 3, duree: 4.6 }, inclinaison: 7, selection: { leve: 16, echelle: 1.05 }, retournement: 520, effets: [] },
    peu_commune: { nom: 'Peu commune', active: false, effets: ['reflet-leger', 'lumiere-douce'] },
    rare: { nom: 'Rare', active: false, effets: ['brillance', 'reflets-dynamiques'] },
    epique: { nom: 'Épique', active: false, effets: ['lumieres', 'particules-discretes', 'profondeur'] },
    legendaire: { nom: 'Légendaire', active: false, effets: ['revelation', 'particules', 'parallaxe', 'effet-propre'] }
  };
  var EFFETS = {};
  function appliquerRarete(el, nom) {
    var r = RARETES[nom] && RARETES[nom].active ? RARETES[nom] : RARETES.commune;
    el.setAttribute('data-rarete', RARETES[nom] ? nom : 'commune');
    el.style.setProperty('--flot-amp', r.flottement.amplitude + 'px');
    el.style.setProperty('--flot-duree', r.flottement.duree + 's');
    el.style.setProperty('--leve', r.selection.leve + 'px');
    el.style.setProperty('--echelle-choix', String(r.selection.echelle));
    el.style.setProperty('--duree-retour', r.retournement + 'ms');
    el._incl = r.inclinaison; el._duree = r.retournement;
    (r.effets || []).forEach(function (e) { if (EFFETS[e]) EFFETS[e](el, r); });
  }

  // ---------- moins d'animations : réglage de la page ou du téléphone ----------
  var racine = document.documentElement;
  var reduitSysteme = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function moinsAnim() { return racine.hasAttribute('data-moins-anim') || !!(reduitSysteme && reduitSysteme.matches); }
  try { if (localStorage.getItem('hs:anim') === 'reduit') racine.setAttribute('data-moins-anim', ''); } catch (e) {}

  // ---------- images des cartes (SVG fabriqués une fois, affichés en image) ----------
  var cache = {};
  function src(svg) { return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); }
  var versoSrc = src(D.verso({ autonome: true }));
  function rectoSrc(rang, e) { var k = rang + e; return cache[k] || (cache[k] = src(D.recto(rang, e, { autonome: true }))); }

  function fabriquer(c) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'carte';
    b.innerHTML = '<span class="flotte"><span class="incline"><span class="pivot"><span class="face recto"><img alt="" draggable="false"></span><span class="face verso"><img alt="" draggable="false"></span></span></span></span>';
    var imgs = b.querySelectorAll('img');
    imgs[0].src = rectoSrc(c.rang, c.e); imgs[1].src = versoSrc;
    b._carte = c; nommer(b);
    appliquerRarete(b, 'commune');
    inclinaison(b);
    return b;
  }
  function nommer(b) { b.setAttribute('aria-label', b.classList.contains('retournee') ? 'Carte retournée, ' + b._carte.nom : b._carte.nom); }

  // inclinaison qui suit la souris (pas au doigt, pour ne pas gêner le défilement)
  function inclinaison(b) {
    var raf = 0, px = 0, py = 0;
    b.addEventListener('pointermove', function (ev) {
      if (ev.pointerType === 'touch' || moinsAnim()) return;
      var r = b.getBoundingClientRect();
      px = (ev.clientX - r.left) / r.width - 0.5; py = (ev.clientY - r.top) / r.height - 0.5;
      b.classList.add('survol');
      if (!raf) raf = requestAnimationFrame(function () {
        raf = 0;
        b.style.setProperty('--rx', (-py * 2 * b._incl).toFixed(2) + 'deg');
        b.style.setProperty('--ry', (px * 2 * b._incl).toFixed(2) + 'deg');
      });
    });
    b.addEventListener('pointerleave', function () {
      b.classList.remove('survol'); b.style.setProperty('--rx', '0deg'); b.style.setProperty('--ry', '0deg');
    });
  }
  function retourner(b, etat) {
    var v = etat === undefined ? !b.classList.contains('retournee') : etat;
    if (v === b.classList.contains('retournee')) return;
    b.classList.toggle('retournee', v); nommer(b);
    if (!moinsAnim()) {
      b.classList.remove('en-retour'); void b.offsetWidth; b.classList.add('en-retour');
      clearTimeout(b._t); b._t = setTimeout(function () { b.classList.remove('en-retour'); }, b._duree + 60);
    }
  }

  // ---------- le jeu complet ----------
  var toutes = D.toutes();
  var jeu = document.getElementById('jeu');
  var cartesJeu = [];
  var SYMB = { S: '♠', H: '♥', D: '♦', C: '♣' }, NOM = { S: 'Pique', H: 'Cœur', D: 'Carreau', C: 'Trèfle' };
  D.ENSEIGNES_ORDRE.forEach(function (e) {
    var rangee = document.createElement('div'); rangee.className = 'rangee';
    rangee.innerHTML = '<div class="nom"><b style="color:' + (e === 'H' || e === 'D' ? '#F4B4A4' : 'var(--creme)') + '">' + SYMB[e] + '</b>' + NOM[e] + '</div><div class="cartes" role="list"></div>';
    var liste = rangee.querySelector('.cartes');
    toutes.filter(function (c) { return c.e === e; }).forEach(function (c) {
      var b = fabriquer(c); b.setAttribute('role', 'listitem');
      b.addEventListener('click', function () { ouvrir(toutes.indexOf(c)); });
      cartesJeu.push(b); liste.appendChild(b);
    });
    jeu.appendChild(rangee);
  });

  var btTout = document.getElementById('tout-retourner');
  btTout.addEventListener('click', function () {
    var dos = btTout.getAttribute('aria-pressed') !== 'true';
    btTout.setAttribute('aria-pressed', String(dos));
    btTout.textContent = dos ? 'Remettre les faces' : 'Tout retourner';
    cartesJeu.forEach(function (b, i) { setTimeout(function () { retourner(b, dos); }, moinsAnim() ? 0 : i * 14); });
  });

  // ---------- la main du joueur ----------
  var eventail = document.getElementById('eventail');
  var largeurMain = 64;
  function tirer(nb) {
    var paquet = toutes.slice(), out = [];
    for (var i = 0; i < nb; i++) out.push(paquet.splice(Math.floor(Math.random() * paquet.length), 1)[0]);
    var ordre = D.RANGS;
    out.sort(function (a, b) { return a.e === b.e ? ordre.indexOf(a.rang) - ordre.indexOf(b.rang) : D.ENSEIGNES_ORDRE.indexOf(a.e) - D.ENSEIGNES_ORDRE.indexOf(b.e); });
    return out;
  }
  var main = [];
  function poserMain(cartes) {
    eventail.innerHTML = ''; main = [];
    var nb = cartes.length;
    cartes.forEach(function (c, i) {
      var b = fabriquer(c); var k = i - (nb - 1) / 2;
      b.style.setProperty('--a', (k * 6).toFixed(1) + 'deg');
      b.style.setProperty('--dx', (k * largeurMain * 0.46).toFixed(1) + 'px');
      b.style.setProperty('--retard', (i * 0.06).toFixed(2) + 's');
      b.style.setProperty('--flot-retard', (-i * 0.7).toFixed(1) + 's');
      b.style.zIndex = String(i + 1);
      b.classList.add('flottante');
      if (!moinsAnim()) b.classList.add('arrive');
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function () { var v = !b.classList.contains('choisie'); b.classList.toggle('choisie', v); b.setAttribute('aria-pressed', String(v)); });
      b.addEventListener('animationend', function (ev) { if (ev.animationName === 'donne') b.classList.remove('arrive'); });
      main.push(b); eventail.appendChild(b);
    });
  }
  document.getElementById('nouvelle-main').addEventListener('click', function () { poserMain(tirer(7)); });
  document.getElementById('retourner-main').addEventListener('click', function () {
    var dos = !(main[0] && main[0].classList.contains('retournee'));
    main.forEach(function (b, i) { setTimeout(function () { retourner(b, dos); }, moinsAnim() ? 0 : i * 60); });
  });
  Array.prototype.forEach.call(document.querySelectorAll('.taille button'), function (bt) {
    bt.addEventListener('click', function () {
      largeurMain = Number(bt.getAttribute('data-l'));
      Array.prototype.forEach.call(document.querySelectorAll('.taille button'), function (x) { x.setAttribute('aria-pressed', String(x === bt)); });
      eventail.style.setProperty('--l', largeurMain + 'px');
      main.forEach(function (b, i) { var k = i - (main.length - 1) / 2; b.style.setProperty('--dx', (k * largeurMain * 0.46).toFixed(1) + 'px'); });
    });
  });
  // une main de départ qui montre des figures et des cartes à chiffres
  poserMain([['A', 'S'], ['10', 'H'], ['V', 'H'], ['D', 'D'], ['R', 'C'], ['7', 'C'], ['3', 'D']].map(function (x) { return toutes.filter(function (c) { return c.rang === x[0] && c.e === x[1]; })[0]; }));

  // ---------- la carte en grand ----------
  var vue = document.getElementById('vue'), place = document.getElementById('vue-carte'), titre = document.getElementById('vue-titre');
  var courant = 0, carteVue = null, avantVue = null;
  function montrer(i) {
    courant = (i + toutes.length) % toutes.length;
    var c = toutes[courant];
    carteVue = fabriquer(c); carteVue.classList.add('flottante');
    carteVue.addEventListener('click', function () { retourner(carteVue); });
    place.innerHTML = ''; place.appendChild(carteVue);
    titre.innerHTML = c.nom + '<small>Commune · ' + (courant + 1) + ' sur 52 · touche la carte pour la retourner</small>';
  }
  function ouvrir(i) { avantVue = document.activeElement; montrer(i); vue.hidden = false; document.getElementById('vue-fermer').focus(); }
  function fermer() { vue.hidden = true; place.innerHTML = ''; if (avantVue && avantVue.focus) avantVue.focus(); }
  document.getElementById('vue-fermer').addEventListener('click', fermer);
  document.getElementById('vue-prec').addEventListener('click', function () { montrer(courant - 1); });
  document.getElementById('vue-suiv').addEventListener('click', function () { montrer(courant + 1); });
  document.getElementById('vue-retourner').addEventListener('click', function () { if (carteVue) retourner(carteVue); });
  vue.addEventListener('click', function (ev) { if (ev.target === vue) fermer(); });
  document.addEventListener('keydown', function (ev) {
    if (vue.hidden) return;
    if (ev.key === 'Escape') fermer();
    else if (ev.key === 'ArrowLeft') montrer(courant - 1);
    else if (ev.key === 'ArrowRight') montrer(courant + 1);
  });

  // ---------- réglage « Moins d'animations » ----------
  var btAnim = document.getElementById('moins-anim');
  function majBouton() { var r = racine.hasAttribute('data-moins-anim'); btAnim.setAttribute('aria-pressed', String(r)); btAnim.textContent = r ? 'Remettre les animations' : 'Moins d’animations'; }
  btAnim.addEventListener('click', function () {
    var r = !racine.hasAttribute('data-moins-anim');
    if (r) racine.setAttribute('data-moins-anim', ''); else racine.removeAttribute('data-moins-anim');
    try { localStorage.setItem('hs:anim', r ? 'reduit' : 'normal'); } catch (e) {}
    majBouton();
  });
  majBouton();

  // ---------- les raretés (affichage) ----------
  var liste = document.getElementById('raretes');
  Object.keys(RARETES).forEach(function (k) {
    var r = RARETES[k], s = document.createElement('span');
    s.className = 'rarete' + (r.active ? ' active' : '');
    s.textContent = r.nom + (r.active ? ' : animée' : ' : prévue');
    liste.appendChild(s);
  });
  window.HSApercu = { RARETES: RARETES, EFFETS: EFFETS, appliquerRarete: appliquerRarete };
})();

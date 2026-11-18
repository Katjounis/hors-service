// Hors Service : nouveaux skins des avatars (lot 1 : coiffures, détails du visage, tenues, bijoux).
// Chargé dans le <head> après genre.js, AVANT le script de l'app.
//
// L'app garde son dessin d'origine. Pour un choix qu'elle ne connaît pas, elle appelle window.HS_SKIN(quoi, numéro,
// options, outils) et pose ce que cette fonction rend. « outils » contient ses propres fonctions de dessin au feutre :
//   n (fabrique), R (forme pleine cernée), O (trait), Ae (point), we (couleur plus claire ou plus foncée).
// Repères du dessin (64 x 64) : visage de x 16,7 à 47,4 et de y 13,6 à 48,4 ; yeux en (25,6 ; 30,6) et (38,4 ; 30,6) ;
// bouche vers y 42 ; oreilles en x 13 à 18 et 46 à 51 ; cou de y 43 à 55 ; épaules de (22,4 ; 51) à (5 ; 66).
// Si ce fichier manque, les anciens avatars s'affichent comme avant et les nouveaux choix ne dessinent rien.
(function () {
  "use strict";

  var ENCRE = "#22201C", OR = "#E2B93B", BLANC = "#FBF8F0", ROUGE = "#D9412B";

  function f(v) { return (Math.round(v * 10) / 10).toString(); }

  // Un rond en quatre courbes (pas d'arc : le tremblé du feutre déplace chaque nombre du tracé)
  function rond(x, y, r, ry) {
    var b = ry || r, k = r * 0.552, q = b * 0.552;
    return "M" + f(x - r) + " " + f(y) + " C" + f(x - r) + " " + f(y - q) + " " + f(x - k) + " " + f(y - b) + " " + f(x) + " " + f(y - b) +
      " C" + f(x + k) + " " + f(y - b) + " " + f(x + r) + " " + f(y - q) + " " + f(x + r) + " " + f(y) +
      " C" + f(x + r) + " " + f(y + q) + " " + f(x + k) + " " + f(y + b) + " " + f(x) + " " + f(y + b) +
      " C" + f(x - k) + " " + f(y + b) + " " + f(x - r) + " " + f(y + q) + " " + f(x - r) + " " + f(y) + " Z";
  }
  // Le même tracé, vu dans un miroir (pour le côté droit)
  function miroir(d) {
    return d.replace(/(-?\d*\.?\d+)[ ,]+(-?\d*\.?\d+)/g, function (m, x, y) { return f(64 - parseFloat(x)) + " " + y; });
  }
  function losange(x, y, r) { return "M" + f(x) + " " + f(y - r * 1.3) + " L" + f(x + r) + " " + f(y) + " L" + f(x) + " " + f(y + r * 1.3) + " L" + f(x - r) + " " + f(y) + " Z"; }
  // Une tresse : des maillons qui se chevauchent, puis une petite mèche au bout
  function tresse(x, y0, y1, nb, r) {
    var pas = (y1 - y0) / nb, d = "";
    for (var i = 0; i < nb; i++) d += rond(x + (i % 2 ? 0.7 : -0.7), y0 + pas * (i + 0.5), r, pas * 0.68) + " ";
    return d + "M" + f(x - r * 0.7) + " " + f(y1 - 0.4) + " L" + f(x) + " " + f(y1 + 3.2) + " L" + f(x + r * 0.7) + " " + f(y1 - 0.4) + " Z";
  }
  function points(liste, h, r, c, op) {
    return liste.map(function (p, i) { return h.n("ellipse", { cx: p[0], cy: p[1], rx: r * 0.9, ry: r * 1.1, fill: c, opacity: op }, i); });
  }
  // Un trait de couleur avec son cerne foncé
  function cerne(d, h, w, c) { return [h.O({ d: d, w: w + 1.3, j: 0.12 }), h.O({ d: d, w: w, color: c, j: 0.12 })]; }

  // ───── Coiffures (numéros 8 à 21). c : couleur des cheveux ; chapeau : une coiffe cache le dessus du crâne.
  var CALOTTE = "M17.2 26.4 C16.8 17.4 23.2 12.4 32.2 12.4 C41.2 12.4 47.6 17.4 47 26.4 C44.4 21.6 39 19.4 32.2 19.4 C25.4 19.4 19.8 21.6 17.2 26.4 Z";
  var RAIE = "M17 30 C16.6 18.6 23.2 12.6 32 12.6 C40.8 12.6 47.4 18.6 47 30 C45.6 23.8 42.2 20.8 38 20.4 C35.6 22.6 33.4 23.4 32 23.6 C30.6 23.4 28.4 22.6 26 20.4 C21.8 20.8 18.4 23.8 17 30 Z";
  var COURT = "M16.9 27.4 C16.2 17.6 22.8 12 32.4 12 C42 12 48 17.6 47.3 27.2 C45.6 22.6 42.4 20.4 38.6 19.8 C35 21.8 28.6 22 24.8 20 C21.2 21 18.6 23.4 16.9 27.4 Z";
  var MECHE = "M17 29.6 C16.4 18.4 23 12.2 32.2 12.2 C41.2 12.2 47.6 18.4 47 29.6 C45.8 24.6 43.2 21.6 39.6 20.4 C34.4 24.6 26.6 25.6 20.6 22.6 C18.8 24.4 17.6 26.8 17 29.6 Z";
  var COUETTE = "M17.4 21.6 C11.4 19.4 6.4 23.6 7.2 29.8 C7.8 34.6 10.8 38.4 10 43.2 C13.8 42.4 16.2 38.8 16.2 34.2 C16.2 30 15.6 25.8 17.4 21.6 Z";
  // Une mèche de dreadlocks : une bande étroite au bout arrondi
  function dread(x, y0, y1, w) {
    return "M" + f(x - w) + " " + f(y0) + " L" + f(x - w - 0.3) + " " + f(y1 - w) + " C" + f(x - w - 0.3) + " " + f(y1 + 0.8) + " " + f(x + w + 0.3) + " " + f(y1 + 0.8) + " " + f(x + w + 0.3) + " " + f(y1 - w) + " L" + f(x + w) + " " + f(y0) + " Z";
  }
  var DREADS = [[11.6, 24.6, 48.6], [14.8, 23.6, 52], [18, 24.6, 46.6]];

  function cheveux(k, o, h) {
    var c = o.c, fonce = h.we(c, 0.68), R = h.R, O = h.O, n = h.n, chapeau = o.hat, g = [];
    var meches = function (d) { return O({ d: d, w: 0.9, color: fonce }); };
    switch (k) {
      case 8: // Queue-de-cheval
        g.push(R({ d: CALOTTE, fill: c }), meches("M22 20.6 C25 17.4 29 15.6 33 15.4 M30 19 C33.6 16.8 37.6 16.4 41 17.6 M38.6 19.8 C41.4 19.4 43.6 20.4 45.2 22.4"));
        break;
      case 9: // Couettes
        g.push(R({ d: COUETTE, fill: c }), R({ d: miroir(COUETTE), fill: c }), R({ d: RAIE, fill: c }));
        g.push(R({ d: "M15.4 20.6 L18.6 21.4 L18.2 24.2 L15 23.4 Z", fill: ROUGE, w: 1.2, sketch: false, j: 0.1 }), R({ d: miroir("M15.4 20.6 L18.6 21.4 L18.2 24.2 L15 23.4 Z"), fill: ROUGE, w: 1.2, sketch: false, j: 0.1 }));
        g.push(meches("M10.2 26 C9.8 30 11.6 33.6 12.4 37.6 M53.8 26 C54.2 30 52.4 33.6 51.6 37.6 M30.6 22 C28.6 18.6 25.8 15.6 22.4 14.8 M33.4 22 C35.6 18.6 38.4 15.6 41.8 14.8"));
        break;
      case 10: // Tresses
        g.push(R({ d: RAIE, fill: c }), R({ d: tresse(13.2, 30, 52, 5, 2.9), fill: c, w: 1.5, j: 0.14 }), R({ d: tresse(50.8, 30, 52, 5, 2.9), fill: c, w: 1.5, j: 0.14 }));
        g.push(meches("M30.6 22 C28.6 18.6 25.8 15.6 22.4 14.8 M33.4 22 C35.6 18.6 38.4 15.6 41.8 14.8"));
        break;
      case 11: // Tresse sur le côté
        g.push(R({ d: MECHE, fill: c }), R({ d: tresse(49.6, 29, 55, 6, 3.1), fill: c, w: 1.5, j: 0.14 }));
        g.push(meches("M21.6 21.4 C26.6 20.2 31.4 17.4 34.6 13.8 M28.6 22.2 C33.4 20.8 38 17.8 40.6 14.8"));
        break;
      case 12: // Frange
        g.push(R({ d: "M16.6 31 C15.8 18.2 22.8 12.2 32 12.2 C41.2 12.2 48.2 18.2 47.4 31 C47 28.4 46.4 26.8 45.4 25.6 L42 26.6 L38.6 25.4 L35.2 26.6 L32 25.4 L28.8 26.6 L25.4 25.4 L22 26.6 L18.6 25.6 C17.6 26.8 17 28.4 16.6 31 Z", fill: c }));
        g.push(meches("M24 24 C24.4 19.6 26.6 15.8 30 14.2 M32 24 C32.2 19.8 32.6 16.4 33.4 14 M40 24 C39.6 19.6 37.8 16 35.2 14.4"));
        break;
      case 13: // Long ondulé
        g.push(R({ d: MECHE, fill: c }), meches("M21.6 21.4 C26.6 20.2 31.4 17.4 34.6 13.8 M28.6 22.2 C33.4 20.8 38 17.8 40.6 14.8 M12.6 42 C14.4 44 13 46.6 14.2 49 M51.4 42 C49.6 44 51 46.6 49.8 49"));
        break;
      case 14: // Afro
        g.push(R({ d: COURT, fill: c, line: false }), meches("M22.4 18.6 C23.6 17 25.4 17.4 25.4 19 M29 15.6 C30.4 14.2 32.2 14.8 32 16.4 M36.6 16.2 C38 14.8 39.8 15.6 39.4 17.2 M41.6 20 C43 19 44.4 20 44 21.4"));
        break;
      case 15: // Macarons
        if (!chapeau) g.push(R({ d: rond(19.6, 11.4, 5.6), fill: c }), R({ d: rond(44.4, 11.4, 5.6), fill: c }), meches("M16.4 11 C17.4 8.6 19.6 7.8 21.6 8.6 M41.2 11 C42.2 8.6 44.4 7.8 46.4 8.6"));
        g.push(R({ d: RAIE, fill: c }), meches("M30.6 22 C28.6 18.6 25.8 15.6 22.4 14.8 M33.4 22 C35.6 18.6 38.4 15.6 41.8 14.8"));
        break;
      case 16: // Dreadlocks
        DREADS.forEach(function (m) {
          var d = dread(m[0], m[1], m[2], 1.45), anneaux = "";
          for (var y = m[1] + 5; y < m[2] - 2; y += 5.2) anneaux += "M" + f(m[0] - 1.3) + " " + f(y) + " L" + f(m[0] + 1.3) + " " + f(y + 0.5) + " ";
          g.push(R({ d: d, fill: c, w: 1.4, j: 0.16 }), R({ d: miroir(d), fill: c, w: 1.4, j: 0.16 }), O({ d: anneaux + miroir(anneaux), w: 0.8, color: fonce, j: 0.1 }));
        });
        g.push(R({ d: COURT, fill: c }), meches("M21.4 22 C22 17.6 24.6 14.6 28 13.4 M27 20.6 C27.6 16.6 29.6 14 32 12.8 M33 20.8 C33 16.8 33.6 14.2 34.6 12.8 M38.4 20.4 C38 16.8 37.2 14.4 36.2 13 M43.4 22.6 C42.4 18.4 40.4 15.2 38 13.6"));
        break;
      case 17: // Nattes collées
        g.push(R({ d: COURT, fill: c }), O({ d: "M20.6 22.4 C21.4 17.8 24 14.6 27.4 13.2 M25 20.8 C25.8 16.8 28 14 30.6 12.6 M29.6 21 C30 17 31.2 14.2 32.8 12.4 M34.4 21 C34.2 17 34.4 14.2 35 12.4 M39 20.4 C38.4 16.6 37.6 14.4 37 12.8 M43.6 22.6 C42.4 18.4 40.6 15.2 39 13.6", w: 1.2, color: fonce }));
        break;
      case 18: // Dégradé
        g.push(n("path", { d: "M17.2 27.6 C17.2 22.6 18.6 19.4 20.8 17.6 L22.6 21.2 C20.6 22.8 18.8 25 17.2 27.6 Z M46.8 27.6 C46.8 22.6 45.4 19.4 43.2 17.6 L41.4 21.2 C43.4 22.8 45.2 25 46.8 27.6 Z", fill: c, opacity: ".4", transform: "translate(.9 .7)" }));
        g.push(R({ d: "M20.4 20.8 C21.8 14.6 26.4 11.8 32.2 11.8 C38 11.8 42.6 14.6 44 20.8 C40.2 18.8 36.2 18.2 32.2 18.2 C28.2 18.2 24.2 18.8 20.4 20.8 Z", fill: c }), meches("M25.4 17.4 C27.4 15 30 14 32.6 14 M34 16.6 C36.6 15.6 39.2 16.2 41 17.8"));
        break;
      case 19: // Mulet
        g.push(R({ d: COURT, fill: c }), meches("M24.8 20 C26.6 16.4 30 14.4 34 14.2 M33.4 20.8 C35.6 17.2 39 15.6 42.6 16.4"));
        break;
      case 20: // Coupe au bol
        g.push(R({ d: "M16.4 26.6 C15.6 16.6 22.6 11.2 32 11.2 C41.4 11.2 48.4 16.6 47.6 26.6 C42.8 25 37.6 24.4 32 24.4 C26.4 24.4 21.2 25 16.4 26.6 Z", fill: c }));
        g.push(meches("M24.6 23.4 C24.8 19.4 26.6 15.8 29.6 14 M32 23 C32.2 19 32.6 16 33.4 13.6 M39.6 23.4 C39.2 19.4 37.6 16 35.2 14.2"));
        break;
      case 21: // Crâne dégarni
        g.push(R({ d: "M16.9 28.4 C16.4 23 17.6 19.4 20 17.2 C21 20 21 23.4 20 26.2 C18.8 26.6 17.8 27.4 16.9 28.4 Z", fill: c, w: 1.6 }), R({ d: miroir("M16.9 28.4 C16.4 23 17.6 19.4 20 17.2 C21 20 21 23.4 20 26.2 C18.8 26.6 17.8 27.4 16.9 28.4 Z"), fill: c, w: 1.6 }));
        if (!chapeau) g.push(O({ d: "M25.6 16 C28.6 14.2 34 14 38 15.6 M27 18.4 C29.8 17.2 33.6 17.2 36.6 18.2", w: 1, color: fonce }));
        break;
      default:
        return null;
    }
    return n("g", { children: g });
  }

  // La partie des cheveux qui passe derrière la tête
  function cheveuxDos(k, o, h) {
    var c = o.c, R = h.R, n = h.n, g = [];
    switch (k) {
      case 8: // Queue-de-cheval : la queue, sur le côté
        g.push(R({ d: "M43.6 15.6 C51.6 12.6 57 18.6 56.2 26.6 C55.6 32.6 52.6 37.6 53.8 43.4 C50.4 42.8 48.2 39.6 48 34.6 C47.8 28.6 49.6 23.4 45.6 19.6 Z", fill: c }));
        g.push(R({ d: "M43.4 14.6 L47 16 L45.8 19.6 L42.2 18.2 Z", fill: ROUGE, w: 1.2, sketch: false, j: 0.1 }));
        break;
      case 12: // Frange : cheveux aux épaules
        g.push(R({ d: "M16 30 C14.6 16.6 22.4 10.8 32 10.8 C41.6 10.8 49.4 16.6 48 30 C47.8 38.4 49.6 45.4 52.2 51.4 C47.8 53.4 43.4 52.8 40.6 50.6 L23.4 50.6 C20.6 52.8 16.2 53.4 11.8 51.4 C14.4 45.4 16.2 38.4 16 30 Z", fill: c }));
        break;
      case 13: // Long ondulé
        g.push(R({ d: "M15.6 30 C14 17 22 10.4 32 10.4 C42 10.4 50 17 48.4 30 C48.6 34 52.4 36.6 51.4 41 C50.6 44.6 54 47.6 53 52.4 C49.4 55.4 43.8 54.2 41 51 L23 51 C20.2 54.2 14.6 55.4 11 52.4 C10 47.6 13.4 44.6 12.6 41 C11.6 36.6 15.4 34 15.6 30 Z", fill: c }));
        break;
      case 14: // Afro : la boule
        g.push(R({ d: "M14.4 31 C8.6 27.4 8.4 18.4 14.6 14.2 C15.6 7.4 23.6 3 32 3.4 C40.4 3 48.4 7.4 49.4 14.2 C55.6 18.4 55.4 27.4 49.6 31 C50.6 35 48.6 38 46 38.6 L18 38.6 C15.4 38 13.4 35 14.4 31 Z", fill: c }));
        break;
      case 16: // Dreadlocks : celles de derrière
        g.push(R({ d: "M18 30 C16.4 38 16.4 46 17.6 53 L23.4 51.6 L40.6 51.6 L46.4 53 C47.6 46 47.6 38 46 30 Z", fill: h.we(c, 0.8), w: 1.5 }));
        break;
      case 19: // Mulet : la nuque longue
        g.push(R({ d: "M19.6 32 C17.6 39 16.6 46 14.6 52.4 C18.2 54.6 22.2 53.6 24.6 51 L39.4 51 C41.8 53.6 45.8 54.6 49.4 52.4 C47.4 46 46.4 39 44.4 32 Z", fill: c }));
        break;
      default:
        return null;
    }
    return n("g", { children: g });
  }

  // ───── Détails du visage (1 à 12). dessous : posé avant la bouche et les yeux ; sinon posé par-dessus.
  function detail(k, o, h, dessous) {
    var R = h.R, O = h.O, n = h.n, g = [];
    if (dessous) {
      if (k === 1) g.push(n("path", { d: "M26.8 41.8 C28.4 39.4 30.6 39.6 32 40.8 C33.4 39.6 35.6 39.4 37.2 41.8 C35.4 45 28.6 45 26.8 41.8 Z", fill: ROUGE, opacity: ".92" })); // Rouge à lèvres
      if (k === 5) g.push(n("ellipse", { cx: 21.4, cy: 37, rx: 3.6, ry: 2.4, fill: "#EE7F9C", opacity: ".6" }), n("ellipse", { cx: 42.6, cy: 37, rx: 3.6, ry: 2.4, fill: "#EE7F9C", opacity: ".6" })); // Joues roses
      if (k === 11) g.push(n("path", { d: "M22.6 33.6 C24.4 35.6 27.2 35.6 28.8 33.8 M35.2 33.8 C36.8 35.6 39.6 35.6 41.4 33.6", fill: "none", stroke: "#6E4F86", "stroke-width": "1.7", "stroke-linecap": "round", opacity: ".55" })); // Cernes
      return g.length ? n("g", { children: g }) : null;
    }
    var poil = o.hc && o.hc[0] === "#" ? o.hc : "#5B4A7A";
    switch (k) {
      case 2: // Cils et eye-liner
        g.push(O({ d: "M24 29.6 L22.2 28.6 M24.6 28.8 L23.4 27.2 M25.7 28.5 L25.4 26.8 M40 29.6 L41.8 28.6 M39.4 28.8 L40.6 27.2 M38.3 28.5 L38.6 26.8", w: 1.15, j: 0.08 }));
        break;
      case 3: // Paillettes sur les joues
        [[19.8, 35.2, "#F2C230"], [22.8, 37.6, "#EFA0B4"], [20.2, 39.4, "#F2C230"], [44.2, 35.2, "#F2C230"], [41.2, 37.6, "#EFA0B4"], [43.8, 39.4, "#F2C230"]].forEach(function (p) {
          g.push(R({ d: losange(p[0], p[1], 1), fill: p[2], w: 0.8, sketch: false, j: 0.06 }));
        });
        break;
      case 4: // Taches de rousseur
        g = points([[20.8, 35.6], [23.2, 36.6], [20.6, 38], [24.6, 34.8], [41, 36.6], [43.2, 35.6], [43.4, 38], [39.4, 34.8], [30.4, 35.4], [35, 35.4]], h, 0.55, "#9A5B36", ".75");
        break;
      case 6: // Barbe courte
        g.push(R({ d: "M17.6 33 C18.2 40 21 45 25.4 47.4 C29.6 49.6 34.4 49.6 38.6 47.4 C43 45 45.8 40 46.4 33 C44.8 38.4 42.4 42.2 39.4 44 C36.6 45.8 27.4 45.8 24.6 44 C21.6 42.2 19.2 38.4 17.6 33 Z", fill: poil, w: 1.7 }));
        break;
      case 7: // Barbe longue
        g.push(R({ d: "M17.6 33 C17.8 42.6 20.4 50 25 54.4 C28.6 57.8 35.4 57.8 39 54.4 C43.6 50 46.2 42.6 46.4 33 C44.8 38.4 42.4 42.2 39.4 44 C36.6 45.8 27.4 45.8 24.6 44 C21.6 42.2 19.2 38.4 17.6 33 Z", fill: poil, w: 1.9 }));
        g.push(O({ d: "M27.4 49 C27.8 51.4 28.8 53.4 30.2 54.6 M32 48.6 L32 55.4 M36.6 49 C36.2 51.4 35.2 53.4 33.8 54.6", w: 0.9, color: h.we(poil, 0.68) }));
        break;
      case 8: // Bouc
        g.push(R({ d: "M28.4 44.8 C30.6 45.6 33.4 45.6 35.6 44.8 C36.2 48 34.8 51 32 51.8 C29.2 51 27.8 48 28.4 44.8 Z", fill: poil, w: 1.6 }));
        break;
      case 9: // Piercing au nez
        g = cerne(rond(34.6, 36.4, 1.15), h, 0.9, OR);
        break;
      case 10: // Grain de beauté
        g.push(n("ellipse", { cx: 39, cy: 39.8, rx: 0.85, ry: 0.95, fill: ENCRE }));
        break;
      case 12: // Pansement sur le nez
        g.push(R({ d: "M28.4 32.6 L35.8 31.6 L36.2 34.6 L28.8 35.6 Z", fill: "#F6E9D2", w: 1.1, sketch: false, j: 0.1 }), points([[31.4, 33.6], [33.2, 33.4]], h, 0.42, "#B98F63", "1"));
        break;
      default:
        return null;
    }
    return n("g", { children: g });
  }

  // ───── Tenues (1 à 10). c : couleur choisie ; sk : peau. Le tee-shirt d'origine est déjà dessiné dessous.
  var CORPS = "M5 66 C5.8 57.4 12.5 52.6 22.4 51 C25.4 54.4 28.8 55.4 32 55.4 C35.2 55.4 38.8 54.4 41.7 51 C51.5 52.6 58.2 57.4 59 66 Z";
  var EPAULE = "M5 66 C5.8 57.4 12.5 52.6 22.4 51 C22.8 52 23.6 52.8 24.4 53.4 C20.8 55.4 19.4 59.6 19.6 66 Z";
  var PAN = "M5 66 C5.8 57.4 12.5 52.6 22.4 51 C24 53 26 54.2 27.8 54.8 L24.8 60.4 L28.6 66 Z";

  function tenue(k, o, h) {
    var c = o.c, sk = o.sk, R = h.R, O = h.O, n = h.n, g = [], clair = h.we(c, 1.16), fonce = h.we(c, 0.8);
    switch (k) {
      case 1: // Débardeur
        g.push(R({ d: EPAULE, fill: sk, w: 1.7 }), R({ d: miroir(EPAULE), fill: sk, w: 1.7 }));
        g.push(R({ d: "M24.4 53.4 C28 55.6 36 55.6 39.6 53.4 C37.6 59.4 26.4 59.4 24.4 53.4 Z", fill: sk, w: 1.5 }));
        break;
      case 2: // Chemise
      case 3: // Chemise hawaïenne
        if (k === 3) {
          [[15.2, 57.8], [21.4, 60.8], [48.8, 57.8], [42.6, 60.8], [11.4, 61.6], [52.6, 61.6]].forEach(function (p, i) {
            g.push(R({ d: rond(p[0], p[1], 1.7), fill: i % 2 ? "#FBF8F0" : "#F2C230", w: 0.8, sketch: false, j: 0.1 }));
          });
          g.push(O({ d: "M17.4 60.6 C18.4 59.4 19.6 59.6 19.8 60.8 M46.6 60.6 C45.6 59.4 44.4 59.6 44.2 60.8 M24.4 57.4 C25.2 56.4 26.2 56.6 26.4 57.6 M39.6 57.4 C38.8 56.4 37.8 56.6 37.6 57.6", w: 1.1, color: "#2F7A4C" }));
        }
        g.push(O({ d: "M32 56.4 L32 66", w: 1.1 }), points([[32, 59.6], [32, 63.4]], h, 0.6, ENCRE, "1"));
        g.push(R({ d: "M22.4 51 L28.4 58.6 L31.6 55.4 C28.4 55.2 25 54 22.4 51 Z", fill: clair, w: 1.5 }), R({ d: miroir("M22.4 51 L28.4 58.6 L31.6 55.4 C28.4 55.2 25 54 22.4 51 Z"), fill: clair, w: 1.5 }));
        break;
      case 4: // Sweat à capuche
        g.push(R({ d: "M18.8 52 C20 47 23.4 45 27.4 44.8 L27.4 53.8 C24.2 54 21.2 53.4 18.8 52 Z", fill: fonce, w: 1.7 }), R({ d: miroir("M18.8 52 C20 47 23.4 45 27.4 44.8 L27.4 53.8 C24.2 54 21.2 53.4 18.8 52 Z"), fill: fonce, w: 1.7 }));
        g.push(O({ d: "M24.2 53.6 C26.8 57.4 30.4 58.4 32 58.4 C33.6 58.4 37.2 57.4 39.8 53.6", w: 1.5 }));
        g.push(cerne("M29.6 57.8 L29 63", h, 1, BLANC), cerne("M34.4 57.8 L35 63", h, 1, BLANC));
        break;
      case 5: // Robe
        g.push(R({ d: CORPS, fill: sk }));
        g.push(R({ d: "M15.6 66 C15.8 60.6 18.6 57.4 23.4 56.4 C26.4 59.6 30 58.8 32 61 C34 58.8 37.6 59.6 40.6 56.4 C45.4 57.4 48.2 60.6 48.4 66 Z", fill: c }));
        g.push(cerne("M23.6 56.6 L22.8 51.6", h, 1.5, c), cerne("M40.4 56.6 L41.2 51.6", h, 1.5, c));
        break;
      case 6: // Robe de soirée à paillettes
        g.push(R({ d: CORPS, fill: sk }));
        g.push(R({ d: "M13.6 66 C14.2 60.2 17.6 56.4 22.6 55 L32 63 L41.4 55 C46.4 56.4 49.8 60.2 50.4 66 Z", fill: c }));
        [[19.6, 61.6], [25.4, 63.8], [38.6, 63.8], [44.4, 61.6], [22.4, 58.2], [41.6, 58.2]].forEach(function (p) { g.push(n("path", { d: losange(p[0], p[1], 0.85), fill: BLANC })); });
        break;
      case 7: // Haut à bretelles
        g.push(R({ d: CORPS, fill: sk }));
        g.push(R({ d: "M12.4 66 C13 61.2 16.4 58 21.4 57.2 L42.6 57.2 C47.6 58 51 61.2 51.6 66 Z", fill: c }));
        g.push(cerne("M23.4 57.2 L22.9 51.6", h, 0.9, c), cerne("M40.6 57.2 L41.1 51.6", h, 0.9, c));
        break;
      case 8: // Salopette
        g.push(cerne("M26.2 58.6 L22.8 51.8", h, 2, "#4F6FA8"), cerne("M37.8 58.6 L41.2 51.8", h, 2, "#4F6FA8"));
        g.push(R({ d: "M24.6 58 L39.4 58 L40.6 66 L23.4 66 Z", fill: "#4F6FA8", w: 1.7 }), points([[26.4, 59.6], [37.6, 59.6]], h, 0.8, OR, "1"));
        g.push(O({ d: "M28.6 62.4 L35.4 62.4 L35 66 M28.6 62.4 L29 66", w: 0.9, color: "#2F4470" }));
        break;
      case 9: // Veste en cuir
        g.push(R({ d: PAN, fill: "#2B2622" }), R({ d: miroir(PAN), fill: "#2B2622" }));
        g.push(O({ d: "M24.6 60.6 L21.4 57 M39.4 60.6 L42.6 57 M10.4 63 C12 60.4 14.4 58.6 17 57.6 M53.6 63 C52 60.4 49.6 58.6 47 57.6", w: 1, color: "#8A8178" }));
        break;
      case 10: // Costume
        g.push(R({ d: CORPS, fill: "#2F3A52" }));
        g.push(R({ d: "M24.2 53 L32 65 L39.8 53 C36.6 55.4 27.4 55.4 24.2 53 Z", fill: BLANC, w: 1.4 }));
        g.push(R({ d: "M30.6 55.6 L33.4 55.6 L34.2 61.6 L32 65.4 L29.8 61.6 Z", fill: c, w: 1.2, sketch: false, j: 0.1 }));
        g.push(O({ d: "M24.2 53 L27 61 L30.4 64.6 M39.8 53 L37 61 L33.6 64.6", w: 1.3 }));
        break;
      default:
        return null;
    }
    return n("g", { children: g });
  }

  // ───── Bijoux (1 à 6)
  function bijou(k, o, h) {
    var R = h.R, n = h.n, g = [];
    var perles = function (liste, r, couleurs) {
      liste.forEach(function (p, i) { g.push(R({ d: rond(p[0], p[1], r), fill: couleurs[i % couleurs.length], w: 0.8, sketch: false, j: 0.08 })); });
    };
    switch (k) {
      case 1: // Créoles
        g = g.concat(cerne(rond(15, 38, 2.5), h, 1.1, OR), cerne(rond(49, 38, 2.5), h, 1.1, OR));
        break;
      case 2: // Boucles d'oreilles pendantes
        g = g.concat(cerne("M15.2 35.6 L15.2 38.6", h, 0.8, OR), cerne("M48.8 35.6 L48.8 38.6", h, 0.8, OR));
        g.push(R({ d: "M15.2 38.4 C13.6 40.6 14 42.6 15.2 42.6 C16.4 42.6 16.8 40.6 15.2 38.4 Z", fill: "#3FB7C4", w: 0.9, sketch: false, j: 0.08 }), R({ d: miroir("M15.2 38.4 C13.6 40.6 14 42.6 15.2 42.6 C16.4 42.6 16.8 40.6 15.2 38.4 Z"), fill: "#3FB7C4", w: 0.9, sketch: false, j: 0.08 }));
        break;
      case 3: // Collier de perles
        perles([[24.4, 53.2], [25.8, 55.2], [27.8, 56.6], [30, 57.4], [32, 57.6], [34, 57.4], [36.2, 56.6], [38.2, 55.2], [39.6, 53.2]], 1.15, [BLANC]);
        break;
      case 4: // Chaîne en or
        g = g.concat(cerne("M23.8 52.6 C25.6 60.6 38.4 60.6 40.2 52.6", h, 1.2, OR));
        g.push(R({ d: rond(32, 59.6, 1.5), fill: OR, w: 0.9, sketch: false, j: 0.08 }));
        break;
      case 5: // Collier de fleurs
        perles([[22.4, 53.4], [24.4, 56.6], [27.6, 58.8], [32, 59.6], [36.4, 58.8], [39.6, 56.6], [41.6, 53.4]], 2.1, ["#EFA0B4", "#F2C230", "#FBF8F0", "#EE8A3A"]);
        break;
      case 6: // Ras-du-cou
        g.push(R({ d: "M27.2 49.8 C30.2 51 33.8 51 36.8 49.8 L36.9 52 C33.8 53.2 30.2 53.2 27.1 52 Z", fill: ENCRE, w: 0.9, sketch: false, j: 0.1 }));
        g.push(R({ d: rond(32, 53.4, 0.9), fill: OR, w: 0.7, sketch: false, j: 0.06 }));
        break;
      default:
        return null;
    }
    return n("g", { children: g });
  }

  window.HS_SKIN = function (quoi, k, o, h) {
    try {
      k = k | 0;
      if (!k || !h || !h.n) return null;
      if (quoi === "cheveux") return cheveux(k, o || {}, h);
      if (quoi === "cheveuxDos") return cheveuxDos(k, o || {}, h);
      if (quoi === "dessous") return detail(k, o || {}, h, true);
      if (quoi === "detail") return detail(k, o || {}, h, false);
      if (quoi === "tenue") return tenue(k, o || {}, h);
      if (quoi === "bijou") return bijou(k, o || {}, h);
    } catch (e) {}
    return null;
  };
})();

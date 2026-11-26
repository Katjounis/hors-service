// Fabrique l'aperçu du deck : une page autonome (à ouvrir telle quelle) et la version publiée en page Artifact.
// Usage : node outils/fabriquer-apercu.mjs <dossier de sortie>
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// esbuild : celui du projet s'il est installé (npm i esbuild), sinon l'installation globale
let esbuild; try { esbuild = require('esbuild'); } catch (e) { esbuild = require(path.join(process.env.NPM_GLOBAL || '/usr/local/lib/node_modules', 'esbuild')); }
const ici = path.dirname(new URL(import.meta.url).pathname), racine = path.join(ici, '..');
const sortie = process.argv[2] || path.join(racine, 'sortie');
fs.mkdirSync(sortie, { recursive: true });

const bundle = esbuild.buildSync({ entryPoints: [path.join(racine, 'src/deck.mjs')], bundle: true, format: 'iife', globalName: 'HSDeck', minify: true, write: false, target: ['es2018'], charset: 'utf8' }).outputFiles[0].text;
const css = fs.readFileSync(path.join(racine, 'apercu/apercu.css'), 'utf8');
const js = fs.readFileSync(path.join(racine, 'apercu/apercu.js'), 'utf8');
const TITRE = 'Deck Classique Hors Service';
const polices = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Atkinson+Hyperlegible:wght@400;700&display=swap">';
const corps = `<div class="page">
  <header class="tete">
    <div>
      <h1>Deck Classique</h1>
      <p>Les 52 cartes communes de Hors Service : 12 figures en double portrait, les enseignes à leur place traditionnelle, un seul dos. Touche une carte pour la voir en grand.</p>
    </div>
    <div class="commandes">
      <button class="bouton" id="tout-retourner" type="button" aria-pressed="false">Tout retourner</button>
      <button class="bouton" id="moins-anim" type="button" aria-pressed="false">Moins d’animations</button>
    </div>
  </header>
  <section class="bloc" aria-labelledby="t-jeu">
    <h2 id="t-jeu">Le jeu complet</h2>
    <p class="aide">Une rangée par enseigne, de l’as au roi. Au survol, la carte s’incline un peu.</p>
    <div class="jeu" id="jeu"></div>
  </section>
  <section class="bloc" aria-labelledby="t-main">
    <h2 id="t-main">Dans la main</h2>
    <p class="aide">Les cartes à la taille du jeu. Touche une carte pour la choisir.</p>
    <div class="main-zone">
      <div class="main-outils">
        <button class="bouton" id="nouvelle-main" type="button">Nouvelle main</button>
        <button class="bouton" id="retourner-main" type="button">Retourner la main</button>
        <div class="taille" role="group" aria-label="Taille des cartes">
          <button type="button" data-l="50" aria-pressed="false">50 px</button>
          <button type="button" data-l="64" aria-pressed="true">64 px</button>
          <button type="button" data-l="90" aria-pressed="false">90 px</button>
          <button type="button" data-l="130" aria-pressed="false">130 px</button>
        </div>
      </div>
      <div class="tapis"><div class="eventail" id="eventail"></div></div>
    </div>
  </section>
  <section class="bloc" aria-labelledby="t-rar">
    <h2 id="t-rar">Les animations par rareté</h2>
    <p class="note">Ce deck est en commune : flottement léger, inclinaison au survol, sélection en douceur, retournement. Les autres raretés ont leur place dans le code, sans effet pour l’instant.</p>
    <div class="raretes" id="raretes"></div>
  </section>
</div>
<div class="vue" id="vue" hidden role="dialog" aria-modal="true" aria-labelledby="vue-titre">
  <div class="vue-boite">
    <div id="vue-carte" style="width:100%;display:grid;place-items:center"></div>
    <div class="vue-titre" id="vue-titre"></div>
    <div class="vue-nav">
      <button class="bouton" id="vue-prec" type="button">← Précédente</button>
      <button class="bouton" id="vue-retourner" type="button">Retourner</button>
      <button class="bouton" id="vue-suiv" type="button">Suivante →</button>
      <button class="bouton" id="vue-fermer" type="button">Fermer</button>
    </div>
  </div>
</div>
<script>${bundle}</script>
<script>${js}</script>`;

// page autonome : document complet
const autonome = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITRE}</title>${polices}
<style>html{height:100%}body{margin:0}${css}</style></head><body>
${corps}
</body></html>`;
// page Artifact : le contenu seul (l'enveloppe est ajoutée à la publication)
const artifact = `<title>${TITRE}</title>
<meta name="claude:viewport-fit-sides" content="cover">
${polices}
<style>${css}</style>
${corps}`;
fs.writeFileSync(path.join(sortie, 'apercu-deck-classique.html'), autonome);
fs.writeFileSync(path.join(sortie, 'deck-classique-artifact.html'), artifact);
fs.writeFileSync(path.join(sortie, 'hs-deck.js'), bundle);
console.log('bundle', (bundle.length / 1024).toFixed(1), 'Ko ; page', (autonome.length / 1024).toFixed(1), 'Ko');

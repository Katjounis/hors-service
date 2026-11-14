// Construction de l'appli :
//   node build.mjs preview  → dist/preview.html (test local) + dist/artifact.html (aperçu publié)
//   node build.mjs pages    → dist/pages : le site à publier (GitHub Pages, Hostinger…), PWA hors ligne
// Les polices sont hébergées dans le dépôt (src/fonts, woff2) : aucun appel à Google Fonts.
import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';

const target = process.argv[2] || 'preview';
const TITLE = 'Hors Service';

// [famille, fichier, graisse]
const FONT_FILES = [
  ['Dela Gothic One', 'dela-gothic-one-400.woff2', '400 900'],
  ['Familjen Grotesk', 'familjen-grotesk-400.woff2', 400],
  ['Familjen Grotesk', 'familjen-grotesk-600.woff2', 600],
  ['Familjen Grotesk', 'familjen-grotesk-700.woff2', '700 900'],
  ['Alfa Slab One', 'alfa-slab-one-400.woff2', '400 900'],
  ['Literata', 'literata-600.woff2', '500 700'],
];
const RANGE = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';

function fontCSS(inline) {
  return FONT_FILES.map(([fam, file, w]) => {
    const src = inline
      ? `data:font/woff2;base64,${readFileSync(`src/fonts/${file}`).toString('base64')}`
      : `fonts/${file}`;
    return `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(${src}) format('woff2');unicode-range:${RANGE};}`;
  }).join('\n');
}

import { lightCSS } from './tools/light-theme.mjs';
const css0 = readFileSync('src/styles.css', 'utf8');
const css = `${css0}\n${lightCSS(css0)}`;

const common = {
  bundle: true,
  minify: process.env.HS_NOMIN ? false : true,
  format: 'iife',
  jsx: 'automatic',
  jsxImportSource: 'preact',
  target: ['es2020', 'safari14'],
  legalComments: 'none',
  logLevel: 'warning',
};

async function bundle(entry) {
  const r = await esbuild.build({ ...common, entryPoints: [entry], write: false });
  return r.outputFiles[0].text;
}

const head = `<title>${TITLE}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Jeux de soirée sur téléphone : chacun le sien, les secrets restent secrets.">
<meta name="theme-color" content="#1C1A17">
<meta name="color-scheme" content="dark">`;

const safeScript = (js) => js.replace(/<\/script/gi, '<\\/script');

if (target === 'preview') {
  const js = await bundle('src/main-preview.jsx');
  const style = `${fontCSS(true)}\n${css}`;
  const body = `${head}
<style>${style}</style>
<div id="app"></div>
<script>document.documentElement.lang='fr';</script>
<script>${safeScript(js)}</script>`;
  mkdirSync('dist', { recursive: true });
  writeFileSync('dist/artifact.html', body);
  writeFileSync('dist/preview.html', `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">${head}<style>${style}</style></head><body><div id="app"></div><script>${safeScript(js)}</script></body></html>`);
  console.log('preview OK', (body.length / 1024).toFixed(0), 'Ko');
} else if (target === 'pages') {
  // version GitHub Pages : site statique prêt à déposer à la racine d'un dépôt (PWA hors ligne)
  const { createHash } = await import('node:crypto');
  const { copyFileSync, readdirSync } = await import('node:fs');
  const OUT = 'dist/pages';
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(`${OUT}/assets/icons`, { recursive: true });
  const js = await bundle('src/main-pages.jsx');
  const icons = readdirSync('src/icons').filter((f) => f.endsWith('.png')).sort();
  for (const f of icons) copyFileSync(`src/icons/${f}`, `${OUT}/assets/icons/${f}`);
  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<script>
  // Serveur des salons (mode « Chacun son téléphone ») — à changer ici si le serveur change d'adresse.
  // Il n'accepte que les pages servies depuis https://katjounis.github.io et http://localhost:8080.
  var SALONS_URL = "https://hors-service-salons.chaux-samuel.workers.dev";
  // Hébergeur affiché dans les mentions légales : "github" (GitHub Pages) ou "hostinger".
  var HEBERGEUR = "github";
</script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${TITLE}</title>
<meta name="description" content="Jeux de soirée sur téléphone : chacun le sien, les secrets restent secrets.">
<meta name="theme-color" content="#1C1A17">
<meta name="color-scheme" content="dark">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="assets/icons/favicon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="assets/icons/icon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="assets/icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Hors Service">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<style>${fontCSS(true)}\n${css}</style>
</head>
<body>
<div id="app"></div>
<noscript><p style="padding:24px;color:#F2EADB;background:#1C1A17;font-family:system-ui,sans-serif">Hors Service a besoin de JavaScript pour fonctionner.</p></noscript>
<script>${safeScript(js)}</script>
</body>
</html>`;
  writeFileSync(`${OUT}/index.html`, html);
  const manifest = {
    name: 'Hors Service', short_name: 'Hors Service',
    description: 'Jeux de soirée sur téléphone, avec ou sans alcool.',
    lang: 'fr', dir: 'ltr', id: './', start_url: './', scope: './',
    display: 'standalone', orientation: 'portrait',
    background_color: '#1C1A17', theme_color: '#1C1A17', categories: ['games', 'entertainment'],
    icons: [
      { src: 'assets/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'assets/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'assets/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  writeFileSync(`${OUT}/manifest.webmanifest`, `${JSON.stringify(manifest, null, 2)}\n`);
  // la version du cache change à chaque nouvelle publication : les téléphones récupèrent la mise à jour
  const h = createHash('sha256').update(html).update(JSON.stringify(manifest));
  for (const f of icons) h.update(readFileSync(`src/icons/${f}`));
  const version = h.digest('hex').slice(0, 10);
  const files = ['./', './index.html', './manifest.webmanifest', ...icons.map((f) => `./assets/icons/${f}`)];
  writeFileSync(`${OUT}/sw.js`, readFileSync('src/pages/sw.js', 'utf8').replace('__VERSION__', version).replace('__FILES__', JSON.stringify(files)));
  writeFileSync(`${OUT}/.nojekyll`, '');
  copyFileSync('src/pages/README.md', `${OUT}/README.md`);
  console.log('pages OK :', (html.length / 1024).toFixed(0), 'Ko, version', version);
}

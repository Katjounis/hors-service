// Version publiée (GitHub Pages ou tout hébergement statique).
// • « Un téléphone qui tourne » : sans réseau, tout reste sur le téléphone.
// • « Chacun son téléphone » : salons sur le serveur Cloudflare existant (src/net/salons.js, SALONS_URL).
import { render } from 'preact';
import { applyTheme, loadTheme } from './ui/prefs.jsx';
import { setLang, loadLang } from './i18n/index.js';
import { Root } from './ui/app.jsx';
import { createStore } from './lib/util.js';
import { SalonDevice } from './core/salon-device.js';
import { SalonBackend } from './net/salons.js';

const store = createStore('hs');
const makeOnline = () => new SalonDevice({ backend: new SalonBackend({ store }), store });

applyTheme(loadTheme());
render(<Root makeOnline={makeOnline} store={store} />, document.getElementById('app'));
if (loadLang() === 'en') setLang('en', false);

// service worker : une fois l'appli ouverte, le mode un téléphone marche même sans réseau
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* pas de hors-ligne : l'appli marche quand même */ });
  });
}

// Aperçu (sans serveur) : démo avec téléphones simulés + mode un seul téléphone.
import { render } from 'preact';
import { applyTheme, loadTheme } from './ui/prefs.jsx';
import { setLang, loadLang } from './i18n/index.js';
import { Root } from './ui/app.jsx';
import { createStore } from './lib/util.js';

const store = createStore('hs');
applyTheme(loadTheme());
render(<Root makeOnline={null} store={store} />, document.getElementById('app'));
if (loadLang() === 'en') setLang('en', false);

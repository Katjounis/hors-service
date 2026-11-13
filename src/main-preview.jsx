// Aperçu (sans serveur) : démo avec téléphones simulés + mode un seul téléphone.
import { render } from 'preact';
import { Root } from './ui/app.jsx';
import { createStore } from './lib/util.js';

const store = createStore('hs');
render(<Root makeOnline={null} store={store} />, document.getElementById('app'));

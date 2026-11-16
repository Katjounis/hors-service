// Service worker de Hors Service : une fois ouverte, l'appli se relance même sans réseau.
// Stratégie : réseau d'abord (les mises à jour arrivent tout de suite), copie locale si hors connexion.
// Les échanges avec le serveur de salons (autre domaine) ne passent jamais par ici.
const CACHE = 'hors-service-cartes-6';
const FILES = ["./","./index.html","./manifest.webmanifest","./install.js","./anim.js","./textes.js","./contenus.js","./cartes.js","./assets/icons/apple-touch-icon.png","./assets/icons/favicon-32.png","./assets/icons/icon-192.png","./assets/icons/icon-512.png","./assets/icons/icon-maskable-512.png","./jeux/96.webp","./jeux/actionverite.webp","./jeux/autres.webp","./jeux/blackjack.webp","./jeux/bombe.webp","./jeux/buzzer.webp","./jeux/cercle.webp","./jeux/coinche.webp","./jeux/degaine.webp","./jeux/dessin.webp","./jeux/garou.webp","./jeux/hippodrome.webp","./jeux/jamais.webp","./jeux/oserait.webp","./jeux/paranoia.webp","./jeux/perudo.webp","./jeux/pipoteur.webp","./jeux/poker.webp","./jeux/president.webp","./jeux/purple.webp","./jeux/ring.webp","./jeux/roulette.webp","./jeux/tournee.webp","./jeux/toutankhamon.webp","./jeux/trouve.webp","./jeux/tupref.webp","./jeux/ware.webp"];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('hors-service-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))),
  );
});

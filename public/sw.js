// Service worker : garde l'interface (HTML, CSS, JS, icônes) disponible hors
// ligne. Les données (/api/…) ne sont jamais mises en cache : elles viennent
// toujours du serveur, pour ne jamais afficher de chiffres périmés.
//
// Stratégie « réseau d'abord » : en ligne, on sert toujours la dernière
// version (pratique en développement) et on met la copie locale à jour ;
// hors ligne, on sert la copie locale.
const CACHE = 'civicpulse-interface-v1';
const INTERFACE = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/app.js',
  '/js/ecrans.js',
  '/js/composants.js',
  '/js/util.js',
  '/manifest.webmanifest',
  '/icone.svg',
  '/icones/icone-192.png',
  '/icones/icone-512.png',
  '/icones/icone-maskable-512.png',
  '/icones/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(INTERFACE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const rep = await fetch(req);
      if (rep.ok && rep.type === 'basic') cache.put(req.mode === 'navigate' ? '/' : req, rep.clone());
      return rep;
    } catch (err) {
      // Application monopage : toute page renvoie la coquille index.html.
      const copie = await cache.match(req.mode === 'navigate' ? '/' : req, { ignoreSearch: true });
      if (copie) return copie;
      throw err;
    }
  })());
});

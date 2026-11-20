// MacMo Electronics — Service Worker for Fast Mobile Caching & Offline Support
const CACHE_NAME = 'macmo-cache-v18';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/privacy.html',
  '/404.html',
  '/manifest.json',
  '/styles.css',
  '/app.js',
  '/macmo-ai-agent.js',
  '/products-data.js',
  '/site-config.js',
  '/images/macmo-emblem-official.png',
  '/images/macmo-logo-official.png',
  '/images/macmo-og-banner.png',
  '/images/macmo-emblem-3d.png',
  '/images/macmo-logo-3d.png',
  '/images/macmo-logo-3d-trans.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => console.warn('PWA Cache warmup note:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET' && event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  }
});

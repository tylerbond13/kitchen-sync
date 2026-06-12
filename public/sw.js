// Kitchen Sync service worker: cache the static shell, never touch the socket.
const CACHE = 'kitchen-sync-v6';
const SHELL = [
  '/',
  '/index.html',
  '/js/app.js',
  '/js/art.js',
  '/js/assetManifest.js',
  '/js/gfx.js',
  '/js/isoRender.js',
  '/js/music.js',
  '/js/sound.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/socket.io')) return; // realtime traffic stays live
  // Music streams with Range requests; cache.put() rejects partial (206)
  // responses, so let the browser talk to the network directly.
  if (e.request.headers.has('range') || url.pathname.startsWith('/assets/audio/')) return;
  // network-first for navigations (fresh app shell), cache fallback for offline
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }
  // icons never change: cache-first. Everything else (js/css/manifest):
  // network-first so deploys reach players immediately, cache fallback offline.
  if (url.pathname.startsWith('/icons/')) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }))
    );
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

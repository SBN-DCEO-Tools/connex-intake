// Connex Intake Console service worker
const CACHE = 'connex-v7';
const ASSETS = ['./','./index.html','./manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // never intercept Firebase / Google APIs
  if (req.url.includes('firebaseio') || req.url.includes('googleapis') ||
      req.url.includes('gstatic')) return;

  // NETWORK-FIRST for navigations + HTML/JS so updates always show.
  const isShell = req.mode === 'navigate' ||
                  req.destination === 'document' ||
                  req.url.endsWith('.html') || req.url.endsWith('.js') ||
                  req.url.endsWith('/');
  if (isShell) {
    e.respondWith(
      fetch(req).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
        return resp;
      }).catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // CACHE-FIRST for everything else (icons, manifest) — fast, with network fallback.
  e.respondWith(caches.match(req).then(r => r || fetch(req)));
});

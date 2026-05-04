const CACHE_NAME = 'kidp-v1';
const STATIC_ASSETS = [
  '/kidp-fight/',
  '/kidp-fight/index.html',
  '/kidp-fight/css/style.css',
  '/kidp-fight/js/app.js',
  '/kidp-fight/data/static.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // updates.json은 항상 네트워크 우선 (최신 데이터 유지)
  if (url.pathname.includes('updates.json')) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }
  // 나머지는 캐시 우선
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

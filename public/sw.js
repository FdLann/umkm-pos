const CACHE_NAME = 'pos-umkm-cache-v1';
const ASSETS_TO_CACHE = [
  '/kasir',
  '/transaksi',
  '/produk',
  '/kategori',
  '/pengaturan',
  '/manifest.json',
  '/globe.svg',
  '/favicon.ico'
];

// Install Event: Cache app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Network-first, fallback to cache for pages; Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip non-GET requests or browser extension/Supabase API requests
  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }

  // Static Assets (_next/static, public files) -> Cache first, fallback to network
  if (requestUrl.pathname.includes('/_next/') || requestUrl.pathname.endsWith('.svg') || requestUrl.pathname.endsWith('.ico') || requestUrl.pathname.endsWith('.png')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // App Shell Pages (/kasir, /produk, etc.) -> Network first, fallback to cache if offline
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache successful page loads
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline: Fallback to cache
        console.log('[Service Worker] Offline fallback for', requestUrl.pathname);
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          
          // Match matching cached pages as fallback if exact route not found
          if (requestUrl.pathname === '/kasir' || requestUrl.pathname === '/') {
            return caches.match('/kasir');
          }
          return caches.match('/kasir'); // default fallback
        });
      })
  );
});

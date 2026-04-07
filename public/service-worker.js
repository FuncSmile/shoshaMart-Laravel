const CACHE_NAME = 'shosha-mart-cache-v2';
const urlsToCache = [
    '/manifest.json',
    '/favicon_io/android-chrome-192x192.png',
    '/favicon_io/android-chrome-512x512.png',
];

self.addEventListener('install', event => {
    // Force the waiting service worker to become the active service worker.
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // Use catch to prevent installation from failing if a resource is missing
                return Promise.allSettled(
                    urlsToCache.map(url => cache.add(url).catch(err => console.error('SW cache error:', err)))
                );
            })
    );
});

self.addEventListener('activate', event => {
    // Tell the active service worker to take control of the page immediately.
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    // Only intercept GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Ignore Chrome extensions
    if (event.request.url.startsWith('chrome-extension://')) {
        return;
    }

    // Fix for Chrome bug: https://bugs.chromium.org/p/chromium/issues/detail?id=973902
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
        return;
    }

    event.respondWith(
        fetch(event.request).then(response => {
            return response;
        }).catch(async error => {
            // If the network fails, try to return from cache
            const cachedResponse = await caches.match(event.request);
            if (cachedResponse) {
                return cachedResponse;
            }

            // For navigation requests, fallback to a simple offline page
            if (event.request.mode === 'navigate') {
                return new Response(
                    '<html><head><title>Offline</title><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="font-family:sans-serif;padding:2rem;text-align:center;"><h2>You are offline</h2><p>Please check your internet connection and try again.</p><button onclick="window.location.reload()" style="padding:10px 20px;border-radius:6px;background:#059669;color:#fff;border:none;cursor:pointer;">Retry</button></body></html>',
                    {
                        status: 503,
                        headers: { 'Content-Type': 'text/html' }
                    }
                );
            }

            // For other requests, return a 503 error instead of throwing to avoid ERR_FAILED
            return new Response('', { status: 503, statusText: 'Service Unavailable' });
        })
    );
});

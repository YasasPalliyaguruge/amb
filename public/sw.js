const APP_SHELL_CACHE = 'amb-app-shell-v1';
const APP_ASSET_CACHE = 'amb-asset-cache-v1';
const APP_SHELL_URLS = ['/', '/index.html', '/site.webmanifest', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![APP_SHELL_CACHE, APP_ASSET_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isCacheableAsset(requestUrl) {
  return requestUrl.origin === self.location.origin && (
    requestUrl.pathname.startsWith('/assets/') ||
    requestUrl.pathname.startsWith('/art/') ||
    requestUrl.pathname === '/favicon.svg' ||
    requestUrl.pathname === '/site.webmanifest'
  );
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(APP_ASSET_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(APP_SHELL_CACHE);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put('/index.html', response.clone());
    }
    return response;
  } catch {
    return (await cache.match('/index.html')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(request.url);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isCacheableAsset(requestUrl)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});


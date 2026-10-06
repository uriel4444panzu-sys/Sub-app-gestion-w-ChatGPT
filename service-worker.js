const CACHE_NAME = "subpilot-v53";
const APP_SHELL = [
  "./",
  "./index.html",
  "./confidentialite.html",
  "./styles.css?v=53",
  "./app.js?v=53",
  "./radar.js?v=53",
  "./manifest.webmanifest?v=53",
  "./assets/subpilot-logo.png?v=53",
  "./assets/icon-192.png?v=53",
  "./assets/icon-512.png?v=53",
  "./assets/icon-maskable-512.png?v=53",
  "./assets/apple-touch-icon.png?v=53",
  "./assets/favicon-16.png?v=53",
  "./assets/favicon-32.png?v=53",
  "./assets/favicon-48.png?v=53",
  "./assets/favicon.ico?v=53",
  "./assets/icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(cacheNames.filter((cacheName) => cacheName !== CACHE_NAME).map((cacheName) => caches.delete(cacheName))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const isNavigation = event.request.mode === "navigate";
  const isSameOrigin = requestUrl.origin === self.location.origin;

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", responseClone));
          return networkResponse;
        })
        .catch(() => caches.match("./index.html")),
    );
    return;
  }

  if (!isSameOrigin) return;

  if (requestUrl.pathname.endsWith("/firebase-config.js")) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request).then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      });

      return cachedResponse || networkFetch;
    }),
  );
});

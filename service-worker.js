const CACHE_NAME = "subpilot-v6";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=6",
  "./app.js?v=6",
  "./manifest.webmanifest",
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


self.addEventListener("push", (event) => {
  let payload = {
    title: "Rappel SubPilot",
    body: "Un abonnement approche de son renouvellement.",
    url: "./index.html",
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "./assets/icon.svg",
      badge: "./assets/icon.svg",
      tag: payload.tag || "subpilot-reminder",
      renotify: true,
      data: { url: payload.url || "./index.html" },
      actions: [{ action: "open", title: "Ouvrir SubPilot" }],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "./index.html", self.registration.scope).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const existingClient = clientList.find((client) => client.url === targetUrl || client.url.startsWith(targetUrl));
      if (existingClient) return existingClient.focus();
      return self.clients.openWindow(targetUrl);
    }),
  );
});

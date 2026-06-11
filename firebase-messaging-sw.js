// Service worker dédié à Firebase Cloud Messaging (notifications push).
// Il est enregistré à son propre scope (./firebase-cloud-messaging-push-scope)
// pour ne pas entrer en conflit avec le service worker de la PWA.
//
// NB : la config ci-dessous est publique (identifiants client Firebase). Si vous
// changez de projet Firebase, mettez aussi ces valeurs à jour ici.
importScripts("https://www.gstatic.com/firebasejs/12.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDHJToTW_c22GvBniopKdL6JVcQ_1qYl1E",
  authDomain: "subpilot-bd743.firebaseapp.com",
  projectId: "subpilot-bd743",
  messagingSenderId: "151154301775",
  appId: "1:151154301775:web:43656447524294aecd433a",
});

const messaging = firebase.messaging();

// Notification reçue quand l'application est fermée ou en arrière-plan.
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "SubPilot";
  const options = {
    body: payload.notification?.body || payload.data?.body || "",
    icon: "./assets/icon.svg",
    badge: "./assets/icon.svg",
    data: { url: payload.fcmOptions?.link || payload.data?.url || "./index.html" },
  };
  self.registration.showNotification(title, options);
});

// Ouvre (ou met au premier plan) l'application au clic sur la notification.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "./index.html";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    }),
  );
});

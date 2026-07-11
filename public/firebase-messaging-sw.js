try {
  importScripts('https://www.gstatic.com/firebasejs/10.15.0/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/10.15.0/firebase-messaging-compat.js');

  firebase.initializeApp({
    apiKey: "AIzaSyDXxaLhpiNsIWl3n9JwQeB6JGZxjtJgWts",
    authDomain: "mazboncomande.firebaseapp.com",
    projectId: "mazboncomande",
    storageBucket: "mazboncomande.firebasestorage.app",
    messagingSenderId: "277926026463",
    appId: "1:277926026463:web:84cf636333371e33075d6a"
  });

  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('Received background message in service worker: ', payload);
    const notificationTitle = payload.notification?.title || "Mise à jour Bon de Commande";
    const notificationOptions = {
      body: payload.notification?.body || "Vous avez une nouvelle notification.",
      icon: '/favicon.ico',
      data: {
        url: payload.data?.url || '/'
      }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (error) {
  console.warn("FCM Service Worker CDN scripts failed to evaluate (offline or blocked):", error);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

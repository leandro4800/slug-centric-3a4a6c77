importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (e) {}
    await self.clients.claim();
  })());
});

firebase.initializeApp({
  apiKey: "AIzaSyD1Wlvqsle1TGs0xOq9d1tCuUzMA0E72zs",
  authDomain: "alpha-coach-a3811.firebaseapp.com",
  projectId: "alpha-coach-a3811",
  storageBucket: "alpha-coach-a3811.firebasestorage.app",
  messagingSenderId: "82597349006",
  appId: "1:82597349006:web:588b59c8fc001d41752bdf",
  measurementId: "G-Y33D91J3MQ"
});

const messaging = firebase.messaging();

function showNotificationFromPayload(payload) {
  const title = payload?.notification?.title || payload?.data?.title || 'Alpha Coach';
  const options = {
    body: payload?.notification?.body || payload?.data?.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: payload?.data || {},
  };
  return self.registration.showNotification(title, options);
}

// Firebase Messaging background handler
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] onBackgroundMessage:', payload);
  showNotificationFromPayload(payload);
});

// Explicit raw `push` listener as safety net (some browsers bypass onBackgroundMessage
// when the payload contains a `notification` key, others vice-versa).
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { notification: { title: 'Alpha Coach', body: event.data ? event.data.text() : '' } };
  }
  console.log('[firebase-messaging-sw.js] push event:', payload);
  event.waitUntil(showNotificationFromPayload(payload));
});

// Foreground-click handler: focus existing tab or open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if ('focus' in client) {
        try { await client.navigate(targetUrl); } catch (e) {}
        return client.focus();
      }
    }
    if (self.clients.openWindow) {
      return self.clients.openWindow(targetUrl);
    }
  })());
});

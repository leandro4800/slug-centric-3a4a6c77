importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Garante que o novo SW assume controle imediatamente em novas versões
self.addEventListener('install', (event) => {
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

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Recebida mensagem em segundo plano ', payload);
  const notificationTitle = payload.notification?.title || 'Alpha Coach';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

/* ═════════════════════════════════════════
   Discount Hub — Firebase Messaging SW
   Handles FCM push when app is in background
═════════════════════════════════════════ */

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyDBZLE7xCgKuXmfl1i1ZSwl86Xko7TUalk",
  authDomain:        "discounthubadmin.firebaseapp.com",
  projectId:         "discounthubadmin",
  storageBucket:     "discounthubadmin.firebasestorage.app",
  messagingSenderId: "610110627519",
  appId:             "1:610110627519:web:0593a19ddc34fb669ef00a"
});

const messaging = firebase.messaging();

/* Background message handler */
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Discount Hub 🛍️';
  const body  = payload.notification?.body  || 'New deals waiting for you!';
  const icon  = payload.notification?.icon  || '/dh.png';
  const url   = payload.data?.url || '/';

  self.registration.showNotification(title, {
    body,
    icon,
    badge:    '/dh.png',
    tag:      'dh-fcm',
    renotify: true,
    data:     { url },
    actions: [
      { action: 'view',  title: '🛒 View Deals' },
      { action: 'close', title: '✕ Dismiss'     },
    ],
  });
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  if (e.action === 'close') return;
  const url = e.notification.data?.url || '/';
  e.waitUntil(clients.openWindow(url));
});

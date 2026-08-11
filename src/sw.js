import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

// Take control immediately. main.jsx handles reload-on-update via controllerchange.
self.skipWaiting();
clientsClaim();

// Inject Workbox precache manifest (replaced by vite-plugin-pwa at build time)
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Cache Google Fonts
registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  })
);

// Cache Firebase Auth/FCM reads — but NOT Firestore (firestore.googleapis.com).
// Firestore uses long-polling HTTP requests when experimentalForceLongPolling is on,
// so caching those responses causes stale data to be served after a hard refresh.
registerRoute(
  ({ url }) => url.hostname.endsWith('.googleapis.com') && !url.hostname.startsWith('firestore.'),
  new NetworkFirst({ cacheName: 'firebase-cache', networkTimeoutSeconds: 5 })
);

// SPA navigation — always try network first so new deploys are seen immediately.
// Falls back to cached index.html only when offline.
registerRoute(
  new NavigationRoute(new NetworkFirst({ cacheName: 'pages-cache', networkTimeoutSeconds: 3 }), {
    denylist: [/^\/api\//],
  })
);

// ── Push notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { body: event.data.text() }; }

  const {
    title   = 'Bookrightly',
    body    = 'You have a new notification',
    icon    = '/images/IMG_9763-removebg-preview.png',
    sound   = true,
    vibrate = true,
    url     = '/dashboard',
    tag     = 'bookrightly',
  } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/images/IMG_9763-removebg-preview.png',
      silent:  !sound,
      vibrate: vibrate ? [200, 100, 200, 100, 200] : undefined,
      data:    { url },
      tag,
      renotify: true,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ('focus' in client) return client.focus();
        }
        return clients.openWindow(targetUrl);
      })
  );
});

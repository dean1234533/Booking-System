import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { clientsClaim } from 'workbox-core';

// Activate a newly-deployed service worker IMMEDIATELY and take control of open
// pages, so a new build is served on the next load instead of being stuck behind
// the old precached app shell ("nothing changes after deploy").
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

// Cache Firebase reads with network-first fallback
registerRoute(
  ({ url }) => url.hostname.endsWith('.googleapis.com'),
  new NetworkFirst({ cacheName: 'firebase-cache', networkTimeoutSeconds: 5 })
);

// SPA navigation fallback — serve index.html for all non-API routes
registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'), {
    denylist: [/^\/api\//],
  })
);

// ── Push notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try { data = event.data.json(); } catch { data = { body: event.data.text() }; }

  const {
    title   = 'Bookrty',
    body    = 'You have a new notification',
    icon    = '/images/IMG_9763-removebg-preview.png',
    sound   = true,
    vibrate = true,
    url     = '/dashboard',
    tag     = 'bookrty',
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

// Bunnyverse service worker: push and notification click ONLY. No fetch handler and no cache: the site keeps its normal caching.
// Served at /sw.js on the hub build (a rewrite in lib/site/routing.ts), so its scope is the whole site.
// The push carries no payload (Web Push without encryption): the notification is fixed and says only that a stack is full.

self.addEventListener('push', (event) => {
  event.waitUntil(
    self.registration.showNotification('Your packs are ready', {
      body: 'Your stack is full. Open a pack on Bunnyverse.',
      icon: '/brand/hub/pwa-192.png',
      tag: 'cards-stack-full',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL('/cards', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (new URL(c.url).origin === self.location.origin && 'focus' in c) {
          return c.navigate(target).then((w) => (w || c).focus()).catch(() => c.focus());
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});

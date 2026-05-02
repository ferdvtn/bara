// @ts-nocheck
// Custom Service Worker untuk Push Notification

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title ?? 'Bara 🔥';
  const options = {
    body: data.body ?? 'Target hari ini belum aman. 5 menit cukup.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'bara-reminder',
    renotify: false,
    vibrate: [200, 100, 200],
    data: { url: '/' },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow('/');
      })
  );
});

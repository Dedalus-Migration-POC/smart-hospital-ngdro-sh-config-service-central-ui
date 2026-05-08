// SmartHospital Central — Service Worker
// Gestisce push notifications e click sulle notifiche.

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const notif = data.notification || {};
  event.waitUntil(
    self.registration.showNotification(notif.title || 'SmartHospital', {
      body: notif.body || '',
      icon: notif.icon || '/icons/icon-192x192.png',
      badge: notif.badge || '/icons/icon-96x96.png',
      data: notif.data || {},
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Service Worker para Notificaciones Push de La Carmelita (Exclusivo Administrador)

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listener para notificaciones enviadas por Web Push Server / VAPID
self.addEventListener('push', (event) => {
  let data = { title: '⚽ La Carmelita Admin', body: '¡Nueva orden de pago / quiniela recibida!' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || '¡Nueva orden de pago / quiniela recibida!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'open', title: 'Ver Órdenes' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '⚽ La Carmelita Admin', options)
  );
});

// Listener para cuando el usuario presiona la notificación en su celular
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(event.notification.data?.url || '/');
      }
    })
  );
});

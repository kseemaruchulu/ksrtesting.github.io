// Service Worker for background push notifications
// Place this file at: public/sw.js

self.addEventListener('push', event => {
  if (!event.data) return

  let data = {}
  try { data = event.data.json() } catch { data = { title: 'New Notification', body: event.data.text() } }

  const options = {
    body: data.body || '',
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    requireInteraction: false,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Restaurant Update', options)
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Focus existing tab if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Otherwise open new tab
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(clients.claim()))

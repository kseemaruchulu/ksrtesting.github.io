// Push Notifications via Service Worker
// Works in background, when tab is hidden, and on Android Chrome.
// iOS Safari requires iOS 16.4+ with app added to home screen.

const STORAGE_KEY = 'push_permission_asked'

// ── Register the service worker ──────────────────────────────────────────────
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return reg
  } catch (e) {
    console.warn('Service worker registration failed:', e)
    return null
  }
}

// ── Ask for notification permission (once per browser) ───────────────────────
export const requestPushPermission = async () => {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false

  // Only ask the user once
  const alreadyAsked = localStorage.getItem(STORAGE_KEY)
  if (alreadyAsked) return false
  localStorage.setItem(STORAGE_KEY, 'true')

  const result = await Notification.requestPermission()
  return result === 'granted'
}

// ── Send a notification (works in background via service worker) ──────────────
export const sendPushNotification = async (title, body, options = {}) => {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  // Prefer service worker so it fires even when tab is in background
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, {
        body,
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        vibrate: [200, 100, 200],
        data: { url: options.url || '/track-order' },
        requireInteraction: false,
        ...options,
      })
      return
    } catch (e) {
      console.warn('SW notification failed, falling back:', e)
    }
  }

  // Fallback: basic Notification API (tab must be open)
  try {
    new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      vibrate: [200, 100, 200],
      ...options,
    })
  } catch (e) {
    console.warn('Push notification failed:', e)
  }
}

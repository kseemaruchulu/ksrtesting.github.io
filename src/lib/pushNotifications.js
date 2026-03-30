// Browser Push Notifications
// Uses the Notifications API — works on desktop and Android Chrome
// iOS Safari requires iOS 16.4+ and app added to home screen

const STORAGE_KEY = 'push_permission_asked'

export const requestPushPermission = async () => {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  // Only ask once
  const alreadyAsked = localStorage.getItem(STORAGE_KEY)
  if (alreadyAsked) return false
  localStorage.setItem(STORAGE_KEY, 'true')
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export const sendPushNotification = (title, body, options = {}) => {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  try {
    new Notification(title, {
      body,
      icon: '/vite.svg', // fallback icon
      badge: '/vite.svg',
      vibrate: [200, 100, 200],
      ...options,
    })
  } catch (e) {
    console.warn('Push notification failed:', e)
  }
}

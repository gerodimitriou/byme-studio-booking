/*
 * One World ByME — Service Worker
 * Strategy:
 *  - Navigation requests: network-first, fallback to cached index.html (offline shell)
 *  - Static assets (js/css/images/fonts): cache-first with background refresh
 *  - Supabase / external APIs: never cache
 */

const CACHE_VERSION = 'byme-v2'
const SHELL_CACHE   = `${CACHE_VERSION}-shell`
const ASSET_CACHE   = `${CACHE_VERSION}-assets`
const SHELL_URLS    = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Never intercept API/external calls (Supabase, EmailJS, Google Maps, fonts CDN should pass through too).
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/realtime/')) return

  // Navigation requests — network-first
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone()
        caches.open(SHELL_CACHE).then((c) => c.put('/index.html', copy))
        return res
      }).catch(() => caches.match('/index.html'))
    )
    return
  }

  // Static assets — cache-first
  if (/\.(js|css|woff2?|ttf|otf|png|jpg|jpeg|webp|svg|ico)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) {
          fetch(req).then((res) => {
            if (res && res.status === 200) {
              caches.open(ASSET_CACHE).then((c) => c.put(req, res.clone()))
            }
          }).catch(() => {})
          return hit
        }
        return fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone()
            caches.open(ASSET_CACHE).then((c) => c.put(req, copy))
          }
          return res
        })
      })
    )
  }
})

/* ---- Web Push: appointment reminders ---- */

self.addEventListener('push', (event) => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = {} }

  const title = data.title || 'ByME'
  const options = {
    body:    data.body || 'Έχεις ραντεβού σε λίγο.',
    icon:    data.icon || '/icons/icon-192.png',
    badge:   data.badge || '/icons/icon-192.png',
    tag:     data.tag || 'byme-reminder',
    data:    { url: data.url || '/' },
    vibrate: [80, 40, 80],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ('focus' in c) return c.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    })
  )
})

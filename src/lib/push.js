// Web Push opt-in: register the service worker, ask permission, subscribe,
// and persist the subscription (keyed by the booking email) via an RPC.
import { supabase } from './supabase.js'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    !!VAPID_PUBLIC_KEY
  )
}

// VAPID public key (base64url) -> Uint8Array, as PushManager.subscribe expects.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function keyToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Asks for notification permission and registers a push subscription for `email`.
 * Returns { ok: true } on success, or { ok: false, reason } otherwise.
 * Safe to call on unsupported browsers (returns a reason, never throws).
 */
export async function enableReminders(email) {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' }
  if (!email)           return { ok: false, reason: 'no-email' }

  try {
    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, reason: 'denied' }

    const reg = await navigator.serviceWorker.ready

    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    const json = sub.toJSON()
    const { error } = await supabase.rpc('save_push_subscription', {
      p_email:    email,
      p_endpoint: sub.endpoint,
      p_p256dh:   json.keys?.p256dh ?? keyToBase64Url(sub.getKey('p256dh')),
      p_auth:     json.keys?.auth   ?? keyToBase64Url(sub.getKey('auth')),
    })
    if (error) return { ok: false, reason: 'save-failed', msg: String(error) }

    return { ok: true }
  } catch (err) {
    return { ok: false, reason: 'error', msg: String(err) }
  }
}

/**
 * Turns reminders off for this device: unsubscribes the browser and removes
 * the saved subscription. The browser permission itself stays granted (only
 * the user can revoke that from settings), so re-enabling won't re-prompt.
 * Returns { ok: true } even if there was nothing to remove.
 */
export async function disableReminders() {
  if (!pushSupported()) return { ok: false, reason: 'unsupported' }
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      const endpoint = sub.endpoint
      await sub.unsubscribe()
      await supabase.rpc('delete_push_subscription', { p_endpoint: endpoint })
    }
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: 'error', error }
  }
}

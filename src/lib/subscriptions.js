import { supabase } from './supabase.js'
import { getSessionToken } from './session.js'

// 42883 = undefined_function · PGRST202 = PostgREST can't find it
function rpcMissing(error) {
  if (!error) return false
  const code = error.code || ''
  const msg  = (error.message || '').toLowerCase()
  return (
    code === '42883' || code === 'PGRST202' ||
    msg.includes('could not find') ||
    (msg.includes('function') && msg.includes('does not exist'))
  )
}

// Plans are split by service (Pilates / Group). The `service` field is used in
// admin to group them and in /me to show only plans relevant to the member.
// A member can hold both a Pilates and a Group subscription simultaneously.
export const PLAN_PRESETS = [
  // ── Pilates Reformer ────────────────────────────────────────
  { name: 'Pilates — 1 Συνεδρία',   service: 'Pilates Reformer', type: 'sessions',  sessions: 1,  days: 30,  price: 15  },
  { name: 'Pilates — 4/μήνα',       service: 'Pilates Reformer', type: 'sessions',  sessions: 4,  days: 30,  price: 50  },
  { name: 'Pilates — 8/μήνα',       service: 'Pilates Reformer', type: 'sessions',  sessions: 8,  days: 30,  price: 90  },
  { name: 'Pilates — 12/μήνα',      service: 'Pilates Reformer', type: 'sessions',  sessions: 12, days: 30,  price: 120 },
  // ── Group Training ──────────────────────────────────────────
  { name: 'Group — 2 Συνεδρίες',    service: 'Group Training',   type: 'sessions',  sessions: 2,  days: 30,  price: 12  },
  { name: 'Group — 4/μήνα',         service: 'Group Training',   type: 'sessions',  sessions: 4,  days: 30,  price: 40  },
  { name: 'Group — 8/μήνα',         service: 'Group Training',   type: 'sessions',  sessions: 8,  days: 30,  price: 60  },
  { name: 'Group — 12/μήνα',        service: 'Group Training',   type: 'sessions',  sessions: 12, days: 30,  price: 75  },
  { name: 'Group — Απεριόριστο',    service: 'Group Training',   type: 'unlimited', sessions: null, days: 30, price: 90 },
]

// Local-timezone date string (YYYY-MM-DD). The whole app stores booking dates
// as LOCAL dates (see DatePicker), so "today" and date math must be local too —
// using UTC (toISOString) shifts the date by a day in the early-morning hours
// for users east of UTC (e.g. Greece, UTC+2/+3).
export function ymd(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return ymd(new Date(y, m - 1, d + days))
}

export function addMonths(dateStr, months) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return ymd(new Date(y, m - 1 + months, d))
}

export function todayStr() {
  return ymd(new Date())
}

export function daysBetween(a, b) {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.ceil(ms / 86_400_000)
}

export function formatDate(s) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

/** True if a booking (YYYY-MM-DD + HH:MM) is less than 5 hours away. */
export function isWithin5Hours(booking_date, booking_time) {
  const [y, m, d] = booking_date.split('-').map(Number)
  const [h, min]  = booking_time.split(':').map(Number)
  return (new Date(y, m - 1, d, h, min) - new Date()) < 5 * 60 * 60 * 1000
}

export function isExpired(sub) {
  if (sub.status !== 'active') return sub.status === 'expired'
  if (sub.end_date < todayStr()) return true
  if (sub.plan_type === 'sessions' && sub.sessions_total && sub.sessions_used >= sub.sessions_total) return true
  return false
}

export function subStatusLabel(sub) {
  if (sub.status === 'cancelled') return { label: 'Ακυρωμένη', tone: 'ember' }
  if (isExpired(sub))              return { label: 'Έληξε',     tone: 'ember' }
  return { label: 'Ενεργή', tone: 'bronze' }
}

export function sessionsLeft(sub) {
  if (sub.plan_type === 'unlimited') return null
  return Math.max(0, (sub.sessions_total ?? 0) - (sub.sessions_used ?? 0))
}

export function daysLeft(sub) {
  return Math.max(0, daysBetween(todayStr(), sub.end_date))
}

export async function fetchMemberSubscriptions(memberId) {
  // Member path goes through the token-scoped RPC (no direct table read once RLS
  // is locked). Falls back to a direct query during the rollout window or for
  // admin contexts that pass a memberId without a member session token.
  const token = getSessionToken()
  if (token) {
    const { data, error } = await supabase.rpc('my_subscriptions', { p_token: token })
    if (!error) return data ?? []
    if (!rpcMissing(error)) return []
  }
  const { data } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function activeSubscription(memberId, service = null) {
  const all = await fetchMemberSubscriptions(memberId)
  const active = all.filter((s) => s.status === 'active' && !isExpired(s))
  if (!service) return active[0] ?? null
  // Match by service: plan names are prefixed "Pilates — " or "Group — "
  const prefix = service === 'Pilates Reformer' ? 'Pilates' : service === 'Group Training' ? 'Group' : null
  if (prefix) {
    const match = active.find(s => s.plan_name?.startsWith(prefix))
    return match ?? null
  }
  return active[0] ?? null
}

export async function createSubscription({ member_id, plan_name, plan_type, sessions_total, price, start_date, end_date, notes }) {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert([{ member_id, plan_name, plan_type, sessions_total, price, start_date, end_date, notes, status: 'active' }])
    .select()
    .single()
  return { data, error }
}

export async function cancelSubscription(id) {
  return supabase.from('subscriptions').update({ status: 'cancelled' }).eq('id', id)
}

export async function incrementUsedSession(id) {
  const { data } = await supabase.from('subscriptions').select('sessions_used').eq('id', id).single()
  if (!data) return
  return supabase.from('subscriptions').update({ sessions_used: (data.sessions_used ?? 0) + 1 }).eq('id', id)
}

export async function decrementUsedSession(id) {
  const { data } = await supabase.from('subscriptions').select('sessions_used').eq('id', id).single()
  if (!data) return
  const next = Math.max(0, (data.sessions_used ?? 0) - 1)
  return supabase.from('subscriptions').update({ sessions_used: next }).eq('id', id)
}

export async function incrementSessionTotal(id) {
  const { data } = await supabase.from('subscriptions').select('sessions_total').eq('id', id).single()
  if (!data) return
  return supabase.from('subscriptions').update({ sessions_total: (data.sessions_total ?? 0) + 1 }).eq('id', id)
}

export async function expireOverdueSubscriptions() {
  return supabase
    .from('subscriptions')
    .update({ status: 'expired' })
    .lt('end_date', todayStr())
    .eq('status', 'active')
}

/**
 * Books a session against the member's active subscription for the given service.
 * - For session plans: increments sessions_used by 1.
 * - For unlimited plans: just links the booking to the subscription.
 * - Returns { ok, sub, error } so caller can show specific errors.
 */
export async function consumeSessionForBooking(memberId, service = null) {
  const sub = await activeSubscription(memberId, service)
  if (!sub) return { ok: false, error: 'Δεν έχεις ενεργή συνδρομή για αυτή την υπηρεσία. Επικοινώνησε με το studio.' }

  if (sub.plan_type === 'sessions') {
    const left = sessionsLeft(sub)
    if (left <= 0) return { ok: false, error: 'Δεν έχεις άλλες διαθέσιμες συνεδρίες.', sub }
    const { error } = await supabase
      .from('subscriptions')
      .update({ sessions_used: (sub.sessions_used ?? 0) + 1 })
      .eq('id', sub.id)
    if (error) return { ok: false, error: 'Σφάλμα ενημέρωσης συνδρομής.', sub }
  }
  return { ok: true, sub }
}

/**
 * Refunds a session back when a booking is cancelled.
 * Only refunds session-based plans, and only if the booking had consumed one.
 */
export async function refundSessionForBooking(subscriptionId) {
  if (!subscriptionId) return
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', subscriptionId)
    .single()
  if (!sub) return
  if (sub.plan_type !== 'sessions') return
  const next = Math.max(0, (sub.sessions_used ?? 0) - 1)
  return supabase.from('subscriptions').update({ sessions_used: next }).eq('id', sub.id)
}

// ── Renewal helpers ─────────────────────────────────────────

/** Active sub whose end_date falls within `days` from today (and not yet expired). */
export function expiringSoon(sub, days = 7) {
  if (!sub || sub.status !== 'active' || isExpired(sub)) return false
  const left = daysBetween(todayStr(), sub.end_date)
  return left >= 0 && left <= days
}

/** Active session-plan sub with `threshold` or fewer sessions left. */
export function lowSessions(sub, threshold = 2) {
  if (!sub || sub.status !== 'active' || isExpired(sub)) return false
  if (sub.plan_type !== 'sessions') return false
  return sessionsLeft(sub) <= threshold
}

// ── Attendance (auto-derived, no manual marking) ────────────

/**
 * Attendance is derived rather than set by hand: a confirmed booking whose
 * date has already passed counts as attended ("present"). Standby, cancelled
 * and future bookings do not.
 */
export function isPresent(booking) {
  return booking?.status === 'confirmed' && booking.booking_date < todayStr()
}


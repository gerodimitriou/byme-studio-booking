import { supabase } from './supabase.js'
import { getSessionToken, clearSessionToken } from './session.js'

/** Revokes the server session and clears the local token. Best-effort. */
export async function logoutMember() {
  const token = getSessionToken()
  if (token) {
    try { await supabase.rpc('member_logout', { p_token: token }) } catch { /* ignore */ }
  }
  clearSessionToken()
}

// Member-scoped booking access. Every call carries the session token so the
// server proves identity (see book_session / cancel_my_booking / my_bookings /
// week_availability / my_standby_position RPCs). No direct table access — these
// keep working after RLS is locked down.

/**
 * Books or waitlists a session for the logged-in member.
 * Returns { result, booking_id } where result ∈
 *   ok | no_active_sub | no_sessions_left | slot_full
 *   | already_booked_today | standby_full | invalid | error
 */
export async function bookSession({ service, date, time, sessionType = null, standby = false }) {
  const token = getSessionToken()
  if (!token) return { result: 'invalid', booking_id: null }
  const { data, error } = await supabase.rpc('book_session', {
    p_token: token,
    p_service: service,
    p_date: date,
    p_time: time,
    p_session_type: sessionType,
    p_standby: standby,
  })
  if (error) return { result: 'error', booking_id: null }
  const row = Array.isArray(data) ? data[0] : data
  return row ?? { result: 'error', booking_id: null }
}

/** Greek user-facing copy for each book_session result code. */
export function bookErrorMessage(result) {
  switch (result) {
    case 'no_active_sub':
      return 'Δεν έχεις ενεργή συνδρομή για αυτή την υπηρεσία. Επικοινώνησε με το studio.'
    case 'no_sessions_left':
      return 'Δεν έχεις άλλες διαθέσιμες συνεδρίες.'
    case 'slot_full':
      return 'Η ώρα γέμισε μόλις τώρα. Διάλεξε άλλη ώρα ή μπες στη λίστα αναμονής.'
    case 'standby_full':
      return 'Η λίστα αναμονής για αυτή την ώρα είναι γεμάτη.'
    case 'already_booked_today':
      return 'Έχεις ήδη ραντεβού αυτή τη μέρα. Επιτρέπεται ένα ραντεβού ανά ημέρα.'
    case 'past_slot':
      return 'Αυτή η ώρα έχει περάσει. Διάλεξε μια μελλοντική ώρα.'
    case 'invalid':
      return 'Η σύνδεσή σου έληξε. Κάνε ξανά σύνδεση.'
    default:
      return 'Κάτι πήγε στραβά. Δοκίμασε ξανά.'
  }
}

/** Non-cancelled bookings in a date range as slot facts + is_mine (no PII). */
export async function fetchWeekAvailability(start, end) {
  const token = getSessionToken()
  if (!token) return []
  const { data, error } = await supabase.rpc('week_availability', {
    p_token: token, p_start: start, p_end: end,
  })
  if (error) return []
  return data ?? []
}

/** The member's own bookings (history), newest first. */
export async function fetchMyBookings() {
  const token = getSessionToken()
  if (!token) return []
  const { data, error } = await supabase.rpc('my_bookings', { p_token: token })
  if (error) return []
  return data ?? []
}

/** 1-based waitlist position for one of the member's standby slots, or null. */
export async function fetchStandbyPosition(date, time, service) {
  const token = getSessionToken()
  if (!token) return null
  const { data, error } = await supabase.rpc('my_standby_position', {
    p_token: token, p_date: date, p_time: time, p_service: service,
  })
  if (error) return null
  return data ?? null
}

/**
 * Cancels one of the member's own bookings. The server computes the outcome,
 * refunds the session if appropriate, and promotes any standby.
 * Returns { outcome, late, result } where result ∈ ok | not_found | not_mine
 *   | already | invalid | error.
 */
export async function cancelMyBooking(bookingId) {
  const token = getSessionToken()
  if (!token) return { outcome: null, late: null, result: 'invalid' }
  const { data, error } = await supabase.rpc('cancel_my_booking', {
    p_token: token, p_booking_id: bookingId,
  })
  if (error) return { outcome: null, late: null, result: 'error' }
  const row = Array.isArray(data) ? data[0] : data
  return row ?? { outcome: null, late: null, result: 'error' }
}

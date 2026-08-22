import { supabase } from './supabase.js'
import { PLAN_PRESETS } from './subscriptions.js'
import { GROUP_SERVICE, PILATES_SERVICE } from './constants.js'

// Fallback defaults — used when the DB has no row yet or a fetch fails,
// so the booking flow can never break.
export const DEFAULT_TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '17:00', '18:00', '19:00', '20:00', '21:00',
]
export const DEFAULT_SATURDAY_SLOTS  = ['10:00', '11:00']
export const DEFAULT_CLOSED_WEEKDAYS = [0] // 0 = Sunday (JS getDay)
export const DEFAULT_PLANS           = PLAN_PRESETS
export const DEFAULT_CLOSED_DATES    = []
// Group schedule: { [weekday 0..6]: { 'HH:MM': type } } — type ∈ full|lower|upper|hiit.
export const DEFAULT_GROUP_SCHEDULE  = {}
// Pilates schedule: { [weekday 0..6]: ['HH:MM', …] } — available hours per day.
export const DEFAULT_PILATES_SCHEDULE = {}
// One-off blocked slots: [{ date:'YYYY-MM-DD', time:'HH:MM', service }]
export const DEFAULT_BLOCKED_SLOTS   = []

const KEYS = {
  time_slots:       DEFAULT_TIME_SLOTS,
  saturday_slots:   DEFAULT_SATURDAY_SLOTS,
  closed_weekdays:  DEFAULT_CLOSED_WEEKDAYS,
  plans:            DEFAULT_PLANS,
  closed_dates:     DEFAULT_CLOSED_DATES,
  group_schedule:   DEFAULT_GROUP_SCHEDULE,
  pilates_schedule: DEFAULT_PILATES_SCHEDULE,
  blocked_slots:    DEFAULT_BLOCKED_SLOTS,
}

// Only these must never be wiped to an empty array (it would empty the UI).
// closed_dates / closed_weekdays / saturday_slots are allowed to be empty.
const PROTECT_NONEMPTY = new Set(['time_slots', 'plans'])

/**
 * Loads all editable settings, merged with defaults.
 * Always resolves — falls back to defaults on any error.
 * @returns {Promise<{ time_slots: string[], saturday_slots: string[], closed_weekdays: number[], plans: object[], closed_dates: string[] }>}
 */
export async function loadSettings() {
  const result = { ...KEYS }
  try {
    const { data, error } = await supabase.from('app_settings').select('key, value')
    if (error || !data) return result
    for (const row of data) {
      if (row.key in result && row.value != null) {
        if (Array.isArray(row.value) && row.value.length === 0 && PROTECT_NONEMPTY.has(row.key)) continue
        result[row.key] = row.value
      }
    }
  } catch {
    /* keep defaults */
  }
  return result
}

/** Upserts a single setting. */
export async function saveSetting(key, value) {
  return supabase
    .from('app_settings')
    .upsert({ key, value }, { onConflict: 'key' })
}

/** Local weekday (0=Sun … 6=Sat) of a YYYY-MM-DD string. */
function weekdayOf(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

/** True if a YYYY-MM-DD date is in the closed list (one-off holidays). */
export function isClosed(dateStr, closedDates) {
  return Array.isArray(closedDates) && closedDates.includes(dateStr)
}

/** True if a date falls on a recurring closed weekday. */
export function isClosedWeekday(dateStr, closedWeekdays) {
  return !!dateStr && Array.isArray(closedWeekdays) && closedWeekdays.includes(weekdayOf(dateStr))
}

/**
 * The bookable time slots for a given date:
 *  • [] if it's a recurring closed weekday
 *  • Saturday → saturday_slots
 *  • otherwise → the weekday time_slots
 * (one-off closed_dates are handled by the date picker, not here)
 */
export function slotsForDate(dateStr, settings = {}) {
  if (!dateStr) return []
  const dow = weekdayOf(dateStr)
  if (Array.isArray(settings.closed_weekdays) && settings.closed_weekdays.includes(dow)) return []
  if (dow === 6) return settings.saturday_slots || []
  return settings.time_slots || []
}

// ── Group schedule + one-off blocked slots ──────────────────

/** Group sessions on a date, as [{ time, type }] sorted by time. */
export function groupSlotsForDate(dateStr, settings = {}) {
  if (!dateStr) return []
  const dow = String(weekdayOf(dateStr))
  if (Array.isArray(settings.closed_weekdays) && settings.closed_weekdays.includes(weekdayOf(dateStr))) return []
  const day = (settings.group_schedule || {})[dow] || {}
  return Object.keys(day).sort().map(time => ({ time, type: day[time] }))
}

/** The workout type for a group session at (date, time), or null. */
export function groupTypeFor(dateStr, time, settings = {}) {
  if (!dateStr || !time) return null
  const dow = String(weekdayOf(dateStr))
  return ((settings.group_schedule || {})[dow] || {})[time] || null
}

/**
 * Pilates available hours on a date. If a per-weekday `pilates_schedule` is
 * configured it is authoritative (a weekday not listed → no Pilates that day);
 * if it's empty/unconfigured, fall back to the general slots.
 */
export function pilatesSlotsForDate(dateStr, settings = {}) {
  if (!dateStr) return []
  const dow = weekdayOf(dateStr)
  if (Array.isArray(settings.closed_weekdays) && settings.closed_weekdays.includes(dow)) return []
  const sched = settings.pilates_schedule || {}
  if (Object.keys(sched).length === 0) return slotsForDate(dateStr, settings)
  return [...(sched[String(dow)] || [])].sort()
}

/** True if a specific (date, time, service) has been blocked one-off by admin. */
export function isSlotBlocked(dateStr, time, service, settings = {}) {
  const blocked = settings.blocked_slots
  if (!Array.isArray(blocked)) return false
  return blocked.some(b => b.date === dateStr && b.time === time && b.service === service)
}

/**
 * The bookable time slots for a given date AND service:
 *  • Group Training → only the times in the weekly group schedule for that day
 *  • other services → the general slotsForDate
 * One-off blocked slots for that service are removed.
 */
export function bookableSlots(dateStr, service, settings = {}) {
  if (!dateStr) return []
  const base = service === GROUP_SERVICE
    ? groupSlotsForDate(dateStr, settings).map(s => s.time)
    : service === PILATES_SERVICE
      ? pilatesSlotsForDate(dateStr, settings)
      : slotsForDate(dateStr, settings)
  return base.filter(t =>
    !isSlotBlocked(dateStr, t, service, settings) && !isSlotInPast(dateStr, t)
  )
}

// A slot is "in the past" only when it's today and its start time has already
// passed (with a small grace buffer so you can't book a class starting now).
function isSlotInPast(dateStr, time) {
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  if (dateStr !== todayStr) return false
  const [h, m] = time.split(':').map(Number)
  const slot = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m)
  const GRACE_MIN = 15 // can't book a class starting within the next 15 minutes
  return slot.getTime() <= now.getTime() + GRACE_MIN * 60 * 1000
}

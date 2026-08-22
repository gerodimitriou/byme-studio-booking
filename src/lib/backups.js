// Daily in-app backups: a JSON snapshot of all business data, one per day,
// stored in the `backups` table (see supabase_backups_table.sql).
//
// The admin panel calls autoBackupIfDue() on load — if today's snapshot
// doesn't exist yet, it creates one silently. Old snapshots (>60 days) are
// pruned server-side. Each row can be re-downloaded as an Excel workbook.
import { supabase } from './supabase.js'

/** YYYY-MM-DD for today, in local time. */
function todayKey() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** Most recent backup metadata (no snapshot blob), or null. */
export async function latestBackup() {
  const { data, error } = await supabase
    .from('backups')
    .select('id, created_at, snapshot_date, bookings_count, members_count, subscriptions_count')
    .order('snapshot_date', { ascending: false })
    .limit(1)
  if (error) throw error
  return data?.[0] || null
}

/** Recent backups (metadata only) for the list view. */
export async function listBackups(limit = 60) {
  const { data, error } = await supabase
    .from('backups')
    .select('id, created_at, snapshot_date, bookings_count, members_count, subscriptions_count')
    .order('snapshot_date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

/** Full snapshot blob for one backup (for download). */
export async function getBackupSnapshot(id) {
  const { data, error } = await supabase
    .from('backups')
    .select('snapshot_date, snapshot')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

/**
 * Upsert today's snapshot from the data already loaded in the admin panel.
 * Overwrites if today's row exists (so re-opening the panel keeps it fresh).
 */
export async function createBackup({ bookings, members, subscriptions }) {
  // Guard: never overwrite/store an empty snapshot. If the admin panel loaded
  // partial data (e.g. an auth hiccup left members empty), skip the backup so a
  // good earlier snapshot isn't clobbered with zeros. A truly-empty studio is
  // not a realistic state once it has members.
  if (!members?.length && !bookings?.length) {
    return null
  }

  const snapshot_date = todayKey()
  const row = {
    snapshot_date,
    bookings_count:      bookings?.length      || 0,
    members_count:       members?.length       || 0,
    subscriptions_count: subscriptions?.length || 0,
    snapshot: { bookings: bookings || [], members: members || [], subscriptions: subscriptions || [] },
  }
  const { error } = await supabase.from('backups').upsert(row, { onConflict: 'snapshot_date' })
  if (error) throw error
  // Best-effort prune; ignore failures.
  await supabase.rpc('prune_backups').catch(() => {})
  return snapshot_date
}

/** Create today's snapshot only if it doesn't exist yet. Returns true if created. */
export async function autoBackupIfDue(data) {
  const last = await latestBackup()
  if (last?.snapshot_date === todayKey()) return false
  await createBackup(data)
  return true
}

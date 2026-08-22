import { supabase } from './supabase.js'
import { setSessionToken, getSessionToken } from './session.js'

// ── Member access wrappers ──────────────────────────────────
// These call SECURITY DEFINER RPCs when they exist (so the members table can
// be locked down by RLS — see supabase_security_upgrade.sql), and gracefully
// fall back to direct queries when the migration hasn't been applied yet.
// That makes the whole app safe to deploy BEFORE or AFTER running the
// migration: nothing breaks in either state.

function rpcMissing(error) {
  if (!error) return false
  const code = error.code || ''
  const msg  = (error.message || '').toLowerCase()
  // 42883 = undefined_function (Postgres) · PGRST202 = PostgREST can't find it
  return (
    code === '42883' ||
    code === 'PGRST202' ||
    msg.includes('could not find') ||
    (msg.includes('function') && msg.includes('does not exist'))
  )
}

/**
 * Validates a member login by email + code.
 * Returns the member row on success, the string 'locked' when the account is
 * temporarily locked after too many failed attempts, or null on bad credentials.
 */
export async function verifyMemberLogin(email, code) {
  const e = (email || '').toLowerCase().trim()
  const c = (code  || '').trim()

  const { data, error } = await supabase.rpc('verify_member_login', { p_email: e, p_code: c })
  if (!error) {
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return null
    // The token is returned exactly once at login; stash it for member RPCs.
    if (row.session_token) setSessionToken(row.session_token)
    // Keep session_token out of the profile object we hand back to callers.
    const { session_token, ...member } = row
    return member
  }
  // Lockout raises a custom error with hint 'locked' (see verify_member_login).
  if ((error.message || '').toLowerCase().includes('too many login attempts') ||
      error.hint === 'locked') {
    return 'locked'
  }
  if (!rpcMissing(error)) return null

  // Fallback: direct query (works while RLS is still open)
  const { data: row } = await supabase
    .from('members')
    .select('id, name, email, phone, member_code, active')
    .eq('email', e)
    .eq('member_code', c)
    .eq('active', true)
    .single()
  return row || null
}

/**
 * Updates a member's own phone and/or code. The current code is required as
 * proof of ownership. Returns { ok, error } where error ∈ 'taken' | 'fail'.
 */
export async function updateMemberSelf({ id, currentCode, phone = null, newCode = null }) {
  // Token-based path: the session token proves ownership server-side, so we no
  // longer send id/current_code. Falls back to the legacy direct update if the
  // RPC isn't deployed (rollout window).
  const token = getSessionToken()
  if (token) {
    const { data, error } = await supabase.rpc('update_member_self', {
      p_token: token,
      p_phone: phone,
      p_new_code: newCode,
    })
    if (!error) {
      if (data === 'ok')    return { ok: true }
      if (data === 'taken') return { ok: false, error: 'taken' }
      return { ok: false, error: 'fail' }
    }
    if (!rpcMissing(error)) return { ok: false, error: 'fail' }
  }

  // Fallback: direct update (RLS still open)
  if (newCode) {
    const { data: existing } = await supabase
      .from('members').select('id').eq('member_code', newCode).neq('id', id).maybeSingle()
    if (existing) return { ok: false, error: 'taken' }
  }
  const patch = {}
  if (phone   != null) patch.phone = phone
  if (newCode != null) patch.member_code = newCode
  const { error: upErr } = await supabase.from('members').update(patch).eq('id', id)
  return upErr ? { ok: false, error: 'fail' } : { ok: true }
}

/** Finds a member id by email (used by standby promotion). Returns uuid or null. */
export async function memberIdByEmail(email) {
  const e = (email || '').toLowerCase().trim()
  const { data, error } = await supabase.rpc('member_id_by_email', { p_email: e })
  if (!error) return data || null

  if (!rpcMissing(error)) return null
  const { data: m } = await supabase.from('members').select('id').eq('email', e).single()
  return m?.id || null
}

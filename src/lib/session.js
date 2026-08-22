// Member session token (issued by verify_member_login, stored separately from
// the member profile row). Every member-scoped RPC sends this so the server can
// prove identity instead of trusting a client-supplied email. See
// supabase migrations: member_sessions + _member_from_token.

export const ME_SESSION_KEY = 'me_session'

export function getSessionToken() {
  try {
    return localStorage.getItem(ME_SESSION_KEY) || null
  } catch {
    return null
  }
}

export function setSessionToken(token) {
  try {
    if (token) localStorage.setItem(ME_SESSION_KEY, token)
  } catch { /* ignore */ }
}

export function clearSessionToken() {
  try {
    localStorage.removeItem(ME_SESSION_KEY)
  } catch { /* ignore */ }
}

// Medical certificate (χαρτί γιατρού): a member uploads a photo/PDF once a year.
// Files live in the private `medical-certificates` bucket; member writes go
// through SECURITY DEFINER RPCs (members aren't Supabase-authenticated).
import { supabase } from './supabase.js'

const BUCKET = 'medical-certificates'
const ACCEPTED = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'application/pdf']
const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

/** Derive a safe file extension from the upload. */
function extFor(file) {
  const fromName = (file.name?.split('.').pop() || '').toLowerCase()
  if (fromName) return fromName
  if (file.type === 'application/pdf') return 'pdf'
  if (file.type === 'image/png') return 'png'
  return 'jpg'
}

/**
 * Uploads a member's certificate and records it. Validity is 12 months from
 * the certificate's real ISSUE date (`issuedAt`, a 'YYYY-MM-DD' string); if
 * omitted the server uses today. Returns { ok, uploaded_at, expires_at, issued_at }
 * or { ok: false, reason }.
 */
export async function uploadMedicalCertificate(memberId, file, issuedAt = null) {
  if (!file) return { ok: false, reason: 'no-file' }
  if (!ACCEPTED.includes(file.type)) return { ok: false, reason: 'bad-type' }
  if (file.size > MAX_BYTES) return { ok: false, reason: 'too-large' }

  const path = `${memberId}/${Date.now()}.${extFor(file)}`

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (upErr) return { ok: false, reason: 'upload-failed', error: upErr }

  const { data, error } = await supabase.rpc('add_medical_certificate', {
    p_member_id: memberId,
    p_file_path: path,
    p_issued_at: issuedAt || null,
  })
  if (error) return { ok: false, reason: 'save-failed', error }

  const row = Array.isArray(data) ? data[0] : data
  return { ok: true, uploaded_at: row?.uploaded_at, expires_at: row?.expires_at, issued_at: row?.issued_at }
}

/**
 * Admin: latest certificate per member id, as a map { [member_id]: row }.
 * Reads the table directly (admin is authenticated). Returns {} on error.
 */
export async function fetchMedicalByMember() {
  const { data, error } = await supabase
    .from('medical_certificates')
    .select('id, member_id, file_path, uploaded_at, expires_at, issued_at, reviewed_at')
    .order('uploaded_at', { ascending: false })
  if (error || !data) return {}
  const map = {}
  for (const row of data) {
    if (!map[row.member_id]) map[row.member_id] = row // first = newest
  }
  return map
}

/**
 * Admin: record a certificate that a member brought in person (no file).
 * `expiresAt` is 'YYYY-MM-DD'. Returns the new cert row or { ok: false }.
 */
export async function adminRecordManualCert(memberId, expiresAt) {
  if (!memberId || !expiresAt) return { ok: false }
  const { data, error } = await supabase.rpc('admin_record_manual_certificate', {
    p_member_id:  memberId,
    p_expires_at: expiresAt,
  })
  if (error) return { ok: false, error }
  const row = Array.isArray(data) ? data[0] : data
  return { ok: true, ...row }
}

/**
 * Admin: manually override a certificate's validity end date. `expiresAt` is a
 * 'YYYY-MM-DD' string. The member sees the new date immediately (the /me card
 * and `my_medical_certificate` read the same `expires_at`).
 */
export async function updateCertExpiry(id, expiresAt) {
  if (!id || !expiresAt) return { ok: false }
  const { error } = await supabase
    .from('medical_certificates')
    .update({ expires_at: expiresAt })
    .eq('id', id)
  return { ok: !error, error }
}

/**
 * Admin: approve a certificate — sets reviewed_at = now() and optionally
 * updates expires_at. `expiresAt` is 'YYYY-MM-DD' or null (keep existing).
 */
export async function adminApproveCert(id, expiresAt = null) {
  if (!id) return { ok: false }
  const patch = { reviewed_at: new Date().toISOString() }
  if (expiresAt) patch.expires_at = expiresAt
  const { error } = await supabase
    .from('medical_certificates')
    .update(patch)
    .eq('id', id)
  return { ok: !error, error }
}

/** Admin: a temporary signed URL to view/download a certificate file. */
export async function signedCertUrl(filePath) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60 * 5) // valid 5 minutes
  if (error) return null
  return data?.signedUrl || null
}

/** Latest certificate status for a member, or null if none uploaded. */
export async function myMedicalCertificate(memberId) {
  const { data, error } = await supabase.rpc('my_medical_certificate', { p_member_id: memberId })
  if (error) return null
  const row = Array.isArray(data) ? data[0] : data
  return row || null
}

/**
 * Classify a certificate's status for display.
 * → 'missing' | 'expired' | 'expiring' (≤30 days left) | 'valid'
 */
export function certStatus(cert) {
  if (!cert?.expires_at) return 'missing'
  // Uploaded but not yet reviewed by admin → pending, not valid yet.
  if (!cert.reviewed_at) return 'pending'
  const now = Date.now()
  const exp = new Date(cert.expires_at).getTime()
  if (exp <= now) return 'expired'
  if (exp - now <= 30 * 86400000) return 'expiring'
  return 'valid'
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import {
  PLAN_PRESETS,
  addMonths,
  todayStr,
  ymd,
  formatDate,
  sessionsLeft,
  subStatusLabel,
  isExpired,
  isPresent,
  fetchMemberSubscriptions,
  createSubscription,
  cancelSubscription,
  incrementUsedSession,
  decrementUsedSession,
  incrementSessionTotal,
} from '../lib/subscriptions.js'
import { loadSettings } from '../lib/settings.js'
import { signedCertUrl, certStatus, updateCertExpiry, adminRecordManualCert, adminApproveCert } from '../lib/medical.js'

const iCls = 'w-full bg-ink/[0.04] dark:bg-ink/40 border border-ink/[0.12] dark:border-bone/[0.15] hover:border-ink/30 dark:hover:border-bone/30 focus:border-bronze focus:ring-1 focus:ring-bronze text-ink dark:text-bone placeholder:text-ink/30 dark:placeholder:text-bone/30 rounded-sm px-4 py-3 text-base font-sans outline-none transition-colors duration-200'
const lCls = 'block text-[11px] font-sans font-semibold text-bronze tracking-[0.2em] uppercase mb-2'

// activeSubs: all currently active subs for this member (may be Pilates + Group simultaneously)
function NewSubForm({ memberId, activeSubs = [], onDone, onCancel, plans = PLAN_PRESETS }) {
  const [presetIdx,   setPresetIdx]   = useState(0)
  const [start,       setStart]       = useState(todayStr())
  const [end,         setEnd]         = useState(addMonths(todayStr(), 1))
  const [notes,       setNotes]       = useState('')
  const [price,       setPrice]       = useState('') // final price; empty = package default
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [doCarryover, setDoCarryover] = useState(false)

  const preset = plans[presetIdx] ?? plans[0]
  const finalPrice = price.trim() !== '' ? (Number(price) || 0) : preset.price

  // Only match the sub for the SELECTED service
  const prefix = preset.service === 'Pilates Reformer' ? 'Pilates' : 'Group'
  const matchingSubs = activeSubs.filter(s => s.plan_name?.startsWith(prefix))
  const matchingSub  = matchingSubs[0] ?? null
  const available = matchingSub && matchingSub.plan_type === 'sessions' ? sessionsLeft(matchingSub) : 0
  const carryover = doCarryover ? available : 0
  const finalSessions = preset.type === 'sessions' ? (preset.sessions ?? 0) + carryover : null

  function handleStartChange(val) {
    setStart(val)
    setEnd(addMonths(val, 1))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true); setError('')

    // Cancel ALL active subs for this service before creating the new one
    await Promise.all(matchingSubs.map(s => cancelSubscription(s.id)))

    const { error: dbErr } = await createSubscription({
      member_id:      memberId,
      plan_name:      preset.name,
      plan_type:      preset.type,
      sessions_total: finalSessions,
      price:          finalPrice,
      start_date:     start,
      end_date:       end,
      notes:          notes.trim() || null,
    })
    if (dbErr) { setError('Σφάλμα αποθήκευσης.'); setSaving(false); return }
    onDone()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-ink/[0.04] dark:bg-ink/40 border border-bronze/20 rounded-sm p-5">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-bronze text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">
          {matchingSub ? 'Ανανέωση' : 'Νέα Συνδρομή'}
        </span>
        <span className="h-px flex-1 bg-bronze/20" />
      </div>

      {matchingSub && available > 0 && preset.type === 'sessions' && (
        <label className="flex items-start gap-3 bg-bronze/[0.05] border border-bronze/20 rounded-sm px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={doCarryover}
            onChange={e => setDoCarryover(e.target.checked)}
            className="mt-0.5 accent-bronze w-4 h-4 shrink-0 cursor-pointer"
          />
          <span className="text-[13px] font-sans text-ink/80 dark:text-bone/80 leading-snug">
            Μεταφορά <span className="text-bronze font-semibold">{available} υπολοίπων συνεδριών</span> στο νέο πακέτο
            {doCarryover && <span className="text-ink/55 dark:text-bone/55"> · σύνολο {finalSessions} συν.</span>}
          </span>
        </label>
      )}

      <div>
        <label className={lCls}>Πακέτο</label>
        <select value={presetIdx} onChange={(e) => { setPresetIdx(+e.target.value); setDoCarryover(false) }} className={`${iCls} cursor-pointer`}>
          {['Pilates Reformer', 'Group Training'].map(svc => {
            const group = plans.map((p, i) => ({ p, i })).filter(({ p }) => p.service === svc)
            if (!group.length) return null
            return (
              <optgroup key={svc} label={svc}>
                {group.map(({ p, i }) => (
                  <option key={p.name} value={i}>
                    {p.name} {p.type === 'sessions' ? `· ${p.sessions} συν. · ${p.price}€` : `· Unlimited · ${p.price}€`}
                  </option>
                ))}
              </optgroup>
            )
          })}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lCls}>Έναρξη</label>
          <input type="date" value={start} onChange={(e) => handleStartChange(e.target.value)} className={iCls} />
        </div>
        <div>
          <label className={lCls}>Λήξη</label>
          <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className={iCls} />
        </div>
      </div>
      <div>
        <label className={lCls}>Έκπτωση — τελική τιμή (€)</label>
        <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={`${preset.price}`} className={iCls} />
        <p className="text-ink/45 dark:text-bone/40 text-xs font-sans mt-1.5">Άφησέ το κενό για την κανονική τιμή ({preset.price}€).</p>
      </div>
      <div>
        <label className={lCls}>Σημειώσεις (προαιρετικά)</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="π.χ. Πληρώθηκε μετρητοίς" className={iCls} />
      </div>
      {error && <p className="text-ember text-sm bg-ember/10 border border-ember/30 rounded-sm px-3 py-2 font-sans">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 border border-ink/[0.15] dark:border-bone/[0.15] hover:border-ink/30 dark:hover:border-bone/30 text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone text-[13px] font-sans font-semibold tracking-[0.16em] uppercase py-3 rounded-full transition-colors cursor-pointer">
          Άκυρο
        </button>
        <button type="submit" disabled={saving} className="flex-1 bg-bronze hover:bg-amber disabled:opacity-50 text-ink font-sans font-semibold text-[13px] tracking-[0.16em] uppercase py-3 rounded-full transition-colors cursor-pointer">
          {saving ? '…' : 'Δημιουργία'}
        </button>
      </div>
    </form>
  )
}

function SubCard({ sub, isAdmin, onRefresh }) {
  const [busy, setBusy] = useState(false)
  const st      = subStatusLabel(sub)
  const expired = isExpired(sub)
  const sLeft   = sessionsLeft(sub)
  const active  = sub.status === 'active' && !expired

  async function handleUseSession() {
    setBusy(true); await incrementUsedSession(sub.id); await onRefresh(); setBusy(false)
  }
  async function handleRefundSession() {
    setBusy(true); await incrementSessionTotal(sub.id); await onRefresh(); setBusy(false)
  }
  async function handleCancel() {
    if (!confirm('Σίγουρα ακύρωση της συνδρομής;')) return
    setBusy(true); await cancelSubscription(sub.id); await onRefresh(); setBusy(false)
  }

  const tone = st.tone === 'bronze'
    ? 'border-bronze/30 bg-bronze/[0.05]'
    : 'border-ember/30 bg-ember/[0.05] opacity-80'

  return (
    <div className={`rounded-sm border ${tone} p-5`}>
      <div className="flex justify-end mb-3">
        <span className={`text-[11px] font-sans font-semibold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full border ${
          st.tone === 'bronze' ? 'bg-bronze/15 text-bronze border-bronze/30' : 'bg-ember/10 text-ember border-ember/30'
        }`}>
          {st.label}
        </span>
      </div>

      <div className="text-center mb-5">
        <p className="text-bronze font-sans font-semibold text-7xl leading-none tabular-nums">
          {sub.plan_type === 'unlimited' ? '∞' : (active ? sLeft : 0)}
        </p>
        <p className="text-ink/70 dark:text-bone/60 text-sm font-sans font-semibold tracking-[0.18em] uppercase mt-4">
          {sub.plan_type === 'unlimited' ? 'Απεριόριστες προπονήσεις' : 'Προπονήσεις διαθέσιμες'}
        </p>
        <p className="text-ink/45 dark:text-bone/40 text-xs font-sans font-semibold tracking-[0.16em] uppercase mt-2">
          {sub.plan_name?.startsWith('Pilates') ? '— Pilates Reformer —' : sub.plan_name?.startsWith('Group') ? '— Group Training —' : ''}
        </p>
      </div>

      <div className="flex items-center justify-between text-xs font-sans tracking-[0.12em] uppercase mb-4 px-1">
        <div className="flex flex-col items-start gap-1">
          <span className="text-ink/45 dark:text-bone/35 text-[11px]">ΕΝΑΡΞΗ</span>
          <span className="text-ink dark:text-bone font-semibold normal-case tracking-normal text-sm">{formatDate(sub.start_date)}</span>
        </div>
        <span className="text-ink/20 dark:text-bone/20">—</span>
        <div className="flex flex-col items-end gap-1">
          <span className="text-ink/45 dark:text-bone/35 text-[11px]">ΛΗΞΗ</span>
          <span className="text-ink dark:text-bone font-semibold normal-case tracking-normal text-sm">{formatDate(sub.end_date)}</span>
        </div>
      </div>

      {/* Package the member bought + the price they paid (final/discounted). */}
      <div className="flex items-center justify-between gap-3 text-xs font-sans mb-4 px-1 pt-3 border-t border-current/10">
        <div className="flex flex-col items-start gap-1 min-w-0">
          <span className="text-ink/45 dark:text-bone/35 text-[11px] tracking-[0.12em] uppercase">Πακέτο</span>
          <span className="text-ink dark:text-bone font-semibold text-sm truncate">{sub.plan_name}</span>
        </div>
        {sub.price != null && sub.price !== '' && (
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-ink/45 dark:text-bone/35 text-[11px] tracking-[0.12em] uppercase">Τιμή</span>
            <span className="text-ink dark:text-bone font-semibold text-sm tabular-nums">{Number(sub.price)}€</span>
          </div>
        )}
      </div>

      {sub.notes && (
        <p className="text-ink/65 dark:text-bone/60 text-sm font-sans italic border-l-2 border-bronze/30 pl-3 mb-3">{sub.notes}</p>
      )}

      {isAdmin && active && (
        <div className="flex gap-2 mt-3">
          {sub.plan_type === 'sessions' && (
            <button onClick={handleRefundSession} disabled={busy}
              className="flex-1 border border-green-600/40 hover:bg-green-600/10 disabled:opacity-50 text-green-600 dark:text-green-400 text-[11px] font-sans font-semibold tracking-[0.16em] uppercase py-2.5 rounded-full transition-colors cursor-pointer">
              +1 Συνεδρία
            </button>
          )}
          {sub.plan_type === 'sessions' && sLeft > 0 && (
            <button onClick={handleUseSession} disabled={busy}
              className="flex-1 border border-ember/40 hover:bg-ember/10 disabled:opacity-50 text-ember text-[11px] font-sans font-semibold tracking-[0.16em] uppercase py-2.5 rounded-full transition-colors cursor-pointer">
              −1 Συνεδρία
            </button>
          )}
          <button onClick={handleCancel} disabled={busy}
            className="flex-1 bg-ember/15 border border-ember hover:bg-ember/25 disabled:opacity-50 text-ember text-[11px] font-sans font-semibold tracking-[0.16em] uppercase py-2.5 rounded-full transition-colors cursor-pointer">
            Ακύρωση
          </button>
        </div>
      )}
    </div>
  )
}

function HistorySubRow({ sub }) {
  const st = subStatusLabel(sub)
  return (
    <div className="py-4 border-b border-ink/[0.06] dark:border-bone/[0.06] last:border-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-ink dark:text-bone text-base font-serif italic truncate">{sub.plan_name}</p>
          <p className="text-ink/50 dark:text-bone/45 text-xs font-sans tracking-[0.1em] mt-1">
            {formatDate(sub.start_date)} → {formatDate(sub.end_date)}
            {sub.plan_type === 'sessions' && ` · ${sub.sessions_used ?? 0}/${sub.sessions_total ?? 0} συν.`}
          </p>
          {sub.notes && (
            <p className="text-ink/55 dark:text-bone/50 text-xs font-sans italic mt-1.5">{sub.notes}</p>
          )}
        </div>
        <span className={`text-[10px] font-sans font-semibold tracking-[0.16em] uppercase px-2.5 py-1 rounded-full border shrink-0 ${
          st.tone === 'bronze' ? 'bg-bronze/15 text-bronze border-bronze/30' : 'bg-ember/10 text-ember border-ember/30'
        }`}>
          {st.label}
        </span>
      </div>
    </div>
  )
}

// Doctor's certificate status + a button to open the file (signed URL).
const CERT_TONE = {
  valid:    { cls: 'border-bronze/30 bg-bronze/[0.05] text-bronze', label: 'Σε ισχύ' },
  expiring: { cls: 'border-amber/40 bg-amber/[0.08] text-amber',     label: 'Λήγει σύντομα' },
  expired:  { cls: 'border-ember/40 bg-ember/[0.08] text-ember',     label: 'Έληξε' },
  missing:  { cls: 'border-ink/[0.15] dark:border-bone/[0.15] bg-ink/[0.03] dark:bg-ink/40 text-ink/55 dark:text-bone/55', label: 'Δεν έχει ανεβάσει' },
  pending:  { cls: 'border-bronze/20 bg-bronze/[0.05] text-bronze/70', label: 'Προς έλεγχο' },
}
function MedicalCertView({ cert: initialCert, memberId, isAdmin = false }) {
  const [cert,         setCert]        = useState(initialCert)
  const [opening,      setOpening]     = useState(false)
  const [editing,      setEditing]     = useState(false)
  const [draft,        setDraft]       = useState('')
  const [saving,       setSaving]      = useState(false)
  const [approving,    setApproving]   = useState(false)
  // Manual "brought in person" form state
  const [manualMode,   setManualMode]  = useState(false)
  const [manualExp,    setManualExp]   = useState('')
  const [manualSaving, setManualSaving] = useState(false)
  const status = certStatus(cert)
  const tone = CERT_TONE[status]
  const needsApproval = isAdmin && cert?.id && !cert?.reviewed_at

  async function openFile() {
    if (!cert?.file_path) return
    setOpening(true)
    const url = await signedCertUrl(cert.file_path)
    setOpening(false)
    if (url) window.open(url, '_blank', 'noopener')
  }

  function startEdit() {
    setDraft((cert?.expires_at || '').slice(0, 10))
    setEditing(true)
  }
  async function saveExpiry() {
    if (!cert?.id || !/^\d{4}-\d{2}-\d{2}$/.test(draft)) return
    setSaving(true)
    // A not-yet-reviewed cert: saving the date approves it in the same step.
    // An already-approved cert: just update the expiry date.
    const res = cert.reviewed_at
      ? await updateCertExpiry(cert.id, draft)
      : await adminApproveCert(cert.id, draft)
    setSaving(false)
    if (res.ok) {
      setCert(c => ({ ...c, expires_at: draft, reviewed_at: c.reviewed_at || new Date().toISOString() }))
      setEditing(false)
    }
  }

  async function saveManual() {
    if (!memberId || !/^\d{4}-\d{2}-\d{2}$/.test(manualExp)) return
    setManualSaving(true)
    const res = await adminRecordManualCert(memberId, manualExp)
    setManualSaving(false)
    if (res.ok) {
      setCert({ id: res.id, uploaded_at: res.uploaded_at, expires_at: res.expires_at, issued_at: res.issued_at, file_path: null, reviewed_at: new Date().toISOString() })
      setManualMode(false)
      setManualExp('')
    }
  }

  async function approveNow() {
    if (!cert?.id) return
    setApproving(true)
    const res = await adminApproveCert(cert.id, null)
    setApproving(false)
    if (res.ok) setCert(c => ({ ...c, reviewed_at: new Date().toISOString() }))
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-bronze text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">Χαρτί Γιατρού</span>
        <span className="h-px flex-1 bg-bronze/20" />
      </div>
      <div className={`rounded-sm border p-4 ${tone.cls}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-sans font-semibold tracking-[0.16em] uppercase">{tone.label}</p>
            {cert?.issued_at && (
              <p className="text-sm font-sans mt-1.5 opacity-85">Έκδοση {formatDate(cert.issued_at.slice(0, 10))}</p>
            )}
            {cert?.expires_at && !editing && (
              <p className="text-sm font-sans mt-0.5 opacity-85">
                {status === 'expired' ? 'Έληξε' : 'Ισχύει έως'} {formatDate(cert.expires_at.slice(0, 10))}
              </p>
            )}
          </div>
          {cert?.file_path && (
            <button
              onClick={openFile}
              disabled={opening}
              className="shrink-0 flex items-center gap-2 border border-current/30 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-50 text-xs font-sans font-semibold tracking-[0.12em] uppercase px-3.5 py-2.5 rounded-full transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {opening ? '…' : 'Άνοιγμα'}
            </button>
          )}
        </div>

        {/* Admin: record cert brought in person when no cert exists yet */}
        {isAdmin && !cert?.id && (
          manualMode ? (
            <div className="mt-3 pt-3 border-t border-current/15 flex flex-col sm:flex-row sm:items-end gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-sans font-semibold tracking-[0.16em] uppercase opacity-75 mb-1.5">Ισχύει έως</label>
                <input
                  type="date"
                  value={manualExp}
                  onChange={e => setManualExp(e.target.value)}
                  className="w-full bg-ivory dark:bg-ink/40 border border-current/25 focus:border-bronze focus:ring-1 focus:ring-bronze text-ink dark:text-bone rounded-sm px-3 py-2.5 text-base font-sans outline-none transition-colors"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={saveManual} disabled={manualSaving || !/^\d{4}-\d{2}-\d{2}$/.test(manualExp)} className="bg-bronze hover:bg-amber disabled:opacity-50 text-ink text-xs font-sans font-semibold tracking-[0.12em] uppercase px-4 py-2.5 rounded-full transition-colors cursor-pointer">
                  {manualSaving ? '…' : 'Καταγραφή'}
                </button>
                <button onClick={() => { setManualMode(false); setManualExp('') }} className="border border-current/30 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-xs font-sans font-semibold tracking-[0.12em] uppercase px-4 py-2.5 rounded-full transition-colors cursor-pointer">
                  Άκυρο
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setManualMode(true)} className="mt-3 inline-flex items-center gap-1.5 text-xs font-sans font-semibold tracking-[0.12em] uppercase text-bronze hover:text-amber transition-colors cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Καταγραφή (φέρθηκε αυτοπροσώπως)
            </button>
          )
        )}

        {cert?.id && (
          editing ? (
            <div className="mt-3 pt-3 border-t border-current/15 flex flex-col sm:flex-row sm:items-end gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-sans font-semibold tracking-[0.16em] uppercase opacity-75 mb-1.5">Ισχύει έως</label>
                <input
                  type="date"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  className="w-full bg-ivory dark:bg-ink/40 border border-current/25 focus:border-bronze focus:ring-1 focus:ring-bronze text-ink dark:text-bone rounded-sm px-3 py-2.5 text-base font-sans outline-none transition-colors"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={saveExpiry} disabled={saving || !/^\d{4}-\d{2}-\d{2}$/.test(draft)} className="bg-bronze hover:bg-amber disabled:opacity-50 text-ink text-xs font-sans font-semibold tracking-[0.12em] uppercase px-4 py-2.5 rounded-full transition-colors cursor-pointer">
                  {saving ? '…' : (needsApproval ? 'Έγκριση' : 'Αποθήκευση')}
                </button>
                <button onClick={() => setEditing(false)} className="border border-current/30 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-xs font-sans font-semibold tracking-[0.12em] uppercase px-4 py-2.5 rounded-full transition-colors cursor-pointer">
                  Άκυρο
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              {needsApproval && (
                <button
                  onClick={approveNow}
                  disabled={approving}
                  className="inline-flex items-center gap-1.5 bg-bronze hover:bg-amber disabled:opacity-50 text-ink text-xs font-sans font-semibold tracking-[0.12em] uppercase px-3.5 py-2 rounded-full transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {approving ? '…' : 'Εγκρίνω'}
                </button>
              )}
              <button onClick={startEdit} className="inline-flex items-center gap-1.5 text-xs font-sans font-semibold tracking-[0.12em] uppercase text-bronze hover:text-amber transition-colors cursor-pointer">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                {needsApproval ? 'Αλλαγή ημ. λήξης & έγκριση' : 'Αλλαγή ημ. λήξης'}
              </button>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default function MemberDetailModal({ member, isAdmin = false, medicalCert = null, onClose }) {
  const [subs,     setSubs]     = useState([])
  const [bookings, setBookings] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showNew,  setShowNew]  = useState(false)
  const [tab,      setTab]      = useState('subscription') // 'subscription' | 'history' | 'workouts'
  const [workoutFilter, setWorkoutFilter] = useState('completed') // 'completed' | 'pending' | 'cancelled'
  const [memberActive, setMemberActive] = useState(member?.active ?? true)
  const [plans,    setPlans]    = useState(PLAN_PRESETS)
  const [info,        setInfo]        = useState({ name: '', email: '', phone: '', member_code: '' })
  const [editingInfo, setEditingInfo] = useState(false)
  const [infoSaving,  setInfoSaving]  = useState(false)
  const [infoError,   setInfoError]   = useState('')

  useEffect(() => {
    loadSettings().then(s => setPlans(s.plans))
  }, [])

  async function saveInfo() {
    setInfoSaving(true); setInfoError('')
    const name  = info.name.trim()
    const email = info.email.toLowerCase().trim()
    const phone = info.phone.trim()
    if (!name || !email) { setInfoError('Όνομα και email είναι υποχρεωτικά.'); setInfoSaving(false); return }

    // The member's login code is managed elsewhere (it's their phone, editable
    // by the member in /me) — admin edits name/email/phone only, never the code.
    const { error } = await supabase
      .from('members').update({ name, email, phone }).eq('id', member.id)
    if (error) {
      const msg = (error.message || '').toLowerCase()
      if (msg.includes('name'))       setInfoError('Αυτό το όνομα υπάρχει ήδη.')
      else if (msg.includes('email')) setInfoError('Αυτό το email χρησιμοποιείται ήδη.')
      else                            setInfoError('Σφάλμα αποθήκευσης.')
      setInfoSaving(false); return
    }
    setInfo(p => ({ ...p, name, email, phone }))
    setEditingInfo(false)
    setInfoSaving(false)
  }

  async function refresh() {
    setLoading(true)
    const [s, b] = await Promise.all([
      // Direct query — bypasses the member-token path in fetchMemberSubscriptions
      // so the admin always sees the correct member's subs, not the token-holder's.
      supabase
        .from('subscriptions')
        .select('*')
        .eq('member_id', member.id)
        .order('created_at', { ascending: false })
        .then(r => r.data ?? []),
      supabase
        .from('bookings')
        .select('*')
        .eq('email', member.email)
        .order('booking_date', { ascending: false })
        .order('booking_time', { ascending: false })
        .limit(50),
    ])
    setSubs(s)
    setBookings(b.data ?? [])
    setLoading(false)
  }

  async function toggleActive() {
    const next = !memberActive
    setMemberActive(next)
    await supabase.from('members').update({ active: next }).eq('id', member.id)
  }

  useEffect(() => {
    if (member) refresh()
    setMemberActive(member?.active ?? true)
    setInfo({
      name:        member?.name        ?? '',
      email:       member?.email       ?? '',
      phone:       member?.phone       ?? '',
      member_code: member?.member_code ?? '',
    })
    setEditingInfo(false)
    setInfoError('')
  }, [member?.id])

  if (!member) return null

  const activeSubs = subs.filter((s) => s.status === 'active' && !isExpired(s))
  const activeSub  = activeSubs[0] ?? null
  const history    = subs.filter((s) => !activeSubs.includes(s))

  const todayDateStr = ymd(new Date())
  const completedBookings = bookings
    .filter(b => b.status !== 'cancelled' && b.booking_date < todayDateStr)
    .sort((a, b) => (b.booking_date + b.booking_time).localeCompare(a.booking_date + a.booking_time))
  const pendingBookings = bookings
    .filter(b => b.status !== 'cancelled' && b.booking_date >= todayDateStr)
    .sort((a, b) => (a.booking_date + a.booking_time).localeCompare(b.booking_date + b.booking_time))
  const cancelledBookings = bookings
    .filter(b => b.status === 'cancelled')
    .sort((a, b) => (b.booking_date + b.booking_time).localeCompare(a.booking_date + a.booking_time))

  const visibleBookings = workoutFilter === 'completed' ? completedBookings
                        : workoutFilter === 'pending'   ? pendingBookings
                        : cancelledBookings

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4 bg-ink/80 backdrop-blur-sm overflow-y-auto" onClick={onClose}>
      <div
        className="bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-none sm:rounded-sm w-full sm:max-w-xl min-h-screen sm:min-h-0 sm:max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-5 border-b border-ink/[0.1] dark:border-bone/[0.1] flex items-start justify-between sticky top-0 bg-white dark:bg-coal z-10">
          <div>
            <p className="text-bronze text-[11px] font-sans font-semibold tracking-[0.22em] uppercase mb-1">Μέλος</p>
            <h2 className="text-ink dark:text-bone text-2xl font-serif italic">{info.name || member.name}</h2>
            <p className="text-ink/65 dark:text-bone/60 text-sm mt-1.5">{info.email || member.email}</p>
            {(info.phone || member.phone) && <p className="text-ink/65 dark:text-bone/60 text-sm mt-0.5">{info.phone || member.phone}</p>}
          </div>
          <button onClick={onClose} className="text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone transition-colors mt-1">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-4 flex gap-1 border-b border-ink/[0.06] dark:border-bone/[0.06] overflow-x-auto">
          {[
            { key: 'subscription', label: 'Συνδρομή' },
            { key: 'history',      label: `Ιστορικό${subs.length > 1 ? ` (${subs.length - (subs.find(s => s.status === 'active' && !isExpired(s)) ? 1 : 0)})` : ''}` },
            { key: 'workouts',     label: `Προπονήσεις${completedBookings.length ? ` (${completedBookings.length})` : ''}` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 text-xs font-sans font-semibold tracking-[0.15em] uppercase py-3.5 transition-colors cursor-pointer border-b-2 ${
                tab === t.key ? 'text-bronze border-bronze' : 'text-ink/45 dark:text-bone/45 hover:text-ink dark:hover:text-bone border-transparent'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="px-6 py-5 space-y-5">
          {tab === 'subscription' && (
            <>
              {/* Active subscription */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-bronze text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">Τρέχουσα Συνδρομή</span>
                  <span className="h-px flex-1 bg-bronze/20" />
                </div>
                {loading ? (
                  <p className="text-ink/55 dark:text-bone/55 text-base font-sans">Φόρτωση…</p>
                ) : activeSubs.length > 0 ? (
                  <div className="space-y-3">
                    {activeSubs.map(s => <SubCard key={s.id} sub={s} isAdmin={isAdmin} onRefresh={refresh} />)}
                  </div>
                ) : (
                  <div className="bg-ink/[0.03] dark:bg-ink/40 border border-dashed border-ink/[0.15] dark:border-bone/[0.15] rounded-sm p-5 text-center">
                    <p className="text-ink/60 dark:text-bone/60 text-base font-serif italic">Καμία ενεργή συνδρομή</p>
                  </div>
                )}
              </div>

              {/* Doctor's certificate */}
              <MedicalCertView cert={medicalCert} memberId={member.id} isAdmin={isAdmin} />

              {/* Renew / new */}
              {isAdmin && (
                <>
                  {showNew ? (
                    <NewSubForm
                      memberId={member.id}
                      activeSubs={activeSubs}
                      plans={plans}
                      onDone={() => { setShowNew(false); refresh() }}
                      onCancel={() => setShowNew(false)}
                    />
                  ) : (
                    <button
                      onClick={() => setShowNew(true)}
                      className="w-full bg-bronze hover:bg-amber text-ink font-sans font-semibold text-[13px] tracking-[0.18em] uppercase py-4 rounded-full transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Νέα / Ανανέωση Συνδρομής
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {tab === 'history' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-bronze text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">Ιστορικό Συνδρομών</span>
                <span className="h-px flex-1 bg-bronze/20" />
              </div>
              {loading ? (
                <p className="text-ink/55 dark:text-bone/55 text-base font-sans py-6 text-center">Φόρτωση…</p>
              ) : history.length === 0 ? (
                <div className="bg-ink/[0.03] dark:bg-ink/40 border border-dashed border-ink/[0.15] dark:border-bone/[0.15] rounded-sm p-6 text-center">
                  <p className="text-ink/60 dark:text-bone/60 text-base font-serif italic">Δεν υπάρχουν προηγούμενες συνδρομές.</p>
                </div>
              ) : (
                <div className="bg-ink/[0.03] dark:bg-ink/40 border border-ink/[0.08] dark:border-bone/[0.08] rounded-sm px-4">
                  {history.map((s) => (
                    <HistorySubRow key={s.id} sub={s} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'workouts' && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-bronze text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">Προπονήσεις</span>
                <span className="h-px flex-1 bg-bronze/20" />
              </div>

              <div className="flex gap-1 bg-ink/[0.04] dark:bg-ink/40 border border-ink/[0.1] dark:border-bone/[0.1] rounded-full p-1 mb-4">
                {[
                  { key: 'completed', label: 'Ολοκληρωμένες', count: completedBookings.length },
                  { key: 'pending',   label: 'Εκκρεμείς',     count: pendingBookings.length },
                  { key: 'cancelled', label: 'Ακυρωμένες',    count: cancelledBookings.length },
                ].map(f => (
                  <button
                    key={f.key}
                    onClick={() => setWorkoutFilter(f.key)}
                    className={`flex-1 text-[11px] font-sans tracking-[0.12em] uppercase py-2.5 rounded-full transition-colors cursor-pointer ${
                      workoutFilter === f.key ? 'bg-bronze text-ink font-semibold' : 'text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone'
                    }`}
                  >
                    {f.label}
                    {f.count > 0 && (
                      <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${workoutFilter === f.key ? 'bg-ink/20 text-bone' : 'bg-ink/[0.06] dark:bg-bone/10'}`}>
                        {f.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {loading ? (
                <p className="text-ink/55 dark:text-bone/55 text-base font-sans py-6 text-center">Φόρτωση…</p>
              ) : visibleBookings.length === 0 ? (
                <div className="bg-ink/[0.03] dark:bg-ink/40 border border-dashed border-ink/[0.15] dark:border-bone/[0.15] rounded-sm p-6 text-center">
                  <p className="text-ink/60 dark:text-bone/60 text-base font-serif italic">
                    {workoutFilter === 'completed' && 'Δεν υπάρχουν ολοκληρωμένες προπονήσεις.'}
                    {workoutFilter === 'pending'   && 'Δεν υπάρχουν εκκρεμείς προπονήσεις.'}
                    {workoutFilter === 'cancelled' && 'Δεν υπάρχουν ακυρωμένες προπονήσεις.'}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {visibleBookings.map(b => {
                    const stCls = b.status === 'cancelled'
                      ? 'bg-ember/10 text-ember/60 border-ember/20'
                      : b.status === 'confirmed'
                      ? 'bg-bronze/15 text-bronze border-bronze/30'
                      : 'bg-amber/15 text-amber border-amber/30'
                    const stLabel = b.status === 'cancelled' ? 'Ακυρώθηκε'
                                  : b.status === 'confirmed' ? 'Επιβ.'
                                  : 'Εκκρεμεί'
                    return (
                      <li key={b.id} className="rounded-sm border border-ink/[0.08] dark:border-bone/[0.08] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-ink dark:text-bone font-serif italic text-base leading-tight truncate">{b.service}</p>
                            <p className="text-ink/60 dark:text-bone/55 text-sm font-sans mt-1">
                              {formatDate(b.booking_date)} · {b.booking_time}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className={`text-[10px] font-sans font-semibold tracking-[0.16em] uppercase px-2.5 py-1 rounded-full border ${stCls}`}>
                              {stLabel}
                            </span>
                            {isPresent(b) && (
                              <span className="text-[10px] font-sans font-semibold tracking-[0.12em] uppercase px-2.5 py-1 rounded-full border bg-bronze/15 text-bronze border-bronze/30">Παρουσία</span>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Member details edit (admin only) — only on subscription tab */}
          {isAdmin && tab === 'subscription' && (
            <div className="pt-2 border-t border-ink/[0.08] dark:border-bone/[0.08]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-bronze text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">Στοιχεία Μέλους</span>
                {!editingInfo && (
                  <button
                    onClick={() => { setEditingInfo(true); setInfoError('') }}
                    className="text-bronze hover:text-amber text-[11px] font-sans font-semibold tracking-[0.16em] uppercase cursor-pointer"
                  >
                    Επεξεργασία
                  </button>
                )}
              </div>

              {editingInfo ? (
                <div className="space-y-3">
                  <div>
                    <label className={lCls}>Ονοματεπώνυμο</label>
                    <input value={info.name} onChange={e => setInfo(p => ({ ...p, name: e.target.value }))} className={iCls} />
                  </div>
                  <div>
                    <label className={lCls}>Email</label>
                    <input type="email" value={info.email} onChange={e => setInfo(p => ({ ...p, email: e.target.value }))} className={iCls} />
                  </div>
                  <div>
                    <label className={lCls}>Τηλέφωνο</label>
                    <input type="tel" value={info.phone} onChange={e => setInfo(p => ({ ...p, phone: e.target.value }))} className={iCls} />
                  </div>
                  {infoError && <p className="text-ember text-sm bg-ember/10 border border-ember/30 rounded-sm px-3 py-2 font-sans">{infoError}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setEditingInfo(false); setInfoError('') }}
                      className="flex-1 border border-ink/[0.15] dark:border-bone/[0.15] hover:border-ink/30 dark:hover:border-bone/30 text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone text-[13px] font-sans font-semibold tracking-[0.16em] uppercase py-3 rounded-full transition-colors cursor-pointer">
                      Άκυρο
                    </button>
                    <button type="button" onClick={saveInfo} disabled={infoSaving}
                      className="flex-1 bg-bronze hover:bg-amber disabled:opacity-50 text-ink font-sans font-semibold text-[13px] tracking-[0.16em] uppercase py-3 rounded-full transition-colors cursor-pointer">
                      {infoSaving ? '…' : 'Αποθήκευση'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-ink/[0.03] dark:bg-ink/40 border border-ink/[0.08] dark:border-bone/[0.08] rounded-sm px-4 py-3.5">
                  <span className="text-ink/60 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.16em] uppercase">Τηλέφωνο</span>
                  <span className="text-ink dark:text-bone font-sans font-semibold text-base">{info.phone || '—'}</span>
                </div>
              )}
            </div>
          )}

          {/* Account toggle (admin only) — only on subscription tab */}
          {isAdmin && tab === 'subscription' && (
            <div className="pt-2 border-t border-ink/[0.08] dark:border-bone/[0.08] flex items-center justify-between">
              <div>
                <p className="text-ink/60 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">Λογαριασμός</p>
                <p className="text-ink dark:text-bone text-base font-serif italic mt-1.5">
                  {memberActive ? 'Ενεργός — μπορεί να συνδεθεί' : 'Ανενεργός — δεν μπορεί να συνδεθεί'}
                </p>
              </div>
              <button
                onClick={toggleActive}
                className={`text-[11px] font-sans font-semibold tracking-[0.16em] uppercase border px-4 py-2.5 rounded-full transition-colors cursor-pointer shrink-0 ml-3 ${
                  memberActive
                    ? 'border-ember/40 hover:bg-ember/10 text-ember'
                    : 'border-bronze/40 hover:bg-bronze/10 text-bronze'
                }`}
              >
                {memberActive ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

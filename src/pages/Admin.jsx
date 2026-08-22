import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { BymeLogo } from '../lib/Logo.jsx'
import DatePicker from '../components/DatePicker.jsx'
import MemberDetailModal from '../components/MemberDetailModal.jsx'
import { SERVICES, SERVICE_CAPACITY, STANDBY_CAPACITY, GROUP_SERVICE, GROUP_TYPES, GROUP_TYPE_META } from '../lib/constants.js'
import { promoteStandby } from '../lib/standby.js'
import { loadSettings, saveSetting, slotsForDate, groupTypeFor, bookableSlots, DEFAULT_TIME_SLOTS, DEFAULT_SATURDAY_SLOTS, DEFAULT_CLOSED_WEEKDAYS, DEFAULT_PLANS } from '../lib/settings.js'
import { downloadCSV } from '../lib/csv.js'
import { downloadXLSX } from '../lib/xlsx.js'
import { autoBackupIfDue, listBackups, getBackupSnapshot } from '../lib/backups.js'
import { fetchMedicalByMember, signedCertUrl, certStatus, adminApproveCert } from '../lib/medical.js'
import {
  isExpired,
  expireOverdueSubscriptions,
  refundSessionForBooking,
  consumeSessionForBooking,
  activeSubscription,
  sessionsLeft,
  daysLeft,
  expiringSoon,
  lowSessions,
  isPresent,
  formatDate,
  PLAN_PRESETS,
  addMonths,
  addDays,
  todayStr,
} from '../lib/subscriptions.js'

const NAV = [
  { key: 'dashboard', label: 'Πίνακας',   icon: 'M2.25 12l8.954-8.955a1.5 1.5 0 012.122 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75' },
  { key: 'bookings',  label: 'Ραντεβού',  icon: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5' },
  { key: 'members',   label: 'Μέλη',      icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
  { key: 'settings',  label: 'Ρυθμίσεις', icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
]

const MONTHS_GR      = ['Ιαν','Φεβ','Μάρ','Απρ','Μάι','Ιούν','Ιούλ','Αύγ','Σεπ','Οκτ','Νοέ','Δεκ']
const MONTHS_GR_FULL = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος']
const DAYS_GR        = ['Δευ','Τρί','Τετ','Πέμ','Παρ','Σάβ','Κυρ']
const DAY_NAMES_GR   = ['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο']

const STATUS = {
  upcoming:  { label: 'Εκκρεμεί',     cls: 'bg-bronze/15 text-bronze border-bronze/30' },
  completed: { label: 'Ολοκληρώθηκε', cls: 'bg-green-900/20 text-green-400 border-green-700/30' },
  cancelled: { label: 'Ακυρώθηκε',    cls: 'bg-ember/10 text-ember border-ember/30' },
  standby:   { label: 'Αναμονή',       cls: 'bg-amber/15 text-amber border-amber/30' },
  pending:   { label: 'Εκκρεμεί',     cls: 'bg-bronze/15 text-bronze border-bronze/30' },
  confirmed: { label: 'Εκκρεμεί',     cls: 'bg-bronze/15 text-bronze border-bronze/30' },
}

const CARD_CLS = {
  upcoming:  'bg-bronze/15 text-bronze border-bronze/30 hover:bg-bronze/25',
  completed: 'bg-green-900/20 text-green-400 border-green-700/30 hover:bg-green-900/30',
  cancelled: 'bg-ember/10 text-ember/60 border-ember/20 hover:bg-ember/15 opacity-60',
  standby:   'bg-amber/10 text-amber/80 border-amber/25 hover:bg-amber/15',
  pending:   'bg-bronze/15 text-bronze border-bronze/30 hover:bg-bronze/25',
  confirmed: 'bg-bronze/15 text-bronze border-bronze/30 hover:bg-bronze/25',
}

const LIST_TABS = [
  { key: 'upcoming',  label: 'Εκκρεμή' },
  { key: 'completed', label: 'Ολοκληρωμένα' },
  { key: 'standby',   label: 'Αναμονή' },
  { key: 'cancelled', label: 'Ακυρωμένα' },
  { key: 'all',       label: 'Όλα' },
]

function AddMemberModal({ onClose, onAdd, plans = PLAN_PRESETS }) {
  const [form,       setForm]      = useState({ name: '', email: '', phone: '', address: '' })
  const [planIdx,    setPlanIdx]   = useState(-1)
  const [startDate,  setStartDate] = useState(todayStr())
  const [endDate,    setEndDate]   = useState(addMonths(todayStr(), 1))
  const [price,      setPrice]     = useState('') // final price; empty = package default
  const [loading,    setLoading]   = useState(false)
  const [error,      setError]     = useState('')
  const [done,       setDone]      = useState(null)

  const iCls = 'w-full bg-ink/[0.04] dark:bg-ink/40 border border-ink/[0.15] dark:border-bone/[0.15] hover:border-ink/30 dark:hover:border-bone/30 focus:border-bronze focus:ring-1 focus:ring-bronze text-ink dark:text-bone placeholder:text-ink/30 dark:placeholder:text-bone/30 rounded-lg px-4 py-3.5 text-base font-sans outline-none transition-colors duration-200 min-h-[52px]'
  const lCls = 'block text-[11px] font-sans font-semibold text-bronze tracking-[0.22em] uppercase mb-2'

  const preset = planIdx >= 0 ? plans[planIdx] : null

  function handlePlanChange(idx) {
    setPlanIdx(idx)
    const p = idx >= 0 ? plans[idx] : null
    setEndDate(p?.days ? addDays(startDate, p.days) : addMonths(startDate, 1))
  }

  function handleStartDateChange(val) {
    setStartDate(val)
    setEndDate(addMonths(val, 1))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.email || !form.phone) { setError('Το όνομα, το email και το τηλέφωνο είναι υποχρεωτικά.'); return }
    setLoading(true); setError('')
    const phone = form.phone.replace(/\s+/g, '').trim()
    const insertRow = { name: form.name.trim(), email: form.email.toLowerCase().trim(), phone, member_code: phone }
    if (form.address.trim()) insertRow.address = form.address.trim()

    const { data: created, error: dbErr } = await supabase
      .from('members')
      .insert([insertRow])
      .select()
      .single()

    if (dbErr) {
      const msg = (dbErr.message || '').toLowerCase()
      if (msg.includes('members_name_unique') || (msg.includes('unique') && msg.includes('name'))) {
        setError('Αυτό το όνομα υπάρχει ήδη.')
      } else if (msg.includes('unique')) {
        setError('Αυτό το email υπάρχει ήδη.')
      } else {
        setError('Σφάλμα αποθήκευσης.')
      }
      setLoading(false)
      return
    }

    if (preset && created) {
      const { error: subErr } = await supabase.from('subscriptions').insert([{
        member_id:      created.id,
        plan_name:      preset.name,
        plan_type:      preset.type,
        sessions_total: preset.sessions,
        price:          price.trim() !== '' ? (Number(price) || 0) : preset.price,
        start_date:     startDate,
        end_date:       endDate,
        status:         'active',
      }])
      if (subErr) {
        // Member was created but sub failed — surface a hint instead of rolling back
        setError('Το μέλος δημιουργήθηκε αλλά η συνδρομή απέτυχε. Πρόσθεσέ τη χειροκίνητα.')
      }
    }

    setDone({ name: form.name.trim() })
    onAdd()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-t-2xl sm:rounded-2xl w-full max-w-sm max-h-[92vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-bone/20 rounded-full mx-auto mt-3 sm:hidden" />
        <div className="px-6 pt-5 pb-5 border-b border-bone/[0.1] flex items-start justify-between shrink-0">
          <div>
            <p className="text-bronze text-[11px] font-sans font-semibold tracking-[0.22em] uppercase mb-1">Μέλη</p>
            <h2 className="text-ink dark:text-bone text-2xl font-serif italic">Νέο Μέλος</h2>
          </div>
          <button onClick={onClose} className="text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone transition-colors mt-1 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {done ? (
          <div className="px-6 py-8 text-center">
            <div className="w-14 h-14 rounded-full bg-bronze/20 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-bronze" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-ink dark:text-bone font-sans font-semibold text-xl mb-1">{done.name}</p>
            <p className="text-ink/55 dark:text-bone/55 text-sm font-sans mb-4">Το μέλος δημιουργήθηκε.</p>
            <p className="text-ink/50 dark:text-bone/50 text-sm font-sans leading-relaxed bg-ink/[0.04] dark:bg-ink/30 border border-bone/[0.1] rounded-xl px-4 py-4">
              Σύνδεση στο portal με <span className="text-bronze font-semibold">email + τηλέφωνο</span>.
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full bg-bronze hover:bg-amber text-ink font-sans font-semibold text-[13px] tracking-[0.22em] uppercase py-4 rounded-full transition-colors cursor-pointer min-h-[56px]"
            >
              Κλείσιμο
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
            <div>
              <label className={lCls}>Ονοματεπώνυμο *</label>
              <input name="name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="π.χ. Γιάννης Παπαδόπουλος" className={iCls} />
            </div>
            <div>
              <label className={lCls}>Email *</label>
              <input name="email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                placeholder="email@example.com" className={iCls} />
            </div>
            <div>
              <label className={lCls}>Τηλέφωνο *</label>
              <input name="phone" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="69XXXXXXXX" className={iCls} />
            </div>
            <div>
              <label className={lCls}>Διεύθυνση</label>
              <input name="address" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                placeholder="π.χ. Αθηνάς 12, Αθήνα" className={iCls} />
            </div>

            <div className="pt-3 border-t border-ink/[0.08] dark:border-bone/[0.08]">
              <label className={lCls}>Αρχική Συνδρομή</label>
              <select value={planIdx} onChange={(e) => handlePlanChange(+e.target.value)} className={`${iCls} cursor-pointer`}>
                <option value={-1}>— Καμία (πρόσθεσέ την αργότερα) —</option>
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
              {preset && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className={lCls}>Έναρξη</label>
                    <input type="date" value={startDate} onChange={(e) => handleStartDateChange(e.target.value)} className={iCls} />
                  </div>
                  <div>
                    <label className={lCls}>Λήξη</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={iCls} />
                  </div>
                </div>
              )}
              {preset && (
                <div className="mt-3">
                  <label className={lCls}>Έκπτωση — τελική τιμή (€)</label>
                  <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder={`${preset.price}`} className={iCls} />
                  <p className="text-ink/45 dark:text-bone/40 text-xs font-sans mt-1.5">Άφησέ το κενό για την κανονική τιμή ({preset.price}€).</p>
                </div>
              )}
            </div>

            {error && <p className="text-ember text-sm bg-ember/10 border border-ember/30 rounded-xl px-4 py-3 font-sans">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-bronze hover:bg-amber disabled:opacity-50 text-ink font-sans font-semibold text-[13px] tracking-[0.22em] uppercase py-4 rounded-full transition-colors duration-200 cursor-pointer min-h-[56px]">
              {loading ? 'Δημιουργία…' : 'Δημιουργία & Κωδικός'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// Local-date YYYY-MM-DD (timezone-safe) — matches how DatePicker stores dates.
function ymd(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  d.setHours(0,0,0,0)
  return d
}
function getWeekDays(monday) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d
  })
}
function toDateStr(date) {
  return ymd(date)
}
function bookingDisplayKey(b) {
  if (b.status === 'cancelled') return 'cancelled'
  if (b.status === 'standby')   return 'standby'
  const td  = ymd(new Date())
  const now = new Date().toTimeString().slice(0, 5)
  if (b.booking_date < td || (b.booking_date === td && b.booking_time < now)) return 'completed'
  return 'upcoming'
}
function getMonthGrid(monthDate) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7
  const lastDate = new Date(year, month + 1, 0).getDate()
  const days = []
  for (let i = 0; i < firstDow; i++) days.push(null)
  for (let d = 1; d <= lastDate; d++) days.push(new Date(year, month, d))
  while (days.length % 7 !== 0) days.push(null)
  return days
}

function DetailModal({ booking, onClose, onCancel, actionId }) {
  const [confirming, setConfirming] = useState(false)
  if (!booking) return null
  const displayKey  = bookingDisplayKey(booking)
  const st          = STATUS[displayKey] || STATUS.upcoming
  const isCompleted = displayKey === 'completed'
  const hasSession  = !!booking.subscription_id
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-t-2xl sm:rounded-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-bone/20 rounded-full mx-auto mt-3 sm:hidden" />
        <div className="px-6 pt-5 pb-5 border-b border-bone/[0.1] flex items-start justify-between">
          <div>
            <p className="text-bronze text-[11px] font-sans font-semibold tracking-[0.22em] uppercase mb-1">Ραντεβού</p>
            <h2 className="text-ink dark:text-bone text-2xl font-sans font-semibold">{booking.name}</h2>
          </div>
          <button onClick={onClose} className="text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone transition-colors mt-1 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {[
            ['Υπηρεσία',   booking.service],
            ['Ημερομηνία', formatDate(booking.booking_date)],
            ['Ώρα',        booking.booking_time],
            ['Τηλέφωνο',   booking.phone],
            ['Email',      booking.email],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between items-center gap-4">
              <span className="text-ink/55 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.18em] uppercase shrink-0">{label}</span>
              <span className="text-ink dark:text-bone text-base font-sans font-medium text-right truncate">{value}</span>
            </div>
          ))}
          <div className="flex justify-between items-center">
            <span className="text-ink/55 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.18em] uppercase">Κατάσταση</span>
            <span className={`text-[11px] font-sans font-semibold tracking-[0.18em] uppercase px-3 py-1.5 rounded-full border ${st.cls}`}>{st.label}</span>
          </div>
        </div>

        {isCompleted && booking.status !== 'cancelled' && (
          <div className="px-6 pb-6">
            <p className="text-ink/45 dark:text-bone/45 text-xs font-sans text-center bg-ink/[0.03] dark:bg-bone/[0.04] border border-ink/[0.08] dark:border-bone/[0.08] rounded-xl py-3 px-4">
              Ολοκληρωμένο ραντεβού — δεν μπορεί να ακυρωθεί.
            </p>
          </div>
        )}

        {booking.status !== 'cancelled' && !isCompleted && (
          <div className="px-6 pb-6">
            {confirming ? (
              <div className="space-y-2.5">
                <p className="text-ink/65 dark:text-bone/65 text-sm font-sans text-center mb-1">
                  Ακύρωση ραντεβού του <span className="font-semibold text-ink dark:text-bone">{booking.name}</span>
                </p>
                {hasSession && (
                  <>
                    <button
                      onClick={() => { setConfirming(false); onCancel(booking, true) }}
                      disabled={actionId === booking.id}
                      className="w-full bg-bronze/10 hover:bg-bronze/20 border border-bronze/30 text-bronze font-sans font-semibold text-[12px] tracking-[0.16em] uppercase py-3.5 rounded-full transition-colors cursor-pointer disabled:opacity-50 min-h-[52px]"
                    >
                      Ακύρωση + επιστροφή συνεδρίας
                    </button>
                    <button
                      onClick={() => { setConfirming(false); onCancel(booking, false) }}
                      disabled={actionId === booking.id}
                      className="w-full bg-ember/90 hover:bg-ember border border-transparent text-white font-sans font-semibold text-[12px] tracking-[0.16em] uppercase py-3.5 rounded-full transition-colors cursor-pointer disabled:opacity-50 min-h-[52px]"
                    >
                      Ακύρωση χωρίς επιστροφή
                    </button>
                  </>
                )}
                {!hasSession && (
                  <button
                    onClick={() => { setConfirming(false); onCancel(booking, false) }}
                    disabled={actionId === booking.id}
                    className="w-full bg-ember/90 hover:bg-ember text-white font-sans font-semibold text-[13px] tracking-[0.18em] uppercase py-3.5 rounded-full transition-colors cursor-pointer disabled:opacity-50 min-h-[52px]"
                  >
                    {actionId === booking.id ? '…' : 'Ακύρωση'}
                  </button>
                )}
                <button
                  onClick={() => setConfirming(false)}
                  className="w-full border border-ink/[0.12] dark:border-bone/[0.12] text-ink/50 dark:text-bone/50 hover:text-ink dark:hover:text-bone font-sans font-semibold text-[12px] tracking-[0.16em] uppercase py-3 rounded-full transition-colors cursor-pointer"
                >
                  Πίσω
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(true)}
                className="w-full border border-ember/40 hover:bg-ember/10 text-ember font-sans font-semibold text-[13px] tracking-[0.22em] uppercase py-4 rounded-full transition-colors duration-200 cursor-pointer min-h-[56px]"
              >
                Ακύρωση ραντεβού
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DayModal({ dateStr, bookings, isClosed, onClose, onSelectBooking, settings = {} }) {
  const dateObj = new Date(dateStr + 'T12:00:00')
  const slots   = slotsForDate(dateStr, settings)
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-ink/10 dark:bg-bone/20 rounded-full mx-auto mt-3 sm:hidden shrink-0" />
        <div className="px-6 pt-5 pb-4 border-b border-ink/[0.08] dark:border-bone/[0.08] flex items-center justify-between shrink-0">
          <div>
            <p className="text-bronze text-[11px] font-sans font-semibold tracking-[0.22em] uppercase mb-0.5">{DAY_NAMES_GR[dateObj.getDay()]}</p>
            <h2 className="text-ink dark:text-bone text-xl font-sans font-semibold">{dateObj.getDate()} {MONTHS_GR_FULL[dateObj.getMonth()]} {dateObj.getFullYear()}</h2>
          </div>
          <div className="flex items-center gap-2">
            {bookings.length > 0 && (
              <span className="text-[11px] font-sans font-semibold px-2.5 py-1 rounded-full bg-bronze/15 text-bronze border border-bronze/30">{bookings.length} ραντεβού</span>
            )}
            <button onClick={onClose} className="text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone transition-colors p-1 ml-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {isClosed && (
            <div className="mx-5 mt-4 bg-ember/[0.06] border border-ember/20 rounded-lg px-4 py-2.5 text-center">
              <p className="text-ember/80 text-[12px] font-sans font-semibold tracking-[0.12em] uppercase">Κλειστά αυτή τη μέρα</p>
            </div>
          )}
          <div className="divide-y divide-ink/[0.07] dark:divide-bone/[0.07]">
            {slots.map(time => {
              const slotBks = bookings.filter(b => b.booking_time === time)
              const isEmpty = slotBks.length === 0
              const services = SERVICES.filter(svc => slotBks.some(b => b.service === svc))
              return (
                <div key={time} className={`flex ${isEmpty ? 'opacity-30' : ''}`}>
                  <div className="w-16 shrink-0 flex items-start justify-center pt-4 pb-4 border-r border-ink/[0.07] dark:border-bone/[0.07] bg-ink/[0.03] dark:bg-ink/20">
                    <span className="text-ink/70 dark:text-bone/70 text-[13px] font-sans font-semibold">{time}</span>
                  </div>
                  <div className="flex-1 min-h-[56px]">
                    {isEmpty ? (
                      <div className="px-4 py-3 flex items-center justify-center h-full">
                        <p className="text-ink/60 dark:text-bone/60 text-sm font-sans">—</p>
                      </div>
                    ) : services.map((svc, si) => {
                      const group = slotBks.filter(b => b.service === svc)
                      if (group.length === 0) return null
                      return (
                        <SlotServiceGroup key={svc} svc={svc} group={group} settings={settings} si={si}
                          onSelect={b => { onClose(); onSelectBooking(b) }} />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function AddModal({ onClose, onAdd, slotBookingCounts, settings = {} }) {
  const today = ymd(new Date())
  const [form,    setForm]    = useState({ name:'', email:'', phone:'', service:'', booking_date:'', booking_time:'' })
  const timeSlots = bookableSlots(form.booking_date, form.service, settings)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const [members,        setMembers]        = useState([])
  const [selectedMember, setSelectedMember] = useState(null)
  const [memberSearch,   setMemberSearch]   = useState('')
  const [showDropdown,   setShowDropdown]   = useState(false)
  const [memberSub,      setMemberSub]      = useState(null)

  useEffect(() => {
    supabase.from('members').select('id, name, email, phone').eq('active', true).order('name')
      .then(({ data }) => { if (data) setMembers(data) })
  }, [])

  useEffect(() => {
    if (!selectedMember) { setMemberSub(null); return }
    activeSubscription(selectedMember.id, form.service || null).then(setMemberSub)
  }, [selectedMember, form.service])

  const filteredMembers = memberSearch.length >= 1
    ? members.filter(m =>
        m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(memberSearch.toLowerCase())
      ).slice(0, 6)
    : []

  function pickMember(m) {
    setSelectedMember(m)
    setMemberSearch(m.name)
    setShowDropdown(false)
    setForm(p => ({ ...p, name: m.name, email: m.email, phone: m.phone || '' }))
  }

  function clearMember() {
    setSelectedMember(null)
    setMemberSearch('')
    setMemberSub(null)
    setForm(p => ({ ...p, name: '', email: '', phone: '' }))
  }

  function slotCounts(time) {
    return slotBookingCounts[`${form.booking_date}_${time}_${form.service}`] || { confirmed: 0, standby: 0 }
  }
  function isTimeFull(time) {
    if (!form.service || !form.booking_date) return false
    const cap = SERVICE_CAPACITY[form.service] ?? 1
    const s = slotCounts(time)
    return s.confirmed >= cap && s.standby >= STANDBY_CAPACITY
  }
  function isTimeStandby(time) {
    if (!form.service || !form.booking_date) return false
    const cap = SERVICE_CAPACITY[form.service] ?? 1
    const s = slotCounts(time)
    return s.confirmed >= cap && s.standby < STANDBY_CAPACITY
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value, ...(name === 'service' ? { booking_time: '' } : {}) }))
  }
  function handleDate(d) { setForm(p => ({ ...p, booking_date: d, booking_time: '' })) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name || !form.email || !form.phone || !form.service || !form.booking_date || !form.booking_time) {
      setError('Συμπλήρωσε όλα τα πεδία.'); return
    }
    if (isTimeFull(form.booking_time)) {
      setError('Η ώρα αυτή είναι γεμάτη για αυτή την υπηρεσία.'); return
    }
    setLoading(true); setError('')
    const ok = await onAdd({ ...form, status: 'confirmed' })
    if (!ok) setError('Σφάλμα αποθήκευσης.')
    setLoading(false)
  }

  const iCls = 'w-full bg-ink/[0.04] dark:bg-ink/40 border border-ink/[0.15] dark:border-bone/[0.15] hover:border-ink/30 dark:hover:border-bone/30 focus:border-bronze focus:ring-1 focus:ring-bronze text-ink dark:text-bone placeholder:text-ink/30 dark:placeholder:text-bone/30 rounded-lg px-4 py-3.5 text-base font-sans outline-none transition-colors duration-200 min-h-[52px]'
  const lCls = 'block text-[11px] font-sans font-semibold text-bronze tracking-[0.22em] uppercase mb-2'

  const subBadge = selectedMember && memberSub !== undefined
    ? memberSub
      ? { text: memberSub.plan_type === 'unlimited' ? `${memberSub.plan_name} · ∞` : `${memberSub.plan_name} · ${sessionsLeft(memberSub)} συν.`, ok: true }
      : form.service
        ? { text: `Χωρίς ενεργή συνδρομή ${form.service === 'Pilates Reformer' ? 'Pilates' : form.service === 'Group Training' ? 'Group' : ''}`, ok: false }
        : { text: 'Δεν υπάρχει ενεργή συνδρομή', ok: false }
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-t-2xl sm:rounded-2xl w-full max-w-sm max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-bone/20 rounded-full mx-auto mt-3 sm:hidden" />
        <div className="px-6 pt-5 pb-5 border-b border-bone/[0.1] flex items-start justify-between">
          <div>
            <p className="text-bronze text-[11px] font-sans font-semibold tracking-[0.22em] uppercase mb-1">Admin</p>
            <h2 className="text-ink dark:text-bone text-2xl font-sans font-semibold">Νέο Ραντεβού</h2>
          </div>
          <button onClick={onClose} className="text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone transition-colors mt-1 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Member picker */}
          <div>
            <label className={lCls}>Μέλος</label>
            <div className="relative">
              {selectedMember ? (
                <div className="flex items-center justify-between bg-bronze/10 border border-bronze/40 rounded-lg px-4 py-3 min-h-[52px]">
                  <div className="min-w-0">
                    <p className="text-ink dark:text-bone font-sans font-semibold text-base leading-tight truncate">{selectedMember.name}</p>
                    {subBadge && (
                      <p className={`text-[11px] font-sans font-medium mt-0.5 ${subBadge.ok ? 'text-bronze' : 'text-ember'}`}>
                        {subBadge.text}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={clearMember} className="text-ink/40 dark:text-bone/40 hover:text-ink dark:hover:text-bone transition-colors ml-3 shrink-0">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/35 dark:text-bone/35 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
                    </svg>
                    <input
                      value={memberSearch}
                      onChange={e => { setMemberSearch(e.target.value); setShowDropdown(true) }}
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                      placeholder="Αναζήτηση μέλους…"
                      className={`${iCls} pl-10`}
                    />
                  </div>
                  {showDropdown && filteredMembers.length > 0 && (
                    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-coal border border-ink/[0.15] dark:border-bone/[0.15] rounded-xl overflow-hidden shadow-xl">
                      {filteredMembers.map(m => (
                        <button
                          key={m.id} type="button"
                          onMouseDown={() => pickMember(m)}
                          className="w-full text-left px-4 py-3 hover:bg-ink/[0.04] dark:hover:bg-bone/[0.06] transition-colors border-b border-ink/[0.06] dark:border-bone/[0.06] last:border-0"
                        >
                          <p className="text-ink dark:text-bone font-sans font-medium text-base">{m.name}</p>
                          <p className="text-ink/45 dark:text-bone/45 text-sm font-sans">{m.email}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="pt-1 border-t border-ink/[0.08] dark:border-bone/[0.08] space-y-4">
            <div>
              <label className={lCls}>Ονοματεπώνυμο</label>
              <input name="name" value={form.name} onChange={handleChange} placeholder="π.χ. Γιάννης Παπαδόπουλος" className={iCls} />
            </div>
            <div>
              <label className={lCls}>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" className={iCls} />
            </div>
            <div>
              <label className={lCls}>Τηλέφωνο</label>
              <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="69XXXXXXXX" className={iCls} />
            </div>
          </div>

          <div>
            <label className={lCls}>Υπηρεσία</label>
            <select name="service" value={form.service} onChange={handleChange} className={`${iCls} cursor-pointer`}>
              <option value="" disabled>Επίλεξε</option>
              {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {selectedMember && form.service && memberSub === null && (
            <div className="flex items-start gap-2.5 bg-amber/10 border border-amber/40 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-amber shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-amber text-sm font-sans font-medium leading-snug">
                Το μέλος δεν έχει ενεργή συνδρομή{' '}
                {form.service === 'Pilates Reformer' ? 'Pilates' : form.service === 'Group Training' ? 'Group Training' : ''}.
                {' '}Μπορείς να συνεχίσεις, αλλά δεν θα αφαιρεθεί συνεδρία.
              </p>
            </div>
          )}

          <div>
            <label className={lCls}>Ημερομηνία</label>
            <DatePicker value={form.booking_date} onChange={handleDate} min={today} disabledDates={settings.closed_dates} disabledWeekdays={settings.closed_weekdays} />
          </div>
          {form.booking_date && (
            <div>
              <label className={lCls}>Ώρα</label>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map(t => {
                  const isFull      = isTimeFull(t)
                  const isStandbyT  = isTimeStandby(t)
                  const isActive    = form.booking_time === t
                  return (
                    <button key={t} type="button" disabled={isFull}
                      onClick={() => setForm(p => ({ ...p, booking_time: t }))}
                      className={`text-base font-sans font-medium py-2.5 rounded-lg border transition-colors min-h-[52px] flex flex-col items-center justify-center gap-0.5 ${
                        isActive && isStandbyT ? 'bg-amber border-amber text-ink font-semibold'
                        : isActive  ? 'bg-bronze border-bronze text-ink font-semibold'
                        : isFull    ? 'border-ink/[0.08] dark:border-bone/[0.08] text-ink/25 dark:text-bone/25 cursor-not-allowed line-through'
                        : isStandbyT ? 'border-amber/50 text-amber/80 hover:border-amber cursor-pointer'
                        : 'border-ink/[0.2] dark:border-bone/[0.2] text-ink/80 dark:text-bone/80 hover:border-bronze cursor-pointer'
                      }`}
                    >
                      <span>{t}</span>
                      {isStandbyT && <span className="text-[9px] tracking-[0.12em] uppercase opacity-80 leading-none">Αναμονή</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {error && <p className="text-ember text-sm bg-ember/10 border border-ember/30 rounded-xl px-4 py-3 font-sans">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-bronze hover:bg-amber disabled:opacity-50 text-ink font-sans font-semibold text-[13px] tracking-[0.22em] uppercase py-4 rounded-full transition-colors duration-200 cursor-pointer min-h-[56px]">
            {loading ? 'Αποθήκευση…' : 'Αποθήκευση'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Settings view ───────────────────────────────────────────

const sLabel = 'block text-[11px] font-sans font-semibold text-bronze tracking-[0.22em] uppercase mb-2'
const sInput = 'w-full bg-ink/[0.04] dark:bg-ink/40 border border-ink/[0.15] dark:border-bone/[0.15] hover:border-ink/30 dark:hover:border-bone/30 focus:border-bronze focus:ring-1 focus:ring-bronze text-ink dark:text-bone placeholder:text-ink/30 dark:placeholder:text-bone/30 rounded-lg px-3.5 py-3 text-base font-sans outline-none transition-colors min-h-[48px]'

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-2xl p-5 sm:p-6">
      <div className="mb-4">
        <h3 className="text-ink dark:text-bone text-lg font-serif italic">{title}</h3>
        {subtitle && <p className="text-ink/50 dark:text-bone/50 text-sm font-sans mt-1">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function SaveBar({ dirty, saving, onSave }) {
  return (
    <button
      onClick={onSave}
      disabled={!dirty || saving}
      className={`mt-5 w-full sm:w-auto px-6 py-3 rounded-full text-[13px] font-sans font-semibold tracking-[0.18em] uppercase transition-colors min-h-[48px] ${
        dirty && !saving
          ? 'bg-bronze hover:bg-amber text-ink cursor-pointer'
          : 'bg-ink/[0.04] dark:bg-bone/[0.06] text-ink/30 dark:text-bone/30 cursor-not-allowed'
      }`}
    >
      {saving ? 'Αποθήκευση…' : dirty ? 'Αποθήκευση' : 'Αποθηκευμένο'}
    </button>
  )
}

function HoursEditor({ value, onSave, title = 'Ώρες κράτησης', subtitle = 'Οι ώρες που εμφανίζονται για κράτηση σε όλη την εφαρμογή.' }) {
  const [list,   setList]   = useState(value)
  const [draft,  setDraft]  = useState('')
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(list) !== JSON.stringify(value)

  function add() {
    if (!/^\d{2}:\d{2}$/.test(draft)) return
    if (list.includes(draft)) { setDraft(''); return }
    setList([...list, draft].sort())
    setDraft('')
  }
  function remove(t) { setList(list.filter(x => x !== t)) }
  async function save() { setSaving(true); await onSave(list); setSaving(false) }

  return (
    <SectionCard title={title} subtitle={subtitle}>
      <div className="flex flex-wrap gap-2 mb-4">
        {list.length === 0 && <p className="text-ink/40 dark:text-bone/40 text-sm font-sans">Καμία ώρα.</p>}
        {list.map(t => (
          <span key={t} className="inline-flex items-center gap-2 bg-ink/[0.04] dark:bg-ink/50 border border-ink/[0.15] dark:border-bone/[0.15] rounded-full pl-3.5 pr-2 py-2 text-ink dark:text-bone text-sm font-sans font-medium">
            {t}
            <button onClick={() => remove(t)} className="text-ink/40 dark:text-bone/40 hover:text-ember transition-colors cursor-pointer" aria-label={`Διαγραφή ${t}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="time" value={draft} onChange={e => setDraft(e.target.value)} className={`${sInput} flex-1`} />
        <button onClick={add} disabled={!/^\d{2}:\d{2}$/.test(draft)} className="shrink-0 px-5 rounded-lg bg-ink/[0.06] dark:bg-bone/[0.06] hover:bg-bronze hover:text-ink disabled:opacity-40 disabled:hover:bg-ink/[0.06] dark:disabled:hover:bg-bone/[0.06] disabled:hover:text-ink dark:disabled:hover:text-bone text-ink dark:text-bone text-[13px] font-sans font-semibold tracking-[0.16em] uppercase transition-colors cursor-pointer">
          Προσθήκη
        </button>
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={save} />
    </SectionCard>
  )
}

function ClosedDatesEditor({ value, onSave }) {
  const today = ymd(new Date())
  const [list,        setList]        = useState(value)
  const [pick,        setPick]        = useState('')
  const [pendingDate, setPendingDate] = useState(null)
  const [saving,      setSaving]      = useState(false)
  const dirty = JSON.stringify(list) !== JSON.stringify(value)

  function handlePick(d) {
    if (d && !list.includes(d)) { setPendingDate(d); setPick(d) }
  }
  function confirmAdd() {
    if (pendingDate) setList(prev => [...prev, pendingDate].sort())
    setPendingDate(null); setPick('')
  }
  function cancelAdd() { setPendingDate(null); setPick('') }
  function remove(d) { setList(list.filter(x => x !== d)) }
  async function save() { setSaving(true); await onSave(list); setSaving(false) }

  const upcoming = list.filter(d => d >= today)
  const past     = list.filter(d => d < today)

  return (
    <SectionCard title="Κλειστές μέρες / Αργίες" subtitle="Οι μέρες αυτές δεν θα δέχονται κρατήσεις.">
      <DatePicker value={pick} onChange={handlePick} min={today} disabledDates={list} />
      {pendingDate && (
        <div className="mt-4 bg-amber/[0.08] border border-amber/30 rounded-xl px-4 py-4 flex items-center justify-between gap-4">
          <p className="text-ink dark:text-bone text-sm font-sans">
            Να οριστεί η <span className="text-amber font-semibold">{formatDate(pendingDate)}</span> ως αργία;
          </p>
          <div className="flex gap-2 shrink-0">
            <button onClick={confirmAdd} className="bg-amber hover:bg-bronze text-ink text-[11px] font-sans font-semibold tracking-[0.16em] uppercase px-4 py-2 rounded-full transition-colors cursor-pointer">Ναι</button>
            <button onClick={cancelAdd} className="text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone text-[11px] font-sans font-semibold tracking-[0.16em] uppercase px-4 py-2 rounded-full border border-ink/[0.15] dark:border-bone/[0.15] hover:border-bone/30 transition-colors cursor-pointer">Άκυρο</button>
          </div>
        </div>
      )}
      <div className="mt-4 space-y-2">
        {upcoming.length === 0 && <p className="text-ink/40 dark:text-bone/40 text-sm font-sans">Καμία επερχόμενη κλειστή μέρα.</p>}
        {upcoming.map(d => (
          <div key={d} className="flex items-center justify-between bg-ink/[0.04] dark:bg-ink/40 border border-ink/[0.1] dark:border-bone/[0.1] rounded-lg px-4 py-3">
            <span className="text-ink dark:text-bone text-base font-sans font-medium">{formatDate(d)}</span>
            <button onClick={() => remove(d)} className="text-ember/70 hover:text-ember text-[11px] font-sans font-semibold tracking-[0.16em] uppercase cursor-pointer">Αφαίρεση</button>
          </div>
        ))}
        {past.length > 0 && (
          <p className="text-ink/30 dark:text-bone/30 text-xs font-sans pt-1">+ {past.length} παλιότερες (αγνοούνται)</p>
        )}
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={save} />
    </SectionCard>
  )
}

function PlansEditor({ value, onSave }) {
  const [list,   setList]   = useState(value)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(list) !== JSON.stringify(value)

  function update(i, patch) {
    setList(list.map((p, idx) => idx === i ? { ...p, ...patch } : p))
  }
  function remove(i) { setList(list.filter((_, idx) => idx !== i)) }
  function add() {
    setList([...list, { name: 'Νέο πακέτο', service: 'Pilates Reformer', type: 'sessions', sessions: 1, days: 30, price: 0 }])
  }
  async function save() {
    // Normalise numeric fields
    const clean = list.map(p => ({
      name: (p.name || '').trim() || 'Πακέτο',
      service: p.service || 'Pilates Reformer',
      type: p.type === 'unlimited' ? 'unlimited' : 'sessions',
      sessions: p.type === 'unlimited' ? null : Math.max(1, parseInt(p.sessions, 10) || 1),
      days: Math.max(1, parseInt(p.days, 10) || 30),
      price: Math.max(0, parseFloat(p.price) || 0),
    }))
    setSaving(true); await onSave(clean); setList(clean); setSaving(false)
  }

  return (
    <SectionCard title="Πακέτα & τιμές" subtitle="Τα συνδρομητικά πακέτα που εμφανίζονται στη δημιουργία/ανανέωση συνδρομής.">
      <div className="space-y-3">
        {list.map((p, i) => (
          <div key={i} className="bg-ink/[0.04] dark:bg-ink/40 border border-ink/[0.1] dark:border-bone/[0.1] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <input value={p.name} onChange={e => update(i, { name: e.target.value })} className={`${sInput} flex-1`} placeholder="Όνομα πακέτου" />
              <button onClick={() => remove(i)} className="shrink-0 w-11 h-11 flex items-center justify-center rounded-lg border border-ember/30 text-ember/70 hover:bg-ember/10 hover:text-ember transition-colors cursor-pointer" aria-label="Διαγραφή πακέτου">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div>
                <label className="text-ink/45 dark:text-bone/45 text-[10px] font-sans tracking-[0.14em] uppercase">Υπηρεσία</label>
                <select value={p.service || 'Pilates Reformer'} onChange={e => update(i, { service: e.target.value })} className={`${sInput} cursor-pointer`}>
                  <option value="Pilates Reformer">Pilates</option>
                  <option value="Group Training">Group</option>
                </select>
              </div>
              <div>
                <label className="text-ink/45 dark:text-bone/45 text-[10px] font-sans tracking-[0.14em] uppercase">Τύπος</label>
                <select value={p.type} onChange={e => update(i, { type: e.target.value })} className={`${sInput} cursor-pointer`}>
                  <option value="sessions">Συνεδρίες</option>
                  <option value="unlimited">Unlimited</option>
                </select>
              </div>
              <div>
                <label className="text-ink/45 dark:text-bone/45 text-[10px] font-sans tracking-[0.14em] uppercase">Συνεδρίες</label>
                <input type="number" min="1" disabled={p.type === 'unlimited'} value={p.type === 'unlimited' ? '' : (p.sessions ?? '')} onChange={e => update(i, { sessions: e.target.value })} className={`${sInput} disabled:opacity-40`} placeholder={p.type === 'unlimited' ? '∞' : ''} />
              </div>
              <div>
                <label className="text-ink/45 dark:text-bone/45 text-[10px] font-sans tracking-[0.14em] uppercase">Μέρες</label>
                <input type="number" min="1" value={p.days ?? ''} onChange={e => update(i, { days: e.target.value })} className={sInput} />
              </div>
              <div>
                <label className="text-ink/45 dark:text-bone/45 text-[10px] font-sans tracking-[0.14em] uppercase">Τιμή €</label>
                <input type="number" min="0" step="0.01" value={p.price ?? ''} onChange={e => update(i, { price: e.target.value })} className={sInput} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={add} className="mt-3 w-full flex items-center justify-center gap-2 border border-dashed border-ink/[0.2] dark:border-bone/[0.2] hover:border-bronze/50 text-ink/60 dark:text-bone/60 hover:text-ink dark:hover:text-bone text-[13px] font-sans font-semibold tracking-[0.16em] uppercase py-3.5 rounded-xl transition-colors cursor-pointer">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
        Νέο πακέτο
      </button>
      <SaveBar dirty={dirty} saving={saving} onSave={save} />
    </SectionCard>
  )
}

// --- Export value formatters: turn raw DB values into human-readable Greek ---
const GR_WEEKDAYS = ['Κυριακή', 'Δευτέρα', 'Τρίτη', 'Τετάρτη', 'Πέμπτη', 'Παρασκευή', 'Σάββατο']
const BOOKING_STATUS_GR = { confirmed: 'Επιβεβαιωμένο', standby: 'Λίστα αναμονής', cancelled: 'Ακυρωμένο', pending: 'Σε εκκρεμότητα' }
const SUB_STATUS_GR     = { active: 'Ενεργή', cancelled: 'Ακυρωμένη', expired: 'Έληξε', paused: 'Σε παύση' }
const PLAN_TYPE_GR      = { sessions: 'Συνεδρίες', unlimited: 'Απεριόριστο' }

function fmtDate(ymd) {
  if (!ymd) return ''
  const [y, m, d] = String(ymd).slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : String(ymd)
}
function fmtWeekday(ymd) {
  if (!ymd) return ''
  const dt = new Date(String(ymd).slice(0, 10) + 'T00:00:00')
  return isNaN(dt) ? '' : (GR_WEEKDAYS[dt.getDay()] || '')
}
function fmtDateTime(iso) {
  if (!iso) return ''
  const dt = new Date(iso)
  if (isNaN(dt)) return ''
  const p = n => String(n).padStart(2, '0')
  return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()} ${p(dt.getHours())}:${p(dt.getMinutes())}`
}
function fmtPrice(v) {
  if (v == null || v === '') return ''
  const n = Number(v)
  return isNaN(n) ? String(v) : `${n.toFixed(2)} €`
}

// Shared column definitions + row shaping, reused by the per-table CSV exports,
// the combined Excel workbook, AND backup downloads (which reshape a stored
// snapshot through the exact same pipeline). Rows are pre-formatted (Greek
// labels, dd/mm/yyyy dates, € prices) so every file reads cleanly.
const BOOKING_COLS = [
  { key: 'name', label: 'Όνομα' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Τηλέφωνο' },
  { key: 'service', label: 'Υπηρεσία' }, { key: 'date', label: 'Ημερομηνία' }, { key: 'weekday', label: 'Ημέρα' },
  { key: 'time', label: 'Ώρα' }, { key: 'created', label: 'Καταχωρήθηκε' },
]
const MEMBER_COLS = [
  { key: 'name', label: 'Όνομα' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Τηλέφωνο' },
  { key: 'member_code', label: 'Κωδικός' }, { key: 'active', label: 'Ενεργό' },
  { key: 'plan_name', label: 'Πακέτο' },
  { key: 'sessions_left', label: 'Υπόλοιπο συνεδριών' },
  { key: 'sub_start', label: 'Έναρξη συνδρομής' }, { key: 'sub_end', label: 'Λήξη συνδρομής' },
  { key: 'created', label: 'Εγγραφή' },
]
const SUB_COLS = [
  { key: 'member', label: 'Μέλος' }, { key: 'email', label: 'Email' }, { key: 'plan_name', label: 'Πακέτο' },
  { key: 'plan_type', label: 'Τύπος' }, { key: 'sessions_total', label: 'Συνεδρίες' }, { key: 'sessions_used', label: 'Χρησιμοποιήθηκαν' },
  { key: 'sessions_left', label: 'Υπόλοιπο' }, { key: 'price', label: 'Τιμή' }, { key: 'start_date', label: 'Έναρξη' },
  { key: 'end_date', label: 'Λήξη' }, { key: 'status', label: 'Κατάσταση' },
]

function bookingExportRows(bookings) {
  return [...bookings]
    // Newest appointment first.
    .sort((a, b) => (b.booking_date + b.booking_time).localeCompare(a.booking_date + a.booking_time))
    .map(b => ({
      name: b.name, email: b.email, phone: b.phone, service: b.service,
      date: fmtDate(b.booking_date), weekday: fmtWeekday(b.booking_date), time: b.booking_time,
      created: fmtDateTime(b.created_at),
    }))
}
function memberExportRows(members, subsByMember) {
  return [...members]
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'el'))
    .map(m => {
      const activeSub = (subsByMember[m.id] || []).find(s => s.status === 'active' && !isExpired(s))
      const total = activeSub?.sessions_total
      const used  = activeSub?.sessions_used ?? 0
      const left  = activeSub?.plan_type === 'unlimited' ? '∞'
        : (total != null ? Math.max(0, total - used) : '')
      return {
        name: m.name, email: m.email, phone: m.phone, member_code: m.member_code,
        active: m.active ? 'Ναι' : 'Όχι',
        plan_name: activeSub?.plan_name || '',
        price: activeSub ? fmtPrice(activeSub.price) : '',
        sessions_left: activeSub ? left : '',
        sub_start: activeSub ? fmtDate(activeSub.start_date) : '',
        sub_end: activeSub ? fmtDate(activeSub.end_date) : '',
        created: fmtDate(m.created_at),
      }
    })
}
function subExportRows(members, subsByMember) {
  const rows = []
  for (const m of members) {
    for (const s of (subsByMember[m.id] || [])) {
      const total = s.sessions_total
      const used  = s.sessions_used ?? 0
      rows.push({
        member: m.name, email: m.email, plan_name: s.plan_name,
        plan_type: PLAN_TYPE_GR[s.plan_type] || s.plan_type,
        sessions_total: s.plan_type === 'unlimited' ? '∞' : (total ?? ''),
        sessions_used: used,
        sessions_left: s.plan_type === 'unlimited' ? '∞' : (total != null ? Math.max(0, total - used) : ''),
        price: fmtPrice(s.price), start_date: fmtDate(s.start_date), end_date: fmtDate(s.end_date),
        status: SUB_STATUS_GR[s.status] || s.status,
      })
    }
  }
  return rows.sort((a, b) => (a.member || '').localeCompare(b.member || '', 'el'))
}

// The three-sheet workbook used by both "Όλα (Excel)" and backup downloads.
const ALL_COLS = [
  { key: 'name', label: 'Όνομα' }, { key: 'email', label: 'Email' }, { key: 'phone', label: 'Τηλέφωνο' },
  { key: 'member_code', label: 'Κωδικός' }, { key: 'active', label: 'Ενεργό' },
  { key: 'plan_name', label: 'Πακέτο' },
  { key: 'sessions_left', label: 'Υπόλοιπο συνεδριών' },
  { key: 'sub_start', label: 'Έναρξη συνδρομής' }, { key: 'sub_end', label: 'Λήξη συνδρομής' },
  { key: 'sub_status', label: 'Κατάσταση συνδρομής' },
]

function allRows(members, subsByMember) {
  return [...members]
    .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'el'))
    .map(m => {
      const activeSub = (subsByMember[m.id] || []).find(s => s.status === 'active' && !isExpired(s))
      const total = activeSub?.sessions_total
      const used  = activeSub?.sessions_used ?? 0
      const left  = activeSub?.plan_type === 'unlimited' ? '∞'
        : (total != null ? Math.max(0, total - used) : '')
      return {
        name: m.name, email: m.email, phone: m.phone, member_code: m.member_code,
        active: m.active ? 'Ναι' : 'Όχι',
        plan_name: activeSub?.plan_name || '',
        price: activeSub ? fmtPrice(activeSub.price) : '',
        sessions_left: activeSub ? left : '',
        sub_start: activeSub ? fmtDate(activeSub.start_date) : '',
        sub_end: activeSub ? fmtDate(activeSub.end_date) : '',
        sub_status: activeSub ? (SUB_STATUS_GR[activeSub.status] || activeSub.status) : '',
      }
    })
}

function exportSheets(bookings, members, subsByMember) {
  return [
    { name: 'Όλα',       rows: allRows(members, subsByMember),          columns: ALL_COLS },
    { name: 'Ραντεβού',  rows: bookingExportRows(bookings),             columns: BOOKING_COLS },
    { name: 'Μέλη',      rows: memberExportRows(members, subsByMember), columns: MEMBER_COLS },
    { name: 'Συνδρομές', rows: subExportRows(members, subsByMember),    columns: SUB_COLS },
  ]
}

// Group a flat subscriptions array (as stored in a backup snapshot) back into
// the { [member_id]: [subs] } shape the row builders expect.
function subsByMemberFrom(subscriptions) {
  const map = {}
  for (const s of (subscriptions || [])) {
    (map[s.member_id] ||= []).push(s)
  }
  return map
}

// Compact doctor's-certificate status pill shown in the members list.
const MEDICAL_BADGE = {
  valid:    { cls: 'bg-bronze/15 text-bronze border-bronze/30', label: 'Σε ισχύ' },
  expiring: { cls: 'bg-amber/15 text-amber border-amber/40',    label: 'Λήγει σύντομα' },
  expired:  { cls: 'bg-ember/10 text-ember border-ember/30',    label: 'Έληξε' },
  missing:  { cls: 'bg-ink/[0.04] dark:bg-bone/[0.06] text-ink/45 dark:text-bone/45 border-ink/[0.12] dark:border-bone/[0.12]', label: 'Λείπει' },
  pending:  { cls: 'bg-bronze/10 text-bronze/70 border-bronze/20', label: 'Προς έλεγχο' },
}
function MedicalBadge({ cert }) {
  const s = MEDICAL_BADGE[certStatus(cert)]
  return (
    <span className={`inline-block text-[10px] font-sans font-semibold tracking-[0.12em] uppercase px-2 py-1 rounded-full border ${s.cls}`}>
      {s.label}
    </span>
  )
}

const SERVICE_COLOR = {
  'Pilates Reformer':  'text-bronze font-semibold',
  'Group Training':    'text-teal-600 dark:text-teal-400 font-semibold',
  'Personal Training': 'text-purple-600 dark:text-purple-400 font-semibold',
}
function ServiceLabel({ service, className = '' }) {
  return (
    <span className={`${SERVICE_COLOR[service] || 'text-ink/60 dark:text-bone/60'} ${className}`}>{service}</span>
  )
}

// Grouped list of bookings for one service within a time slot.
// Used by DayModal and the dashboard agenda.
function SlotServiceGroup({ svc, group, settings, onSelect, si = 0 }) {
  const firstB   = group[0]
  const groupType = svc === GROUP_SERVICE
    ? (firstB.session_type || (settings ? groupTypeFor(firstB.booking_date, firstB.booking_time, settings) : null))
    : null
  const groupMeta = groupType ? GROUP_TYPE_META[groupType] : null
  const confirmed = group.filter(b => b.status !== 'standby').length
  return (
    <div className={`px-4 py-3 ${si > 0 ? 'border-t border-ink/[0.07] dark:border-bone/[0.07]' : ''}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-sans font-extrabold tracking-[0.18em] uppercase ${SERVICE_COLOR[svc] || 'text-ink/60'}`}>{svc}</span>
        {groupMeta && (
          <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-sans font-semibold tracking-[0.06em] uppercase ${groupMeta.chip}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${groupMeta.dot}`} />{groupMeta.label}
          </span>
        )}
        <span className="text-[11px] font-sans text-ink/35 dark:text-bone/35 ml-auto tabular-nums">{confirmed} / {SERVICE_CAPACITY[svc] ?? '—'}</span>
      </div>
      <div className="space-y-1.5">
        {[...group].sort((a, b) => (a.status === 'standby') - (b.status === 'standby')).map(b => (
          <button key={b.id} onClick={() => onSelect(b)}
            className="flex items-center gap-2 w-full text-left cursor-pointer group">
            <p className={`font-sans text-sm leading-snug transition-colors truncate flex-1 ${b.status === 'standby' ? 'text-orange-500 dark:text-orange-400 group-hover:text-orange-400' : 'text-ink dark:text-bone group-hover:text-bronze'}`}>{b.name}</p>
            {b.status === 'standby' && (
              <span className={`text-[9px] font-sans font-semibold tracking-[0.12em] uppercase px-1.5 py-0.5 rounded-full border shrink-0 ${STATUS.standby.cls}`}>Αναμονή</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

// Small colored chip showing a Group booking's workout type. Uses the type
// stored on the booking; falls back to deriving it from the weekly schedule.
function GroupTypeChip({ booking, settings, className = '' }) {
  if (!booking || booking.service !== GROUP_SERVICE) return null
  const type = booking.session_type || (settings ? groupTypeFor(booking.booking_date, booking.booking_time, settings) : null)
  const meta = type ? GROUP_TYPE_META[type] : null
  if (!meta) return null
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-sans font-semibold tracking-[0.06em] uppercase ${meta.chip} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
    </span>
  )
}

// Off-site backup nudge: the in-app `backups` table lives in the same database,
// so it won't survive a DB loss. This strip reminds the admin to pull a real
// local copy (Excel). One click downloads it and records the date in
// localStorage; the daily prompt hides only once *today's* backup is taken,
// then reappears the next day.
const BACKUP_DL_KEY = 'byme_last_backup_download'

function BackupReminder({ bookings, members, subsByMember }) {
  const [last, setLast] = useState(() => localStorage.getItem(BACKUP_DL_KEY) || null)

  // Daily nudge: show every day until today's backup has been taken.
  if (last === todayStr()) return null
  // Don't nag before any data has loaded.
  if (!members?.length && !bookings?.length) return null

  function downloadNow() {
    downloadXLSX(`byme_backup_${todayStr()}.xlsx`, exportSheets(bookings, members, subsByMember))
    const today = todayStr()
    localStorage.setItem(BACKUP_DL_KEY, today)
    setLast(today)
  }

  return (
    <button onClick={downloadNow}
      className="w-full flex items-center gap-3 bg-bronze/[0.08] border border-bronze/30 hover:border-bronze/60 hover:bg-bronze/[0.12] rounded-xl px-4 py-3 transition-colors cursor-pointer text-left">
      <span className="w-2 h-2 rounded-full bg-bronze shrink-0" />
      <span className="flex-1 text-bronze text-[13px] font-sans font-semibold">
        Πάρε σημερινό αντίγραφο ασφαλείας
        <span className="block text-ink/55 dark:text-bone/55 text-[11px] font-normal mt-0.5">
          Ένα κλικ — κατεβάζει Excel με όλα τα δεδομένα.
        </span>
      </span>
      <span className="text-bronze text-[11px] font-sans font-semibold tracking-[0.12em] uppercase px-3 py-1.5 rounded-full bg-bronze/10 border border-bronze/30 shrink-0">
        Λήψη Excel
      </span>
    </button>
  )
}

function ExportPanel({ bookings, members, subsByMember }) {
  function exportBookings() { downloadCSV(`bookings_${todayStr()}.csv`, bookingExportRows(bookings), BOOKING_COLS) }
  function exportMembers()  { downloadCSV(`members_${todayStr()}.csv`, memberExportRows(members, subsByMember), MEMBER_COLS) }
  function exportSubs()     { downloadCSV(`subscriptions_${todayStr()}.csv`, subExportRows(members, subsByMember), SUB_COLS) }
  function exportAll()      { downloadXLSX(`byme_${todayStr()}.xlsx`, exportSheets(bookings, members, subsByMember)) }

  const btn = 'flex items-center justify-center gap-2 border border-ink/[0.15] dark:border-bone/[0.15] hover:border-bronze/50 hover:bg-bronze/[0.06] text-ink/80 dark:text-bone/80 hover:text-ink dark:hover:text-bone text-[13px] font-sans font-semibold tracking-[0.14em] uppercase py-3.5 rounded-xl transition-colors cursor-pointer min-h-[52px]'

  return (
    <SectionCard title="Εξαγωγή δεδομένων" subtitle="Κάθε κατηγορία ξεχωριστά σε CSV, ή όλα μαζί σε ένα Excel με χωριστές καρτέλες.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <button onClick={exportBookings} className={btn}>Ραντεβού (CSV)</button>
        <button onClick={exportMembers} className={btn}>Μέλη (CSV)</button>
        <button onClick={exportSubs} className={btn}>Συνδρομές (CSV)</button>
        <button onClick={exportAll} className="flex items-center justify-center gap-2 bg-bronze hover:bg-amber text-ink text-[13px] font-sans font-semibold tracking-[0.14em] uppercase py-3.5 rounded-xl transition-colors cursor-pointer min-h-[52px]">
          Όλα (Excel)
        </button>
      </div>
    </SectionCard>
  )
}

function BackupsPanel() {
  const [rows,    setRows]    = useState(null)   // null = loading
  const [busyId,  setBusyId]  = useState(null)
  const [error,   setError]   = useState('')

  useEffect(() => {
    listBackups()
      .then(setRows)
      .catch(() => { setError('Δεν ήταν δυνατή η φόρτωση των αντιγράφων.'); setRows([]) })
  }, [])

  async function download(b) {
    setBusyId(b.id)
    try {
      const { snapshot_date, snapshot } = await getBackupSnapshot(b.id)
      const subsByMember = subsByMemberFrom(snapshot.subscriptions)
      downloadXLSX(`byme_backup_${snapshot_date}.xlsx`, exportSheets(snapshot.bookings || [], snapshot.members || [], subsByMember))
    } catch {
      setError('Η λήψη απέτυχε. Δοκίμασε ξανά.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <SectionCard title="Αυτόματα αντίγραφα ασφαλείας" subtitle="Κάθε μέρα που ανοίγεις τον πίνακα κρατιέται αυτόματα ένα αντίγραφο όλων των δεδομένων. Κατέβασε όποιο θέλεις σε Excel.">
      {error && <p className="text-ember text-sm font-sans mb-3">{error}</p>}
      {rows === null ? (
        <p className="text-ink/55 dark:text-bone/55 text-sm font-sans py-4">Φόρτωση…</p>
      ) : rows.length === 0 ? (
        <p className="text-ink/55 dark:text-bone/55 text-sm font-sans py-4">Δεν υπάρχουν αντίγραφα ακόμα. Θα δημιουργηθεί ένα αυτόματα σήμερα.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map(b => (
            <li key={b.id} className="flex items-center justify-between gap-3 bg-ink/[0.03] dark:bg-ink/30 border border-ink/[0.08] dark:border-bone/[0.08] rounded-xl px-4 py-3">
              <div className="min-w-0">
                <p className="text-ink dark:text-bone text-sm font-sans font-semibold tabular-nums">{fmtDate(b.snapshot_date)}</p>
                <p className="text-ink/50 dark:text-bone/50 text-[12px] font-sans mt-0.5 tabular-nums">
                  {b.members_count} μέλη · {b.bookings_count} ραντεβού · {b.subscriptions_count} συνδρομές
                </p>
              </div>
              <button
                onClick={() => download(b)}
                disabled={busyId === b.id}
                className="shrink-0 flex items-center gap-2 border border-ink/[0.15] dark:border-bone/[0.15] hover:border-bronze/50 hover:bg-bronze/[0.06] disabled:opacity-50 text-ink/80 dark:text-bone/80 hover:text-ink dark:hover:text-bone text-[12px] font-sans font-semibold tracking-[0.12em] uppercase px-4 py-2.5 rounded-full transition-colors cursor-pointer"
              >
                {busyId === b.id ? '…' : 'Excel'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
}

const WEEKDAYS_GR = [
  { dow: 1, label: 'Δευτέρα' }, { dow: 2, label: 'Τρίτη' }, { dow: 3, label: 'Τετάρτη' },
  { dow: 4, label: 'Πέμπτη' }, { dow: 5, label: 'Παρασκευή' }, { dow: 6, label: 'Σάββατο' }, { dow: 0, label: 'Κυριακή' },
]

function WeekdaysEditor({ value, onSave }) {
  const [list,   setList]   = useState(value)
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify([...list].sort()) !== JSON.stringify([...value].sort())

  function toggle(dow) {
    setList(list.includes(dow) ? list.filter(x => x !== dow) : [...list, dow])
  }
  async function save() { setSaving(true); await onSave([...list].sort()); setSaving(false) }

  return (
    <SectionCard title="Κλειστές μέρες (κάθε εβδομάδα)" subtitle="Μέρες που το studio είναι μόνιμα κλειστό — δεν θα δέχονται κρατήσεις.">
      <div className="flex flex-wrap gap-2">
        {WEEKDAYS_GR.map(d => {
          const closed = list.includes(d.dow)
          return (
            <button key={d.dow} type="button" onClick={() => toggle(d.dow)}
              className={`px-4 py-2.5 rounded-full text-sm font-sans font-medium border transition-colors cursor-pointer ${
                closed
                  ? 'bg-ember/15 border-ember/40 text-ember'
                  : 'bg-ink/[0.05] dark:bg-ink/40 border-ink/[0.15] dark:border-bone/[0.15] text-ink/70 dark:text-bone/70 hover:border-bronze/50 hover:text-ink dark:hover:text-bone'
              }`}>
              {d.label}{closed ? ' · κλειστά' : ''}
            </button>
          )
        })}
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={save} />
    </SectionCard>
  )
}

// Weekly Group schedule editor: per weekday, a list of (time → workout type).
function GroupScheduleEditor({ value, onSave }) {
  const [sched,  setSched]  = useState(value || {})
  const [dow,    setDow]    = useState(1) // Monday
  const [time,   setTime]   = useState('')
  const [type,   setType]   = useState('full')
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(sched) !== JSON.stringify(value || {})

  const dayKey   = String(dow)
  const dayItems = Object.entries(sched[dayKey] || {}).sort((a, b) => a[0].localeCompare(b[0]))

  function add() {
    if (!/^\d{2}:\d{2}$/.test(time)) return
    setSched(prev => ({ ...prev, [dayKey]: { ...(prev[dayKey] || {}), [time]: type } }))
    setTime('')
  }
  function remove(t) {
    setSched(prev => {
      const day = { ...(prev[dayKey] || {}) }; delete day[t]
      const next = { ...prev }
      if (Object.keys(day).length) next[dayKey] = day; else delete next[dayKey]
      return next
    })
  }
  async function save() { setSaving(true); await onSave(sched); setSaving(false) }

  return (
    <SectionCard title="Πρόγραμμα Group" subtitle="Όρισε τι είδος προπόνησης (Full Body / Lower / Upper / HIIT) έχει κάθε μέρα και ώρα. Οι πελάτες βλέπουν το είδος όταν κλείνουν Group.">
      {/* Weekday tabs */}
      <div className="flex gap-1 bg-ink/[0.04] dark:bg-ink/40 border border-ink/[0.1] dark:border-bone/[0.1] rounded-full p-1 mb-4 overflow-x-auto">
        {WEEKDAYS_GR.filter(d => d.dow !== 0).map(d => (
          <button key={d.dow} type="button" onClick={() => setDow(d.dow)}
            className={`shrink-0 px-3.5 py-2 rounded-full text-[12px] font-sans font-semibold tracking-[0.1em] uppercase transition-colors cursor-pointer ${
              dow === d.dow ? 'bg-bronze text-ink' : 'text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone'
            }`}>
            {d.label.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {dayItems.length === 0 && <p className="text-ink/40 dark:text-bone/40 text-sm font-sans">Κανένα group αυτή τη μέρα.</p>}
        {dayItems.map(([t, ty]) => {
          const meta = GROUP_TYPE_META[ty]
          return (
            <span key={t} className={`inline-flex items-center gap-2 rounded-full border pl-3 pr-2 py-2 text-sm font-sans font-medium ${meta?.chip || 'border-ink/15 text-ink/70'}`}>
              <span className="tabular-nums font-semibold">{t}</span>
              <span className="opacity-90">{meta?.label || ty}</span>
              <button onClick={() => remove(t)} className="text-current/50 hover:text-ember transition-colors cursor-pointer" aria-label={`Διαγραφή ${t}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </span>
          )
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input type="time" value={time} onChange={e => setTime(e.target.value)} className={`${sInput} sm:flex-1`} />
        <select value={type} onChange={e => setType(e.target.value)} className={`${sInput} sm:flex-1 cursor-pointer`}>
          {GROUP_TYPES.map(t => <option key={t} value={t}>{GROUP_TYPE_META[t].label}</option>)}
        </select>
        <button onClick={add} disabled={!/^\d{2}:\d{2}$/.test(time)} className="shrink-0 px-5 py-3 rounded-lg bg-ink/[0.06] dark:bg-bone/[0.06] hover:bg-bronze hover:text-ink disabled:opacity-40 text-ink dark:text-bone text-[13px] font-sans font-semibold tracking-[0.16em] uppercase transition-colors cursor-pointer">
          Προσθήκη
        </button>
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={save} />
    </SectionCard>
  )
}

// Per-weekday available hours for Pilates (the "blue cells" timetable).
function PilatesScheduleEditor({ value, onSave }) {
  const [sched,  setSched]  = useState(value || {})
  const [dow,    setDow]    = useState(1)
  const [time,   setTime]   = useState('')
  const [saving, setSaving] = useState(false)
  const dirty = JSON.stringify(sched) !== JSON.stringify(value || {})

  const dayKey   = String(dow)
  const dayTimes = [...(sched[dayKey] || [])].sort()

  function add() {
    if (!/^\d{2}:\d{2}$/.test(time) || dayTimes.includes(time)) { setTime(''); return }
    setSched(prev => ({ ...prev, [dayKey]: [...(prev[dayKey] || []), time].sort() }))
    setTime('')
  }
  function remove(t) {
    setSched(prev => {
      const arr = (prev[dayKey] || []).filter(x => x !== t)
      const next = { ...prev }
      if (arr.length) next[dayKey] = arr; else delete next[dayKey]
      return next
    })
  }
  async function save() { setSaving(true); await onSave(sched); setSaving(false) }

  return (
    <SectionCard title="Πρόγραμμα Pilates" subtitle="Όρισε τις διαθέσιμες ώρες Pilates για κάθε μέρα. Ο πελάτης βλέπει μόνο αυτές όταν κλείνει Pilates.">
      <div className="flex gap-1 bg-ink/[0.04] dark:bg-ink/40 border border-ink/[0.1] dark:border-bone/[0.1] rounded-full p-1 mb-4 overflow-x-auto">
        {WEEKDAYS_GR.filter(d => d.dow !== 0).map(d => (
          <button key={d.dow} type="button" onClick={() => setDow(d.dow)}
            className={`shrink-0 px-3.5 py-2 rounded-full text-[12px] font-sans font-semibold tracking-[0.1em] uppercase transition-colors cursor-pointer ${
              dow === d.dow ? 'bg-bronze text-ink' : 'text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone'
            }`}>
            {d.label.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {dayTimes.length === 0 && <p className="text-ink/40 dark:text-bone/40 text-sm font-sans">Καμία ώρα Pilates αυτή τη μέρα.</p>}
        {dayTimes.map(t => (
          <span key={t} className="inline-flex items-center gap-2 bg-ink/[0.04] dark:bg-ink/50 border border-ink/[0.15] dark:border-bone/[0.15] rounded-full pl-3.5 pr-2 py-2 text-ink dark:text-bone text-sm font-sans font-medium">
            <span className="tabular-nums">{t}</span>
            <button onClick={() => remove(t)} className="text-ink/40 dark:text-bone/40 hover:text-ember transition-colors cursor-pointer" aria-label={`Διαγραφή ${t}`}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-2">
        <input type="time" value={time} onChange={e => setTime(e.target.value)} className={`${sInput} flex-1`} />
        <button onClick={add} disabled={!/^\d{2}:\d{2}$/.test(time)} className="shrink-0 px-5 rounded-lg bg-ink/[0.06] dark:bg-bone/[0.06] hover:bg-bronze hover:text-ink disabled:opacity-40 text-ink dark:text-bone text-[13px] font-sans font-semibold tracking-[0.16em] uppercase transition-colors cursor-pointer">
          Προσθήκη
        </button>
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={save} />
    </SectionCard>
  )
}

// One-off block of a specific service at a specific date+time (not recurring).
function BlockedSlotsEditor({ value, onSave, settings = {} }) {
  const today = ymd(new Date())
  const [list,    setList]    = useState(value || [])
  const [pick,    setPick]    = useState('')
  const [service, setService] = useState(SERVICES[0])
  const [saving,  setSaving]  = useState(false)
  const dirty = JSON.stringify(list) !== JSON.stringify(value || [])

  const has = (d, t, s) => list.some(b => b.date === d && b.time === t && b.service === s)
  // The actual bookable times for the picked date+service (the schedule the
  // customer would see). Admin just taps the slot to close it — no typing.
  const slots = pick ? bookableSlots(pick, service, settings) : []
  function toggle(t) {
    if (has(pick, t, service)) remove({ date: pick, time: t, service })
    else setList(prev => [...prev, { date: pick, time: t, service }])
  }
  function remove(b) { setList(list.filter(x => !(x.date === b.date && x.time === b.time && x.service === b.service))) }
  async function save() { setSaving(true); await onSave(list); setSaving(false) }

  const sortKey = b => `${b.date} ${b.time}`
  const upcoming = list.filter(b => b.date >= today).sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
  const pastCount = list.length - upcoming.length

  return (
    <SectionCard title="Κλείσιμο ώρας (μία φορά)" subtitle="Διάλεξε μέρα & υπηρεσία, μετά πάτησε την ώρα που θες να κλείσεις — δεν θα δέχεται κράτηση μόνο εκείνη τη φορά.">
      <DatePicker value={pick} onChange={d => d && setPick(d)} min={today} />
      <div className="mt-4">
        <select value={service} onChange={e => setService(e.target.value)} className={`${sInput} w-full cursor-pointer`}>
          {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {pick && (
        <div className="mt-4">
          {slots.length === 0 ? (
            <p className="text-ink/40 dark:text-bone/40 text-sm font-sans">Δεν υπάρχουν ώρες για {service} αυτή τη μέρα.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {slots.map(t => {
                const blocked = has(pick, t, service)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggle(t)}
                    className={`tabular-nums text-sm font-sans font-semibold rounded-lg py-2.5 border transition-colors cursor-pointer ${
                      blocked
                        ? 'bg-ember/[0.12] border-ember/40 text-ember'
                        : 'bg-ink/[0.04] dark:bg-bone/[0.04] border-ink/[0.12] dark:border-bone/[0.12] text-ink dark:text-bone hover:border-bronze hover:text-bronze'
                    }`}
                    aria-pressed={blocked}
                  >
                    {t}{blocked ? ' ✕' : ''}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {upcoming.length === 0 && <p className="text-ink/40 dark:text-bone/40 text-sm font-sans">Καμία κλειστή ώρα.</p>}
        {upcoming.map((b, i) => (
          <div key={`${b.date}_${b.time}_${b.service}_${i}`} className="flex items-center justify-between bg-ink/[0.04] dark:bg-ink/40 border border-ink/[0.1] dark:border-bone/[0.1] rounded-lg px-4 py-3 gap-3">
            <span className="text-ink dark:text-bone text-sm font-sans font-medium">
              {formatDate(b.date)} · <span className="tabular-nums">{b.time}</span> · <span className="text-ink/60 dark:text-bone/60">{b.service}</span>
            </span>
            <button onClick={() => remove(b)} className="text-ember/70 hover:text-ember text-[11px] font-sans font-semibold tracking-[0.16em] uppercase cursor-pointer shrink-0">Αφαίρεση</button>
          </div>
        ))}
        {pastCount > 0 && <p className="text-ink/30 dark:text-bone/30 text-xs font-sans pt-1">+ {pastCount} παλιότερες (αγνοούνται)</p>}
      </div>
      <SaveBar dirty={dirty} saving={saving} onSave={save} />
    </SectionCard>
  )
}

function SettingsView({ timeSlots, saturdaySlots, closedWeekdays, closedDates, groupSchedule, pilatesSchedule, blockedSlots, plans, onSaved, bookings, members, subsByMember }) {
  return (
    <div className="space-y-5 max-w-2xl">
      <HoursEditor       key={'wd-'  + JSON.stringify(timeSlots)}     value={timeSlots}     title="Ώρες κράτησης (Δευτέρα–Παρασκευή)" subtitle="Γενικές ώρες (Personal Training). Pilates & Group έχουν δικό τους πρόγραμμα παρακάτω." onSave={v => onSaved('time_slots', v)} />
      <HoursEditor       key={'sat-' + JSON.stringify(saturdaySlots)} value={saturdaySlots} title="Ώρες κράτησης (Σάββατο)"             subtitle="Ξεχωριστές γενικές ώρες μόνο για το Σάββατο." onSave={v => onSaved('saturday_slots', v)} />
      <PilatesScheduleEditor key={'pil-' + JSON.stringify(pilatesSchedule)} value={pilatesSchedule}                                        onSave={v => onSaved('pilates_schedule', v)} />
      <GroupScheduleEditor key={'grp-' + JSON.stringify(groupSchedule)}     value={groupSchedule}                                          onSave={v => onSaved('group_schedule', v)} />
      <WeekdaysEditor    key={'cwd-' + JSON.stringify(closedWeekdays)}      value={closedWeekdays}                                         onSave={v => onSaved('closed_weekdays', v)} />
      <ClosedDatesEditor key={'cd-'  + JSON.stringify(closedDates)}        value={closedDates}                                            onSave={v => onSaved('closed_dates', v)} />
      <BlockedSlotsEditor key={'bs-' + JSON.stringify(blockedSlots)}       value={blockedSlots} settings={{ time_slots: timeSlots, saturday_slots: saturdaySlots, closed_weekdays: closedWeekdays, group_schedule: groupSchedule, pilates_schedule: pilatesSchedule, blocked_slots: blockedSlots }} onSave={v => onSaved('blocked_slots', v)} />
      <PlansEditor       key={'pl-'  + JSON.stringify(plans)}              value={plans}                                                  onSave={v => onSaved('plans', v)} />
      <ExportPanel bookings={bookings} members={members} subsByMember={subsByMember} />
      <BackupsPanel />
    </div>
  )
}

const eur = new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const eur2 = new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' })

function RevenueStat({ label, value, sub }) {
  return (
    <div className="bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-2xl p-5">
      <p className="text-ink/45 dark:text-bone/45 text-[11px] font-sans font-semibold tracking-[0.18em] uppercase mb-2">{label}</p>
      <p className="text-ink dark:text-bone text-3xl font-sans font-semibold tracking-tight tabular-nums leading-none">{value}</p>
      {sub && <p className="text-ink/45 dark:text-bone/45 text-[13px] font-sans mt-2">{sub}</p>}
    </div>
  )
}

// Revenue is recognised on the date a subscription was registered (created_at).
// Cancelled subscriptions are excluded.
function RevenueView({ subsByMember, members, bookings }) {
  const [month, setMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })

  const allSubs = Object.values(subsByMember || {}).flat()
  const y = month.getFullYear(), m = month.getMonth()
  const now = new Date()
  const isCurrentMonth = y === now.getFullYear() && m === now.getMonth()

  const inMonthTs  = (ts)  => { if (!ts) return false; const d = new Date(ts); return d.getFullYear() === y && d.getMonth() === m }
  const inMonthYmd = (ymd) => !!ymd && (+ymd.slice(0, 4)) === y && (+ymd.slice(5, 7) - 1) === m

  const monthSubs   = allSubs.filter(s => s.status !== 'cancelled' && inMonthTs(s.created_at))
  const revenue     = monthSubs.reduce((sum, s) => sum + (Number(s.price) || 0), 0)
  const subsCount   = monthSubs.length
  const avgValue    = subsCount ? revenue / subsCount : 0
  const newMembers  = (members || []).filter(mm => inMonthTs(mm.created_at)).length
  const sessions    = (bookings || []).filter(b => b.status !== 'cancelled' && b.status !== 'standby' && inMonthYmd(b.booking_date)).length

  // Breakdown by plan name.
  const byPlan = {}
  for (const s of monthSubs) {
    const key = s.plan_name || '—'
    if (!byPlan[key]) byPlan[key] = { count: 0, revenue: 0 }
    byPlan[key].count   += 1
    byPlan[key].revenue += Number(s.price) || 0
  }
  const planRows = Object.entries(byPlan).sort((a, b) => b[1].revenue - a[1].revenue)

  // Last 6 months trend (revenue per month).
  const trend = []
  for (let i = 5; i >= 0; i--) {
    const d  = new Date(y, m - i, 1)
    const ry = d.getFullYear(), rm = d.getMonth()
    const rev = allSubs
      .filter(s => s.status !== 'cancelled' && s.created_at && (() => { const c = new Date(s.created_at); return c.getFullYear() === ry && c.getMonth() === rm })())
      .reduce((sum, s) => sum + (Number(s.price) || 0), 0)
    trend.push({ label: MONTHS_GR[rm], year: ry, month: rm, rev })
  }
  const trendMax = Math.max(1, ...trend.map(t => t.rev))

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Month navigator */}
      <div className="flex items-center justify-between">
        <button onClick={() => setMonth(new Date(y, m - 1, 1))}
          className="w-10 h-10 flex items-center justify-center rounded-full text-ink/50 dark:text-bone/50 hover:bg-ink/[0.06] dark:hover:bg-bone/[0.06] hover:text-ink dark:hover:text-bone transition-colors cursor-pointer">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        </button>
        <div className="text-center">
          <p className="text-ink dark:text-bone font-sans text-2xl font-semibold tracking-tight">{MONTHS_GR_FULL[m]} {y}</p>
          {!isCurrentMonth && (
            <button onClick={() => { const d = new Date(); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)) }}
              className="text-bronze hover:text-amber text-[11px] font-sans tracking-[0.18em] uppercase mt-0.5 transition-colors cursor-pointer">
              Τρέχων μήνας
            </button>
          )}
        </div>
        <button onClick={() => setMonth(new Date(y, m + 1, 1))} disabled={isCurrentMonth}
          aria-label="Επόμενος μήνας"
          className="w-10 h-10 flex items-center justify-center rounded-full text-ink/50 dark:text-bone/50 hover:bg-ink/[0.06] dark:hover:bg-bone/[0.06] hover:text-ink dark:hover:text-bone disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
        </button>
      </div>

      {/* Headline revenue */}
      <div className="relative overflow-hidden rounded-2xl p-6 border border-bronze/35 bg-gradient-to-br from-bronze/[0.12] to-transparent">
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-bronze/15 blur-2xl" />
        <p className="relative text-bronze text-[11px] font-sans font-semibold tracking-[0.26em] uppercase">Έσοδα μήνα</p>
        <p className="relative text-ink dark:text-bone text-5xl font-sans font-semibold tracking-tight tabular-nums mt-2 leading-none">{eur2.format(revenue)}</p>
        <p className="relative text-ink/55 dark:text-bone/55 text-[13px] font-sans mt-3">
          {subsCount} {subsCount === 1 ? 'συνδρομή' : 'συνδρομές'} · μέση αξία {eur.format(avgValue)}
        </p>
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-2 gap-3">
        <RevenueStat label="Νέα μέλη" value={newMembers} sub="εγγραφές τον μήνα" />
        <RevenueStat label="Προπονήσεις" value={sessions} sub="κρατήσεις τον μήνα" />
      </div>

      {/* Breakdown by plan */}
      <SectionCard title="Ανά πακέτο" subtitle="Πόσα πούλησε το κάθε πακέτο αυτόν τον μήνα.">
        {planRows.length === 0 ? (
          <p className="text-ink/45 dark:text-bone/45 text-sm font-sans py-2">Καμία συνδρομή αυτόν τον μήνα.</p>
        ) : (
          <ul className="divide-y divide-ink/[0.07] dark:divide-bone/[0.07]">
            {planRows.map(([name, d]) => (
              <li key={name} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-ink dark:text-bone font-sans font-medium text-base truncate">{name}</p>
                  <p className="text-ink/45 dark:text-bone/45 text-[13px] font-sans">{d.count} {d.count === 1 ? 'συνδρομή' : 'συνδρομές'}</p>
                </div>
                <p className="text-ink dark:text-bone font-sans font-semibold tabular-nums shrink-0">{eur2.format(d.revenue)}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* 6-month trend */}
      <SectionCard title="Τελευταίοι 6 μήνες" subtitle="Τάση εσόδων.">
        <div className="flex items-end justify-between gap-2 h-32 pt-2">
          {trend.map((t, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 min-w-0">
              <span className="text-ink/55 dark:text-bone/55 text-[10px] font-sans tabular-nums">{t.rev > 0 ? eur.format(t.rev) : ''}</span>
              <div className="w-full flex items-end" style={{ height: '72px' }}>
                <div
                  className={`w-full rounded-t-md transition-all ${t.month === m && t.year === y ? 'bg-bronze' : 'bg-bronze/30'}`}
                  style={{ height: `${Math.max(t.rev > 0 ? 6 : 0, (t.rev / trendMax) * 72)}px` }}
                />
              </div>
              <span className="text-ink/45 dark:text-bone/45 text-[11px] font-sans">{t.label}</span>
            </div>
          ))}
        </div>
      </SectionCard>

      <p className="text-ink/35 dark:text-bone/35 text-[12px] font-sans leading-relaxed">
        Τα έσοδα μετρώνται με βάση την ημερομηνία καταχώρησης της συνδρομής. Οι ακυρωμένες συνδρομές δεν προσμετρώνται.
      </p>
    </div>
  )
}

export default function Admin() {
  const navigate = useNavigate()

  const [bookings,         setBookings]         = useState([])
  const [view,             setView]             = useState('dashboard')
  const [bookingSubView,   setBookingSubView]   = useState('calendar')
  const [calendarService,  setCalendarService]  = useState('all')
  const [dashboardService, setDashboardService] = useState('all')
  const [listFilter,       setListFilter]       = useState('upcoming')
  const [listService,      setListService]      = useState('all')
  const [calendarMonth,    setCalendarMonth]    = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1) })
  const [selectedDay,      setSelectedDay]      = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [actionId,         setActionId]         = useState(null)
  const [toast,            setToast]            = useState(null)
  const [selectedBooking,  setSelectedBooking]  = useState(null)
  const [showAddModal,     setShowAddModal]     = useState(false)
  const [weekStart,        setWeekStart]        = useState(() => getMonday(new Date()))
  const [mobileDayOffset,  setMobileDayOffset]  = useState(() => {
    const today = new Date(); today.setHours(0,0,0,0)
    const mon   = getMonday(new Date())
    return Math.max(0, Math.round((today - mon) / 86400000))
  })
  const [members,          setMembers]          = useState([])
  const [membersLoading,   setMembersLoading]   = useState(false)
  const [showAddMember,    setShowAddMember]    = useState(false)
  const [selectedMember,   setSelectedMember]   = useState(null)
  const [confirmDeactivate, setConfirmDeactivate] = useState(null) // { id, name }
  const [subsByMember,     setSubsByMember]     = useState({})
  const [allSubs,          setAllSubs]          = useState([])
  const [medicalByMember,  setMedicalByMember]  = useState({})
  const [certReviewQueue,  setCertReviewQueue]  = useState([]) // [{ cert, memberName }]
  const [certReviewExpiry, setCertReviewExpiry] = useState('')
  const [certReviewUrl,    setCertReviewUrl]    = useState(null)
  const [certReviewSaving, setCertReviewSaving] = useState(false)
  const [memberSearch,     setMemberSearch]     = useState('')
  const [memberFilter,     setMemberFilter]     = useState('all')
  const [timeSlots,        setTimeSlots]        = useState(DEFAULT_TIME_SLOTS)
  const [saturdaySlots,    setSaturdaySlots]    = useState(DEFAULT_SATURDAY_SLOTS)
  const [closedWeekdays,   setClosedWeekdays]   = useState(DEFAULT_CLOSED_WEEKDAYS)
  const [closedDates,      setClosedDates]      = useState([])
  const [groupSchedule,    setGroupSchedule]    = useState({})
  const [pilatesSchedule,  setPilatesSchedule]  = useState({})
  const [blockedSlots,     setBlockedSlots]     = useState([])
  const [plans,            setPlans]            = useState(DEFAULT_PLANS)
  const [theme,            setTheme]            = useState(() => localStorage.getItem('admin_theme') || 'light')

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('admin_theme', next)
  }

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function handleSaveSetting(key, value) {
    const { error } = await saveSetting(key, value)
    if (error) { showToast('Σφάλμα αποθήκευσης ρυθμίσεων.', 'error'); return }
    if (key === 'time_slots')      setTimeSlots(value)
    if (key === 'saturday_slots')  setSaturdaySlots(value)
    if (key === 'closed_weekdays') setClosedWeekdays(value)
    if (key === 'closed_dates')    setClosedDates(value)
    if (key === 'group_schedule')   setGroupSchedule(value)
    if (key === 'pilates_schedule') setPilatesSchedule(value)
    if (key === 'blocked_slots')    setBlockedSlots(value)
    if (key === 'plans')           setPlans(value)
    showToast('Οι ρυθμίσεις αποθηκεύτηκαν.')
  }

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('bookings').select('*')
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true })
    if (!error) setBookings(data ?? [])
    setLoading(false)
  }, [])

  const fetchMembers = useCallback(async () => {
    setMembersLoading(true)
    await expireOverdueSubscriptions()
    const { data: mems, error: memsErr } = await supabase.from('members').select('*').order('created_at', { ascending: false })
    const { data: subs, error: subsErr } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false })
    if (memsErr) console.error('fetchMembers error:', memsErr)
    if (subsErr) console.error('fetchSubs error:', subsErr)
    if (mems) setMembers(mems)
    if (subs) {
      const map = {}
      for (const s of subs) {
        if (!map[s.member_id]) map[s.member_id] = []
        map[s.member_id].push(s)
      }
      setSubsByMember(map)
      setAllSubs(subs)
    }
    fetchMedicalByMember().then(setMedicalByMember)
    setMembersLoading(false)
  }, [])

  useEffect(() => {
    let active = true
    // Gate on a real Supabase Auth session; load data only once confirmed.
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (!data.session) { navigate('/admin/login'); return }
      fetchBookings(); fetchMembers()
    })
    // Redirect out if the session ends (logout / token expiry) mid-use.
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate('/admin/login')
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [navigate, fetchBookings, fetchMembers])

  // Auto daily backup: once all data is loaded, snapshot today's state if it
  // hasn't been captured yet. Guarded so it runs at most once per session.
  const backupDone = useRef(false)
  useEffect(() => {
    if (backupDone.current || loading || membersLoading) return
    if (members.length === 0 && bookings.length === 0) return
    backupDone.current = true
    autoBackupIfDue({ bookings, members, subscriptions: allSubs }).catch(err =>
      console.error('auto-backup failed:', err)
    )
  }, [loading, membersLoading, bookings, members, allSubs])

  useEffect(() => {
    loadSettings().then(s => {
      setTimeSlots(s.time_slots)
      setSaturdaySlots(s.saturday_slots)
      setClosedWeekdays(s.closed_weekdays)
      setClosedDates(s.closed_dates)
      setGroupSchedule(s.group_schedule || {})
      setPilatesSchedule(s.pilates_schedule || {})
      setBlockedSlots(s.blocked_slots || [])
      setPlans(s.plans)
    })
  }, [])

  async function handleToggleMember(id, active, name) {
    if (!active) {
      // Deactivating — ask first
      setConfirmDeactivate({ id, name })
      return
    }
    await supabase.from('members').update({ active }).eq('id', id)
    fetchMembers()
  }

  async function doDeactivate() {
    if (!confirmDeactivate) return
    await supabase.from('members').update({ active: false }).eq('id', confirmDeactivate.id)
    setConfirmDeactivate(null)
    fetchMembers()
  }

  const currentReview = certReviewQueue[0] || null

  async function openCertForReview() {
    if (!currentReview?.cert?.file_path) return
    const url = await signedCertUrl(currentReview.cert.file_path)
    setCertReviewUrl(url)
    if (url) window.open(url, '_blank')
  }

  async function approveCert() {
    if (!currentReview) return
    setCertReviewSaving(true)
    const expiry = certReviewExpiry || currentReview.cert.expires_at?.slice(0, 10) || null
    const res = await adminApproveCert(currentReview.cert.id, expiry)
    setCertReviewSaving(false)
    if (res.ok) {
      setCertReviewQueue(q => q.slice(1))
      setCertReviewExpiry('')
      setCertReviewUrl(null)
      fetchMedicalByMember().then(setMedicalByMember)
    }
  }

  function dismissCertReview() {
    setCertReviewQueue(q => q.slice(1))
    setCertReviewExpiry('')
    setCertReviewUrl(null)
  }

  useEffect(() => {
    const ch = supabase.channel('bookings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, fetchBookings)
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [fetchBookings])

  useEffect(() => {
    const ch = supabase.channel('medical-cert-uploads')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'medical_certificates' },
        async (payload) => {
          const cert = payload.new
          if (!cert?.id || cert.reviewed_at) return
          // Look up the member name from current state (or re-fetch)
          const { data: member } = await supabase
            .from('members').select('name').eq('id', cert.member_id).single()
          const memberName = member?.name || 'Άγνωστος'
          setCertReviewQueue(q => [...q, { cert, memberName }])
        }
      )
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [])

  async function handleCancel(booking, refund = true) {
    // Completed bookings can't be cancelled.
    if (bookingDisplayKey(booking) === 'completed') {
      showToast('Τα ολοκληρωμένα ραντεβού δεν μπορούν να ακυρωθούν.', 'error')
      return
    }
    setActionId(booking.id)
    const wasActive = booking.status !== 'cancelled'
    const outcome   = !booking.subscription_id ? 'none' : refund ? 'refunded' : 'kept'
    const { error } = await supabase.from('bookings')
      .update({ status: 'cancelled', cancel_outcome: outcome })
      .eq('id', booking.id)
    if (error) {
      showToast('Σφάλμα κατά την ακύρωση.', 'error')
    } else {
      if (wasActive && booking.subscription_id && refund) {
        await refundSessionForBooking(booking.subscription_id)
      }
      if (booking.status === 'confirmed') {
        try { await promoteStandby(booking) } catch { /* silent */ }
      }
      const msg = refund && booking.subscription_id
        ? `Ακυρώθηκε το ραντεβού του ${booking.name}. Η συνεδρία επιστράφηκε.`
        : booking.subscription_id
          ? `Ακυρώθηκε το ραντεβού του ${booking.name}. Η συνεδρία δεν επιστράφηκε.`
          : `Ακυρώθηκε το ραντεβού του ${booking.name}.`
      showToast(msg)
      setSelectedBooking(null)
      fetchBookings()
    }
    setActionId(null)
  }

  async function handleAddBooking(form) {
    // Determine status first — only consume a session for confirmed bookings,
    // never for standby (mirrors the member portal flow, prevents double-charging).
    const { data: existingSlot } = await supabase
      .from('bookings')
      .select('status')
      .eq('booking_date', form.booking_date)
      .eq('booking_time', form.booking_time)
      .eq('service', form.service)
      .eq('status', 'confirmed')
    const cap = SERVICE_CAPACITY[form.service] ?? 1
    const bookingStatus = (existingSlot?.length || 0) < cap ? 'confirmed' : 'standby'

    let subscription_id = null
    if (bookingStatus === 'confirmed' && form.email) {
      const { data: m } = await supabase
        .from('members').select('id').eq('email', form.email.toLowerCase().trim()).single()
      if (m?.id) {
        const consume = await consumeSessionForBooking(m.id)
        if (!consume.ok) {
          showToast(consume.error, 'error')
          return false
        }
        subscription_id = consume.sub.id
      }
    }

    // For Group Training, stamp the workout type from the weekly schedule.
    const session_type = form.service === GROUP_SERVICE
      ? groupTypeFor(form.booking_date, form.booking_time, settingsObj)
      : null
    const payload = { ...form, email: form.email.toLowerCase().trim(), subscription_id, status: bookingStatus, session_type }
    const { error } = await supabase.from('bookings').insert([payload])
    if (error) {
      if (subscription_id) await refundSessionForBooking(subscription_id)
      return false
    }
    showToast('Το ραντεβού αποθηκεύτηκε.')
    setShowAddModal(false)
    fetchBookings()
    return true
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/admin/login')
  }

  const todayStr = ymd(new Date())
  const todayDow = new Date().getDay()
  // The agenda always shows existing bookings even on closed days.
  // Saturday gets its own shorter slot list; everything else (including closed
  // recurring weekdays) uses the main weekday time_slots.
  const agendaSlots = todayDow === 6 ? saturdaySlots : timeSlots
  const todayIsClosed = closedDates.includes(todayStr) || closedWeekdays.includes(todayDow)

  const counts = {
    upcoming:  bookings.filter(b => bookingDisplayKey(b) === 'upcoming').length,
    completed: bookings.filter(b => bookingDisplayKey(b) === 'completed').length,
    standby:   bookings.filter(b => b.status === 'standby').length,
    cancelled: bookings.filter(b => b.status === 'cancelled').length,
  }
  const todayCount = bookings.filter(b => b.booking_date === todayStr).length

  const todayBookings = bookings
    .filter(b => b.booking_date === todayStr)
    .sort((a, b) => a.booking_time.localeCompare(b.booking_time))

  const upcomingBookings = bookings
    .filter(b => b.booking_date > todayStr && b.status !== 'cancelled')
    .sort((a, b) => (a.booking_date + a.booking_time).localeCompare(b.booking_date + b.booking_time))
    .slice(0, 10)

  const slotBookingCounts = {}
  bookings.filter(b => b.status === 'confirmed' || b.status === 'standby').forEach(b => {
    const key = `${b.booking_date}_${b.booking_time}_${b.service}`
    if (!slotBookingCounts[key]) slotBookingCounts[key] = { confirmed: 0, standby: 0 }
    slotBookingCounts[key][b.status]++
  })

  const activeMembersCount = members.filter(m => m.active).length

  // Members who need a renewal nudge — prioritised: expired → low sessions → expiring
  const REASON_ORDER = { expired: 0, low: 1, expiring: 2 }
  // Active members whose cert needs attention: unreviewed upload, missing, expired,
  // or expiring within a month (certStatus → 'expiring' when ≤30 days left).
  const pendingCerts = members
    .filter(m => m.active)
    .filter(m => {
      const cert = medicalByMember[m.id]
      // uploaded but not yet reviewed by admin
      if (cert?.id && !cert.reviewed_at) return true
      // missing, expired, or expiring within a month
      return ['missing', 'expired', 'expiring'].includes(certStatus(cert))
    })

  // Split into the three concerns so the dashboard can show them as separate boxes.
  const certsToReview = pendingCerts.filter(m => medicalByMember[m.id]?.id && !medicalByMember[m.id]?.reviewed_at)
  const certsMissing  = pendingCerts.filter(m => ['missing', 'expired'].includes(certStatus(medicalByMember[m.id])))
  const certsExpiring = pendingCerts.filter(m => certStatus(medicalByMember[m.id]) === 'expiring')

  const renewals = members
    .filter(m => m.active)
    .flatMap(m => {
      const subs   = subsByMember[m.id] || []
      const actives = subs.filter(s => s.status === 'active' && !isExpired(s))
      if (actives.length > 0) {
        // Check each active sub independently — a member with 2 subs can have one that's fine
        // and one that's low/expiring; both should appear.
        const alerts = actives.flatMap(active => {
          if (lowSessions(active))  return [{ m, sub: active, kind: 'low',      value: sessionsLeft(active) }]
          if (expiringSoon(active)) return [{ m, sub: active, kind: 'expiring', value: daysLeft(active) }]
          return []
        })
        return alerts
      }
      if (subs.length > 0) return [{ m, sub: subs[0], kind: 'expired' }]
      return []
    })
    .filter(Boolean)
    .sort((a, b) => REASON_ORDER[a.kind] - REASON_ORDER[b.kind])

  function renewalText(r) {
    if (r.kind === 'expired')  return 'Έληξε η συνδρομή'
    if (r.kind === 'low')      return r.value === 0 ? 'Καμία συνεδρία' : `${r.value} συνεδρ. έμειναν`
    return r.value <= 0 ? 'Λήγει σήμερα' : `Λήγει σε ${r.value} μέρ.`
  }

  const weekDays = getWeekDays(weekStart)

  function getCells(date, time) {
    const ds = toDateStr(date)
    return bookings.filter(b => b.booking_date === ds && b.booking_time === time)
  }

  const mobileDay = (() => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + mobileDayOffset)
    return d
  })()

  const filtered = (() => {
    const base = (listFilter === 'all' ? bookings : bookings.filter(b => bookingDisplayKey(b) === listFilter))
      .filter(b => listService === 'all' || b.service === listService)
    const upcoming = base.filter(b => b.booking_date >= todayStr)
      .sort((a, b) => (a.booking_date + a.booking_time).localeCompare(b.booking_date + b.booking_time))
    const pastBookings = base.filter(b => b.booking_date < todayStr)
      .sort((a, b) => (b.booking_date + b.booking_time).localeCompare(a.booking_date + a.booking_time))
    return [...upcoming, ...pastBookings]
  })()

  function prevWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); setMobileDayOffset(0)
  }
  function nextWeek() {
    const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); setMobileDayOffset(0)
  }
  function goToday() {
    setWeekStart(getMonday(new Date()))
    const today = new Date(); today.setHours(0,0,0,0)
    const mon   = getMonday(new Date())
    setMobileDayOffset(Math.max(0, Math.round((today - mon) / 86400000)))
  }

  // Combined settings object passed to child views / used for slot derivation.
  const settingsObj = {
    time_slots: timeSlots, saturday_slots: saturdaySlots,
    closed_weekdays: closedWeekdays, closed_dates: closedDates,
    group_schedule: groupSchedule, pilates_schedule: pilatesSchedule, blocked_slots: blockedSlots,
  }

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''}`}>
    <div className="min-h-screen bg-bone dark:bg-ink text-ink dark:text-bone">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-4 left-4 sm:left-auto sm:right-5 sm:max-w-xs z-50 px-5 py-4 rounded-xl text-base font-sans font-medium shadow-xl border ${
          toast.type === 'error'
            ? 'bg-ember/10 text-ember border-ember/30'
            : 'bg-bronze/15 text-bronze border-bronze/30'
        }`}>{toast.msg}</div>
      )}

      {selectedDay && (
        <DayModal
          dateStr={selectedDay}
          bookings={bookings.filter(b => b.booking_date === selectedDay && b.status !== 'cancelled' && (calendarService === 'all' || b.service === calendarService))}
          isClosed={closedDates.includes(selectedDay)}
          onClose={() => setSelectedDay(null)}
          onSelectBooking={b => { setSelectedDay(null); setSelectedBooking(b) }}
          settings={settingsObj}
        />
      )}
      {selectedBooking && (
        <DetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onCancel={handleCancel}
          actionId={actionId}
        />
      )}
      {showAddModal && (
        <AddModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddBooking}
          slotBookingCounts={slotBookingCounts}
          settings={settingsObj}
        />
      )}
      {showAddMember && (
        <AddMemberModal
          onClose={() => setShowAddMember(false)}
          onAdd={() => { fetchMembers(); }}
          plans={plans}
        />
      )}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          isAdmin={true}
          medicalCert={medicalByMember[selectedMember.id] || null}
          onClose={() => { setSelectedMember(null); fetchMembers(); }}
        />
      )}

      {confirmDeactivate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/80 backdrop-blur-sm" onClick={() => setConfirmDeactivate(null)}>
          <div className="bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-t-2xl sm:rounded-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-bone/20 rounded-full mx-auto mt-3 sm:hidden" />
            <div className="px-6 pt-6 pb-2">
              <p className="text-[11px] font-sans font-semibold text-bronze tracking-[0.22em] uppercase mb-1">Απενεργοποίηση</p>
              <p className="text-ink dark:text-bone text-lg font-sans font-semibold mt-1">Είσαι σίγουρος;</p>
              <p className="text-ink/65 dark:text-bone/65 text-sm font-sans mt-2 leading-relaxed">
                Το μέλος <span className="font-semibold text-ink dark:text-bone">{confirmDeactivate.name}</span> θα απενεργοποιηθεί και δεν θα μπορεί να συνδεθεί.
              </p>
            </div>
            <div className="px-6 pb-6 pt-4 flex gap-3">
              <button
                onClick={() => setConfirmDeactivate(null)}
                className="flex-1 border border-ink/[0.15] dark:border-bone/[0.15] hover:border-ink/30 dark:hover:border-bone/30 text-ink/60 dark:text-bone/60 hover:text-ink dark:hover:text-bone font-sans font-semibold text-[13px] tracking-[0.18em] uppercase py-3.5 rounded-full transition-colors cursor-pointer min-h-[52px]"
              >
                Άκυρο
              </button>
              <button
                onClick={doDeactivate}
                className="flex-1 bg-ember/90 hover:bg-ember text-white font-sans font-semibold text-[13px] tracking-[0.18em] uppercase py-3.5 rounded-full transition-colors cursor-pointer min-h-[52px]"
              >
                Απενεργοποίηση
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:left-0 md:w-60 border-r border-ink/[0.08] dark:border-bone/[0.08] bg-white/95 dark:bg-coal/40 z-40">
        <div className="px-6 py-[18px] flex items-center gap-3 border-b border-ink/[0.08] dark:border-bone/[0.08]">
          <BymeLogo size="xs" className="text-ink dark:text-bone" />
          <span className="text-bronze text-[10px] font-sans tracking-[0.25em] uppercase border border-bronze/30 bg-bronze/10 px-2.5 py-1 rounded-full">Admin</span>
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1">
          {NAV.map(item => {
            const isActive = view === item.key
            const badge = item.key === 'bookings' ? counts.standby : item.key === 'dashboard' ? renewals.length : 0
            const badgeCls = item.key === 'bookings' ? 'bg-amber/20 text-amber' : 'bg-ember/20 text-ember'
            return (
              <button key={item.key} onClick={() => { setView(item.key); if (item.key === 'members') setMemberFilter('all') }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-sans font-semibold tracking-[0.06em] transition-colors cursor-pointer ${
                  isActive ? 'bg-bronze text-ink' : 'text-ink/60 dark:text-bone/60 hover:text-ink dark:hover:text-bone hover:bg-ink/[0.05] dark:hover:bg-bone/[0.05]'
                }`}>
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span>{item.label}</span>
                {badge > 0 && (
                  <span className={`ml-auto text-[11px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-ink/[0.04] dark:bg-ink/20' : badgeCls}`}>{badge}</span>
                )}
              </button>
            )
          })}
        </nav>
        <div className="px-3 py-4 border-t border-ink/[0.08] dark:border-bone/[0.08] space-y-1">
          <button onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-bronze hover:bg-amber text-ink text-[13px] font-sans font-semibold tracking-[0.16em] uppercase px-4 py-3 rounded-xl transition-colors cursor-pointer">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Νέο Ραντεβού
          </button>
          <button onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone hover:bg-ink/[0.05] dark:hover:bg-bone/[0.05] text-[13px] font-sans font-medium transition-colors cursor-pointer">
            {theme === 'dark'
              ? <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
              : <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
            }
            {theme === 'dark' ? 'Φωτεινό θέμα' : 'Σκοτεινό θέμα'}
          </button>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone hover:bg-ink/[0.05] dark:hover:bg-bone/[0.05] text-[13px] font-sans font-medium transition-colors cursor-pointer">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
            Έξοδος
          </button>
        </div>
      </aside>

      {/* Mobile top header */}
      <header className="md:hidden border-b border-ink/[0.08] dark:border-bone/[0.08] bg-white/95 dark:bg-ink/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BymeLogo size="xs" className="text-ink dark:text-bone" />
            <span className="text-bronze text-[10px] font-sans tracking-[0.25em] uppercase border border-bronze/30 bg-bronze/10 px-2.5 py-1 rounded-full">Admin</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-full text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone hover:bg-ink/[0.06] dark:hover:bg-bone/[0.06] transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Φωτεινό θέμα' : 'Σκοτεινό θέμα'}
            >
              {theme === 'dark'
                ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
                : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
              }
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 bg-bronze hover:bg-amber text-ink text-xs font-sans font-semibold tracking-[0.18em] uppercase px-3.5 py-2 rounded-full transition-colors duration-200 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Νέο
            </button>
          </div>
        </div>
      </header>

      <main className="md:pl-60">
        <div className="max-w-6xl mx-auto px-5 py-6 pb-28 md:pb-10">

        {view === 'dashboard' && (
          <div className="space-y-4">
            {/* Alert strips */}
            {renewals.length > 0 && (
              <button onClick={() => { setView('members'); setMemberFilter('renewals') }}
                className="w-full flex items-center gap-3 bg-ember/[0.07] border border-ember/20 hover:border-ember/40 rounded-xl px-4 py-3 transition-colors cursor-pointer text-left">
                <span className="w-2 h-2 rounded-full bg-ember shrink-0" />
                <span className="flex-1 text-ember text-[13px] font-sans font-semibold">
                  {renewals.length} {renewals.length === 1 ? 'μέλος χρειάζεται' : 'μέλη χρειάζονται'} ανανέωση
                </span>
                <svg className="w-4 h-4 text-ember/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            )}
            {certsToReview.length > 0 && (
              <button onClick={() => { setView('members'); setMemberFilter('certs_review') }}
                className="w-full flex items-center gap-3 bg-bronze/[0.07] border border-bronze/20 hover:border-bronze/40 rounded-xl px-4 py-3 transition-colors cursor-pointer text-left">
                <span className="w-2 h-2 rounded-full bg-bronze shrink-0" />
                <span className="flex-1 text-bronze text-[13px] font-sans font-semibold">
                  {certsToReview.length} χαρτί{certsToReview.length === 1 ? '' : 'ά'} γιατρού προς έλεγχο
                </span>
                <svg className="w-4 h-4 text-bronze/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            )}
            {certsMissing.length > 0 && (
              <button onClick={() => { setView('members'); setMemberFilter('certs_missing') }}
                className="w-full flex items-center gap-3 bg-amber/[0.07] border border-amber/20 hover:border-amber/40 rounded-xl px-4 py-3 transition-colors cursor-pointer text-left">
                <span className="w-2 h-2 rounded-full bg-amber shrink-0" />
                <span className="flex-1 text-amber text-[13px] font-sans font-semibold">
                  {certsMissing.length} {certsMissing.length === 1 ? 'μέλος' : 'μέλη'} χωρίς χαρτί γιατρού
                </span>
                <svg className="w-4 h-4 text-amber/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            )}
            {certsExpiring.length > 0 && (
              <button onClick={() => { setView('members'); setMemberFilter('certs_expiring') }}
                className="w-full flex items-center gap-3 bg-amber/[0.04] border border-amber/15 hover:border-amber/30 rounded-xl px-4 py-3 transition-colors cursor-pointer text-left">
                <span className="w-2 h-2 rounded-full bg-amber/70 shrink-0" />
                <span className="flex-1 text-amber/90 text-[13px] font-sans font-semibold">
                  {certsExpiring.length} {certsExpiring.length === 1 ? 'μέλος' : 'μέλη'} με χαρτί που λήγει εντός μήνα
                </span>
                <svg className="w-4 h-4 text-amber/50 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            )}

            <BackupReminder bookings={bookings} members={members} subsByMember={subsByMember} />

            {/* Today header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-ink/45 dark:text-bone/45 text-[11px] font-sans font-semibold tracking-[0.22em] uppercase mb-1">{DAY_NAMES_GR[new Date().getDay()]}</p>
                <p className="text-ink dark:text-bone font-sans text-3xl font-semibold leading-none tracking-tight tabular-nums">
                  {new Date().getDate()} {MONTHS_GR_FULL[new Date().getMonth()]} {new Date().getFullYear()}
                </p>
              </div>
              <span className="text-bronze text-[11px] font-sans font-semibold tracking-[0.12em] uppercase px-3 py-1.5 rounded-full bg-bronze/10 border border-bronze/20">Σήμερα</span>
            </div>

            {todayIsClosed && (
              <div className="bg-ember/[0.06] border border-ember/20 rounded-xl px-4 py-3 text-center">
                <p className="text-ember/80 text-[13px] font-sans font-semibold tracking-[0.12em] uppercase">Κλειστά σήμερα</p>
              </div>
            )}

            {/* Daily agenda */}
            {!loading && (
              <div className="flex gap-1 bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-full p-1 w-full overflow-x-auto">
                {[{ key: 'all', label: 'Όλα' }, ...SERVICES.map(s => ({ key: s, label: s }))].map(t => (
                  <button key={t.key} onClick={() => setDashboardService(t.key)}
                    className={`shrink-0 flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-[12px] font-sans font-semibold tracking-[0.14em] uppercase transition-colors duration-200 cursor-pointer ${
                      dashboardService === t.key ? 'bg-bronze text-ink' : 'text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
            {loading ? (
              <p className="text-ink/55 dark:text-bone/55 text-base font-sans py-10 text-center">Φόρτωση…</p>
            ) : (
              <div className="bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-2xl overflow-hidden divide-y divide-ink/[0.07] dark:divide-bone/[0.07]">
                {agendaSlots.length === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <p className="text-ink/40 dark:text-bone/40 text-sm font-sans">{todayIsClosed ? 'Κλειστά σήμερα.' : 'Δεν έχουν οριστεί ώρες ραντεβού.'}</p>
                  </div>
                ) : agendaSlots.map(time => {
                  const slotBks = bookings.filter(b => b.booking_date === todayStr && b.booking_time === time && b.status !== 'cancelled' && (dashboardService === 'all' || b.service === dashboardService))
                  const isEmpty = slotBks.length === 0
                  const services = SERVICES.filter(svc => slotBks.some(b => b.service === svc))
                  return (
                    <div key={time} className="flex">
                      <div className={`w-16 md:w-20 shrink-0 flex items-start justify-center pt-4 pb-4 border-r border-ink/[0.07] dark:border-bone/[0.07] bg-ink/[0.04] dark:bg-ink/20 ${isEmpty ? 'opacity-30' : ''}`}>
                        <span className="text-ink/70 dark:text-bone/70 text-[13px] font-sans font-semibold">{time}</span>
                      </div>
                      <div className={`flex-1 min-h-[56px] ${isEmpty ? 'opacity-25' : ''}`}>
                        {isEmpty ? (
                          <div className="px-4 py-3 flex items-center h-full">
                            <p className="text-ink/60 dark:text-bone/60 text-sm font-sans">—</p>
                          </div>
                        ) : services.map((svc, si) => {
                          const group = slotBks.filter(b => b.service === svc)
                          if (group.length === 0) return null
                          return (
                            <SlotServiceGroup key={svc} svc={svc} group={group} settings={settingsObj} si={si}
                              onSelect={b => setSelectedBooking(b)} />
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {view === 'bookings' && (
          <div>
            {/* Sub-toggle: Ημερολόγιο / Λίστα */}
            <div className="flex gap-1 bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-full p-1 mb-5 w-full sm:w-fit">
              {[
                { key: 'calendar', label: 'Ημερολόγιο' },
                { key: 'list',     label: 'Λίστα' },
              ].map(t => (
                <button key={t.key} onClick={() => setBookingSubView(t.key)}
                  className={`flex-1 sm:flex-initial px-5 py-2.5 rounded-full text-[13px] font-sans font-semibold tracking-[0.14em] uppercase transition-colors duration-200 cursor-pointer ${
                    bookingSubView === t.key ? 'bg-bronze text-ink' : 'text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {bookingSubView === 'calendar' && (
              <div className="space-y-4">
                {/* Service filter */}
                <div className="flex gap-1 bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-full p-1 w-full overflow-x-auto">
                  {[{ key: 'all', label: 'Όλα' }, ...SERVICES.map(s => ({ key: s, label: s }))].map(t => (
                    <button key={t.key} onClick={() => setCalendarService(t.key)}
                      className={`shrink-0 flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-[12px] font-sans font-semibold tracking-[0.14em] uppercase transition-colors duration-200 cursor-pointer ${
                        calendarService === t.key ? 'bg-bronze text-ink' : 'text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                {/* Monthly calendar */}
                <div className="bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-ink/[0.1] dark:border-bone/[0.1]">
                    <button onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                      className="w-9 h-9 flex items-center justify-center rounded-full border border-ink/[0.15] dark:border-bone/[0.15] hover:bg-ink/[0.05] dark:hover:bg-bone/[0.05] text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone transition-colors cursor-pointer">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                    </button>
                    <div className="text-center">
                      <p className="text-ink dark:text-bone font-sans font-semibold text-lg tabular-nums">{MONTHS_GR_FULL[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => { const d = new Date(); setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1)); setSelectedDay(ymd(d)) }}
                        className="text-bronze text-[10px] font-sans tracking-[0.25em] uppercase hover:text-amber transition-colors cursor-pointer px-3 py-2">
                        Σήμερα
                      </button>
                      <button onClick={() => setCalendarMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                        className="w-9 h-9 flex items-center justify-center rounded-full border border-ink/[0.15] dark:border-bone/[0.15] hover:bg-ink/[0.05] dark:hover:bg-bone/[0.05] text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone transition-colors cursor-pointer">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 border-b border-ink/[0.1] dark:border-bone/[0.1]">
                    {DAYS_GR.map(d => (
                      <div key={d} className="py-2.5 text-center text-[10px] font-sans font-semibold tracking-[0.18em] uppercase text-ink/40 dark:text-bone/40">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 divide-x divide-ink/[0.06] dark:divide-bone/[0.06]">
                    {getMonthGrid(calendarMonth).map((day, i) => {
                      if (!day) return <div key={`pad-${i}`} className="bg-ink/[0.03] dark:bg-ink/40 border-b border-ink/[0.06] dark:border-bone/[0.06] min-h-[72px] md:min-h-[96px]" />
                      const ds         = ymd(day)
                      const dayBks     = bookings.filter(b => b.booking_date === ds && b.status !== 'cancelled' && (calendarService === 'all' || b.service === calendarService))
                      const isToday    = ds === todayStr
                      const isPast     = ds < todayStr
                      const isClosed   = closedDates.includes(ds)
                      const isSelected = ds === selectedDay
                      return (
                        <button key={ds}
                          onClick={() => { if (dayBks.length > 0) setSelectedDay(isSelected ? null : ds) }}
                          className={`relative group border-b border-ink/[0.06] dark:border-bone/[0.06] min-h-[72px] md:min-h-[96px] p-1.5 text-left transition-colors cursor-pointer ${
                            isSelected ? 'bg-bronze/[0.12]' :
                            isToday    ? 'bg-bronze/[0.06] hover:bg-bronze/[0.1]' :
                            isClosed   ? 'bg-ember/[0.03] hover:bg-ember/[0.05]' :
                            isPast     ? 'bg-ink/[0.03] dark:bg-ink/50 hover:bg-ink/[0.06] dark:hover:bg-ink/40' :
                                         'bg-white dark:bg-coal hover:bg-ink/[0.02] dark:hover:bg-bone/[0.03]'
                          }`}>
                          <span className={`text-[13px] font-sans font-semibold leading-none inline-flex items-center justify-center w-6 h-6 rounded-full ${
                            isToday    ? 'bg-bronze text-ink' :
                            isSelected ? 'bg-bronze/30 text-ink dark:text-bone' :
                            isClosed   ? 'text-ink/25 dark:text-bone/25 line-through' :
                            isPast     ? 'text-ink/35 dark:text-bone/35' : 'text-ink dark:text-bone'
                          }`}>{day.getDate()}</span>
                          {dayBks.length > 0 && (
                            <span className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[10px] font-sans font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 ${isSelected ? 'bg-bronze/40 text-bone' : 'bg-bronze/20 text-bronze'}`}>
                              {dayBks.length}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

              </div>
            )}

            {bookingSubView === 'list' && (
              <>
                <div className="flex gap-1 bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-full p-1 mb-3 w-full overflow-x-auto">
                  {[{ key: 'all', label: 'Όλα' }, ...SERVICES.map(s => ({ key: s, label: s }))].map(t => (
                    <button key={t.key} onClick={() => setListService(t.key)}
                      className={`shrink-0 flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-[12px] font-sans font-semibold tracking-[0.14em] uppercase transition-colors duration-200 cursor-pointer ${
                        listService === t.key ? 'bg-bronze text-ink' : 'text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone'
                      }`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1 bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-full p-1 mb-6 w-full overflow-x-auto">
                  {LIST_TABS.map(t => (
                    <button key={t.key} onClick={() => setListFilter(t.key)}
                      className={`shrink-0 flex-1 sm:flex-initial px-4 py-2.5 rounded-full text-[12px] font-sans font-semibold tracking-[0.14em] uppercase transition-colors duration-200 cursor-pointer ${
                        listFilter === t.key ? 'bg-bronze text-ink' : 'text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone'
                      }`}>
                      {t.label}
                      {t.key !== 'all' && counts[t.key] > 0 && (
                        <span className={`ml-1 text-[11px] px-1.5 py-0.5 rounded-full ${listFilter === t.key ? 'bg-ink/[0.04] dark:bg-ink/20' : 'bg-bone/10'}`}>
                          {counts[t.key]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {loading ? (
                  <div className="text-ink/55 dark:text-bone/55 text-sm py-16 text-center font-sans">Φόρτωση…</div>
                ) : filtered.length === 0 ? (
                  <div className="text-ink/55 dark:text-bone/55 text-sm py-16 text-center font-sans">Δεν υπάρχουν ραντεβού σε αυτή την κατηγορία.</div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-hidden rounded-sm border border-ink/[0.1] dark:border-bone/[0.1]">
                      <table className="w-full">
                        <thead className="bg-ink/[0.03] dark:bg-coal border-b border-ink/[0.1] dark:border-bone/[0.1]">
                          <tr>
                            {['Ονοματεπώνυμο','Υπηρεσία','Ημερομηνία','Ώρα','Τηλέφωνο','Email','Κατάσταση',''].map(h => (
                              <th key={h} className="text-left text-[10px] font-sans tracking-[0.2em] uppercase text-ink/55 dark:text-bone/55 px-5 py-4">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-ink/[0.05] dark:divide-bone/[0.05]">
                          {filtered.map(b => (
                            <tr key={b.id} className="bg-white dark:bg-ink/30 hover:bg-ink/[0.03] dark:hover:bg-coal/50 transition-colors duration-150">
                              <td className="px-5 py-4 text-ink dark:text-bone text-sm font-sans font-semibold">{b.name}</td>
                              <td className="px-5 py-4 text-ink/80 dark:text-bone/80 text-sm">
                                <span className="inline-flex items-center gap-2 flex-wrap"><ServiceLabel service={b.service} /><GroupTypeChip booking={b} settings={settingsObj} /></span>
                              </td>
                              <td className="px-5 py-4 text-ink/80 dark:text-bone/80 text-sm">{formatDate(b.booking_date)}</td>
                              <td className="px-5 py-4 text-ink/80 dark:text-bone/80 text-sm">{b.booking_time}</td>
                              <td className="px-5 py-4">
                                <a href={`tel:${b.phone}`} className="text-ink/80 dark:text-bone/80 hover:text-bronze text-sm transition-colors">{b.phone}</a>
                              </td>
                              <td className="px-5 py-4 text-ink/80 dark:text-bone/80 text-sm">{b.email}</td>
                              <td className="px-5 py-4">
                                <span className={`text-[10px] font-sans tracking-[0.2em] uppercase px-2.5 py-1 rounded-full border ${STATUS[bookingDisplayKey(b)]?.cls}`}>
                                  {STATUS[bookingDisplayKey(b)]?.label}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <button
                                  onClick={() => setSelectedBooking(b)}
                                  className="text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone text-[10px] font-sans tracking-[0.2em] uppercase border border-ink/[0.15] dark:border-bone/[0.15] hover:border-bone/30 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                                >
                                  Προβολή
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="md:hidden space-y-3">
                      {filtered.map(b => (
                        <div key={b.id} className="relative bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-xl p-5 pl-6 overflow-hidden">
                          <span className={`absolute left-0 top-0 bottom-0 w-1.5 ${bookingDisplayKey(b) === 'cancelled' ? 'bg-ember/50' : bookingDisplayKey(b) === 'completed' ? 'bg-bone/20' : bookingDisplayKey(b) === 'standby' ? 'bg-amber/60' : 'bg-bronze'}`} />
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <p className="text-ink dark:text-bone font-sans font-semibold text-lg leading-tight">{b.name}</p>
                              <p className="text-sm font-sans mt-1 flex items-center gap-2 flex-wrap"><ServiceLabel service={b.service} /><GroupTypeChip booking={b} settings={settingsObj} /></p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                              <span className={`text-[11px] font-sans font-semibold tracking-[0.15em] uppercase px-2.5 py-1.5 rounded-full border ${STATUS[bookingDisplayKey(b)]?.cls}`}>
                                {STATUS[bookingDisplayKey(b)]?.label}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div>
                              <p className="text-ink/55 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.18em] uppercase mb-1">Ημ/νία</p>
                              <p className="text-ink dark:text-bone text-base font-sans font-medium">{formatDate(b.booking_date)}</p>
                            </div>
                            <div>
                              <p className="text-ink/55 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.18em] uppercase mb-1">Ώρα</p>
                              <p className="text-ink dark:text-bone text-base font-sans font-medium">{b.booking_time}</p>
                            </div>
                            <div>
                              <p className="text-ink/55 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.18em] uppercase mb-1">Τηλ.</p>
                              <a href={`tel:${b.phone}`} className="text-base font-sans font-medium text-ink dark:text-bone hover:text-bronze transition-colors">{b.phone}</a>
                            </div>
                            <div>
                              <p className="text-ink/55 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.18em] uppercase mb-1">Email</p>
                              <p className="text-ink/85 dark:text-bone/85 text-sm font-sans truncate">{b.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedBooking(b)}
                            className="w-full text-center border border-ink/[0.18] dark:border-bone/[0.18] hover:border-bronze/50 text-ink/70 dark:text-bone/70 hover:text-ink dark:hover:text-bone text-[13px] font-sans font-semibold tracking-[0.18em] uppercase py-3.5 rounded-full transition-colors cursor-pointer min-h-[52px]"
                          >
                            Προβολή & Ενέργειες
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {view === 'members' && (() => {
          function memberHealth(m) {
            const subs = subsByMember[m.id] || []
            const actives = subs.filter(s => s.status === 'active' && !isExpired(s))
            if (actives.length === 0) return 'red'
            // Any active sub low on sessions or near expiry flags the member for renewal —
            // mirrors the dashboard's per-sub renewals check (a healthy 2nd sub shouldn't hide a dying 1st).
            const needs = actives.some(s => {
              const left = sessionsLeft(s)
              const days = daysLeft(s)
              return (left !== null && left < 3) || days < 7
            })
            return needs ? 'yellow' : 'green'
          }
          const HEALTH_DOT = {
            red:    'bg-red-500',
            yellow: 'bg-yellow-400',
            green:  'bg-green-500',
          }
          const HEALTH_FILTERS = [
            { key: 'all',     label: 'Όλα' },
            { key: 'red',     label: 'Ληγμένα',  dot: 'bg-red-500' },
            { key: 'yellow',  label: 'Κοντεύουν', dot: 'bg-yellow-400' },
            { key: 'green',   label: 'Ενεργά',   dot: 'bg-green-500' },
            { key: 'medical', label: 'Χωρίς χαρτί' },
          ]

          // A member is "active" (currently training) if they hold a live subscription.
          const isActiveMember = m => (subsByMember[m.id] || []).some(s => s.status === 'active' && !isExpired(s))
          // Active members whose medical certificate is missing/expired (red) or expiring (yellow).
          const CERT_RANK = { missing: 0, expired: 1, expiring: 2, pending: 3, valid: 4 }
          function medicalNeedsAttention(m) {
            if (!isActiveMember(m)) return false
            return ['missing', 'expired', 'expiring'].includes(certStatus(medicalByMember[m.id]))
          }

          const q = memberSearch.trim().toLowerCase()
          // 'renewals' / 'certs' come from the dashboard alert buttons
          let filteredMembers = memberFilter === 'all'
            ? members
            : memberFilter === 'renewals'
              ? members.filter(m => ['red', 'yellow'].includes(memberHealth(m)))
              : memberFilter === 'certs'
                ? members.filter(m => {
                    if (!isActiveMember(m)) return false
                    const cert = medicalByMember[m.id]
                    if (cert?.id && !cert.reviewed_at) return true
                    return ['missing', 'expired', 'expiring'].includes(certStatus(cert))
                  }).sort((a, b) => {
                    const aUnreviewed = medicalByMember[a.id]?.id && !medicalByMember[a.id]?.reviewed_at ? -1 : 0
                    const bUnreviewed = medicalByMember[b.id]?.id && !medicalByMember[b.id]?.reviewed_at ? -1 : 0
                    if (aUnreviewed !== bUnreviewed) return aUnreviewed - bUnreviewed
                    return CERT_RANK[certStatus(medicalByMember[a.id])] - CERT_RANK[certStatus(medicalByMember[b.id])]
                  })
              : memberFilter === 'certs_review'
                ? members.filter(m => isActiveMember(m) && medicalByMember[m.id]?.id && !medicalByMember[m.id]?.reviewed_at)
              : memberFilter === 'certs_missing'
                ? members.filter(m => isActiveMember(m) && ['missing', 'expired'].includes(certStatus(medicalByMember[m.id])))
              : memberFilter === 'certs_expiring'
                ? members.filter(m => isActiveMember(m) && certStatus(medicalByMember[m.id]) === 'expiring')
              : memberFilter === 'medical'
                ? members.filter(medicalNeedsAttention)
                    .sort((a, b) => CERT_RANK[certStatus(medicalByMember[a.id])] - CERT_RANK[certStatus(medicalByMember[b.id])])
                : members.filter(m => memberHealth(m) === memberFilter)
          if (q) filteredMembers = filteredMembers.filter(m =>
                m.name.toLowerCase().includes(q) ||
                m.email.toLowerCase().includes(q) ||
                (m.member_code || '').toLowerCase().includes(q) ||
                (m.phone || '').includes(q)
              )
          return (
          <div>
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <p className="text-ink/55 dark:text-bone/55 text-sm font-sans">{filteredMembers.length} / {members.length} μέλη</p>
              <button
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-1.5 bg-bronze hover:bg-amber text-ink text-xs font-sans font-semibold tracking-[0.18em] uppercase px-4 py-2.5 rounded-full transition-colors duration-200 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Νέο Μέλος
              </button>
            </div>

            <div className="flex gap-1 bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-full p-1 mb-4 w-full sm:w-fit overflow-x-auto">
              {HEALTH_FILTERS.map(t => (
                <button key={t.key} onClick={() => setMemberFilter(t.key)}
                  className={`shrink-0 flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-sans font-semibold tracking-[0.14em] uppercase transition-colors duration-200 cursor-pointer ${
                    memberFilter === t.key ? 'bg-bronze text-ink' : 'text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone'
                  }`}>
                  {t.dot && <span className={`w-2 h-2 rounded-full shrink-0 ${t.dot}`} />}
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative mb-5">
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35 dark:text-bone/35" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Αναζήτηση με όνομα, email ή τηλέφωνο…"
                className="w-full bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] hover:border-ink/20 dark:hover:border-bone/20 focus:border-bronze focus:ring-1 focus:ring-bronze text-ink dark:text-bone placeholder:text-ink/35 dark:placeholder:text-bone/35 rounded-xl pl-11 pr-10 py-4 text-base font-sans outline-none transition-colors min-h-[56px]"
              />
              {memberSearch && (
                <button
                  onClick={() => setMemberSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/35 dark:text-bone/35 hover:text-ink dark:hover:text-bone p-1 cursor-pointer"
                  aria-label="Καθαρισμός"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {membersLoading ? (
              <div className="text-ink/55 dark:text-bone/55 text-sm py-16 text-center font-sans">Φόρτωση…</div>
            ) : members.length === 0 ? (
              <div className="text-ink/55 dark:text-bone/55 text-sm py-16 text-center font-sans">Δεν υπάρχουν μέλη ακόμα.</div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-ink/55 dark:text-bone/55 text-sm py-16 text-center font-sans">
                {memberSearch
                  ? `Δεν βρέθηκε μέλος για «${memberSearch}».`
                  : (memberFilter === 'renewals' || memberFilter === 'red' || memberFilter === 'yellow')
                    ? 'Καμία εκκρεμότητα ανανέωσης. 🎉'
                    : ['certs', 'certs_review', 'certs_missing', 'certs_expiring', 'medical'].includes(memberFilter)
                      ? 'Κανένα εκκρεμές χαρτί γιατρού. 🎉'
                      : 'Δεν υπάρχουν μέλη σε αυτή την κατηγορία.'}
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-hidden rounded-sm border border-ink/[0.1] dark:border-bone/[0.1]">
                  <table className="w-full">
                    <thead className="bg-ink/[0.03] dark:bg-coal border-b border-ink/[0.1] dark:border-bone/[0.1]">
                      <tr>
                        {['Ονοματεπώνυμο','Email','Κατάσταση','Χαρτί γιατρού',''].map(h => (
                          <th key={h} className="text-left text-[10px] font-sans tracking-[0.2em] uppercase text-ink/55 dark:text-bone/55 px-5 py-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink/[0.05] dark:divide-bone/[0.05]">
                      {filteredMembers.map(m => (
                        <tr key={m.id} className="bg-white dark:bg-ink/30 hover:bg-ink/[0.03] dark:hover:bg-coal/50 transition-colors duration-150 cursor-pointer" onClick={() => setSelectedMember(m)}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${HEALTH_DOT[memberHealth(m)]}`} />
                              <span className="text-ink dark:text-bone text-sm font-sans font-semibold">{m.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-ink/80 dark:text-bone/80 text-sm">{m.email}</td>
                          <td className="px-5 py-4">
                            <span className={`text-[10px] font-sans tracking-[0.2em] uppercase px-2.5 py-1 rounded-full border ${
                              m.active
                                ? 'bg-bronze/15 text-bronze border-bronze/30'
                                : 'bg-ember/10 text-ember/60 border-ember/20'
                            }`}>
                              {m.active ? 'Ενεργό' : 'Ανενεργό'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <MedicalBadge cert={medicalByMember[m.id]} />
                          </td>
                          <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleToggleMember(m.id, !m.active, m.name)}
                              className="text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone text-[10px] font-sans tracking-[0.2em] uppercase border border-ink/[0.15] dark:border-bone/[0.15] hover:border-bone/30 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                            >
                              {m.active ? 'Απενεργ.' : 'Ενεργ.'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {filteredMembers.map(m => {
                    const memberSubs = subsByMember[m.id] || []
                    const activeSub  = memberSubs.find(s => s.status === 'active' && !isExpired(s))
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMember(m)}
                        className="w-full text-left bg-white dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] hover:border-bronze/30 rounded-xl p-5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="min-w-0 flex-1 flex items-start gap-2.5">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1.5 ${HEALTH_DOT[memberHealth(m)]}`} />
                            <div className="min-w-0">
                              <p className="text-ink dark:text-bone font-sans font-semibold text-lg leading-tight truncate">{m.name}</p>
                              <p className="text-ink/60 dark:text-bone/60 text-sm font-sans mt-0.5 truncate">{m.email}</p>
                            </div>
                          </div>
                          <span className={`text-[11px] font-sans font-semibold tracking-[0.15em] uppercase px-2.5 py-1.5 rounded-full border shrink-0 ml-3 ${
                            m.active
                              ? 'bg-bronze/15 text-bronze border-bronze/30'
                              : 'bg-ember/10 text-ember/60 border-ember/20'
                          }`}>
                            {m.active ? 'Ενεργό' : 'Ανενεργό'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            {activeSub && (
                              <span className="text-ink/55 dark:text-bone/55 text-xs font-sans bg-bone/[0.06] px-2 py-1 rounded-full">
                                {activeSub.plan_name}
                              </span>
                            )}
                            <MedicalBadge cert={medicalByMember[m.id]} />
                          </div>
                          <span className="text-ink/40 dark:text-bone/40 text-sm font-sans">›</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
          )
        })()}

        {view === 'revenue' && (
          <RevenueView subsByMember={subsByMember} members={members} bookings={bookings} />
        )}

        {view === 'settings' && (
          <SettingsView
            timeSlots={timeSlots}
            saturdaySlots={saturdaySlots}
            closedWeekdays={closedWeekdays}
            closedDates={closedDates}
            groupSchedule={groupSchedule}
            pilatesSchedule={pilatesSchedule}
            blockedSlots={blockedSlots}
            plans={plans}
            onSaved={handleSaveSetting}
            bookings={bookings}
            members={members}
            subsByMember={subsByMember}
          />
        )}

        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-coal/95 backdrop-blur-sm border-t border-ink/[0.1] dark:border-bone/[0.1] pb-[env(safe-area-inset-bottom)]">
        <div className="flex">
          {NAV.map(item => {
            const isActive = view === item.key
            const badge = item.key === 'bookings' ? counts.standby : item.key === 'dashboard' ? renewals.length : 0
            return (
              <button key={item.key} onClick={() => { setView(item.key); if (item.key === 'members') setMemberFilter('all') }}
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 transition-colors cursor-pointer ${
                  isActive ? 'text-bronze' : 'text-ink/45 dark:text-bone/45'
                }`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className="text-[9px] font-sans font-semibold tracking-[0.04em]">{item.label}</span>
                {badge > 0 && (
                  <span className={`absolute top-1 right-1/2 translate-x-3.5 min-w-[15px] h-3.5 px-0.5 flex items-center justify-center text-[8px] font-bold rounded-full ${item.key === 'bookings' ? 'bg-amber text-ink' : 'bg-ember text-ink'}`}>{badge}</span>
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
    </div>
  )
}

import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BymeLogo } from '../lib/Logo.jsx'
import {
  fetchMemberSubscriptions,
  formatDate,
  daysLeft,
  sessionsLeft,
  isExpired,
  ymd,
  isWithin5Hours,
} from '../lib/subscriptions.js'
import {
  bookSession,
  bookErrorMessage,
  fetchWeekAvailability,
  fetchMyBookings,
  fetchStandbyPosition,
  cancelMyBooking,
  logoutMember,
} from '../lib/bookings.js'
import { ME_KEY } from './MeLogin.jsx'
import { updateMemberSelf } from '../lib/members.js'
import { clearSessionToken, getSessionToken } from '../lib/session.js'
import { uploadMedicalCertificate, myMedicalCertificate, certStatus } from '../lib/medical.js'
import { SERVICES, SERVICE_CAPACITY, STANDBY_CAPACITY, GOOGLE_REVIEW_URL, GROUP_SERVICE, GROUP_TYPE_META } from '../lib/constants.js'
import { enableReminders, pushSupported } from '../lib/push.js'
import { loadSettings, slotsForDate, bookableSlots, groupSlotsForDate, groupTypeFor } from '../lib/settings.js'

function StatCard({ value, label, accent }) {
  return (
    <div className="bg-bone dark:bg-coal border border-ink/[0.08] dark:border-bone/[0.08] rounded-sm p-5 text-center">
      <p className={`text-4xl font-sans font-semibold leading-none tabular-nums ${accent || 'text-ink dark:text-bone'}`}>{value}</p>
      <p className="text-ink/55 dark:text-bone/55 text-[10px] font-sans tracking-[0.25em] uppercase mt-3">{label}</p>
    </div>
  )
}

const MONTHS_GR = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος']
const MONTHS_SHORT = ['Ιαν','Φεβ','Μάρ','Απρ','Μάι','Ιούν','Ιούλ','Αύγ','Σεπ','Οκτ','Νοέ','Δεκ']
const DAY_HEADERS = ['Δε','Τρ','Τε','Πε','Πα','Σα','Κυ']
// Full weekday names indexed by JS getDay() (0=Sun … 6=Sat).
const WEEKDAY_FULL = ['Κυριακή','Δευτέρα','Τρίτη','Τετάρτη','Πέμπτη','Παρασκευή','Σάββατο']

/** Monday (00:00 local) of the week containing date d. */
function mondayOf(d) {
  const x = new Date(d); x.setHours(0, 0, 0, 0)
  const dow = (x.getDay() + 6) % 7 // 0 = Mon
  x.setDate(x.getDate() - dow)
  return x
}
function addDaysLocal(d, n) {
  const x = new Date(d); x.setDate(x.getDate() + n); return x
}
/** Human relative day label for a YYYY-MM-DD string ("Σήμερα", "Αύριο", "σε 3 μέρες"). */
function relativeDay(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const target = new Date(y, m - 1, d); target.setHours(0, 0, 0, 0)
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const diff = Math.round((target - now) / 86400000)
  if (diff <= 0) return 'Σήμερα'
  if (diff === 1) return 'Αύριο'
  if (diff < 7) return `σε ${diff} μέρες`
  if (diff < 14) return 'σε 1 εβδομάδα'
  return `σε ${Math.round(diff / 7)} εβδομάδες`
}

function MonthCalendar({ bookings, onSelectDay, closedDates = [], closedWeekdays = [] }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const closed = new Set(closedDates)
  const closedDow = new Set(closedWeekdays)
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(null)

  const year  = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1)
  const last  = new Date(year, month + 1, 0)
  const leadingBlank = (first.getDay() + 6) % 7
  const cells = []
  for (let i = 0; i < leadingBlank; i++) cells.push(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  function toStr(d) { return ymd(d) }

  const bookingMap = bookings.reduce((acc, b) => {
    if (b.status === 'cancelled') return acc
    acc[b.booking_date] = (acc[b.booking_date] || 0) + 1
    return acc
  }, {})

  function handlePick(d) {
    if (!d) return
    const s = toStr(d)
    const next = selected === s ? null : s
    setSelected(next)
    onSelectDay?.(next)
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth()

  return (
    <div className="bg-bone dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.08] rounded-xl p-5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-ink/[0.06] dark:hover:bg-bone/[0.06] text-ink/45 dark:text-bone/45 hover:text-ink dark:hover:text-bone transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>

        <div className="text-center">
          <p className="text-ink dark:text-bone font-sans font-semibold text-[15px] leading-none tracking-wide">
            {MONTHS_GR[month]} <span className="text-ink/45 dark:text-bone/45 font-normal">{year}</span>
          </p>
          {!isCurrentMonth && (
            <button
              onClick={() => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="text-bronze hover:text-amber text-[10px] font-sans tracking-[0.2em] uppercase mt-1.5 transition-colors cursor-pointer"
            >
              Σήμερα
            </button>
          )}
        </div>

        <button
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-ink/[0.06] dark:hover:bg-bone/[0.06] text-ink/45 dark:text-bone/45 hover:text-ink dark:hover:text-bone transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d, i) => (
          <div key={i} className="text-center text-ink/30 dark:text-bone/30 text-[11px] font-sans font-semibold tracking-wider py-2">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="h-11 sm:h-12" />
          const s          = toStr(d)
          const count      = bookingMap[s] || 0
          const isToday    = d.getTime() === today.getTime()
          const isPast     = d < today
          const isSelect   = selected === s
          const hasBooking = count > 0
          const localStr   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const isClosedDay = (closed.has(localStr) || closedDow.has(d.getDay())) && !isPast
          return (
            <button
              key={i}
              onClick={() => handlePick(d)}
              aria-label={`${d.getDate()}${isClosedDay ? ' · κλειστά' : ''}${hasBooking ? ` · ${count} ραντεβού` : ''}`}
              title={isClosedDay ? 'Κλειστά' : undefined}
              className={`relative h-11 sm:h-12 rounded-lg flex items-center justify-center text-[15px] font-sans transition-all duration-150 cursor-pointer ${
                isSelect
                  ? 'bg-bronze text-ink font-bold shadow-sm shadow-bronze/20'
                : isToday
                  ? 'bg-bronze/[0.13] text-bronze font-bold ring-2 ring-bronze/50 ring-offset-1 ring-offset-bone dark:ring-offset-coal'
                : isClosedDay
                  ? 'text-ink/30 dark:text-bone/30 line-through hover:bg-ink/[0.04] dark:hover:bg-bone/[0.04]'
                : isPast
                  ? 'text-ink/25 dark:text-bone/25 hover:bg-ink/[0.04] dark:hover:bg-bone/[0.04]'
                : 'text-ink/80 dark:text-bone/80 hover:bg-ink/[0.06] dark:hover:bg-bone/[0.06] hover:text-ink dark:hover:text-bone'
              }`}
            >
              <span className="leading-none">{d.getDate()}</span>
              {hasBooking && (
                <span className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full ${
                  isSelect ? 'w-1 h-1 bg-ink/50' : 'w-1.5 h-1.5 bg-bronze'
                }`} />
              )}
              {hasBooking && count > 1 && !isSelect && (
                <span className="absolute top-1 right-1.5 text-[9px] font-bold leading-none text-bronze/70">{count}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function InstallHint() {
  const [guide,        setGuide]        = useState(false)
  const [installEvent, setInstallEvent] = useState(null)
  const isIOS     = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const isAndroid = /Android/i.test(navigator.userAgent)

  useEffect(() => {
    if (window.__installPrompt) setInstallEvent(window.__installPrompt)
    function handler(e) { e.preventDefault(); window.__installPrompt = e; setInstallEvent(e) }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!isIOS && !isAndroid) return null

  async function handleAndroidInstall() {
    if (installEvent) {
      installEvent.prompt()
      await installEvent.userChoice
    } else {
      setGuide(true)
    }
  }

  const iosSteps = [
    {
      num: '1', highlight: true,
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7 text-bronze"><path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15M9 12l3 3m0 0l3-3m-3 3V2.25" /></svg>,
      text: 'Πάτα το κουμπί Share',
      sub: 'Στο κάτω μέρος του Safari',
    },
    {
      num: '2',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7 text-ink/60 dark:text-bone/60"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
      text: '"Προσθήκη στην Αρχική Οθόνη"',
      sub: 'Σκρόλαρε κάτω στο μενού',
    },
    {
      num: '3',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7 text-ink/60 dark:text-bone/60"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>,
      text: 'Πάτα "Προσθήκη"',
      sub: 'Πάνω δεξιά στην οθόνη',
    },
  ]

  const androidSteps = [
    {
      num: '1', highlight: true,
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7 text-bronze"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>,
      text: 'Πάτα τις 3 τελείες ⋮',
      sub: 'Πάνω δεξιά στο Chrome',
    },
    {
      num: '2',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7 text-ink/60 dark:text-bone/60"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>,
      text: '"Προσθήκη στην Αρχική Οθόνη"',
      sub: 'Ή "Install app"',
    },
    {
      num: '3',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-7 h-7 text-ink/60 dark:text-bone/60"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>,
      text: 'Πάτα "Προσθήκη"',
      sub: 'Στο παράθυρο που εμφανίζεται',
    },
  ]

  const steps = isIOS ? iosSteps : androidSteps

  return (
    <>
      {!guide && (
        <button
          onClick={isIOS ? () => setGuide(true) : handleAndroidInstall}
          className="w-full bg-bronze/[0.08] border border-bronze/30 rounded-xl p-4 flex items-center gap-4 cursor-pointer active:bg-bronze/[0.15] transition-colors text-left"
        >
          <div className="w-11 h-11 rounded-full bg-bronze/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-bronze" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 9l1.5 1.5m0 0l1.5-1.5M12 11.25V15" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-ink dark:text-bone text-base font-sans font-semibold">Πρόσθεσέ την στο κινητό σου</p>
            <p className="text-ink/60 dark:text-bone/50 text-sm font-sans mt-0.5">Γρήγορη πρόσβαση σαν εφαρμογή</p>
          </div>
          <svg className="w-4 h-4 text-ink/40 dark:text-bone/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}

      {guide && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(14,12,10,0.88)' }}>
          <div className="bg-cream dark:bg-coal border-t border-ink/[0.12] dark:border-bone/[0.12] rounded-t-2xl px-6 pt-6 pb-10">
            <div className="w-10 h-1 bg-ink/20 dark:bg-bone/20 rounded-full mx-auto mb-6" />
            <p className="font-serif italic text-ink dark:text-bone text-xl text-center mb-1">Πώς να το εγκαταστήσεις</p>
            <p className="text-ink/45 dark:text-bone/45 text-xs font-sans text-center tracking-[0.15em] uppercase mb-7">
              {isIOS ? '3 βήματα στο Safari' : '3 βήματα στο Chrome'}
            </p>
            <div className="space-y-4 mb-8">
              {steps.map((s) => (
                <div key={s.num} className={`flex items-center gap-4 p-4 rounded-sm ${s.highlight ? 'bg-bronze/[0.12] border border-bronze/30' : 'bg-cream/80 dark:bg-ink/40 border border-ink/[0.08] dark:border-bone/[0.08]'}`}>
                  <div className="shrink-0 w-8 h-8 rounded-full bg-ink/[0.06] dark:bg-bone/[0.06] flex items-center justify-center text-ink/40 dark:text-bone/40 font-serif text-sm">{s.num}</div>
                  <div className="shrink-0">{s.icon}</div>
                  <div className="min-w-0">
                    <p className={`text-sm font-sans font-medium ${s.highlight ? 'text-ink dark:text-bone' : 'text-ink/80 dark:text-bone/80'}`}>{s.text}</p>
                    <p className="text-ink/40 dark:text-bone/40 text-[11px] font-sans mt-0.5 leading-snug">{s.sub}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setGuide(false)} className="w-full border border-ink/[0.15] dark:border-bone/[0.15] text-ink/55 dark:text-bone/55 text-xs font-sans tracking-[0.2em] uppercase py-3.5 rounded-full transition-colors cursor-pointer">
              Κλείσιμο
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// Once the browser permission is 'denied', no code can re-prompt — only the
// user can reset it from settings. We can't auto-fix it, so we explain *how*,
// with the exact steps for the device they're on.
function BlockedNotificationsHelp() {
  const [open, setOpen] = useState(false)
  const isIOS     = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  const isAndroid = /Android/i.test(navigator.userAgent)

  const steps = isIOS
    ? [
        'Σβήσε αυτή την εφαρμογή από την αρχική οθόνη (κράτα πατημένο → Διαγραφή)',
        'Άνοιξε ξανά το byme στο Safari και πάτα Μοιραστείτε → "Προσθήκη στην Αρχική οθόνη"',
        'Άνοιξε την εφαρμογή από την αρχική οθόνη (όχι μέσα από το Safari)',
        'Πάτα ξανά τον διακόπτη Ειδοποιήσεων — τώρα θα εμφανιστεί το παράθυρο "Να επιτρέπεται"',
      ]
    : isAndroid
    ? [
        'Πάτα το λουκέτο 🔒 δίπλα στη διεύθυνση πάνω-αριστερά',
        'Πάτα "Άδειες" ή "Ειδοποιήσεις"',
        'Ενεργοποίησε τις Ειδοποιήσεις',
        'Ανανέωσε τη σελίδα και πάτα ξανά το κουμπί',
      ]
    : [
        'Πάτα το λουκέτο 🔒 αριστερά από τη διεύθυνση',
        'Βρες "Ειδοποιήσεις" και άλλαξέ το σε "Να επιτρέπεται"',
        'Ανανέωσε τη σελίδα και πάτα ξανά το κουμπί',
      ]

  return (
    <div className="rounded-xl border border-ink/[0.12] dark:border-bone/[0.12] bg-ink/[0.02] dark:bg-bone/[0.03] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left cursor-pointer"
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <svg className="w-4 h-4 shrink-0 text-ink/45 dark:text-bone/45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
          <span className="text-ink/70 dark:text-bone/65 text-[12px] font-sans font-medium">
            Οι ειδοποιήσεις είναι μπλοκαρισμένες — δες πώς να τις ξεμπλοκάρεις
          </span>
        </span>
        <svg className={`w-4 h-4 shrink-0 text-ink/40 dark:text-bone/40 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <ol className="px-4 pb-4 pt-1 space-y-2.5">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-bronze/15 text-bronze text-[11px] font-sans font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <span className="text-ink/75 dark:text-bone/70 text-[13px] font-sans leading-snug">{s}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

// Weekly Group program so a member can plan their week. Reads the group
// schedule and lists each day's sessions (time + workout type) as colored chips.
function GroupWeekProgram({ settings = {} }) {
  const [open, setOpen] = useState(false)
  const schedule = settings.group_schedule || {}
  // Monday(1) … Saturday(6); skip days with no group sessions.
  const days = [1, 2, 3, 4, 5, 6]
    .map(dow => ({ dow, slots: Object.entries(schedule[String(dow)] || {}).sort((a, b) => a[0].localeCompare(b[0])) }))
    .filter(d => d.slots.length > 0)

  if (days.length === 0) return null

  return (
    <div className="rounded-xl border border-ink/[0.1] dark:border-bone/[0.1] bg-ivory dark:bg-ink/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left cursor-pointer"
      >
        <span className="flex items-center gap-2.5">
          <svg className="w-4 h-4 shrink-0 text-bronze" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
          <span className="text-ink/75 dark:text-bone/70 text-[12px] font-sans font-semibold tracking-[0.12em] uppercase">Εβδομαδιαίο πρόγραμμα Group</span>
        </span>
        <svg className={`w-4 h-4 shrink-0 text-ink/40 dark:text-bone/40 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          {days.map(({ dow, slots }) => (
            <div key={dow}>
              <p className="text-ink/55 dark:text-bone/45 text-[11px] font-sans font-semibold tracking-[0.16em] uppercase mb-1.5">{WEEKDAY_FULL[dow]}</p>
              <div className="flex flex-wrap gap-1.5">
                {slots.map(([t, type]) => {
                  const meta = GROUP_TYPE_META[type]
                  return (
                    <span key={t} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-sans font-medium ${meta?.chip || 'border-ink/15 text-ink/60'}`}>
                      <span className="tabular-nums font-semibold">{t}</span>
                      <span className="opacity-90">{meta?.label || type}</span>
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BookingForm({ member, sub, subs = [], onDone, settings = {}, refreshKey = 0 }) {
  const today = ymd(new Date())
  const thisMonday = mondayOf(new Date())
  // Members can book from today through *next week's Saturday*, regardless of
  // what day it is today. Next Saturday = this week's Monday + 12 days (next
  // Monday is +7, that week's Saturday is +5 more). On a Sunday this still
  // points at the upcoming week's Saturday, which is what the studio wants.
  const maxDate = ymd(addDaysLocal(thisMonday, 12))
  const [service,   setService]   = useState('')
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()))
  const [date,      setDate]      = useState('')
  const timeSlots = bookableSlots(date, service, settings)
  const [time,    setTime]    = useState('')
  const [weekBookings,   setWeekBookings]   = useState([])
  const [bookingStandby, setBookingStandby] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')
  // Web Push reminders opt-in. Read the *current* browser permission on load so
  // a previously-blocked device shows the "how to unblock" help immediately
  // (the browser will never re-prompt once 'denied' — only the user can reset it).
  const [remindersState, setRemindersState] = useState(() => {
    if (!pushSupported() || typeof Notification === 'undefined') return 'idle'
    if (Notification.permission === 'granted') return 'on'
    if (Notification.permission === 'denied')  return 'denied'
    return 'idle'
  })

  // Called right after a successful booking so reminders "just work" without the
  // member having to find the bell button. Once permission is granted (the one
  // unavoidable one-time prompt the browser requires), every future booking
  // subscribes silently. We never nag a device that has explicitly blocked it.
  async function autoEnableReminders() {
    if (!pushSupported() || typeof Notification === 'undefined') return
    if (Notification.permission === 'denied') return
    const res = await enableReminders(member.email)
    setRemindersState(res.ok ? 'on' : (res.reason === 'denied' ? 'denied' : 'idle'))
  }

  // On load: if permission is already granted, silently re-register the subscription
  // so it stays fresh in the DB (handles browser updates, cache clears, new devices).
  useEffect(() => {
    if (!pushSupported() || typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return
    enableReminders(member.email).then(res => {
      if (res.ok) setRemindersState('on')
    })
  }, [member.email]) // eslint-disable-line react-hooks/exhaustive-deps

  const weekDays  = Array.from({ length: 7 }, (_, i) => addDaysLocal(weekStart, i))
  const isThisWeek = ymd(weekStart) === ymd(thisMonday)
  const rangeLabel = (() => {
    const a = weekDays[0], b = weekDays[6]
    return a.getMonth() === b.getMonth()
      ? `${a.getDate()} – ${b.getDate()} ${MONTHS_GR[b.getMonth()]}`
      : `${a.getDate()} ${MONTHS_GR[a.getMonth()]} – ${b.getDate()} ${MONTHS_GR[b.getMonth()]}`
  })()

  // Fetch all non-cancelled bookings for the visible week (for availability).
  // Goes through week_availability so the server returns only slot facts plus
  // an `is_mine` flag — never other members' email/name/phone.
  function refreshWeek() {
    const start = ymd(weekStart)
    const end   = ymd(addDaysLocal(weekStart, 6))
    return fetchWeekAvailability(start, end).then(rows => setWeekBookings(rows))
  }
  useEffect(() => { refreshWeek() }, [weekStart, refreshKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const dayBookings = weekBookings.filter(b => b.booking_date === date)
  // One booking per day: does the member already hold a (non-cancelled) booking on `date`?
  const alreadyBookedToday = weekBookings.some(
    b => b.is_mine && b.booking_date === date && b.status !== 'cancelled'
  )

  // Availability summary for a day chip (for the picked service).
  function dayInfo(dateStr) {
    const isPast  = dateStr < today
    const tooFar  = dateStr > maxDate
    const slots   = bookableSlots(dateStr, service, settings)
    const closed  = slots.length === 0 || (Array.isArray(settings.closed_dates) && settings.closed_dates.includes(dateStr))
    // The member's own (non-cancelled) booking that day — one per day allowed.
    const mine    = weekBookings.some(b => b.is_mine && b.booking_date === dateStr && b.status !== 'cancelled')
    if (isPast || tooFar || closed || !service) return { isPast, tooFar, closed, mine, hasFree: false, hasStandby: false }
    const cap = SERVICE_CAPACITY[service] ?? 1
    let hasFree = false, hasStandby = false
    for (const t of slots) {
      const conf = weekBookings.filter(b => b.booking_date === dateStr && b.booking_time === t && b.service === service && b.status === 'confirmed').length
      const sb   = weekBookings.filter(b => b.booking_date === dateStr && b.booking_time === t && b.service === service && b.status === 'standby').length
      if (conf < cap) hasFree = true
      else if (sb < STANDBY_CAPACITY) hasStandby = true
    }
    return { isPast, tooFar, closed, mine, hasFree, hasStandby }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!service || !date || !time) { setError('Συμπλήρωσε όλα τα πεδία.'); return }
    if (date > maxDate) { setError('Μπορείς να κλείσεις ραντεβού έως το επόμενο Σάββατο.'); return }
    if (alreadyBookedToday) { setError('Έχεις ήδη ραντεβού αυτή τη μέρα. Επιτρέπεται ένα ραντεβού ανά ημέρα.'); return }
    setSaving(true)

    // For Group Training, capture the workout type of the chosen slot.
    const sessionType = service === GROUP_SERVICE ? groupTypeFor(date, time, settings) : null

    // Both standby and confirmed go through book_session: the server reads the
    // member from the session token, finds & consumes the right subscription,
    // and lets the capacity trigger / one-per-day index decide. Session consume
    // and the insert share one transaction, so no client-side refund-on-error.
    const res = await bookSession({
      service, date, time, sessionType, standby: bookingStandby,
    })

    if (res.result !== 'ok') {
      setError(bookErrorMessage(res.result))
      await refreshWeek()  // reflect real DB state
      setSaving(false)
      return
    }

    // Push notification sent by DB trigger on booking insert (notify_new_booking).
    await refreshWeek()
    setService(''); setDate(''); setTime(''); setBookingStandby(false)
    onDone(bookingStandby ? 'standby' : undefined)
    autoEnableReminders()
    setSaving(false)
  }

  const lCls = 'block text-[11px] font-sans font-semibold text-bronze tracking-[0.22em] uppercase mb-3'
  const iCls = 'w-full bg-ivory dark:bg-ink/40 border border-ink/[0.12] dark:border-bone/[0.15] hover:border-ink/30 dark:hover:border-bone/30 focus:border-bronze focus:ring-1 focus:ring-bronze text-ink dark:text-bone placeholder:text-ink/30 dark:placeholder:text-bone/30 rounded-lg px-4 py-3.5 text-base font-sans outline-none transition-colors duration-200 min-h-[52px]'

  // If a service is selected, check the service-specific subscription;
  // otherwise use the first active subscription just to gate the form.
  const activeSubs = subs.filter(s => s.status === 'active' && !isExpired(s))
  const subForService = (() => {
    if (!service) return activeSubs[0] ?? sub ?? null
    // Each service requires a subscription whose plan_name starts with its
    // prefix. Personal Training has no fallback — it needs a 'Personal …' plan.
    const prefix = service === 'Pilates Reformer' ? 'Pilates'
      : service === 'Group Training' ? 'Group'
      : service === 'Personal Training' ? 'Personal'
      : null
    return activeSubs.find(s => s.plan_name?.startsWith(prefix)) ?? null
  })()
  const hasAnySub = activeSubs.length > 0 || !!sub
  const blocked = !hasAnySub

  if (blocked) {
    return (
      <div className="bg-ember/[0.06] border border-ember/30 rounded-lg p-6 text-center">
        <p className="text-ink dark:text-bone font-serif italic text-xl mb-2">Δεν μπορείς να κλείσεις ραντεβού</p>
        <p className="text-ink/65 dark:text-bone/65 text-base font-sans mb-5">
          Δεν έχεις ενεργή συνδρομή.
        </p>
        <a href="tel:+302120212371" className="inline-flex items-center gap-2 text-bronze hover:text-amber text-[13px] font-sans font-semibold tracking-[0.2em] uppercase transition-colors border-b border-bronze/40 hover:border-amber pb-1">
          Καλέσε 212 021 2371
        </a>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-bone dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.08] rounded-lg p-6 space-y-6">
      <div>
        <label className={lCls}>Υπηρεσία</label>
        <div className="space-y-2">
          {SERVICES.map(s => {
            const isActive = service === s
            return (
              <button
                key={s} type="button"
                onClick={() => { setService(s); setTime(''); setBookingStandby(false) }}
                className={`w-full text-left px-4 py-3.5 rounded-lg border font-sans text-base font-medium transition-colors duration-200 flex items-center justify-between min-h-[52px] ${
                  isActive
                    ? 'bg-bronze border-bronze text-ink'
                    : 'bg-ivory dark:bg-ink/40 border-ink/[0.12] dark:border-bone/[0.15] text-ink/85 dark:text-bone/85 hover:border-bronze/60 hover:text-ink dark:hover:text-bone cursor-pointer'
                }`}
              >
                <span>{s}</span>
                {isActive && (
                  <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {service === GROUP_SERVICE && <GroupWeekProgram settings={settings} />}

      {service && !subForService && (
        <div className="bg-ember/[0.06] border border-ember/30 rounded-xl px-5 py-4 text-sm font-sans text-ember">
          Δεν έχεις ενεργή συνδρομή για <strong>{service}</strong>. Επικοινώνησε με το studio.
        </div>
      )}

      {service && subForService && (
        <div>
          <label className={lCls}>Διάλεξε μέρα</label>
          <div className="bg-ivory dark:bg-ink/40 border border-ink/[0.12] dark:border-bone/[0.15] rounded-xl p-2 sm:p-3">
            {/* Week navigator */}
            <div className="flex items-center justify-between mb-3 px-0.5">
              <button
                type="button"
                onClick={() => setWeekStart(w => addDaysLocal(w, -7))}
                disabled={isThisWeek}
                aria-label="Προηγούμενη εβδομάδα"
                className="w-9 h-9 flex items-center justify-center rounded-full text-ink/50 dark:text-bone/50 hover:bg-ink/[0.06] dark:hover:bg-bone/[0.06] hover:text-ink dark:hover:text-bone disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <div className="text-center">
                <p className="text-ink dark:text-bone font-sans font-semibold text-sm tracking-wide">{rangeLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => setWeekStart(w => addDaysLocal(w, 7))}
                disabled={ymd(addDaysLocal(weekStart, 7)) > maxDate}
                aria-label="Επόμενη εβδομάδα"
                className="w-9 h-9 flex items-center justify-center rounded-full text-ink/50 dark:text-bone/50 hover:bg-ink/[0.06] dark:hover:bg-bone/[0.06] hover:text-ink dark:hover:text-bone disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
            </div>

            {/* Day strip */}
            <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
              {weekDays.map((d, i) => {
                const s        = ymd(d)
                const info     = dayInfo(s)
                const disabled = info.isPast || info.tooFar || info.closed
                const isSelect = date === s
                return (
                  <button
                    key={s} type="button" disabled={disabled}
                    onClick={() => { setDate(s); setTime(''); setBookingStandby(false) }}
                    title={info.tooFar ? 'Πολύ μακριά' : info.closed ? 'Κλειστά' : undefined}
                    className={`h-[72px] sm:h-20 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors duration-150 ${
                      isSelect       ? 'bg-bronze text-ink'
                      : disabled     ? 'text-ink/25 dark:text-bone/25 cursor-not-allowed'
                      : 'text-ink/85 dark:text-bone/80 hover:bg-ink/[0.06] dark:hover:bg-bone/[0.06] cursor-pointer'
                    }`}
                  >
                    <span className={`text-[11px] font-sans font-semibold tracking-wide ${isSelect ? 'text-ink/70' : 'text-ink/45 dark:text-bone/40'}`}>{DAY_HEADERS[i]}</span>
                    <span className={`text-base sm:text-lg font-sans font-bold leading-none ${(info.closed || info.tooFar) ? 'line-through' : ''}`}>{d.getDate()}</span>
                    <span className="h-2 flex items-center">
                      {info.mine
                        ? <svg className={`w-3 h-3 ${isSelect ? 'text-ink/70' : 'text-bronze'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        : !disabled && (info.hasFree
                          ? <span className={`w-1.5 h-1.5 rounded-full ${isSelect ? 'bg-ink/50' : 'bg-bronze'}`} />
                          : info.hasStandby
                            ? <span className={`w-1.5 h-1.5 rounded-full ${isSelect ? 'bg-ink/40' : 'bg-amber'}`} />
                            : <span className={`text-[8px] font-sans uppercase tracking-wide ${isSelect ? 'text-ink/50' : 'text-ink/30 dark:text-bone/30'}`}>—</span>
                        )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {date && service && subForService && alreadyBookedToday && (
        <div className="rounded-lg border border-bronze/30 bg-bronze/[0.06] px-4 py-3 text-bronze text-[13px] font-sans flex items-center gap-2.5">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Έχεις ήδη ραντεβού αυτή τη μέρα — επιτρέπεται ένα ραντεβού ανά ημέρα.
        </div>
      )}

      {date && service && subForService && !alreadyBookedToday && (
        <div>
          <label className={lCls}>Ώρα</label>
          {timeSlots.length === 0 ? (
            <p className="text-ink/55 dark:text-bone/50 text-sm font-sans py-2">Δεν υπάρχουν διαθέσιμες ώρες αυτή τη μέρα για {service}.</p>
          ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {timeSlots.map(t => {
              const cap         = SERVICE_CAPACITY[service] ?? 1
              const confirmedCt = dayBookings.filter(b => b.booking_time === t && b.service === service && b.status === 'confirmed').length
              const standbyCt   = dayBookings.filter(b => b.booking_time === t && b.service === service && b.status === 'standby').length
              const isTaken       = confirmedCt >= cap && standbyCt >= STANDBY_CAPACITY
              const isStandbySlot = confirmedCt >= cap && standbyCt < STANDBY_CAPACITY
              const isActive      = time === t
              const disabled      = isTaken
              const gType         = service === GROUP_SERVICE ? groupTypeFor(date, t, settings) : null
              const meta          = gType ? GROUP_TYPE_META[gType] : null
              return (
                <button
                  key={t} type="button" disabled={disabled}
                  onClick={() => { setTime(t); setBookingStandby(isStandbySlot) }}
                  className={`text-base font-sans font-medium py-2.5 rounded-lg border transition-colors duration-200 min-h-[52px] flex flex-col items-center justify-center gap-0.5 ${
                    isActive && isStandbySlot ? 'bg-amber border-amber text-ink font-semibold'
                    : isActive      ? 'bg-bronze border-bronze text-ink font-semibold'
                    : isTaken       ? 'border-ink/[0.08] dark:border-bone/[0.08] text-ink/25 dark:text-bone/25 cursor-not-allowed line-through'
                    : isStandbySlot ? 'border-amber/50 text-amber/80 hover:border-amber hover:text-amber cursor-pointer'
                    : 'border-ink/[0.15] dark:border-bone/[0.15] text-ink/85 dark:text-bone/85 hover:border-bronze hover:text-ink dark:hover:text-bone cursor-pointer'
                  }`}
                >
                  <span>{t}</span>
                  {meta && (
                    <span className={`text-[9px] font-sans font-semibold tracking-[0.08em] uppercase leading-none flex items-center gap-1 ${isActive ? 'text-ink/70' : ''}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
                    </span>
                  )}
                  {!meta && isStandbySlot && <span className="text-[9px] tracking-[0.12em] uppercase opacity-80 leading-none">Αναμονή</span>}
                  {meta && isStandbySlot && <span className="text-[8px] tracking-[0.1em] uppercase opacity-70 leading-none">Αναμονή</span>}
                </button>
              )
            })}
          </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-ember text-base bg-ember/[0.08] border border-ember/30 rounded-lg px-4 py-3 font-sans">{error}</p>
      )}

      {subForService && pushSupported() && remindersState === 'on' && (
        <div className="w-full flex items-center justify-center gap-2.5 rounded-full border border-bronze/40 bg-bronze/[0.08] text-bronze px-4 py-3.5 font-sans text-[12px] font-semibold tracking-[0.16em] uppercase min-h-[52px]">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          Υπενθυμίσεις ενεργές
        </div>
      )}
      {subForService && pushSupported() && (remindersState === 'idle' || remindersState === 'enabling') && (
        <p className="text-ink/50 dark:text-bone/45 text-[12px] font-sans text-center flex items-center justify-center gap-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          Θα σου θυμίσουμε 1 ώρα πριν το ραντεβού
        </p>
      )}
      {subForService && remindersState === 'denied' && <BlockedNotificationsHelp />}

      {subForService && (
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-bronze hover:bg-amber disabled:opacity-50 text-ink font-sans font-semibold text-[13px] tracking-[0.22em] uppercase py-4 rounded-full transition-colors duration-200 cursor-pointer min-h-[56px]"
        >
          {saving ? 'Αποστολή…' : 'Κλείσε Ραντεβού'}
        </button>
      )}
    </form>
  )
}

function HistoryTab({ bookings, subs, loading, isExpired }) {
  const now     = new Date()
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  const groups = bookings.reduce((acc, b) => {
    const key = b.booking_date.slice(0, 7)
    if (!acc[key]) acc[key] = []
    acc[key].push(b)
    return acc
  }, {})
  const monthKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  const [visibleCount, setVisibleCount] = useState(1)
  const visibleKeys    = monthKeys.slice(0, visibleCount)
  const hasMore        = visibleCount < monthKeys.length

  function monthLabel(key) {
    const [y, m] = key.split('-')
    return `${MONTHS_GR[+m - 1]} ${y}`
  }

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const nowTime  = now.toTimeString().slice(0, 5)
  function bookingDisplayKey(b) {
    if (b.status === 'cancelled') return 'cancelled'
    if (b.status === 'standby')   return 'standby'
    if (b.booking_date < todayStr || (b.booking_date === todayStr && b.booking_time < nowTime)) return 'completed'
    return 'upcoming'
  }
  // A late cancel where the session was kept (lost) is shown more strongly red.
  const isKeptCancel = b => b.status === 'cancelled' && b.cancel_outcome === 'kept'
  function statusCls(b) {
    const k = bookingDisplayKey(b)
    if (k === 'cancelled')  return isKeptCancel(b) ? 'bg-ember/20 text-ember border-ember/50' : 'bg-ember/10 text-ember/60 border-ember/20'
    if (k === 'completed')  return 'bg-green-900/20 text-green-400 border-green-700/30'
    if (k === 'standby')    return 'bg-amber/15 text-amber border-amber/30'
    return 'bg-bronze/15 text-bronze border-bronze/30'
  }
  function statusLabel(b) {
    const k = bookingDisplayKey(b)
    if (k === 'cancelled')  return isKeptCancel(b) ? 'Ακυρ. — χάθηκε' : b.cancel_outcome === 'refunded' ? 'Ακυρ. — επιστράφηκε' : 'Ακυρώθηκε'
    if (k === 'completed')  return 'Ολοκληρ.'
    if (k === 'standby')    return 'Αναμονή'
    return 'Εκκρεμεί'
  }

  return (
    <section className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-ink/55 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">Ιστορικό Προπονήσεων</span>
          <span className="h-px flex-1 bg-ink/[0.08] dark:bg-bone/[0.08]" />
        </div>

        {loading ? (
          <p className="text-ink/55 dark:text-bone/55 text-base font-sans py-6 text-center">Φόρτωση…</p>
        ) : monthKeys.length === 0 ? (
          <div className="bg-bone/60 dark:bg-ink/40 border border-ink/[0.1] dark:border-bone/[0.08] rounded-xl p-6 text-center">
            <p className="text-ink/65 dark:text-bone/55 text-base font-serif italic">Δεν υπάρχει ιστορικό ακόμα.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {visibleKeys.map(key => (
              <div key={key}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[11px] font-sans tracking-[0.2em] uppercase font-semibold ${
                    key === thisKey ? 'text-bronze' : 'text-ink/55 dark:text-bone/45'
                  }`}>
                    {monthLabel(key)}
                    {key === thisKey && <span className="ml-1.5 text-bronze/70 font-medium normal-case tracking-normal">· Τρέχων μήνας</span>}
                  </span>
                  <span className="h-px flex-1 bg-ink/[0.06] dark:bg-bone/[0.06]" />
                  <span className="text-ink/45 dark:text-bone/30 text-xs font-sans font-medium">
                    {groups[key].filter(b => b.status !== 'cancelled').length} προπ.
                  </span>
                </div>

                <ul className="space-y-2">
                  {groups[key]
                    .sort((a, b) => (b.booking_date + b.booking_time).localeCompare(a.booking_date + a.booking_time))
                    .map(b => (
                      <li key={b.id} className="relative bg-bone dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.08] rounded-xl p-4 pl-5 flex items-center justify-between gap-3 overflow-hidden">
                        <span className={`absolute left-0 top-0 bottom-0 w-1 ${isKeptCancel(b) ? 'bg-ember' : b.status === 'cancelled' ? 'bg-ember/40' : 'bg-bronze/80'}`} />
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 shrink-0 text-center">
                            <p className="text-bronze font-sans font-semibold text-2xl leading-none tabular-nums">{b.booking_date.split('-')[2]}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-ink dark:text-bone font-sans font-semibold text-base truncate flex items-center gap-2">
                              {b.service}
                              {b.session_type && GROUP_TYPE_META[b.session_type] && (
                                <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.06em] uppercase ${GROUP_TYPE_META[b.session_type].chip}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${GROUP_TYPE_META[b.session_type].dot}`} />{GROUP_TYPE_META[b.session_type].label}
                                </span>
                              )}
                            </p>
                            <p className="text-ink/55 dark:text-bone/55 text-sm font-sans mt-0.5">{b.booking_time}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-sans font-semibold tracking-[0.18em] uppercase px-2.5 py-1 rounded-full border shrink-0 ${statusCls(b)}`}>
                          {statusLabel(b)}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}

            {hasMore && (
              <button
                onClick={() => setVisibleCount(v => v + 3)}
                className="w-full flex items-center justify-center gap-2 border border-ink/[0.12] dark:border-bone/[0.12] hover:border-bronze/40 text-ink/65 dark:text-bone/55 hover:text-ink dark:hover:text-bone text-[12px] font-sans font-semibold tracking-[0.18em] uppercase py-4 rounded-xl transition-colors cursor-pointer group"
              >
                <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs group-hover:border-bronze group-hover:text-bronze transition-colors">+</span>
                Παλιότερα ({monthKeys.length - visibleCount} μήνες ακόμα)
              </button>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-ink/55 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">Συνδρομές</span>
          <span className="h-px flex-1 bg-ink/[0.08] dark:bg-bone/[0.08]" />
        </div>
        {subs.length === 0 ? (
          <div className="bg-bone/60 dark:bg-ink/40 border border-ink/[0.1] dark:border-bone/[0.08] rounded-xl p-6 text-center">
            <p className="text-ink/65 dark:text-bone/55 text-base font-serif italic">Καμία συνδρομή ακόμα.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {subs.map(s => (
              <li key={s.id} className="bg-bone dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.08] rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-ink dark:text-bone font-sans font-semibold text-base truncate">{s.plan_name}</p>
                  <p className="text-ink/55 dark:text-bone/55 text-sm font-sans mt-1">{formatDate(s.start_date)} → {formatDate(s.end_date)}</p>
                </div>
                <span className={`text-[10px] font-sans font-semibold tracking-[0.18em] uppercase px-2.5 py-1 rounded-full border shrink-0 ${
                  s.status === 'active' && !isExpired(s) ? 'bg-bronze/15 text-bronze border-bronze/30' : 'bg-ink/[0.06] dark:bg-bone/[0.06] text-ink/45 dark:text-bone/45 border-ink/[0.1] dark:border-bone/[0.1]'
                }`}>
                  {s.status === 'active' && !isExpired(s) ? 'Ενεργή' : s.status === 'cancelled' ? 'Ακυρωμ.' : 'Έληξε'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

// Doctor's certificate (χαρτί γιατρού) — upload a photo/PDF, valid for 1 year.
function MedicalCertCard({ memberId }) {
  const [cert,    setCert]    = useState(undefined) // undefined = loading, null = none
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState('')
  const [issuedAt, setIssuedAt] = useState('') // YYYY-MM-DD
  // Three-field date picker state (avoids iOS <input type="date"> bugs)
  const [dayVal,   setDayVal]   = useState('')
  const [monthVal, setMonthVal] = useState('')
  const [yearVal,  setYearVal]  = useState('')
  const inputRef = useRef(null)
  const today = ymd(new Date())
  const todayDate = new Date()
  const currentYear = todayDate.getFullYear()

  // Keep issuedAt in sync with the three dropdowns
  function updateDate(d, m, y) {
    if (d && m && y) {
      const dd = String(d).padStart(2, '0')
      const mm = String(m).padStart(2, '0')
      const candidate = `${y}-${mm}-${dd}`
      // Don't allow future dates
      setIssuedAt(candidate <= today ? candidate : '')
    } else {
      setIssuedAt('')
    }
  }
  function onDayChange(e)   { const v = e.target.value; setDayVal(v);   updateDate(v, monthVal, yearVal) }
  function onMonthChange(e) { const v = e.target.value; setMonthVal(v); updateDate(dayVal, v, yearVal) }
  function onYearChange(e)  { const v = e.target.value; setYearVal(v);  updateDate(dayVal, monthVal, v) }

  const MONTHS_GR = ['Ιανουάριος','Φεβρουάριος','Μάρτιος','Απρίλιος','Μάιος','Ιούνιος','Ιούλιος','Αύγουστος','Σεπτέμβριος','Οκτώβριος','Νοέμβριος','Δεκέμβριος']

  useEffect(() => {
    let alive = true
    myMedicalCertificate(memberId).then(c => { if (alive) setCert(c) })
    return () => { alive = false }
  }, [memberId])

  async function onPick(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    if (!issuedAt) { setError('Συμπλήρωσε πρώτα την ημερομηνία που αναγράφεται στο χαρτί.'); return }
    setError(''); setBusy(true)
    const res = await uploadMedicalCertificate(memberId, file, issuedAt || null)
    setBusy(false)
    if (res.ok) {
      setCert({ uploaded_at: res.uploaded_at, expires_at: res.expires_at, issued_at: res.issued_at })
    } else {
      setError(
        res.reason === 'bad-type'  ? 'Δεκτά μόνο φωτογραφία (JPG/PNG) ή PDF.'
        : res.reason === 'too-large' ? 'Το αρχείο είναι πολύ μεγάλο (έως 10MB).'
        : 'Η μεταφόρτωση απέτυχε. Δοκίμασε ξανά.'
      )
    }
  }

  const status = cert === undefined ? 'loading' : certStatus(cert)
  const fmt = ts => ts ? new Date(ts).toLocaleDateString('el-GR', { day: 'numeric', month: 'long', year: 'numeric' }) : ''

  const banner = {
    valid:    { cls: 'border-bronze/30 bg-bronze/[0.06] text-bronze',  text: `Σε ισχύ έως ${fmt(cert?.expires_at)}` },
    expiring: { cls: 'border-amber/40 bg-amber/[0.08] text-amber',      text: `Λήγει στις ${fmt(cert?.expires_at)} — ανέβασε νέο σύντομα` },
    expired:  { cls: 'border-ember/40 bg-ember/[0.08] text-ember',      text: `Έληξε στις ${fmt(cert?.expires_at)} — χρειάζεται νέο` },
    missing:  { cls: 'border-ember/40 bg-ember/[0.06] text-ember',      text: 'Δεν έχεις ανεβάσει χαρτί γιατρού ακόμα' },
    pending:  { cls: 'border-stone/40 bg-stone/[0.06] text-ink/60 dark:text-bone/60', text: 'Το χαρτί σου ανέβηκε — αναμονή έγκρισης από το studio' },
  }[status]

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-ink/55 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">Χαρτί Γιατρού</span>
        <span className="h-px flex-1 bg-ink/[0.08] dark:bg-bone/[0.08]" />
      </div>
      <div className="bg-bone dark:bg-coal border border-ink/[0.08] dark:border-bone/[0.08] rounded-xl p-5 space-y-4">
        <p className="text-ink/60 dark:text-bone/55 text-sm font-sans leading-relaxed">
          Ανέβασε φωτογραφία ή PDF της ιατρικής βεβαίωσης. Ισχύει για 1 χρόνο από την ημερομηνία που αναγράφεται στο χαρτί.
        </p>

        {status !== 'loading' && (
          <div className={`flex items-center gap-2.5 rounded-lg border px-4 py-3 text-[13px] font-sans font-medium ${banner.cls}`}>
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{banner.text}</span>
          </div>
        )}

        <div>
          <label className="block text-ink/55 dark:text-bone/50 text-[11px] font-sans font-semibold tracking-[0.16em] uppercase mb-1.5">Ημερομηνία στο χαρτί</label>
          <div className="grid grid-cols-3 gap-2">
            <select value={dayVal} onChange={onDayChange}
              className="bg-ivory dark:bg-ink/40 border border-ink/[0.12] dark:border-bone/[0.15] focus:border-bronze focus:ring-1 focus:ring-bronze text-ink dark:text-bone rounded-lg px-3 py-3 text-base font-sans outline-none transition-colors min-h-[52px] appearance-none text-center">
              <option value="">Μέρα</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                <option key={d} value={String(d).padStart(2,'0')}>{d}</option>
              ))}
            </select>
            <select value={monthVal} onChange={onMonthChange}
              className="bg-ivory dark:bg-ink/40 border border-ink/[0.12] dark:border-bone/[0.15] focus:border-bronze focus:ring-1 focus:ring-bronze text-ink dark:text-bone rounded-lg px-3 py-3 text-base font-sans outline-none transition-colors min-h-[52px] appearance-none text-center">
              <option value="">Μήνας</option>
              {MONTHS_GR.map((m, i) => (
                <option key={i+1} value={String(i+1).padStart(2,'0')}>{m}</option>
              ))}
            </select>
            <select value={yearVal} onChange={onYearChange}
              className="bg-ivory dark:bg-ink/40 border border-ink/[0.12] dark:border-bone/[0.15] focus:border-bronze focus:ring-1 focus:ring-bronze text-ink dark:text-bone rounded-lg px-3 py-3 text-base font-sans outline-none transition-colors min-h-[52px] appearance-none text-center">
              <option value="">Χρόνος</option>
              {Array.from({ length: 3 }, (_, i) => currentYear - i).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <p className="text-ink/40 dark:text-bone/40 text-[11px] font-sans mt-1.5">Η ημερομηνία έκδοσης που γράφει το χαρτί — η ισχύς (1 χρόνος) μετράει από εκεί.</p>
        </div>

        <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onPick} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || !issuedAt}
          className="w-full flex items-center justify-center gap-2.5 bg-bronze hover:bg-amber disabled:opacity-50 disabled:cursor-not-allowed text-ink font-sans font-semibold text-[12px] tracking-[0.18em] uppercase py-3.5 rounded-full transition-colors cursor-pointer min-h-[52px]"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {busy ? 'Μεταφόρτωση…' : (cert ? 'Ανέβασε νέο χαρτί' : 'Ανέβασε χαρτί γιατρού')}
        </button>

        {error && <p className="text-ember text-[13px] font-sans">{error}</p>}
      </div>
    </section>
  )
}

// One-time welcome card shown on the member's first visit to the portal. The
// "enable notifications" button runs inside a direct tap, so the iOS permission
// prompt fires reliably (iOS suppresses prompts not in a user-gesture stack).
// Once dismissed (enabled, declined, or "later") it never shows again on this device.
const WELCOME_KEY = 'byme_welcomed'

function WelcomeNotifications({ email, onClose }) {
  const supported = pushSupported() && typeof Notification !== 'undefined'
  const [busy, setBusy] = useState(false)

  // Nothing to ask if push isn't supported or already decided — close immediately.
  useEffect(() => {
    if (!supported || Notification.permission !== 'default') {
      localStorage.setItem(WELCOME_KEY, '1')
      onClose()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!supported || Notification.permission !== 'default') return null

  function finish() {
    localStorage.setItem(WELCOME_KEY, '1')
    onClose()
  }

  async function enable() {
    setBusy(true)
    await enableReminders(email)
    setBusy(false)
    finish()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-ink/60 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-bone dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.1] rounded-2xl p-7 text-center shadow-2xl">
        <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-bronze/15 flex items-center justify-center">
          <svg className="w-7 h-7 text-bronze" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        </div>
        <h2 className="text-ink dark:text-bone font-serif text-2xl mb-2">Ειδοποιήσεις</h2>
        <p className="text-ink/60 dark:text-bone/55 text-sm font-sans leading-relaxed mb-6">
          Ενεργοποίησε τις ειδοποιήσεις για να σου θυμίζουμε 1 ώρα πριν το ραντεβού,
          να μαθαίνεις όταν μπαίνεις από τη λίστα αναμονής και πότε λήγει η συνδρομή σου.
        </p>
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="w-full bg-bronze hover:bg-amber disabled:opacity-50 text-ink font-sans font-semibold text-[12px] tracking-[0.18em] uppercase py-3.5 rounded-full transition-colors cursor-pointer min-h-[52px] mb-3"
        >
          {busy ? 'Ενεργοποίηση…' : 'Ενεργοποίηση ειδοποιήσεων'}
        </button>
        <button
          type="button"
          onClick={finish}
          className="w-full text-ink/45 dark:text-bone/45 hover:text-ink/70 dark:hover:text-bone/70 text-[12px] font-sans tracking-[0.12em] uppercase py-2 transition-colors cursor-pointer"
        >
          Όχι τώρα
        </button>
      </div>
    </div>
  )
}

export default function MePortal() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState(() => localStorage.getItem('me_theme') || 'light')
  const [member, setMember] = useState(() => {
    try {
      const s = localStorage.getItem(ME_KEY)
      return s ? JSON.parse(s) : null
    } catch { return null }
  })
  const [tab,        setTab]        = useState('home')
  const [subs,       setSubs]       = useState([])
  const [bookings,   setBookings]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [toast,      setToast]      = useState('')
  const [selectedDay, setSelectedDay] = useState(null)
  const [settings,    setSettings]    = useState({ time_slots: [], saturday_slots: [], closed_weekdays: [], closed_dates: [] })
  const [editingPhone,  setEditingPhone]  = useState(false)
  const [phoneVal,      setPhoneVal]      = useState('')
  const [phoneSaving,   setPhoneSaving]   = useState(false)
  const [editingCode,   setEditingCode]   = useState(false)
  const [codeVal,       setCodeVal]       = useState('')
  const [codeSaving,    setCodeSaving]    = useState(false)
  const [copied,        setCopied]        = useState(false)
  const [codeVisible,   setCodeVisible]   = useState(false)
  const [standbyPos,    setStandbyPos]    = useState({})
  // Google review prompt: hidden permanently (on this device) once the member taps it.
  const [reviewed,      setReviewed]      = useState(() => localStorage.getItem('byme_reviewed') === '1')
  // First-visit notifications welcome (shown once per device).
  const [showWelcome,   setShowWelcome]   = useState(() => localStorage.getItem(WELCOME_KEY) !== '1')
  const [cancelSheet,   setCancelSheet]   = useState(null) // booking to cancel
  const [bookingFormKey, setBookingFormKey] = useState(0)
  const [showAllBookings, setShowAllBookings] = useState(false)

  function handleReviewClick() {
    localStorage.setItem('byme_reviewed', '1')
    setReviewed(true)
  }

  useEffect(() => {
    if (!member) { navigate('/login', { replace: true }); return }
    // Members logged in before session tokens existed have a profile row but no
    // token. Every member action now needs one, so force a one-time re-login.
    if (!getSessionToken()) {
      localStorage.removeItem(ME_KEY)
      clearSessionToken()
      setMember(null)
      navigate('/login', { replace: true })
    }
  }, [member, navigate])

  useEffect(() => {
    loadSettings().then(setSettings)
  }, [])

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('me_theme', next)
  }

  async function refresh() {
    if (!member) return
    setLoading(true)
    const [s, rows] = await Promise.all([
      fetchMemberSubscriptions(member.id),
      fetchMyBookings(),
    ])
    setSubs(s)
    setBookings(rows)
    setLoading(false)

    // Compute waitlist position for each upcoming standby booking (server-side,
    // so the queue's other members aren't exposed to the client).
    const todayKey = ymd(new Date())
    const myStandbys = rows.filter(r => r.status === 'standby' && r.booking_date >= todayKey)
    if (myStandbys.length) {
      const entries = await Promise.all(myStandbys.map(async r => {
        const pos = await fetchStandbyPosition(r.booking_date, r.booking_time, r.service)
        return [r.id, pos]
      }))
      setStandbyPos(Object.fromEntries(entries))
    } else {
      setStandbyPos({})
    }
  }

  useEffect(() => { if (member) refresh() }, [member?.id])

  async function logout() {
    await logoutMember()
    localStorage.removeItem(ME_KEY)
    setMember(null)
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 4000) }

  async function savePhone() {
    const val = phoneVal.trim()
    if (!val) return
    setPhoneSaving(true)
    const res = await updateMemberSelf({ id: member.id, currentCode: member.member_code, phone: val })
    if (res.ok) {
      const updated = { ...member, phone: val }
      localStorage.setItem(ME_KEY, JSON.stringify(updated))
      setMember(updated)
      setEditingPhone(false)
      showToast('Τηλέφωνο αποθηκεύτηκε.')
    } else {
      showToast('Σφάλμα αποθήκευσης.')
    }
    setPhoneSaving(false)
  }

  async function saveCode() {
    const val = codeVal.trim()
    if (!val) return
    setCodeSaving(true)
    const res = await updateMemberSelf({ id: member.id, currentCode: member.member_code, newCode: val })
    if (res.ok) {
      const updated = { ...member, member_code: val }
      localStorage.setItem(ME_KEY, JSON.stringify(updated))
      setMember(updated)
      setEditingCode(false)
      showToast('Κωδικός αποθηκεύτηκε.')
    } else if (res.error === 'taken') {
      showToast('Αυτός ο κωδικός χρησιμοποιείται ήδη.')
    } else {
      showToast('Σφάλμα αποθήκευσης.')
    }
    setCodeSaving(false)
  }

  function copyCode() {
    navigator.clipboard.writeText(member.member_code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }


  async function handleCancelBooking(b) {
    setCancelSheet(b)
  }

  async function doCancelBooking(b) {
    setCancelSheet(null)
    // The server decides the outcome (kept/refunded/none), refunds the session
    // if due, and promotes any standby — all under the member's session token.
    const res = await cancelMyBooking(b.id)
    if (res.result === 'ok' || res.result === 'already') {
      const toastMsg = res.outcome === 'kept'
        ? 'Το ραντεβού ακυρώθηκε. Η συνεδρία δεν επιστράφηκε (ακύρωση εντός 5 ωρών).'
        : res.outcome === 'refunded'
          ? 'Το ραντεβού ακυρώθηκε. Η συνεδρία επιστράφηκε.'
          : 'Το ραντεβού ακυρώθηκε.'
      setToast(toastMsg)
      setTimeout(() => setToast(''), 5000)
      setBookingFormKey(k => k + 1)
      refresh()
    } else {
      setToast(res.result === 'invalid'
        ? 'Η σύνδεσή σου έληξε. Κάνε ξανά σύνδεση.'
        : 'Κάτι πήγε στραβά. Δοκίμασε ξανά.')
      setTimeout(() => setToast(''), 5000)
    }
  }

  if (!member) return null

  const activeSub  = subs.find((s) => s.status === 'active' && !isExpired(s)) ?? null
  const activeSubs = subs.filter((s) => s.status === 'active' && !isExpired(s))
  const todayStr  = ymd(new Date())
  const nowTime2  = new Date().toTimeString().slice(0, 5)
  function isPast(b) {
    return b.booking_date < todayStr || (b.booking_date === todayStr && b.booking_time < nowTime2)
  }
  const upcoming  = bookings
    .filter((b) => !isPast(b) && b.status !== 'cancelled')
    .sort((a, b) => (a.booking_date + a.booking_time).localeCompare(b.booking_date + b.booking_time))
  const past      = bookings
    .filter((b) => isPast(b) || b.status === 'cancelled')
    .sort((a, b) => (b.booking_date + b.booking_time).localeCompare(a.booking_date + a.booking_time))

  return (
    <div className={`${theme === 'dark' ? 'dark' : ''}`}>
    <div className="relative min-h-screen bg-ivory dark:bg-ink text-ink dark:text-bone" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
      {showWelcome && <WelcomeNotifications email={member.email} onClose={() => setShowWelcome(false)} />}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ willChange: 'transform' }}>
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-bronze/[0.07] blur-[60px]" />
        <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] rounded-full bg-bronze/[0.04] blur-[60px]" />
      </div>

      {toast && (
        <div className="fixed left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:w-auto sm:max-w-sm z-50 px-5 py-3.5 rounded-2xl text-sm font-sans font-semibold shadow-xl bg-ink dark:bg-bone text-bone dark:text-ink leading-snug text-center" style={{ top: 'calc(1.25rem + env(safe-area-inset-top))' }}>
          {toast}
        </div>
      )}

      <header className="relative border-b border-ink/[0.1] dark:border-bone/[0.08] bg-ivory/95 dark:bg-ink/95 backdrop-blur-sm sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BymeLogo size="xs" className="text-ink dark:text-bone" />
            <span className="text-bronze text-[10px] font-sans tracking-[0.25em] uppercase border border-bronze/30 bg-bronze/10 px-2.5 py-1 rounded-full">Member</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Φωτεινό θέμα' : 'Σκοτεινό θέμα'}
              className="w-9 h-9 flex items-center justify-center rounded-full border border-ink/[0.1] dark:border-bone/[0.1] hover:border-bronze/40 text-ink/55 dark:text-bone/55 hover:text-bronze transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                </svg>
              )}
            </button>
            <button onClick={logout} className="text-ink/55 dark:text-bone/55 hover:text-ink dark:hover:text-bone text-sm transition-colors flex items-center gap-1.5 px-2 py-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              <span className="hidden sm:inline text-xs">Έξοδος</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative max-w-3xl mx-auto px-4 sm:px-5 py-6 sm:py-8 space-y-5 sm:space-y-6">
        <section>
          <p className="text-bronze text-[11px] font-sans font-semibold tracking-[0.28em] uppercase">Καλώς ήρθες</p>
          <h1 className="font-serif text-5xl md:text-6xl text-ink dark:text-bone italic font-light mt-3 leading-[1.05]">{member.name.split(' ')[0]}.</h1>
        </section>

        <InstallHint />

        <div className="flex gap-1 bg-bone dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.08] rounded-full p-1 w-full sm:w-fit">
          {[
            { key: 'home',     label: 'Αρχική' },
            { key: 'book',     label: 'Κράτηση' },
            { key: 'history',  label: 'Ιστορικό' },
            { key: 'settings', label: 'Ρυθμίσεις' },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 sm:flex-initial px-3 sm:px-5 py-2.5 rounded-full text-[11px] sm:text-[13px] font-sans font-semibold tracking-[0.1em] sm:tracking-[0.14em] uppercase transition-colors duration-200 cursor-pointer ${
                tab === t.key ? 'bg-bronze text-ink' : 'text-ink/60 dark:text-bone/55 hover:text-ink dark:hover:text-bone'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* HOME */}
        <div className={tab === 'home' ? 'space-y-7' : 'hidden'}>
            {!loading && upcoming.length > 0 && (() => {
              const next   = upcoming[0]
              const isSb   = next.status === 'standby'
              const pos    = standbyPos[next.id]
              const dateLbl = new Date(next.booking_date).toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' })
              return (
                <section>
                  <div className={`relative overflow-hidden rounded-2xl p-6 border ${isSb ? 'border-amber/35 bg-amber/[0.06]' : 'border-bronze/35 bg-gradient-to-br from-bronze/[0.12] to-transparent'}`}>
                    <div className={`absolute -top-10 -right-10 w-36 h-36 rounded-full blur-2xl ${isSb ? 'bg-amber/15' : 'bg-bronze/15'}`} />
                    <div className="relative flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className={`text-[11px] font-sans font-semibold tracking-[0.26em] uppercase ${isSb ? 'text-amber' : 'text-bronze'}`}>
                          {isSb ? 'Σε λίστα αναμονής' : 'Επόμενη προπόνηση'}
                        </p>
                        <p className="font-sans font-semibold text-ink dark:text-bone text-4xl mt-2 leading-none">
                          {relativeDay(next.booking_date)}
                        </p>
                        <p className="text-ink dark:text-bone font-sans text-xl font-semibold mt-3 capitalize leading-snug">{dateLbl}</p>
                        <p className="text-ink/65 dark:text-bone/60 font-sans text-base font-medium mt-1 truncate">{next.service} · {next.booking_time}</p>
                        {isSb && pos && (
                          <span className="inline-block mt-3 text-[11px] font-sans font-semibold tracking-[0.16em] uppercase text-amber bg-amber/15 border border-amber/30 rounded-full px-3 py-1">
                            Θέση {pos} στη λίστα
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              )
            })()}

            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-ink/55 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">Η Συνδρομή σου</span>
                <span className="h-px flex-1 bg-ink/[0.08] dark:bg-bone/[0.08]" />
              </div>

              {loading ? (
                <p className="text-ink/55 dark:text-bone/55 text-base font-sans py-6 text-center">Φόρτωση…</p>
              ) : activeSubs.length > 0 ? (
                <div className="space-y-4">
                  {activeSubs.map(sub => (
                    <div key={sub.id} className="bg-bone dark:bg-gradient-to-br dark:from-coal dark:to-ink border border-bronze/30 rounded-2xl p-6">
                      <div className="flex items-start justify-between mb-5">
                        <div>
                          <p className="text-bronze text-[11px] font-sans font-semibold tracking-[0.28em] uppercase">Ενεργή</p>
                          <h2 className="font-serif text-3xl italic text-ink dark:text-bone mt-1.5 leading-tight">{sub.plan_name}</h2>
                        </div>
                        <div className="w-12 h-12 rounded-full border border-bronze/40 flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-bronze" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                          </svg>
                        </div>
                      </div>

                      <div className="mb-5">
                        <div className="bg-ivory dark:bg-coal border border-bronze/25 rounded-xl p-7 text-center">
                          <p className="text-7xl font-sans font-semibold leading-none text-bronze tabular-nums">
                            {sub.plan_type === 'unlimited' ? '∞' : sessionsLeft(sub)}
                          </p>
                          <p className="text-ink/65 dark:text-bone/55 text-xs font-sans font-semibold tracking-[0.22em] uppercase mt-4">
                            {sub.plan_type === 'unlimited' ? 'Απεριόριστες προπονήσεις' : 'Προπονήσεις διαθέσιμες'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-sans font-medium text-ink/65 dark:text-bone/55 tracking-[0.12em] border-t border-ink/[0.08] dark:border-bone/[0.06] pt-4">
                        <span>ΕΝΑΡΞΗ · {formatDate(sub.start_date)}</span>
                        <span>ΛΗΞΗ · {formatDate(sub.end_date)}</span>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setTab('book')}
                    className="w-full bg-bronze hover:bg-amber text-ink font-sans font-semibold text-[13px] tracking-[0.22em] uppercase py-4 rounded-full transition-colors cursor-pointer min-h-[56px]"
                  >
                    + Κλείσε Ραντεβού
                  </button>
                </div>
              ) : (
                <div className="bg-bone/60 dark:bg-ink/40 border border-dashed border-ink/[0.18] dark:border-bone/[0.15] rounded-2xl p-8 text-center">
                  <p className="text-ink/75 dark:text-bone/70 font-serif italic text-xl">Δεν έχεις ενεργή συνδρομή</p>
                  <p className="text-ink/55 dark:text-bone/45 text-sm font-sans mt-2">Επικοινώνησε με το studio για να ξεκινήσεις.</p>
                  <a href="tel:+302120212371" className="inline-flex items-center gap-2 mt-5 text-bronze hover:text-amber text-[13px] font-sans font-semibold tracking-[0.2em] uppercase transition-colors border-b border-bronze/40 hover:border-amber pb-1">
                    Καλέσε 212 021 2371
                  </a>
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-ink/55 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">Ημερολόγιο</span>
                <span className="h-px flex-1 bg-ink/[0.08] dark:bg-bone/[0.08]" />
              </div>
              <MonthCalendar bookings={bookings} onSelectDay={setSelectedDay} closedDates={settings.closed_dates} closedWeekdays={settings.closed_weekdays} />
            </section>

            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-ink/55 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">
                  {selectedDay ? `Ραντεβού · ${formatDate(selectedDay)}` : showAllBookings ? 'Όλα τα Ραντεβού' : 'Επόμενα Ραντεβού'}
                </span>
                <span className="h-px flex-1 bg-ink/[0.08] dark:bg-bone/[0.08]" />
                {selectedDay ? (
                  <button
                    onClick={() => setSelectedDay(null)}
                    aria-label="Καθάρισμα επιλογής"
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-ink/[0.08] dark:bg-bone/[0.08] hover:bg-ink/[0.15] dark:hover:bg-bone/[0.15] text-ink/55 dark:text-bone/45 hover:text-ink dark:hover:text-bone transition-colors cursor-pointer shrink-0"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={() => setShowAllBookings(v => !v)}
                    className={`text-[11px] font-sans font-semibold tracking-[0.18em] uppercase shrink-0 cursor-pointer transition-colors ${showAllBookings ? 'text-bronze' : 'text-ink/45 dark:text-bone/40 hover:text-ink dark:hover:text-bone'}`}
                  >
                    {showAllBookings ? 'Επόμενα' : 'Όλα'}
                  </button>
                )}
              </div>

              {(() => {
                const list = selectedDay
                  ? bookings
                      .filter(b => b.booking_date === selectedDay && b.status !== 'cancelled')
                      .sort((a, b) => a.booking_time.localeCompare(b.booking_time))
                  : showAllBookings
                    ? [...bookings].sort((a, b) => (b.booking_date + b.booking_time).localeCompare(a.booking_date + a.booking_time))
                    : upcoming
                if (loading) {
                  return <p className="text-ink/55 dark:text-bone/55 text-base font-sans py-6 text-center">Φόρτωση…</p>
                }
                if (list.length === 0) {
                  return (
                    <div className="bg-bone/60 dark:bg-ink/40 border border-ink/[0.1] dark:border-bone/[0.08] rounded-xl p-6 text-center">
                      <p className="text-ink/65 dark:text-bone/55 text-base font-serif italic">
                        {selectedDay ? 'Δεν υπάρχει ραντεβού αυτή τη μέρα.' : 'Δεν έχεις προγραμματισμένα ραντεβού.'}
                      </p>
                    </div>
                  )
                }
                return (
                  <ul className="space-y-2.5">
                    {list.map((b) => {
                      const bIsPast = isPast(b)
                      return (
                        <li key={b.id} className="relative bg-bone dark:bg-coal border border-ink/[0.1] dark:border-bone/[0.08] rounded-xl p-4 pl-5 flex items-center justify-between gap-3 overflow-hidden">
                          <span className="absolute left-0 top-0 bottom-0 w-1 bg-bronze" />
                          <div className="flex items-center gap-4 min-w-0">
                            <div className="text-center shrink-0 w-14">
                              <p className="text-bronze text-2xl font-sans font-semibold leading-none tabular-nums">{b.booking_date.split('-')[2]}</p>
                              <p className="text-ink/55 dark:text-bone/55 text-[10px] font-sans font-semibold tracking-[0.18em] uppercase mt-0.5">
                                {['Ιαν','Φεβ','Μάρ','Απρ','Μάι','Ιούν','Ιούλ','Αύγ','Σεπ','Οκτ','Νοέ','Δεκ'][+b.booking_date.split('-')[1] - 1]}
                              </p>
                              <p className="text-ink/40 dark:text-bone/40 text-[10px] font-sans font-medium mt-0.5">
                                {WEEKDAY_FULL[new Date(b.booking_date + 'T00:00:00').getDay()].slice(0, 3)}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-ink dark:text-bone font-sans font-semibold text-base leading-snug">{b.service}</p>
                                {b.session_type && GROUP_TYPE_META[b.session_type] && (() => {
                                  const meta = GROUP_TYPE_META[b.session_type]
                                  return (
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-sans font-semibold tracking-[0.06em] uppercase shrink-0 ${meta.chip}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
                                    </span>
                                  )
                                })()}
                              </div>
                              <p className="text-ink/60 dark:text-bone/55 text-sm font-sans mt-1">{b.booking_time} · {bIsPast ? 'Ολοκληρ.' : b.status === 'standby' ? (standbyPos[b.id] ? `Αναμονή · θέση ${standbyPos[b.id]}` : 'Αναμονή') : 'Εκκρεμεί'}</p>
                            </div>
                          </div>
                          {!bIsPast && (
                            <button
                              onClick={() => handleCancelBooking(b)}
                              className="shrink-0 text-ember/80 hover:text-ember text-[11px] font-sans font-semibold tracking-[0.18em] uppercase border border-ember/30 hover:border-ember/60 px-3 py-2 rounded-full transition-colors cursor-pointer"
                            >
                              Ακύρωση
                            </button>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )
              })()}
            </section>

            {GOOGLE_REVIEW_URL && !reviewed && (
              <section>
                <a
                  href={GOOGLE_REVIEW_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleReviewClick}
                  className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-bronze/30 bg-gradient-to-br from-bronze/[0.1] to-transparent p-5 transition-colors hover:border-bronze/50"
                >
                  <div className="flex shrink-0 items-center gap-0.5 text-bronze">
                    {[0, 1, 2, 3, 4].map(i => (
                      <svg key={i} className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9 4.8 17.6l1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
                      </svg>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-ink dark:text-bone font-serif italic text-lg leading-snug">Σου άρεσε η εμπειρία σου;</p>
                    <p className="text-ink/60 dark:text-bone/55 text-sm font-sans mt-0.5">Άφησε μια κριτική στο Google — μας βοηθάει πολύ.</p>
                  </div>
                  <svg className="w-5 h-5 shrink-0 text-bronze transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </a>
              </section>
            )}
        </div>

        {/* BOOK */}
        <div className={tab === 'book' ? '' : 'hidden'}>
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-ink/55 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">Νέο Ραντεβού</span>
              <span className="h-px flex-1 bg-ink/[0.08] dark:bg-bone/[0.08]" />
            </div>
            <BookingForm
              member={member}
              sub={activeSub}
              subs={subs}
              settings={settings}
              refreshKey={bookingFormKey}
              onDone={(type) => {
                const msg = type === 'standby'
                  ? 'Μπήκες στη λίστα αναμονής. Θα λάβεις email αν επιβεβαιωθεί η θέση σου.'
                  : 'Το ραντεβού καταχωρήθηκε.'
                setToast(msg)
                setTimeout(() => setToast(''), 5000)
                setTab('home'); refresh()
              }}
            />
          </section>
        </div>

        {/* HISTORY */}
        <div className={tab === 'history' ? '' : 'hidden'}>
          <HistoryTab bookings={past} subs={subs} loading={loading} isExpired={isExpired} />
        </div>

        {/* SETTINGS */}
        <div className={tab === 'settings' ? 'space-y-6' : 'hidden'}>

          {/* Personal info */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-ink/55 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">Στοιχεία</span>
              <span className="h-px flex-1 bg-ink/[0.08] dark:bg-bone/[0.08]" />
            </div>
            <div className="bg-bone dark:bg-coal border border-ink/[0.08] dark:border-bone/[0.08] rounded-xl divide-y divide-ink/[0.06] dark:divide-bone/[0.06]">

              {/* Name */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-sans font-semibold text-ink/45 dark:text-bone/45 tracking-[0.22em] uppercase mb-0.5">Ονοματεπώνυμο</p>
                  <p className="text-ink dark:text-bone font-sans text-base font-medium">{member.name}</p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-sans font-semibold text-ink/45 dark:text-bone/45 tracking-[0.22em] uppercase mb-0.5">Email</p>
                  <p className="text-ink dark:text-bone font-sans text-base font-medium truncate">{member.email}</p>
                </div>
              </div>

              {/* Phone — read-only, only admin can change */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-sans font-semibold text-ink/45 dark:text-bone/45 tracking-[0.22em] uppercase mb-0.5">Τηλέφωνο</p>
                    <p className="text-ink dark:text-bone font-sans text-base font-medium">{member.phone || <span className="text-ink/35 dark:text-bone/35 italic">Δεν έχει οριστεί</span>}</p>
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Medical certificate */}
          <MedicalCertCard memberId={member.id} />

          {/* Password / member code */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-ink/55 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">Κωδικός Πρόσβασης</span>
              <span className="h-px flex-1 bg-ink/[0.08] dark:bg-bone/[0.08]" />
            </div>
            <div className="bg-bone dark:bg-coal border border-ink/[0.08] dark:border-bone/[0.08] rounded-xl p-5">
              {editingCode ? (
                <div className="space-y-3">
                  <p className="text-ink/55 dark:text-bone/55 text-sm font-sans">Θα χρησιμοποιηθεί την επόμενη φορά που θα συνδεθείς.</p>
                  <input
                    autoFocus
                    value={codeVal}
                    onChange={e => setCodeVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveCode(); if (e.key === 'Escape') setEditingCode(false) }}
                    placeholder="Νέος κωδικός"
                    maxLength={30}
                    className="w-full bg-ink/[0.04] dark:bg-ink/40 border border-ink/[0.12] dark:border-bone/[0.15] focus:border-bronze focus:ring-1 focus:ring-bronze text-ink dark:text-bone placeholder:text-ink/30 dark:placeholder:text-bone/30 rounded-lg px-4 py-3 text-base font-sans outline-none transition-colors"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveCode} disabled={codeSaving || !codeVal.trim()}
                      className="flex-1 bg-bronze hover:bg-amber disabled:opacity-50 text-ink font-sans font-semibold text-xs tracking-[0.22em] uppercase py-3 rounded-full transition-colors cursor-pointer">
                      {codeSaving ? 'Αποθήκευση…' : 'Αποθήκευση'}
                    </button>
                    <button onClick={() => setEditingCode(false)}
                      className="flex-1 border border-ink/20 dark:border-bone/20 text-ink/60 dark:text-bone/60 font-sans font-semibold text-xs tracking-[0.22em] uppercase py-3 rounded-full transition-colors cursor-pointer">
                      Άκυρο
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-3 bg-ink/[0.04] dark:bg-ink/40 border border-ink/[0.1] dark:border-bone/[0.12] rounded-xl py-3.5 px-4">
                    <span className="flex-1 font-sans text-base text-ink dark:text-bone tracking-widest">
                      {codeVisible ? member.member_code : '•'.repeat(Math.min(member.member_code.length, 10))}
                    </span>
                    <button onClick={() => setCodeVisible(v => !v)} className="shrink-0 text-ink/35 dark:text-bone/35 hover:text-bronze transition-colors cursor-pointer" aria-label={codeVisible ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}>
                      {codeVisible
                        ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                        : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      }
                    </button>
                    <button onClick={copyCode} className="shrink-0 text-ink/35 dark:text-bone/35 hover:text-bronze transition-colors cursor-pointer" aria-label="Αντιγραφή">
                      {copied
                        ? <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                        : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="9" y="9" width="13" height="13" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                      }
                    </button>
                  </div>
                  <button onClick={() => { setCodeVal(''); setEditingCode(true) }}
                    className="shrink-0 text-ink/35 dark:text-bone/35 hover:text-bronze transition-colors cursor-pointer p-1" aria-label="Αλλαγή κωδικού">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /></svg>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Appearance */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-ink/55 dark:text-bone/55 text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">Εμφάνιση</span>
              <span className="h-px flex-1 bg-ink/[0.08] dark:bg-bone/[0.08]" />
            </div>
            <div className="bg-bone dark:bg-coal border border-ink/[0.08] dark:border-bone/[0.08] rounded-xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-ink dark:text-bone font-sans font-semibold text-base">Σκοτεινό θέμα</p>
                  <p className="text-ink/55 dark:text-bone/55 text-sm font-sans mt-0.5">Dark / Light mode</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative w-14 h-7 rounded-full transition-colors duration-300 cursor-pointer ${theme === 'dark' ? 'bg-bronze' : 'bg-ink/20'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-300 ${theme === 'dark' ? 'translate-x-7' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </section>

          {/* Logout */}
          <section>
            <button
              onClick={logout}
              className="w-full border border-ember/30 hover:border-ember/60 text-ember text-[13px] font-sans font-semibold tracking-[0.18em] uppercase py-4 rounded-full transition-colors cursor-pointer min-h-[52px]"
            >
              Αποσύνδεση
            </button>
          </section>

        </div>

        <footer className="pt-10 text-center text-ink/45 dark:text-bone/35 text-[11px] font-sans font-medium tracking-[0.22em] uppercase space-y-1.5">
          <p>One World ByME</p>
          <p>Πεισιστράτου 15 · Περιστέρι</p>
          <p>
            <a href="tel:+302120212371" className="hover:text-ink/70 dark:hover:text-bone/60 transition-colors">212 021 2371</a>
          </p>
        </footer>
      </main>

      {cancelSheet && (() => {
        // Standby bookings never consumed a session, so late-cancel penalty doesn't apply.
        const lateCancel = cancelSheet.status !== 'standby' && isWithin5Hours(cancelSheet.booking_date, cancelSheet.booking_time)
        const month = ['Ιαν','Φεβ','Μάρ','Απρ','Μάι','Ιούν','Ιούλ','Αύγ','Σεπ','Οκτ','Νοέ','Δεκ'][+cancelSheet.booking_date.split('-')[1] - 1]
        const day   = cancelSheet.booking_date.split('-')[2]
        return (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/75 backdrop-blur-sm" onClick={() => setCancelSheet(null)}>
            <div className="bg-white dark:bg-coal border-t border-ink/[0.1] dark:border-bone/[0.1] rounded-t-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 bg-ink/15 dark:bg-bone/20 rounded-full mx-auto mt-3" />
              <div className="px-6 pt-5 pb-2">
                <p className="text-[11px] font-sans font-semibold text-bronze tracking-[0.22em] uppercase mb-1">Ακύρωση ραντεβού</p>
                <p className="text-ink dark:text-bone text-lg font-sans font-semibold mt-1">
                  {cancelSheet.service} · {day} {month} · {cancelSheet.booking_time}
                </p>
                {lateCancel ? (
                  <div className="mt-3 bg-ember/10 border border-ember/25 rounded-xl px-4 py-3">
                    <p className="text-ember text-sm font-sans font-semibold">Εντός 5 ωρών</p>
                    <p className="text-ink/70 dark:text-bone/70 text-sm font-sans mt-0.5">Η ακύρωση είναι αργοπορημένη — η συνεδρία δεν θα επιστραφεί.</p>
                  </div>
                ) : (
                  <p className="text-ink/65 dark:text-bone/65 text-sm font-sans mt-2">Είσαι σίγουρος; Η συνεδρία θα επιστραφεί.</p>
                )}
              </div>
              <div className="px-6 pb-8 pt-4 flex gap-3">
                <button
                  onClick={() => setCancelSheet(null)}
                  className="flex-1 border border-ink/[0.15] dark:border-bone/[0.15] text-ink/60 dark:text-bone/60 hover:text-ink dark:hover:text-bone font-sans font-semibold text-[13px] tracking-[0.18em] uppercase py-4 rounded-full transition-colors cursor-pointer min-h-[56px]"
                >
                  Πίσω
                </button>
                <button
                  onClick={() => doCancelBooking(cancelSheet)}
                  className="flex-1 bg-ember/90 hover:bg-ember text-white font-sans font-semibold text-[13px] tracking-[0.18em] uppercase py-4 rounded-full transition-colors cursor-pointer min-h-[56px]"
                >
                  Ακύρωση
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
    </div>
  )
}

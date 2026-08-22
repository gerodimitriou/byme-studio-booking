import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase.js'
import { BymeLogo } from '../lib/Logo.jsx'
import { formatDate, isWithin5Hours } from '../lib/subscriptions.js'

export default function Cancel() {
  const { id } = useParams()
  const [booking,  setBooking]  = useState(null)
  const [status,   setStatus]   = useState('loading')
  const [errMsg,   setErrMsg]   = useState('')

  useEffect(() => {
    async function load() {
      // Read only the display fields via RPC — no table access for anon.
      const { data, error } = await supabase.rpc('booking_public_summary', { p_booking_id: id })
      const row = Array.isArray(data) ? data[0] : data

      if (error || !row) {
        setStatus('error')
        setErrMsg('Δεν βρέθηκε το ραντεβού. Ο σύνδεσμος ακύρωσης μπορεί να μην είναι έγκυρος.')
        return
      }
      if (row.status === 'cancelled') {
        setStatus('already')
        setBooking(row)
        return
      }
      setBooking(row)
      setStatus('ready')
    }
    load()
  }, [id])

  async function handleCancel() {
    setStatus('confirm')
    // The server does the whole cancel: outcome + session refund + standby
    // promotion, keyed only by the (unguessable) booking id.
    const { data, error } = await supabase.rpc('cancel_booking_by_id', { p_booking_id: id })
    const row = Array.isArray(data) ? data[0] : data

    if (error || !row || (row.result !== 'ok' && row.result !== 'already')) {
      setStatus('error')
      setErrMsg('Κάτι πήγε στραβά. Επικοινώνησε μαζί μας.')
      return
    }
    setStatus(row.late ? 'done_late' : 'done')
  }

  return (
    <div className="min-h-screen bg-ink flex flex-col items-center justify-center px-5 py-16">
      <div className="flex justify-center mb-10">
        <Link to="/" aria-label="One World ByME Home">
          <BymeLogo size="md" className="text-bone" />
        </Link>
      </div>

      <div className="w-full max-w-md">
        {status === 'loading' && (
          <div className="text-bone/55 text-sm text-center py-16 font-sans tracking-wide">Φόρτωση…</div>
        )}

        {status === 'error' && (
          <div className="bg-ember/10 border border-ember/20 rounded-sm p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-ember/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-ember" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-bone font-serif italic text-2xl mb-3">Σφάλμα</h1>
            <p className="text-bone/60 text-sm leading-relaxed">{errMsg}</p>
          </div>
        )}

        {status === 'already' && (
          <div className="bg-coal border border-bone/[0.1] rounded-sm p-8 text-center">
            <p className="text-bronze text-[10px] font-sans tracking-[0.3em] uppercase mb-2">Κατάσταση</p>
            <h1 className="text-bone font-serif italic text-2xl mb-3">Ήδη ακυρωμένο</h1>
            <p className="text-bone/60 text-sm leading-relaxed mb-6">
              Αυτό το ραντεβού έχει ήδη ακυρωθεί.
            </p>
            <Link
              to="/"
              className="inline-block bg-bronze hover:bg-amber text-ink text-xs font-sans font-semibold tracking-[0.22em] uppercase px-6 py-3 rounded-full transition-colors"
            >
              Κλείσε νέο ραντεβού
            </Link>
          </div>
        )}

        {(status === 'ready' || status === 'confirm') && booking && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="bg-coal border border-bone/[0.1] rounded-sm overflow-hidden"
          >
            <div className="px-7 pt-7 pb-5 border-b border-bone/[0.1]">
              <p className="text-bronze text-[10px] font-sans tracking-[0.3em] uppercase mb-2">Ακύρωση Ραντεβού</p>
              <h1 className="text-bone text-2xl font-serif italic">Θέλεις σίγουρα να ακυρώσεις;</h1>
            </div>

            <div className="px-7 py-6 space-y-4">
              {[
                ['Όνομα',      booking.name],
                ['Υπηρεσία',   booking.service],
                ['Ημερομηνία', formatDate(booking.booking_date)],
                ['Ώρα',        booking.booking_time],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-bone/55 text-xs font-sans tracking-[0.2em] uppercase">{label}</span>
                  <span className="text-bone text-sm font-serif italic">{value}</span>
                </div>
              ))}
              {isWithin5Hours(booking.booking_date, booking.booking_time) && (
                <div className="mt-2 bg-ember/10 border border-ember/30 rounded-sm px-4 py-3">
                  <p className="text-ember text-xs font-sans leading-relaxed">
                    Προσοχή: Το ραντεβού είναι σε λιγότερο από 5 ώρες. Αν το ακυρώσεις, η συνεδρία σου δεν θα επιστραφεί.
                  </p>
                </div>
              )}
            </div>

            <div className="px-7 pb-7 flex flex-col gap-3">
              <button
                onClick={handleCancel}
                disabled={status === 'confirm'}
                className="w-full border border-ember/40 hover:bg-ember/10 disabled:opacity-50 text-ember font-sans font-semibold text-xs tracking-[0.22em] uppercase py-3.5 rounded-full transition-colors duration-200 cursor-pointer"
              >
                {status === 'confirm' ? 'Ακύρωση…' : 'Ναι, ακύρωσε το ραντεβού'}
              </button>
              <Link
                to="/"
                className="w-full text-center text-bone/55 hover:text-bone text-sm py-2 transition-colors duration-200 font-sans"
              >
                Όχι, κράτησέ το
              </Link>
            </div>
          </motion.div>
        )}

        {status === 'done' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="bg-coal border border-bone/[0.1] rounded-sm p-8 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-bronze/15 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-bronze" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-bone font-serif italic text-2xl mb-3">Το ραντεβού ακυρώθηκε</h1>
            <p className="text-bone/60 text-sm leading-relaxed mb-6">
              Αν αλλάξεις γνώμη, μπορείς να κλείσεις νέο ραντεβού οποιαδήποτε στιγμή.
            </p>
            <Link to="/" className="inline-block bg-bronze hover:bg-amber text-ink text-xs font-sans font-semibold tracking-[0.22em] uppercase px-6 py-3 rounded-full transition-colors">
              Κλείσε νέο ραντεβού
            </Link>
          </motion.div>
        )}

        {status === 'done_late' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="bg-coal border border-bone/[0.1] rounded-sm p-8 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-ember/15 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-ember" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-bone font-serif italic text-2xl mb-3">Το ραντεβού ακυρώθηκε</h1>
            <p className="text-bone/60 text-sm leading-relaxed mb-6">
              Επειδή η ακύρωση έγινε εντός 5 ωρών από το ραντεβού, η συνεδρία σου δεν επιστράφηκε.
            </p>
            <Link to="/" className="inline-block bg-bronze hover:bg-amber text-ink text-xs font-sans font-semibold tracking-[0.22em] uppercase px-6 py-3 rounded-full transition-colors">
              Κλείσε νέο ραντεβού
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  )
}

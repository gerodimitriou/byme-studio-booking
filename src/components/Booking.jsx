import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, useInView } from 'framer-motion'
import { SplitText } from '../lib/SplitText.jsx'
import { verifyMemberLogin } from '../lib/members.js'

const ME_KEY = 'me_auth'

const inputClass = `w-full bg-ink/40 border border-bone/[0.15] hover:border-bone/30 focus:border-bronze focus:ring-1 focus:ring-bronze text-bone placeholder:text-bone/30 rounded-sm px-4 py-3.5 text-base font-sans outline-none transition-colors duration-200 min-h-[48px]`
const labelClass = 'block text-[10px] font-sans font-medium text-bronze tracking-[0.25em] uppercase mb-2'

export default function Booking() {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-5% 0px' })
  const navigate = useNavigate()

  const [form,    setForm]    = useState({ email: '', code: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.email || !form.code) { setError('Συμπλήρωσε email και κωδικό.'); return }
    setLoading(true); setError('')
    const data = await verifyMemberLogin(form.email, form.code)
    if (data === 'locked') {
      setError('Πολλές αποτυχημένες προσπάθειες. Δοκίμασε ξανά σε 15 λεπτά.')
      setLoading(false)
    } else if (!data) {
      setError('Λάθος email ή κωδικός. Επικοινώνησε με το studio.')
      setLoading(false)
    } else {
      localStorage.setItem(ME_KEY, JSON.stringify(data))
      navigate('/me')
    }
  }

  return (
    <section
      id="booking"
      ref={ref}
      className="relative py-24 md:py-40 px-5 md:px-10 bg-ink text-bone overflow-hidden grain"
    >
      <div className="max-w-[1400px] mx-auto grid grid-cols-12 gap-y-12 md:gap-x-12">

        {/* Left */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="col-span-12 lg:col-span-5"
        >
          <div className="flex items-center gap-4 mb-8">
            <span className="text-bronze text-xs font-sans tracking-[0.35em] uppercase">05 / Booking</span>
            <span className="h-px w-16 bg-bronze/40" />
          </div>

          <h2 className="font-serif text-editorial text-bone leading-[1.04] font-light mb-8" style={{ fontStyle: 'oblique 8deg' }}>
            <SplitText text="Κλείσε" inView={inView} className="block" />
            <SplitText text="ραντεβού." inView={inView} delay={0.25} className="block text-bronze" />
          </h2>

          <p className="text-bone/65 text-base md:text-lg leading-relaxed font-light mb-10 max-w-md">
            Μόνο για εγγεγραμμένα μέλη. Χρησιμοποίησε τον κωδικό που έλαβες από το studio για να συνδεθείς και να κλείσεις την επόμενη συνεδρία σου.
          </p>

          <ul className="space-y-5 list-none p-0">
            {[
              { kicker: 'Address', value: 'Πεισιστράτου 15, Περιστέρι 121 37', href: null },
              { kicker: 'Phone',   value: '212 021 2371', href: 'tel:+302120212371' },
              { kicker: 'Email',   value: 'hello@oneworldbyme.gr', href: 'mailto:hello@oneworldbyme.gr' },
              { kicker: 'Hours',   value: 'Δευ–Παρ 08:00–12:00 & 17:00–22:00 · Σαβ 10:00–12:00', href: null },
            ].map(it => (
              <li key={it.kicker} className="flex items-start gap-5 border-t border-bone/[0.1] pt-5 first:border-t-0 first:pt-0">
                <span className="text-bronze text-[10px] font-sans tracking-[0.3em] uppercase shrink-0 mt-1 w-16">{it.kicker}</span>
                {it.href ? (
                  <a href={it.href} className="text-bone hover:text-bronze text-lg font-serif transition-colors" style={{ fontStyle: 'oblique 8deg' }}>{it.value}</a>
                ) : (
                  <span className="text-bone text-lg font-serif" style={{ fontStyle: 'oblique 8deg' }}>{it.value}</span>
                )}
              </li>
            ))}
          </ul>

          <motion.a
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.7, delay: 0.5 }}
            href="https://www.instagram.com/one_world_byme/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 group inline-flex items-center gap-4 border border-bone/[0.15] hover:border-bronze rounded-sm px-6 py-4 transition-colors duration-300"
          >
            <svg className="w-5 h-5 text-bronze" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
            <div>
              <p className="text-[10px] text-bone/55 tracking-[0.25em] uppercase font-sans">Follow</p>
              <p className="text-bone group-hover:text-bronze transition-colors text-lg font-serif" style={{ fontStyle: 'oblique 8deg' }}>@one_world_byme</p>
            </div>
            <svg className="w-4 h-4 text-bone/40 group-hover:text-bronze ml-auto transition-all group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </motion.a>
        </motion.div>

        {/* Right — login */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="col-span-12 lg:col-span-6 lg:col-start-7"
        >
          <div className="bg-coal/40 border border-bone/[0.1] rounded-sm p-6 md:p-10">
            <div className="flex items-baseline justify-between mb-6">
              <p className="text-bone/55 text-[10px] font-sans tracking-[0.3em] uppercase">Πρόσβαση Μελών</p>
              <p className="text-bronze text-[10px] font-sans tracking-[0.3em] uppercase">Members Only</p>
            </div>
            <p className="text-bone/70 text-base leading-relaxed mb-8 font-light">
              Συνδέσου με το email σου και τον κωδικό που έλαβες από το studio για να αποκτήσεις πρόσβαση στο member portal σου.
            </p>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelClass}>Email</label>
                <input
                  type="email" value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="email@example.com"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Κωδικός</label>
                <input
                  type="text" value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                  placeholder="Κωδικός πρόσβασης"
                  autoCorrect="off"
                  spellCheck="false"
                  className={inputClass}
                />
              </div>
              {error && (
                <p className="text-ember text-sm bg-ember/[0.08] border border-ember/30 rounded-sm px-4 py-3 font-sans">
                  {error}
                </p>
              )}
              <button
                type="submit" disabled={loading}
                className="w-full bg-bronze hover:bg-amber disabled:opacity-50 text-ink font-sans font-semibold text-xs tracking-[0.22em] uppercase py-4 rounded-full transition-colors duration-200 cursor-pointer min-h-[56px]"
              >
                {loading ? 'Σύνδεση…' : 'Σύνδεση & Κράτηση'}
              </button>
            </form>
          </div>
        </motion.div>

      </div>
    </section>
  )
}

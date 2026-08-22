import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BymeWordmark, BymeLogo } from '../lib/Logo.jsx'

const NAV_LINKS = [
  { href: '#story',    label: 'Studio',     no: '01' },
  { href: '#services', label: 'Υπηρεσίες',  no: '02' },
  { href: '#spaces',   label: 'Χώροι',      no: '03' },
  { href: '#reviews',  label: 'Κριτικές',   no: '04' },
  { href: '#booking',  label: 'Ραντεβού',   no: '05' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  function close() { setMenuOpen(false) }

  return (
    <>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        className={`fixed top-0 left-0 right-0 z-50 px-6 md:px-10 transition-all duration-500 ${
          scrolled || menuOpen
            ? 'bg-ink/92 backdrop-blur-xl border-b border-bone/[0.07] py-3'
            : 'bg-transparent py-5'
        }`}
      >
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <a href="#" aria-label="One World ByME Home" onClick={close} className="flex items-center gap-3 text-bone">
            <BymeLogo size="xs" className="text-bone shrink-0" />
            <BymeWordmark height={14} className="hidden sm:inline-flex text-bone" />
          </a>

          {/* Desktop nav — editorial numbered */}
          <ul className="hidden lg:flex items-center gap-9 list-none">
            {NAV_LINKS.map(l => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="group flex items-baseline gap-1.5 text-bone/65 hover:text-bone transition-colors duration-300"
                >
                  <span className="text-bronze/70 text-[10px] font-sans tracking-[0.2em] group-hover:text-bronze transition-colors">
                    {l.no}
                  </span>
                  <span className="font-serif text-[15px] italic tracking-wide">
                    {l.label}
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-4">
            <a
              href="/login"
              className="hidden md:inline-flex items-center gap-1.5 text-bone/65 hover:text-bone text-[11px] font-sans tracking-[0.25em] uppercase transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Είσοδος
            </a>
            <a
              href="#booking"
              className="hidden md:inline-flex items-center gap-2 bg-bronze hover:bg-amber text-ink text-xs font-sans font-semibold tracking-[0.18em] uppercase px-5 py-3 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-bronze focus:ring-offset-2 focus:ring-offset-ink"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-ink animate-pulse" />
              Κλείσε Θέση
            </a>

            {/* Mobile menu */}
            <button
              className="lg:hidden text-bone p-2 -mr-1 rounded-lg focus:outline-none"
              onClick={() => setMenuOpen(v => !v)}
              aria-label={menuOpen ? 'Κλείσιμο μενού' : 'Άνοιγμα μενού'}
              aria-expanded={menuOpen}
            >
              <svg width="22" height="16" viewBox="0 0 22 16" fill="none" aria-hidden="true">
                <motion.line
                  x1="0" y1="1" x2="22" y2="1"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  animate={menuOpen ? { rotate: 45, y: 7, x: 0 } : { rotate: 0, y: 0, x: 0 }}
                  style={{ originX: '11px', originY: '1px' }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                />
                <motion.line
                  x1="0" y1="8" x2="22" y2="8"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  animate={menuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                  style={{ originX: '11px', originY: '8px' }}
                  transition={{ duration: 0.2 }}
                />
                <motion.line
                  x1="0" y1="15" x2="22" y2="15"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
                  animate={menuOpen ? { rotate: -45, y: -7, x: 0 } : { rotate: 0, y: 0, x: 0 }}
                  style={{ originX: '11px', originY: '15px' }}
                  transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                />
              </svg>
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu — full-screen editorial */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-40 bg-ink lg:hidden flex flex-col"
          >
            <div className="flex-1 flex flex-col justify-center px-7 pt-20">
              {NAV_LINKS.map((l, i) => (
                <motion.a
                  key={l.href}
                  href={l.href}
                  onClick={close}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  className="group flex items-baseline gap-4 py-5 border-b border-bone/[0.08] last:border-0"
                >
                  <span className="text-bronze text-[11px] font-sans tracking-[0.25em]">{l.no}</span>
                  <span className="font-serif text-4xl text-bone group-hover:italic transition-all">{l.label}</span>
                </motion.a>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5, ease: 'easeOut' }}
              className="px-7 pb-10"
            >
              <a
                href="#booking"
                onClick={close}
                className="block w-full bg-bronze hover:bg-amber text-ink text-sm font-sans font-semibold tracking-[0.2em] uppercase text-center py-4 rounded-full transition-colors"
              >
                Κλείσε Ραντεβού
              </a>
              <a
                href="/login"
                onClick={close}
                className="block w-full mt-3 border border-bone/[0.15] hover:border-bronze/50 text-bone/70 hover:text-bone text-xs font-sans tracking-[0.22em] uppercase text-center py-3.5 rounded-full transition-colors"
              >
                Σύνδεση
              </a>
              <p className="text-ash text-xs text-center mt-5 font-sans tracking-[0.18em] uppercase">
                One World ByME · Boutique Studio
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

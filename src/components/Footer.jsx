import { Link } from 'react-router-dom'
import { BymeLogo, BymeWordmark } from '../lib/Logo.jsx'

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="relative bg-ink text-bone border-t border-bone/[0.08] overflow-hidden">

      {/* Huge bottom wordmark */}
      <div className="px-5 md:px-10 pt-20 md:pt-28 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-12 gap-y-10 md:gap-x-10">

          <div className="col-span-12 md:col-span-5 flex flex-col gap-6">
            <BymeLogo size="md" className="text-bone" />
            <p className="text-bone/55 text-sm leading-relaxed max-w-xs font-light">
              Boutique fitness studio στο Περιστέρι, Αθήνα. Pilates Reformer,
              personal training, group sessions.
            </p>

            <a
              href="https://www.instagram.com/oneworldbyme/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-bronze hover:text-amber text-xs font-sans tracking-[0.22em] uppercase transition-colors border-b border-bronze/40 hover:border-amber pb-1 w-fit"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
              @oneworldbyme
            </a>
          </div>

          <div className="col-span-6 md:col-span-3 md:col-start-7">
            <p className="text-bronze text-[10px] font-sans tracking-[0.3em] uppercase mb-5">Πλοήγηση</p>
            <ul className="flex flex-col gap-3 list-none p-0">
              <li><a href="#story"    className="text-bone/75 hover:text-bone text-sm font-serif italic transition-colors">Studio</a></li>
              <li><a href="#services" className="text-bone/75 hover:text-bone text-sm font-serif italic transition-colors">Υπηρεσίες</a></li>
              <li><a href="#spaces"   className="text-bone/75 hover:text-bone text-sm font-serif italic transition-colors">Χώροι</a></li>
              <li><a href="#reviews"  className="text-bone/75 hover:text-bone text-sm font-serif italic transition-colors">Κριτικές</a></li>
              <li><a href="#booking"  className="text-bone/75 hover:text-bone text-sm font-serif italic transition-colors">Ραντεβού</a></li>
            </ul>
          </div>

          <div className="col-span-6 md:col-span-3 md:col-start-10">
            <p className="text-bronze text-[10px] font-sans tracking-[0.3em] uppercase mb-5">Επικοινωνία</p>
            <ul className="flex flex-col gap-3 list-none p-0">
              <li><a href="tel:+302100000000" className="text-bone/75 hover:text-bone text-sm font-serif italic transition-colors">+30 210 000 0000</a></li>
              <li><a href="mailto:hello@oneworldbyme.gr" className="text-bone/75 hover:text-bone text-sm font-serif italic transition-colors break-all">hello@oneworldbyme.gr</a></li>
              <li><span className="text-bone/75 text-sm font-serif italic">Αθήνα, Ελλάδα</span></li>
            </ul>
          </div>
        </div>

        {/* HUGE wordmark */}
        <div className="mt-16 md:mt-24 mb-10 md:mb-12 overflow-hidden">
          <p
            className="font-serif font-light text-bone/95 leading-[0.88] tracking-[-0.04em] text-center"
            style={{ fontSize: 'clamp(3.5rem, 14vw, 14rem)' }}
          >
            <span className="italic">One World</span> <span className="text-bronze italic">By</span><span className="text-bronze mx-2 opacity-50">|</span><span className="text-bronze italic">mE</span>
          </p>
        </div>

        <div className="border-t border-bone/[0.08] pt-6 pb-10 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-bone/40 text-[11px] font-sans tracking-[0.18em] uppercase">
            © {year} One World ByME · Studio
          </p>
          <div className="flex items-center gap-5">
            <Link
              to="/privacy"
              className="text-bone/40 hover:text-bone/70 text-[11px] font-sans tracking-[0.18em] uppercase transition-colors"
            >
              Πολιτική Απορρήτου
            </Link>
            <span className="text-bone/20 text-[11px]">·</span>
            <p className="text-bone/40 text-[11px] font-sans tracking-[0.18em] uppercase">
              Αθήνα · Ελλάδα
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

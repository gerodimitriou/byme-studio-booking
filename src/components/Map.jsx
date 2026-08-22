import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { SplitText } from '../lib/SplitText.jsx'

export default function Map() {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-5% 0px' })

  return (
    <section
      id="map"
      ref={ref}
      className="relative py-20 md:py-32 px-5 md:px-10 bg-bone text-ink"
      aria-label="Τοποθεσία"
    >
      <div className="max-w-[1400px] mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="flex items-center gap-4 mb-8"
        >
          <span className="text-copper text-xs font-sans tracking-[0.35em] uppercase">06 / Find Us</span>
          <span className="h-px w-16 bg-copper/40" />
        </motion.div>

        <h2 className="font-serif text-editorial text-ink font-light leading-[1.04] mb-12 md:mb-16">
          <SplitText text="Έλα" inView={inView} className="block" />
          <SplitText text="να γνωριστούμε." inView={inView} delay={0.2} className="block italic text-copper" />
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.35, ease: 'easeOut' }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-7 items-start"
        >
          {/* Map embed */}
          <div className="lg:col-span-2 rounded-sm overflow-hidden border border-ink/[0.1] h-[340px] md:h-[460px] relative">
            <iframe
              title="One World ByME — Χάρτης"
              src="https://maps.google.com/maps?q=Pisistratou+15,+Peristeri+121+37&output=embed&hl=el"
              width="100%"
              height="100%"
              style={{ border: 0, filter: 'grayscale(40%) sepia(15%)' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="absolute top-4 left-4 bg-ink text-bone text-[10px] font-sans tracking-[0.3em] uppercase px-3 py-2 rounded-sm">
              Studio Location
            </div>
          </div>

          {/* Info card */}
          <div className="bg-ink text-bone rounded-sm p-6 md:p-8 flex flex-col gap-7">
            <div>
              <p className="text-bronze text-[10px] font-sans tracking-[0.3em] uppercase mb-3">Address</p>
              <p className="font-serif italic text-2xl leading-snug">
                One World<br/>
                ByME Studio
              </p>
              <p className="text-bone/70 text-sm mt-2">Πεισιστράτου 15, Περιστέρι 121 37</p>
            </div>

            <div className="h-px bg-bone/[0.1]" />

            <div>
              <p className="text-bronze text-[10px] font-sans tracking-[0.3em] uppercase mb-2">Phone</p>
              <a href="tel:+302120212371" className="text-bone hover:text-bronze text-base font-serif italic transition-colors">212 021 2371</a>
            </div>

            <div>
              <p className="text-bronze text-[10px] font-sans tracking-[0.3em] uppercase mb-2">Hours</p>
              <p className="text-bone/85 text-sm leading-relaxed">
                Δευ – Παρ &nbsp; 08:00–12:00 &amp; 17:00–22:00<br/>
                Σάββατο &nbsp; 10:00–12:00<br/>
                Κυριακή &nbsp; Κλειστά
              </p>
            </div>

            <a
              href="https://www.google.com/maps/dir/?api=1&destination=Pisistratou+15,+Peristeri+121+37"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto bg-bronze hover:bg-amber text-ink text-xs font-sans font-semibold tracking-[0.22em] uppercase px-5 py-4 rounded-full text-center transition-colors duration-200"
            >
              Οδηγίες →
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

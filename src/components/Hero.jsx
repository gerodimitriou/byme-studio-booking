import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { SplitText } from '../lib/SplitText.jsx'

export default function Hero() {
  const ref = useRef(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  // Parallax for background + foreground type
  const bgY      = useTransform(scrollYProgress, [0, 1], ['0%', '20%'])
  const bgScale  = useTransform(scrollYProgress, [0, 1], [1, 1.12])
  const titleY   = useTransform(scrollYProgress, [0, 1], ['0%', '-40%'])
  const opacity  = useTransform(scrollYProgress, [0, 0.85], [1, 0])

  return (
    <section
      ref={ref}
      className="relative min-h-[100svh] flex flex-col text-bone overflow-hidden grain"
      aria-label="One World ByME — Boutique fitness & pilates studio"
    >
      {/* Background image with parallax + slow zoom */}
      <motion.div
        className="absolute inset-0 z-0"
        style={{ y: bgY, scale: bgScale }}
        aria-hidden="true"
      >
        <img
          src="/images/pilates-hero.webp"
          alt=""
          className="w-full h-full object-cover object-center"
          loading="eager"
          decoding="async"
        />
        {/* Layered overlays for editorial mood */}
        <div className="absolute inset-0 bg-ink/55" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/60 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/40 via-transparent to-ink/30" />
      </motion.div>

      {/* Top corner labels — editorial chrome */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 hidden md:flex justify-between px-10 pt-28 text-bone/70 text-[11px] font-sans tracking-[0.3em] uppercase"
        style={{ opacity }}
      >
        <span>Est. 2025 · Athens, GR</span>
        <span className="text-right">
          Pilates Reformer<br />
          <span className="text-bronze">/ Personal Training</span>
          
        </span>
      </motion.div>

      {/* Main content */}
      <motion.div
        className="relative z-10 flex-1 flex flex-col justify-center items-center text-center px-5 pb-12"
        style={{ y: titleY, opacity }}
      >
        {/* Kicker */}
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="text-bronze text-xs font-sans font-medium uppercase tracking-[0.3em] mb-7 md:mb-9"
        >
          One World · By M.E.
        </motion.p>

        {/* Headline */}
        <h1 className="font-serif text-massive font-light text-bone leading-[0.92]">
          <div className="block">
            <SplitText
              text="Move."
              stagger={0.06}
              duration={0.8}
              delay={0.2}
              className="block italic text-bone/95"
            />
          </div>
          <div className="block mt-1 md:mt-2">
            <SplitText
              text="Breathe."
              stagger={0.06}
              duration={0.8}
              delay={0.4}
              className="block text-bronze"
            />
          </div>
          <div className="block mt-1 md:mt-2">
            <SplitText
              text="Become."
              stagger={0.06}
              duration={0.8}
              delay={0.6}
              className="block italic text-bone/95"
            />
          </div>
        </h1>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 1.0 }}
          className="w-20 h-px bg-bronze mt-10 md:mt-14 origin-center"
          aria-hidden="true"
        />

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.15, ease: [0.22, 1, 0.36, 1] }}
          className="text-bone/75 text-base md:text-lg font-light max-w-md leading-relaxed mt-7 font-serif italic"
        >
          Pilates Reformer, personal training, group sessions —
          boutique studio στο Περιστέρι με χώρο για λίγους.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row gap-3 sm:gap-5 items-center mt-10"
        >
          <a
            href="#booking"
            className="group relative w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-bronze hover:bg-amber text-ink font-sans font-semibold text-xs tracking-[0.22em] uppercase px-9 py-4 rounded-full transition-colors duration-300 glow-bronze focus:outline-none focus:ring-2 focus:ring-bronze focus:ring-offset-2 focus:ring-offset-ink"
          >
            Κλείσε Ραντεβού
            <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </a>
          <a
            href="#story"
            className="group text-bone/65 hover:text-bone font-sans text-xs tracking-[0.22em] uppercase transition-colors duration-300 flex items-center gap-2"
          >
            <span className="w-6 h-px bg-bone/40 group-hover:w-10 group-hover:bg-bone transition-all duration-500" />
            Δες το Studio
          </a>
        </motion.div>
      </motion.div>

      {/* Side meta — like film credits */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.5 }}
        className="absolute left-6 bottom-10 hidden lg:flex flex-col gap-2 text-bone/55 text-[10px] font-sans tracking-[0.35em] uppercase"
        style={{ opacity }}
      >
        <span className="rotate-180" style={{ writingMode: 'vertical-rl' }}>Scroll to explore</span>
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.5 }}
        className="absolute right-6 bottom-10 hidden lg:flex flex-col items-end gap-1 text-bone/55 text-[10px] font-sans tracking-[0.3em] uppercase"
        style={{ opacity }}
      >
        <span>N 38.00°</span>
        <span>E 23.72°</span>
      </motion.div>

      {/* Bottom scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1.8 }}
        aria-hidden="true"
        style={{ opacity }}
      >
        <span className="w-px h-12 bg-gradient-to-b from-transparent to-bone/60" />
        <span className="text-bone/50 text-[10px] tracking-[0.3em] uppercase">01 / 06</span>
      </motion.div>
    </section>
  )
}

import { useRef } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { SplitText } from '../lib/SplitText.jsx'

const STATS = [
  { value: 'Pilates',  label: 'Reformer Studio' },
  { value: 'Gym',      label: 'Strength Floor' },
  { value: '1:1',      label: 'Personal Training' },
  { value: 'Group',    label: 'Team Sessions' },
]

export default function Story() {
  const ref     = useRef(null)
  const imgRef  = useRef(null)
  const inView  = useInView(ref, { once: true, margin: '-12% 0px' })

  const { scrollYProgress } = useScroll({
    target: imgRef,
    offset: ['start end', 'end start'],
  })

  // Reveal: a curtain panel slides up off the image as the user scrolls in.
  const curtainY = useTransform(scrollYProgress, [0, 0.55], ['0%', '-100%'])
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.15, 1])

  return (
    <section
      id="story"
      ref={ref}
      className="relative py-24 md:py-40 px-5 md:px-10 bg-ink text-bone overflow-hidden"
    >
      {/* Section index */}
      <div className="max-w-[1400px] mx-auto grid grid-cols-12 gap-y-12 md:gap-x-12">

        {/* Left column — text */}
        <div className="col-span-12 lg:col-span-7 flex flex-col">
          {/* Index */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-4 mb-10"
          >
            <span className="text-bronze text-xs font-sans tracking-[0.35em] uppercase">01 / Το Studio</span>
            <span className="h-px w-16 bg-bronze/40" />
          </motion.div>

          {/* Heading */}
          <h2 className="font-serif text-editorial font-light text-bone leading-[1.04] mb-10 md:mb-14">
            <SplitText
              text="Ένας χώρος"
              inView={inView}
              delay={0.05}
              className="block italic"
            />
            <SplitText
              text="που σε χωράει"
              inView={inView}
              delay={0.25}
              className="block"
            />
            <SplitText
              text="ολόκληρο."
              inView={inView}
              delay={0.5}
              className="block text-bronze italic"
            />
          </h2>

          {/* Body */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.7, ease: 'easeOut' }}
            className="max-w-xl space-y-5 text-bone/70 text-base md:text-lg leading-relaxed font-light"
          >
            <p>
              Το <em className="font-serif text-bone">One World ByME</em> δεν είναι ακόμα ένα γυμναστήριο.
              Είναι ένα boutique studio που γεννήθηκε από μια απλή ιδέα:
              ένας χώρος να εξυπηρετεί <span className="text-bronze">όλο</span> το σώμα,
              όλη τη ζωή.
            </p>
            <p>
              Από το Reformer Pilates studio με τα premium μηχανήματα, μέχρι το πλήρως εξοπλισμένο
              gym floor και τα φροντισμένα αποδυτήρια — κάθε γωνιά
              έχει σχεδιαστεί για να σε κάνει να επιστρέφεις.
            </p>
            <p>
              Μέγιστα 4 άτομα ανά Pilates session — γιατί ο instructor σου πρέπει να ξέρει το όνομά σου.
            </p>
          </motion.div>

          {/* Stats grid */}
          <motion.dl
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={{
              hidden:  {},
              visible: { transition: { staggerChildren: 0.08, delayChildren: 0.9 } },
            }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-y-8 gap-x-6 mt-14 md:mt-20 pt-10 border-t border-bone/[0.08]"
          >
            {STATS.map(s => (
              <motion.div
                key={s.label}
                variants={{
                  hidden:  { opacity: 0, y: 16 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
                }}
              >
                <dt className="font-serif text-3xl md:text-4xl font-light text-bone leading-none tracking-wide">{s.value}</dt>
                <dd className="text-bone/55 text-[11px] font-sans tracking-[0.2em] uppercase mt-3">{s.label}</dd>
              </motion.div>
            ))}
          </motion.dl>
        </div>

        {/* Right column — vertical image with curtain reveal */}
        <div className="col-span-12 lg:col-span-5 lg:col-start-9 lg:-mt-8 relative">
          <div ref={imgRef} className="relative aspect-[4/3] sm:aspect-[3/4] overflow-hidden rounded-sm">
            <motion.img
              src="/images/pilates-reformer.webp"
              alt="One World ByME — Pilates Reformer Studio"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ scale: imgScale }}
              loading="lazy"
            />

            {/* Curtain panel that slides up to reveal */}
            <motion.div
              className="absolute inset-0 bg-ink"
              style={{ y: curtainY }}
            />

            {/* Edge labels overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-5 md:p-7 text-bone/85 text-[10px] font-sans tracking-[0.3em] uppercase">
              <span>The Pilates Room</span>
              <div className="flex justify-between items-end">
                <span>N° 01</span>
                <span>2024 →</span>
              </div>
            </div>
          </div>

          {/* Floating mini-quote */}
          <motion.blockquote
            initial={{ opacity: 0, x: -20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.9, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block absolute -left-12 -bottom-10 max-w-[200px] bg-bronze text-ink p-5 rounded-sm font-serif italic text-base leading-snug"
          >
            <span className="text-2xl leading-none">"</span>
            Νιώθεις άνετα από την πρώτη στιγμή.
          </motion.blockquote>
        </div>
      </div>
    </section>
  )
}

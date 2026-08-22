import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { SplitText } from '../lib/SplitText.jsx'

const SPACES = [
  {
    n:    '01',
    name: 'The Pilates Room',
    sub:  'Reformer Studio',
    image: '/images/space-pilates.webp',
    blurb: 'Premium Reformer μηχανήματα κάτω από warm LED φωτισμό και ξύλινο δάπεδο.',
  },
  {
    n:    '02',
    name: 'The Gym Floor',
    sub:  'Strength Lab',
    image: '/images/space-gym.webp',
    blurb: 'Πλήρως εξοπλισμένος χώρος δύναμης — dumbbells, benches, multi-stations.',
  },
  {
    n:    '03',
    name: 'The Energy Wall',
    sub:  'Eat Clean · Train Dirty',
    image: '/images/space-neon.webp',
    blurb: 'Το neon που σου θυμίζει γιατί ήρθες. Η αλήθεια είναι απλή — και φωτεινή.',
  },
  {
    n:    '04',
    name: 'The Locker Rooms',
    sub:  'Αποδυτήρια',
    image: '/images/space-lockers.webp',
    blurb: 'Καθαρά, φωτεινά, λειτουργικά. Από το πρώτο step έως τον LED καθρέφτη.',
  },
]

export default function Spaces() {
  const ref    = useRef(null)
  const inView = useInView(ref, { once: true, margin: '0px' })

  return (
    <section
      id="spaces"
      ref={ref}
      className="relative py-20 md:py-32 bg-ink text-bone overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 md:px-10 mb-10 md:mb-14">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="flex items-center gap-4 mb-5"
        >
          <span className="text-bronze text-xs font-sans tracking-[0.35em] uppercase">03 / Οι Χώροι</span>
          <span className="h-px w-12 bg-bronze/40" />
        </motion.div>

        <h2 className="font-serif text-4xl md:text-6xl text-bone font-light leading-[1.04]">
          <SplitText
            text="Ένα studio,"
            inView={inView}
            className="block italic text-bone/95"
          />
          <SplitText
            text="τέσσερις κόσμοι."
            inView={inView}
            delay={0.25}
            className="block text-bronze"
          />
        </h2>
      </div>

      {/* Cards — snap scroll on mobile, grid on desktop */}
      <div className="flex gap-4 md:gap-6 px-6 md:px-10 overflow-x-auto snap-x snap-mandatory no-scrollbar md:grid md:grid-cols-4 md:overflow-visible">
        {SPACES.map((s, i) => (
          <motion.article
            key={s.n}
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            className="group relative shrink-0 snap-center w-[78vw] sm:w-[55vw] md:w-auto aspect-[3/4] rounded-sm overflow-hidden bg-coal"
          >
            <img
              src={s.image}
              alt={s.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-105"
              loading={i < 2 ? 'eager' : 'lazy'}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/15 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-ink/20 to-transparent" />

            {/* Top label */}
            <div className="absolute top-5 left-5 right-5 flex justify-between text-bone/85 text-[10px] font-sans tracking-[0.3em] uppercase">
              <span>{s.sub}</span>
              <span>N° {s.n}</span>
            </div>

            {/* Bottom */}
            <div className="absolute bottom-5 md:bottom-7 left-5 md:left-7 right-5 md:right-7">
              <h3 className="font-serif text-2xl md:text-3xl text-bone leading-[1.05] italic mb-2">
                {s.name}
              </h3>
              <p className="text-bone/70 text-sm leading-relaxed font-light">
                {s.blurb}
              </p>
            </div>

            <span className="absolute inset-3 border border-bronze/0 group-hover:border-bronze/70 transition-colors duration-700 pointer-events-none" />
          </motion.article>
        ))}
      </div>

      {/* Mobile swipe hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="md:hidden text-bone/35 text-[10px] font-sans tracking-[0.3em] uppercase text-center mt-6"
      >
        Σύρε για περισσότερα →
      </motion.p>
    </section>
  )
}

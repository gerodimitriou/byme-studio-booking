import { useRef } from 'react'
import { motion, useInView, useScroll, useTransform } from 'framer-motion'
import { SplitText } from '../lib/SplitText.jsx'

const SERVICES = [
  {
    no:    '01',
    tag:   'Group · Reformer',
    title: 'Pilates Reformer',
    image: '/images/svc-pilates.webp',
    description:
      'Group sessions έως 4 ατόμων σε premium Reformer μηχανήματα. ' +
      'Δύναμη, ευελιξία και σωστή τεχνική — με instructor που βλέπει τι κάνεις.',
    points: ['Small group setting', 'Όλα τα επίπεδα', 'Certified instructors'],
  },
  {
    no:    '02',
    tag:   'One-to-One',
    title: 'Personal Training',
    image: '/images/svc-personal.webp',
    description:
      'Προπόνηση 1:1 στο πλήρως εξοπλισμένο gym floor. ' +
      'Δύναμη, αδυνάτισμα, αποκατάσταση — ανάλογα με τον στόχο σου.',
    points: ['Strength & conditioning', 'Body transformation', 'Mobility & recovery'],
  },
  {
    no:    '03',
    tag:   'Small Group',
    title: 'Group Training',
    image: '/images/svc-group.webp',
    description:
      'Functional, HIIT και strength sessions σε μικρές ομάδες. ' +
      'Η ενέργεια που δίνει η παρέα, η ποιότητα που δίνει το μικρό μέγεθος.',
    points: ['Small group sessions', 'Ενέργεια & ομάδα', 'Functional & HIIT'],
  },
]

function ServiceCard({ s, index }) {
  const ref     = useRef(null)
  const inView  = useInView(ref, { once: true, margin: '-15% 0px' })
  const imgRef  = useRef(null)

  const { scrollYProgress } = useScroll({
    target: imgRef,
    offset: ['start end', 'end start'],
  })

  // Image scale + clip-path mask reveal
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.18, 1])
  const clip     = useTransform(scrollYProgress, [0, 0.55], ['inset(0 0 100% 0)', 'inset(0 0 0% 0)'])

  const isReverse = index % 2 === 1

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      className="grid grid-cols-12 gap-y-8 md:gap-x-10 items-center py-16 md:py-24 border-t border-bone/[0.08] first:border-t-0"
    >
      {/* Image */}
      <div className={`col-span-12 lg:col-span-7 ${isReverse ? 'lg:col-start-6 lg:order-2' : ''}`}>
        <div ref={imgRef} className="relative aspect-[4/3] overflow-hidden rounded-sm bg-coal">
          <motion.div className="absolute inset-0" style={{ clipPath: clip }}>
            <motion.img
              src={s.image}
              alt={s.title}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ scale: imgScale }}
              loading="lazy"
            />
          </motion.div>

          {/* Edge label */}
          <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 md:p-6 text-bone/85 text-[10px] font-sans tracking-[0.3em] uppercase">
            <span>{s.tag}</span>
            <span className="self-end">N° {s.no}</span>
          </div>
        </div>
      </div>

      {/* Copy */}
      <div className={`col-span-12 lg:col-span-5 ${isReverse ? 'lg:col-start-1 lg:order-1' : 'lg:col-start-8'} `}>
        <div className="max-w-md">
          <p className="font-serif text-5xl md:text-7xl lg:text-8xl text-bronze/30 leading-none mb-4">{s.no}</p>

          <h3 className="font-serif text-4xl md:text-5xl text-ink font-light mb-5 leading-[1.05]">
            <SplitText text={s.title} inView={inView} stagger={0.06} duration={0.85} />
          </h3>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="text-smoke text-base leading-relaxed mb-7"
          >
            {s.description}
          </motion.p>

          <motion.ul
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={{
              hidden:  {},
              visible: { transition: { staggerChildren: 0.07, delayChildren: 0.5 } },
            }}
            className="list-none space-y-2 mb-9 pl-0"
          >
            {s.points.map(p => (
              <motion.li
                key={p}
                variants={{
                  hidden:  { opacity: 0, x: -10 },
                  visible: { opacity: 1, x: 0 },
                }}
                className="flex items-baseline gap-3 text-ink/65 text-sm"
              >
                <span className="text-bronze">—</span>
                <span>{p}</span>
              </motion.li>
            ))}
          </motion.ul>

          <motion.a
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.7 }}
            href="#booking"
            className="group inline-flex items-center gap-3 text-bronze hover:text-amber transition-colors duration-300 text-xs font-sans tracking-[0.22em] uppercase border-b border-bronze/40 hover:border-amber pb-1.5"
          >
            Δες περισσότερα
            <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </motion.a>
        </div>
      </div>
    </motion.article>
  )
}

export default function Services() {
  const headRef = useRef(null)
  const inView  = useInView(headRef, { once: true, margin: '-10% 0px' })

  return (
    <section
      id="services"
      className="relative py-20 md:py-32 px-5 md:px-10 bg-bone text-ink"
    >
      <div className="max-w-[1400px] mx-auto">

        {/* Header */}
        <div ref={headRef} className="grid grid-cols-12 gap-y-8 md:gap-x-10 mb-12 md:mb-20">
          <div className="col-span-12 lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7 }}
              className="flex items-center gap-4 mb-8"
            >
              <span className="text-copper text-xs font-sans tracking-[0.35em] uppercase">02 / Τι Προσφέρουμε</span>
              <span className="h-px w-16 bg-copper/40" />
            </motion.div>

            <h2 className="font-serif text-editorial font-light text-ink leading-[1.04]">
              <SplitText text="Τρία προγράμματα," inView={inView} className="block" />
              <SplitText text="ένα studio —" inView={inView} delay={0.2} className="block italic text-copper" />
              <SplitText text="διάλεξε αυτό που σου ταιριάζει." inView={inView} delay={0.4} className="block" />
            </h2>
          </div>

          <div className="col-span-12 lg:col-span-5 lg:col-start-8 flex items-end">
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-smoke text-base md:text-lg leading-relaxed max-w-md"
            >
              Επίλεξε ένα, συνδύασέ τα, ή ρώτησέ μας ποιο σου ταιριάζει. Και τα τρία υπάρχουν στον ίδιο χώρο.
            </motion.p>
          </div>
        </div>

        {/* Service rows */}
        <div className="border-t border-ink/[0.08]">
          {SERVICES.map((s, i) => (
            <ServiceCard key={s.title} s={s} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

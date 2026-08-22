import { useRef, useState } from 'react'
import { motion, useInView, AnimatePresence } from 'framer-motion'
import { SplitText } from '../lib/SplitText.jsx'

// Πραγματικές κριτικές από το Google profile (One World ByME, Περιστέρι).
const REVIEWS = [
  {
    name:   'Φώτης Καρναχωρίτης',
    rating: 5,
    date:   'Πριν από 4 μήνες',
    text:   'Ζεστός, καθαρός και φιλικός χώρος, στελεχωμένος από άρτια καταρτισμένους επαγγελματίες. Το προτείνω ανεπιφύλακτα σε όσους θέλουν να γυμναστούν με μέθοδο και συνέπεια, βελτιώνοντας ουσιαστικά την καθημερινότητά τους.',
  },
  {
    name:   'Ιωάννα Φλώτσιου',
    rating: 5,
    date:   'Πριν από 3 μήνες',
    text:   'Εξαιρετικό γυμναστήριο με ευχάριστη ατμόσφαιρα! Ο χώρος είναι καθαρός και έχει ό,τι χρειάζεται για καλή προπόνηση. Όλη η ομάδα είναι πρόθυμη να βοηθήσει. Νιώθεις άνετα από την πρώτη στιγμή και γενικά υπάρχει πολύ θετική ενέργεια. Το προτείνω σίγουρα!',
  },
  {
    name:   'Κατερίνα Σακελλαρίου',
    rating: 5,
    date:   'Πριν από 3 μήνες',
    text:   'Πηγαίνω σε αυτό το γυμναστήριο στο Περιστέρι εδώ και αρκετό καιρό για Pilates και personal training και πραγματικά είμαι απόλυτα ικανοποιημένη. Ο χώρος είναι σύγχρονος, πεντακάθαρος και πλήρως εξοπλισμένος.',
  },
  {
    name:   'Taxiarchis Ntagiantas',
    rating: 5,
    date:   'Πριν από 4 μήνες',
    text:   'Ένα από τα καλύτερα γυμναστήρια της περιοχής! Ο εξοπλισμός είναι ολοκαίνουργιος και πολύ καλά συντηρημένος, ενώ ο χώρος είναι πάντα πεντακάθαρος. Οι γυμναστές είναι εξαιρετικοί επαγγελματίες, πάντα πρόθυμοι να βοηθήσουν με τις ασκήσεις και να διορθώσουν την τεχνική σου. Το κλίμα είναι πολύ ευχάριστο και καθόλου πιεστικό.',
  },
  {
    name:   'Matina Chaloulakou',
    rating: 5,
    date:   'Πριν από 4 μήνες',
    text:   'Ένα σύγχρονο, πλήρως εξοπλισμένο και καθαρό γυμναστήριο στο Περιστέρι για Pilates και personal training. Οι γυμνάστριες είναι εξαιρετικές, με επαγγελματική προσέγγιση και σωστή καθοδήγηση.',
  },
  {
    name:   'Γεωργία Μόλλα',
    rating: 5,
    date:   'Πριν από 4 μήνες',
    text:   'Εξαιρετικός χώρος, καθαρός, καινούριος, σύγχρονος και άψογα προσεγμένος. Από την πρώτη στιγμή νιώθεις άνετα και σε επαγγελματικά χέρια. Το προσωπικό είναι πλήρως καταρτισμένο και δείχνει πραγματικό ενδιαφέρον. Ιδανικό τόσο για αρχάριους όσο και για πιο προχωρημένους. Το προτείνω ανεπιφύλακτα!',
  },
  {
    name:   'Μαρία Κύρογλου',
    rating: 5,
    date:   'Πριν από 4 μήνες',
    text:   'Εξαιρετικός χώρος με θετική ενέργεια από την πρώτη στιγμή! Το προσωπικό είναι άρτια καταρτισμένο, φιλικό και πραγματικά ενδιαφέρεται για τον καθένα ξεχωριστά. Οι προπονήσεις είναι σωστά δομημένες και προσαρμοσμένες στις ανάγκες του καθενός. Το συστήνω ανεπιφύλακτα σε όποιον θέλει να γυμνάζεται σωστά και με ασφάλεια ✨',
  },
  {
    name:   'John Rallios',
    rating: 5,
    date:   'Πριν από 4 μήνες',
    text:   'Σύγχρονο γυμναστήριο με καινούργιους, καθαρούς και προσεγμένους χώρους και πολύ καλό εξοπλισμό. Η Εύη εξαιρετική, με σωστή καθοδήγηση, θετική ενέργεια και προπονήσεις προσαρμοσμένες στον καθένα.',
  },
  {
    name:   'Spyridoula Louka',
    rating: 5,
    date:   'Πριν από 4 μήνες',
    text:   'Πολύ ποιοτικό γυμναστήριο με άριστη οργάνωση, επαγγελματισμό, ευγένεια και προσοχή στη λεπτομέρεια. Καθαρός χώρος, σύγχρονος εξοπλισμός και εξαιρετικοί γυμναστές που δίνουν πραγματική προσοχή μεμονωμένα στην ανάγκη του κάθε ασκούμενου. Από τα top στον χώρο — το συστήνω ανεπιφύλακτα.',
  },
  {
    name:   'Ντίνα Μπαλ',
    rating: 5,
    date:   'Πριν από 5 μήνες',
    text:   'Ένας πολύ όμορφος χώρος στο κέντρο του Περιστεριού!! Η Εύη είναι φοβερή!!! Είναι όλη την ώρα κοντά σου και δεν σε αφήνει στιγμή!! Με εμπειρία και αφοσίωση σ\' αυτό που κάνει!! Άψογη, την συνιστώ ανεπιφύλακτα!!',
  },
]

function Stars({ count = 5 }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} αστέρια`}>
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-3.5 h-3.5 text-bronze" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export default function Reviews() {
  const ref     = useRef(null)
  const inView  = useInView(ref, { once: true, margin: '-12% 0px' })
  const [active, setActive] = useState(0)

  function go(delta) {
    setActive(a => (a + delta + REVIEWS.length) % REVIEWS.length)
  }

  const r = REVIEWS[active]

  return (
    <section
      id="reviews"
      ref={ref}
      className="relative py-24 md:py-40 px-5 md:px-10 bg-coal text-bone overflow-hidden"
    >
      <div className="max-w-[1400px] mx-auto grid grid-cols-12 gap-y-12 md:gap-x-10">

        {/* Header */}
        <div className="col-span-12 lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="flex items-center gap-4 mb-8"
          >
            <span className="text-bronze text-xs font-sans tracking-[0.35em] uppercase">04 / Κριτικές</span>
            <span className="h-px w-16 bg-bronze/40" />
          </motion.div>

          <h2 className="font-serif text-editorial text-bone leading-[1.04] font-light mb-10">
            <SplitText text="Ό,τι λένε" inView={inView} className="block" />
            <SplitText text="οι άνθρωποί μας." inView={inView} delay={0.25} className="block italic text-bronze" />
          </h2>

          {/* Big rating panel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="flex items-end gap-5 mb-10"
          >
            <span className="font-serif text-7xl md:text-8xl text-bone leading-none">5.0</span>
            <div className="flex flex-col gap-2 pb-2">
              <Stars count={5} />
              <span className="text-bone/55 text-[10px] font-sans tracking-[0.25em] uppercase">Google Reviews</span>
            </div>
          </motion.div>

          <motion.a
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.7 }}
            href="https://www.google.com/maps/search/One+World+ByME+Pisistratou+15+Peristeri"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 text-bronze hover:text-amber transition-colors text-xs font-sans tracking-[0.22em] uppercase border-b border-bronze/40 hover:border-amber pb-1.5"
          >
            Όλες στο Google
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </motion.a>
        </div>

        {/* Big pull-quote carousel */}
        <div className="col-span-12 lg:col-span-6 lg:col-start-7 relative md:min-h-[460px]">
          <span
            className="absolute -top-6 -left-2 md:-left-6 text-bronze/15 font-serif leading-none select-none pointer-events-none"
            style={{ fontSize: 'clamp(120px, 22vw, 320px)' }}
            aria-hidden="true"
          >
            "
          </span>

          <div className="relative h-full flex flex-col justify-between pt-10 md:pt-16">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10"
              >
                <Stars count={r.rating} />
                <blockquote className="font-serif text-2xl md:text-3xl text-bone/95 leading-snug italic mt-6 max-w-xl">
                  {r.text}
                </blockquote>
                <footer className="mt-8 flex items-center gap-3">
                  <span className="w-10 h-px bg-bronze" />
                  <span className="font-serif text-bone text-lg">{r.name}</span>
                  <span className="text-bone/45 text-xs font-sans tracking-[0.2em] uppercase">{r.date}</span>
                </footer>
              </motion.div>
            </AnimatePresence>

            {/* Controls */}
            <div className="flex items-center gap-4 mt-10 md:mt-14 z-10">
              <button
                onClick={() => go(-1)}
                aria-label="Προηγούμενη κριτική"
                className="group w-12 h-12 rounded-full border border-bone/20 hover:border-bronze hover:bg-bronze flex items-center justify-center text-bone hover:text-ink transition-colors duration-300"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                onClick={() => go(1)}
                aria-label="Επόμενη κριτική"
                className="group w-12 h-12 rounded-full border border-bone/20 hover:border-bronze hover:bg-bronze flex items-center justify-center text-bone hover:text-ink transition-colors duration-300"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>

              <span className="text-bone/55 text-xs font-sans tracking-[0.25em] ml-3">
                {String(active + 1).padStart(2, '0')} / {String(REVIEWS.length).padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BymeLogo } from '../lib/Logo.jsx'

const SECTIONS = [
  {
    title: '1. Υπεύθυνος Επεξεργασίας',
    body: `Υπεύθυνος επεξεργασίας των προσωπικών σας δεδομένων είναι:

Εύη Καρναχωρίτη
One World By|mE — Boutique Fitness & Pilates Studio
Email: hello@oneworldbyme.gr
Διεύθυνση: Πεισιστράτου 15, Περιστέρι 121 37`,
  },
  {
    title: '2. Ποια Δεδομένα Συλλέγουμε',
    body: `Κατά τη χρήση της υπηρεσίας ηλεκτρονικής κράτησης, συλλέγουμε:

— Ονοματεπώνυμο
— Διεύθυνση ηλεκτρονικού ταχυδρομείου (email)
— Αριθμό τηλεφώνου
— Πληροφορίες κράτησης (ημερομηνία, ώρα, υπηρεσία)
— Ιστορικό συνεδριών και συνδρομών (για εγγεγραμμένα μέλη)`,
  },
  {
    title: '3. Σκοπός και Νομική Βάση Επεξεργασίας',
    body: `Τα δεδομένα σας χρησιμοποιούνται αποκλειστικά για:

— Διαχείριση και επιβεβαίωση κρατήσεων (εκτέλεση σύμβασης — άρθρο 6§1β GDPR)
— Αποστολή ενημερώσεων σχετικά με τη συνεδρία σας (έννομο συμφέρον — άρθρο 6§1στ GDPR)
— Διαχείριση συνδρομών και υπολοίπου συνεδριών (εκτέλεση σύμβασης)

Δεν χρησιμοποιούμε τα δεδομένα σας για marketing χωρίς τη ρητή συγκατάθεσή σας.`,
  },
  {
    title: '4. Αποθήκευση και Ασφάλεια',
    body: `Τα δεδομένα αποθηκεύονται σε servers της Supabase (supabase.com), εντός της Ευρωπαϊκής Ένωσης, με κρυπτογράφηση κατά τη μεταφορά και αποθήκευση.

Διατηρούμε τα δεδομένα σας για όσο διάστημα διατηρείτε ενεργό λογαριασμό. Σε περίπτωση διαγραφής, τα δεδομένα διαγράφονται εντός 30 ημερών.`,
  },
  {
    title: '5. Κοινοποίηση σε Τρίτους',
    body: `Δεν πωλούμε ούτε μοιραζόμαστε τα δεδομένα σας με τρίτους για εμπορικούς σκοπούς.

Χρησιμοποιούμε τις ακόλουθες υπηρεσίες για τη λειτουργία της εφαρμογής:

— Supabase (αποθήκευση δεδομένων) — supabase.com/privacy
— EmailJS (αποστολή email επιβεβαίωσης) — emailjs.com/legal/privacy-policy`,
  },
  {
    title: '6. Τα Δικαιώματά σας',
    body: `Βάσει του GDPR (Κανονισμός ΕΕ 2016/679), έχετε δικαίωμα:

— Πρόσβασης: να ζητήσετε αντίγραφο των δεδομένων σας
— Διόρθωσης: να ζητήσετε διόρθωση ανακριβών δεδομένων
— Διαγραφής ("δικαίωμα στη λήθη"): να ζητήσετε τη διαγραφή τους
— Περιορισμού: να περιορίσετε την επεξεργασία
— Φορητότητας: να λάβετε τα δεδομένα σας σε δομημένη μορφή
— Εναντίωσης: να αντιταχθείτε στην επεξεργασία

Για οποιοδήποτε αίτημα, επικοινωνήστε στο: hello@oneworldbyme.gr`,
  },
  {
    title: '7. Καταγγελία στην Αρχή',
    body: `Έχετε δικαίωμα να υποβάλετε καταγγελία στην Αρχή Προστασίας Δεδομένων Προσωπικού Χαρακτήρα (ΑΠΔΠΧ):

Ιφιγενείας 1-3, 115 23 Αθήνα
Τηλ: 210 6475600
www.dpa.gr`,
  },
  {
    title: '8. Cookies',
    body: `Η εφαρμογή χρησιμοποιεί αποκλειστικά localStorage και sessionStorage του browser για τη διατήρηση της σύνδεσής σας. Δεν χρησιμοποιούμε cookies παρακολούθησης ή analytics τρίτων.`,
  },
  {
    title: '9. Αλλαγές στην Πολιτική',
    body: `Ενδέχεται να ενημερώνουμε την παρούσα πολιτική περιοδικά. Κάθε αλλαγή θα αναρτάται στη σελίδα αυτή με ενημερωμένη ημερομηνία.

Τελευταία ενημέρωση: Μάιος 2026`,
  },
]

export default function Privacy() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen bg-ink text-bone">
      {/* Header */}
      <div className="border-b border-bone/[0.08] px-5 md:px-10 py-6 flex items-center justify-between">
        <Link to="/">
          <BymeLogo size="sm" className="text-bone" />
        </Link>
        <Link
          to="/"
          className="text-bone/50 hover:text-bone text-[11px] font-sans tracking-[0.22em] uppercase transition-colors flex items-center gap-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Επιστροφή
        </Link>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-5 md:px-10 py-16 md:py-24">
        <p className="text-bronze text-xs font-sans tracking-[0.3em] uppercase mb-6">Νομικά</p>
        <h1 className="font-serif text-4xl md:text-5xl font-light italic text-bone leading-tight mb-4">
          Πολιτική Απορρήτου
        </h1>
        <p className="text-bone/45 text-sm font-sans mb-14">
          One World By|mE · Ισχύει από Μάιο 2026
        </p>

        <div className="space-y-12">
          {SECTIONS.map(s => (
            <div key={s.title}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-bone/50 text-[11px] font-sans font-semibold tracking-[0.22em] uppercase">{s.title}</span>
                <span className="h-px flex-1 bg-bone/[0.08]" />
              </div>
              <p className="text-bone/70 text-sm md:text-base leading-relaxed whitespace-pre-line font-light">
                {s.body}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-bone/[0.08]">
          <p className="text-bone/35 text-xs font-sans tracking-[0.15em]">
            © {new Date().getFullYear()} One World ByME · Εύη Καρναχωρίτη · hello@oneworldbyme.gr
          </p>
        </div>
      </div>
    </div>
  )
}

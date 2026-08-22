// Single source of truth for the services offered. The capacity keys below
// must match these names exactly.
export const SERVICES = ['Pilates Reformer', 'Personal Training', 'Group Training']

export const SERVICE_CAPACITY = {
  'Personal Training': 2,
  'Pilates Reformer':  3,
  'Group Training':    5,
}

export const STANDBY_CAPACITY = 2

// Group Training runs a different workout type per day/time (see the weekly
// group schedule in admin settings). This is the canonical service name and
// the display metadata (label + colors) for each workout type.
export const GROUP_SERVICE = 'Group Training'

// Pilates runs on different hours per weekday (configured in admin settings as
// `pilates_schedule`). This is its canonical service name.
export const PILATES_SERVICE = 'Pilates Reformer'

export const GROUP_TYPES = ['full', 'lower', 'upper', 'hiit']

// Colors mirror the studio's printed schedule:
// FULL BODY = green · LOWER = orange · UPPER = yellow · HIIT = purple.
export const GROUP_TYPE_META = {
  full:  { label: 'Full Body', dot: 'bg-green-500',  chip: 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30' },
  lower: { label: 'Lower',     dot: 'bg-orange-500', chip: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30' },
  upper: { label: 'Upper',     dot: 'bg-yellow-400', chip: 'bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30' },
  hiit:  { label: 'HIIT',      dot: 'bg-purple-500', chip: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30' },
}

export function groupTypeLabel(type) {
  return GROUP_TYPE_META[type]?.label || ''
}

// Booking window: members can book today through the next 14 days
// (i.e. up to next week's Saturday). Used to cap the date picker.
export const BOOKING_WINDOW_DAYS = 14

// Google review link shown to members in the portal.
// Paste the studio's "write a review" URL here, e.g.
//   https://g.page/r/XXXXXXXX/review   (Google Business short link), or
//   https://search.google.com/local/writereview?placeid=YOUR_PLACE_ID
// Leave empty ('') to hide the review card entirely.
export const GOOGLE_REVIEW_URL = ''

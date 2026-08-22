/**
 * Continuous looping marquee strip — neon-orange accent that nods
 * to the "EAT CLEAN · TRAIN DIRTY" sign in the studio.
 */
const TOKENS = [
  'Eat Clean',
  'Train Dirty',
  'One World',
  'By M.E.',
  'Reformer Pilates',
  'Strength',
  'Mobility',
  'Boutique Studio',
]

function Star() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" className="text-ember shrink-0" aria-hidden="true" fill="currentColor">
      <path d="M12 0L13.5 10.5L24 12L13.5 13.5L12 24L10.5 13.5L0 12L10.5 10.5L12 0Z"/>
    </svg>
  )
}

export default function Marquee({ tone = 'bronze' }) {
  // Duplicate the row so the keyframe (-50%) yields a seamless loop.
  const row = TOKENS.concat(TOKENS)
  const isEmber = tone === 'ember'

  return (
    <section
      aria-hidden="true"
      className={`relative overflow-hidden py-7 md:py-8 border-y ${
        isEmber
          ? 'bg-ink border-ember/30'
          : 'bg-bone border-line'
      }`}
    >
      <div className={`flex animate-marquee whitespace-nowrap ${isEmber ? 'text-ember' : 'text-ink'}`}>
        {row.map((t, i) => (
          <span key={i} className="flex items-center mx-7 md:mx-10">
            <Star />
            <span
              className={`ml-7 md:ml-10 font-serif italic text-3xl md:text-5xl leading-none ${
                isEmber ? 'animate-flicker' : ''
              }`}
              style={ isEmber
                ? { textShadow: '0 0 12px rgba(255,122,26,0.55), 0 0 28px rgba(255,122,26,0.3)' }
                : {}
              }
            >
              {t}
            </span>
          </span>
        ))}
      </div>
    </section>
  )
}

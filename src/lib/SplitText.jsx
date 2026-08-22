import { motion } from 'framer-motion'

/**
 * Reveal text word-by-word OR letter-by-letter on mount/inView.
 * Pass `inView` to drive from a parent IntersectionObserver, or omit
 * to animate immediately on mount.
 */
export function SplitText({
  text,
  className   = '',
  as          = 'span',
  perChar     = false,
  delay       = 0,
  stagger     = 0.04,
  duration    = 0.85,
  inView      = true,
  yFrom       = '110%',
}) {
  const Tag = motion[as] || motion.span
  const tokens = perChar ? Array.from(text) : text.split(/(\s+)/)

  return (
    <Tag
      className={className}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{
        hidden:  {},
        visible: { transition: { staggerChildren: stagger, delayChildren: delay } },
      }}
      aria-label={text}
    >
      {tokens.map((tok, i) => {
        // Whitespace stays as-is, preserves spacing.
        if (/^\s+$/.test(tok)) return <span key={i} aria-hidden="true">{tok}</span>
        return (
          <span
            key={i}
            className="inline-block overflow-hidden align-baseline"
            aria-hidden="true"
          >
            <motion.span
              className="inline-block will-change-transform"
              variants={{
                hidden:  { y: yFrom, opacity: 0 },
                visible: {
                  y: 0,
                  opacity: 1,
                  transition: { duration, ease: [0.22, 1, 0.36, 1] },
                },
              }}
            >
              {tok}
            </motion.span>
          </span>
        )
      })}
    </Tag>
  )
}

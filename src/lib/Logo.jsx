const sizes = {
  xs: 32,
  sm: 44,
  md: 64,
  lg: 96,
  xl: 140,
  xxl: 200,
}

/**
 * One World ByME — circular monogram logo.
 * Faithful recreation of the on-site signage: thin ring, small "ONE WORLD"
 * ribbon at top, large serif "By | mE" centerpiece.
 */
export function BymeLogo({ className = '', size = 'md', variant = 'mono' }) {
  const h = sizes[size] || 64
  const ring  = variant === 'mono' ? 'currentColor' : variant === 'invert' ? '#0E0C0A' : 'currentColor'
  const fill  = variant === 'invert' ? 'transparent' : 'transparent'

  return (
    <div
      className={`inline-flex items-center justify-center leading-none ${className}`}
      style={{ width: h, height: h }}
      aria-label="One World ByME"
      role="img"
    >
      <svg
        viewBox="0 0 200 200"
        width={h}
        height={h}
        fill="none"
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Outer ring */}
        <circle cx="100" cy="100" r="97" stroke={ring} strokeWidth="1.4" fill={fill} />

        {/* ONE WORLD ribbon */}
        <g>
          <rect x="44" y="50" width="112" height="18" fill={ring} opacity="0.08" />
          <text
            x="100" y="63.5"
            textAnchor="middle"
            fontFamily="Inter, system-ui, sans-serif"
            fontSize="10.5"
            fontWeight="400"
            letterSpacing="3.5"
            fill={ring}
          >
            ONE WORLD
          </text>
        </g>

        {/* By | mE — serif monogram */}
        <g fontFamily="'Cormorant Garamond', Georgia, serif" fill={ring}>
          <text
            x="62" y="138"
            textAnchor="middle"
            fontSize="62"
            fontWeight="500"
            fontStyle="italic"
          >
            By
          </text>

          {/* Divider */}
          <line x1="100" y1="92" x2="100" y2="148" stroke={ring} strokeWidth="1.2" />

          <text
            x="138" y="138"
            textAnchor="middle"
            fontSize="62"
            fontWeight="500"
          >
            mE
          </text>
        </g>
      </svg>
    </div>
  )
}

/**
 * Horizontal wordmark — for compact navbar / footer uses.
 */
export function BymeWordmark({ className = '', height = 28 }) {
  return (
    <div
      className={`inline-flex items-baseline gap-2 leading-none ${className}`}
      aria-label="One World ByME"
    >
      <span
        className="font-sans uppercase tracking-[0.3em] opacity-80"
        style={{ fontSize: height * 0.32 }}
      >
        One World
      </span>
      <span
        className="font-serif italic"
        style={{ fontSize: height, letterSpacing: '-0.02em' }}
      >
        By
      </span>
      <span
        className="font-serif opacity-50"
        style={{ fontSize: height * 0.85 }}
      >
        |
      </span>
      <span
        className="font-serif"
        style={{ fontSize: height, letterSpacing: '-0.02em' }}
      >
        mE
      </span>
    </div>
  )
}

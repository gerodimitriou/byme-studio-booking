/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bone:    '#F5F1EA',
        cream:   '#FAF6EF',
        ivory:   '#FBF8F3',
        ink:     '#0E0C0A',
        coal:    '#1A1714',
        stone:   '#2A2520',
        bronze:  '#B08D57',
        copper:  '#967142',
        amber:   '#D9A86C',
        ember:   '#FF7A1A',
        ash:     '#8A8580',
        smoke:   '#6B6660',
        line:    '#D8D1C5',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:  ['"Inter"', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        editorial: ['clamp(2rem, 5vw, 5rem)',  { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        massive:   ['clamp(3rem, 10vw, 10rem)', { lineHeight: '0.92', letterSpacing: '-0.04em' }],
        kicker:    ['0.7rem', { letterSpacing: '0.3em' }],
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '8%, 10%':  { opacity: '0.4' },
          '20%':      { opacity: '0.85' },
        },
      },
      animation: {
        marquee: 'marquee 38s linear infinite',
        flicker: 'flicker 5s linear infinite',
      },
    },
  },
  plugins: [],
}

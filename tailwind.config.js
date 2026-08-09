/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: {
          DEFAULT: '#f6f1e5',
          dark: '#ede5d2',
          edge: '#e3d9c2'
        },
        ink: {
          DEFAULT: '#2c2a26',
          soft: '#57524a',
          faint: '#8a8378'
        },
        accent: {
          red: '#c0392b',
          blue: '#3b6ea5',
          green: '#3c7a4f',
          amber: '#b7791f',
          purple: '#7c5cbf',
          pink: '#c2547e'
        }
      },
      fontFamily: {
        sans: ['"Google Sans"', '"Product Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        hand: ['Caveat', '"Google Sans"', 'cursive']
      },
      boxShadow: {
        paper: '0 2px 6px rgba(44,42,38,0.14), 0 14px 30px rgba(44,42,38,0.16)',
        'paper-sm': '0 1px 3px rgba(44,42,38,0.2)',
        lift: '0 10px 40px -8px rgba(44,42,38,0.45)',
        ring: '0 0 0 3px rgba(192,57,43,0.25)'
      },
      keyframes: {
        'ink-fill': {
          from: { transform: 'scaleY(0.3)', opacity: '0.4' },
          to: { transform: 'scaleY(1)', opacity: '1' }
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        pop: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '70%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        wobble: {
          '0%,100%': { transform: 'rotate(-2deg)' },
          '50%': { transform: 'rotate(2deg)' }
        },
        wiggle: {
          '0%,100%': { transform: 'rotate(-4deg) translateX(0)' },
          '50%': { transform: 'rotate(4deg) translateX(2px)' }
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' }
        },
        dash: {
          to: { strokeDashoffset: '0' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        'ink-fill': 'ink-fill 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-up': 'fade-up 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        pop: 'pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        wobble: 'wobble 2.4s ease-in-out infinite',
        wiggle: 'wiggle 1.2s ease-in-out infinite',
        floaty: 'floaty 3s ease-in-out infinite',
        dash: 'dash 0.8s ease-out forwards'
      }
    }
  },
  plugins: []
};

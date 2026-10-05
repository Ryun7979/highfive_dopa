/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './*.{ts,tsx}', './components/**/*.{ts,tsx}', './utils/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Mochiy Pop One"', '"Noto Sans JP"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        pop: ['"Mochiy Pop One"', 'sans-serif'],
        rounded: ['"Zen Maru Gothic"', 'sans-serif'],
      },
      animation: {
        'bounce-short': 'bounce 0.5s infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        }
      },
      boxShadow: {
        'block': '0px 8px 0px 0px rgba(0,0,0,0.15)',
        'block-hover': '0px 4px 0px 0px rgba(0,0,0,0.15)',
        'hard': '4px 4px 0px 0px rgba(0,0,0,1)',
        'plastic': 'inset 0 2px 0 rgba(255,255,255,0.4), 0 4px 0 rgba(0,0,0,0.1)',
      },
      colors: {
        brand: {
          yellow: '#FFD600',
          blue: '#2962FF',
          red: '#FF1744',
          green: '#00E676',
        }
      }
    },
  },
};

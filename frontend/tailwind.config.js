/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        terminal: {
          bg: '#050505',
          border: '#333300',
          dim: '#8B8B00',
          yellow: '#FFFF00',
        }
      },
      fontFamily: {
        mono: ['"Fira Code"', '"VT323"', 'monospace'],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 1s ease-in-out',
      }
    },
  },
  plugins: [],
}

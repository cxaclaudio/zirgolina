/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-plus-jakarta)', 'system-ui', 'sans-serif'],
        body:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
        brush:   ['Caveat', 'cursive'],
      },
      colors: {
        brand: { 400: '#4ade80', 500: '#22c55e', 600: '#16a34a' },
        sand:  { 50: '#faf8f5', 100: '#f5f0e8', 200: '#ede4d3', border: '#ddd0b8' },
        dark:  { 800: '#16142a', 900: '#0e0c1f', 950: '#08061a', card: '#1a1830', border: 'rgba(255,255,255,0.08)' },
      },
    },
  },
  plugins: [],
};
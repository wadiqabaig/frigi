/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        red: { DEFAULT: '#E5332A', 600: '#C9261E', 50: '#FDECEA', 100: '#FBD5D2' },
        sun: { DEFAULT: '#FEB506', 50: '#FFF6DC', 100: '#FFEAB0', 700: '#8A5A00' },
        cream: { DEFAULT: '#F2E5D3', 50: '#FAF3EA', 200: '#E8D5BC' },
        brown: { DEFAULT: '#31170E', 70: '#5E4438', 50: '#7A635C', 20: '#D9CCC3' },
        paper: '#FFF9F2',
        peach: '#FFE7D9',
        leaf: { DEFAULT: '#2E7340', 50: '#E7F4E7' },
      },
      fontFamily: {
        display: ['Fredoka', 'Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
        sans: ['Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(49,23,14,.18), 0 2px 6px -2px rgba(49,23,14,.06)',
        float: '0 24px 50px -20px rgba(49,23,14,.28), 0 6px 14px -6px rgba(49,23,14,.10)',
        red: '0 12px 24px -10px rgba(229,51,42,.55)',
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.5rem' },
    },
  },
  plugins: [],
}

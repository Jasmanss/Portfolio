/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Case studies build the next project's hover colour at runtime.
  safelist: ['hover:text-lilac', 'hover:text-orange', 'hover:text-pink', 'hover:text-sky'],
  theme: {
    extend: {
      colors: {
        night: '#0D0E0C',
        cream: '#FFF7E0',
        muted: '#9E9C8C',
        line: '#2B2C28',
        green: '#2BF27A',
        pink: '#FFB3EC',
        orange: '#FF7A1A',
        lilac: '#A89BFF',
        sky: '#3CC8F0',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Archivo Variable"', 'system-ui', 'sans-serif'],
        mono: ['"Martian Mono Variable"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#ECECEC',
        ink: '#0B0B0B',
        red: '#FF4747',
        mute: '#8C8C8C',
        rule: '#D2D2D2',
      },
      fontFamily: {
        serif: ['Gloock', 'Georgia', 'serif'],
        sans: ['"Schibsted Grotesk Variable"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

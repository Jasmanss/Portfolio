/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Parchment and ink, for placards, letters and the guestbook.
        paper: '#F2E6CC',
        ink: '#24150E',
        red: '#8E1119',
        mute: '#7A6A55',
        rule: '#CDBB94',
        // The house.
        wall: '#6E0E14',
        'wall-deep': '#3D060A',
        gold: '#D4AF5A',
        'gold-light': '#F3DC8E',
        'gold-deep': '#8A6424',
        wood: '#2B1409',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond Variable"', 'Georgia', 'serif'],
        caps: ['Cinzel', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

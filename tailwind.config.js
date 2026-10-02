/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Black, white and one accent. The accent lives in a CSS variable so it can be swapped in one place.
      colors: {
        ink: '#0A0A0A',
        paper: '#F2F2F2',
        mute: '#7C7C7C',
        line: '#222222',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        // Older names still used by shared components.
        night: '#0A0A0A',
        snow: '#F2F2F2',
        ash: '#7C7C7C',
        ember: 'rgb(var(--accent) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Inter Tight Variable"', 'system-ui', 'sans-serif'],
        sans: ['"Inter Tight Variable"', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono Variable"', 'ui-monospace', 'monospace'],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}

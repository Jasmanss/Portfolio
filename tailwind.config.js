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
      screens: {
        // Side-by-side layouts (the opened panels): only on screens that are wide AND landscape, so tablets held
        // upright get the stacked phone layout instead of two cramped columns.
        split: { raw: '(min-width: 1024px) and (min-aspect-ratio: 1/1)' },
        // Big monitors (1800px and wider): type and spacing scale up so content doesn't float in empty space.
        huge: '1800px',
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

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0B0D0C',
        bone: '#E8E6DF',
        dim: '#6E726C',
        line: '#2A2D2B',
        flame: '#FF7A2B',
      },
      fontFamily: {
        mono: ['"JetBrains Mono Variable"', 'ui-monospace', 'monospace'],
        cond: ['Anton', 'Impact', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

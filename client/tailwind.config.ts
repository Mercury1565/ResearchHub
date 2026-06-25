import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        caveat:   ['"Caveat"', 'cursive'],
        indie:    ['"Indie Flower"', 'cursive'],
        patrick:  ['"Patrick Hand"', 'cursive'],
      },
      gridTemplateColumns: {
        workspace: '260px 1fr 380px',
      },
    },
  },
  plugins: [],
} satisfies Config;

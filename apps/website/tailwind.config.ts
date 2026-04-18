import type { Config } from 'tailwindcss';

/** Theme only: Tailwind v4 scans via `@source` in `src/globals.css`, not this `content` array. */
const config: Config = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        /** Montserrat — interaction copy, headings, UI body */
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
        /** Inter — metadata, labels, hints */
        secondary: ['Inter', 'system-ui', 'sans-serif'],
        /** Orbitron — wordmark and marketing-style titles */
        brand: ['Orbitron', 'system-ui', 'sans-serif'],
        /** Large landing/marketing display */
        display: ['Orbitron', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;

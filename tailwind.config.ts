import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#038cc9',
          dark: '#011a2e',
          accent: '#f0c040',
          success: '#22c98e',
          danger: '#e24b4a',
        },
        ocean: {
          50: '#e6f4fb',
          100: '#c0e2f4',
          200: '#7ec6ea',
          300: '#3baada',
          400: '#038cc9',
          500: '#0279ae',
          600: '#026191',
          700: '#01496e',
          800: '#01304a',
          900: '#011a2e',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
}

export default config

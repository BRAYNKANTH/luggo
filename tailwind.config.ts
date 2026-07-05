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
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'glow-brand': '0 0 15px rgba(3, 140, 201, 0.15)',
        'glow-accent': '0 0 15px rgba(240, 192, 64, 0.25)',
        'premium': '0 10px 30px -10px rgba(1, 26, 46, 0.08)',
        'premium-hover': '0 20px 40px -15px rgba(1, 26, 46, 0.12)',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(15px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        'shimmer': {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'pulse-glow': 'pulse-glow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
        'fade-in-up': 'fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pop-in': 'pop-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'shake': 'shake 0.3s ease-in-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
}

export default config

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B365D',
          container: '#1b365d',
        },
        on: {
          primary: '#ffffff',
          'primary-container': '#87a0cd',
          surface: '#1B1C1E',
          'surface-variant': '#44474E',
        },
        secondary: {
          DEFAULT: '#5c5f60',
          container: '#e1e3e4',
        },
        tertiary: {
          DEFAULT: '#4F2F00',
          container: '#4f2f00',
        },
        background: '#FAF9FC',
        surface: '#FAF9FC',
        'surface-container': {
          lowest: '#ffffff',
          low: '#f4f3f6',
          DEFAULT: '#EFEDF0',
          high: '#E9E7EB',
          highest: '#E3E2E5',
        },
        outline: {
          DEFAULT: '#74777F',
          variant: '#C4C6CF',
        },
        error: '#ba1a1a',
      },
      spacing: {
        'margin-page': '24px',
        lg: '24px',
        md: '16px',
        sm: '8px',
        xs: '4px',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

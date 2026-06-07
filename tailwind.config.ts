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
          secondary: '#ffffff',
          'secondary-container': '#626566',
          tertiary: '#ffffff',
          'tertiary-container': '#c6965e',
          error: '#ffffff',
          'error-container': '#93000a',
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
        'surface-dim': '#dad9dd',
        'surface-bright': '#faf9fd',
        'surface-variant': '#e3e2e6',
        'surface-tint': '#465f88',
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
        'error-container': '#ffdad6',
        'primary-fixed': '#d6e3ff',
        'primary-fixed-dim': '#aec7f7',
        'on-primary-fixed': '#001b3d',
        'on-primary-fixed-variant': '#2e476f',
        'secondary-fixed': '#e1e3e4',
        'secondary-fixed-dim': '#c5c7c8',
        'on-secondary-fixed': '#191c1d',
        'on-secondary-fixed-variant': '#454748',
        'tertiary-fixed': '#ffddb9',
        'tertiary-fixed-dim': '#f1bd81',
        'on-tertiary-fixed': '#2b1700',
        'on-tertiary-fixed-variant': '#623f0f',
        'inverse-primary': '#aec7f7',
        'inverse-surface': '#2f3033',
        'inverse-on-surface': '#f1f0f4',
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

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8B7355',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#e6e6d8',
          foreground: '#1a1a1a',
        },
        destructive: {
          DEFAULT: '#ef4444',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: '#f5f5f0',
          foreground: '#666666',
        },
        accent: {
          DEFAULT: '#f5f5f0',
          foreground: '#1a1a1a',
        },
        border: {
          DEFAULT: '#e6e6d8',
        },
        input: {
          DEFAULT: '#e6e6d8',
        },
        card: {
          DEFAULT: '#ffffff',
        },
        background: {
          DEFAULT: '#f5f5f0',
        },
        ring: {
          DEFAULT: '#8B7355',
        },
        foreground: {
          DEFAULT: '#1a1a1a',
          muted: '#666666',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} 
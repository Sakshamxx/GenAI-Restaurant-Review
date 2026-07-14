/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f0fa',
          100: '#e8dbf2',
          200: '#d1b8e6',
          300: '#b08bda',
          400: '#8c59c9',
          500: '#7620BF', // Primary Accent
          600: '#611a9e',
          700: '#4d147d',
          800: '#390f5c',
          900: '#26093d',
          950: '#140324',
        },
        accent: '#7620BF',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      animation: {
        'gradient-x': 'gradient-x 15s ease infinite',
        'gradient-y': 'gradient-y 15s ease infinite',
        'gradient-xy': 'gradient-xy 15s ease infinite',
        'silk': 'silk 25s ease-in-out infinite',
      },
      keyframes: {
        'gradient-y': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'center top'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'center bottom'
          }
        },
        'gradient-x': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        'gradient-xy': {
          '0%, 100%': {
            'background-size': '400% 400%',
            'background-position': 'left top'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right bottom'
          }
        },
        silk: {
          '0%, 100%': {
            transform: 'translate(0px, 0px) scale(1) rotate(0deg)',
          },
          '33%': {
            transform: 'translate(30px, -50px) scale(1.1) rotate(120deg)',
          },
          '66%': {
            transform: 'translate(-20px, 20px) scale(0.9) rotate(240deg)',
          },
        }
      },
    },
  },
  plugins: [],
}

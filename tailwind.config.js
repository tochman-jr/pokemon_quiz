/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        poke: {
          blue: '#3466AF',
          'dark-blue': '#21308E',
          navy: '#1D2C5E',
          yellow: '#FFC805',
          gold: '#C7A008',
        },
      },
      fontFamily: {
        bangers: ['Bangers', 'cursive'],
        nunito: ['Nunito', 'sans-serif'],
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-4deg)' },
          '50%': { transform: 'rotate(4deg)' },
        },
        'pop-in': {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '80%': { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        wiggle: 'wiggle 0.4s ease-in-out',
        'pop-in': 'pop-in 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
}

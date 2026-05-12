/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        green: {
          800: '#1B5E20',
          700: '#2E7D32',
          600: '#388E3C',
          500: '#43A047',
        },
        gold: {
          DEFAULT: '#FFD700',
          dark: '#C8962C',
        }
      }
    },
  },
  plugins: [],
}
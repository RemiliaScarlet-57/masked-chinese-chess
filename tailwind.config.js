/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/renderer/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'chess-red': '#c41e3a',
        'chess-black': '#1a1a1a',
        'chess-board': '#deb887',
        'chess-dark': '#8b7355',
      }
    },
  },
  plugins: [],
}

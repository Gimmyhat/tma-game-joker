/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        table: {
          DEFAULT: '#1a5a32',
          dark: '#0d3d1f',
          light: '#2a7a4a',
        },
        card: {
          back: '#1e3a5f',
          border: '#c9a227',
        },
      },
    },
  },
  plugins: [],
}

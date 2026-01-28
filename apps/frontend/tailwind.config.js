/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Casino Green Felt
        felt: {
          DEFAULT: '#1a5c32',
          light: '#238c4a',
          dark: '#0f3d23',
          darker: '#0a2918',
        },
        // Wood/Table Edge
        wood: {
          DEFAULT: '#3d2211',
          light: '#5a3518',
          dark: '#2a1608',
        },
        // Gold/Bronze Accents
        gold: {
          DEFAULT: '#c9a227',
          light: '#e6c34a',
          dark: '#a68418',
          muted: '#8b7019',
        },
        // Card Colors
        card: {
          back: '#8b0000',
          backLight: '#a52a2a',
          face: '#ffffff',
          border: '#c9a227',
          red: '#dc143c',
          black: '#1a1a1a',
        },
        // UI Surface Colors
        surface: {
          dark: 'rgba(0, 0, 0, 0.8)',
          medium: 'rgba(0, 0, 0, 0.6)',
          light: 'rgba(0, 0, 0, 0.4)',
          glass: 'rgba(255, 255, 255, 0.05)',
        },
        // Legacy compatibility
        table: {
          DEFAULT: '#1a5a32',
          dark: '#0d3d1f',
          light: '#2a7a4a',
        },
      },
      fontFamily: {
        sans: ['Roboto', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 12px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.5)',
        'card-active': '0 2px 8px rgba(0, 0, 0, 0.3)',
        'glow-gold': '0 0 20px rgba(201, 162, 39, 0.5)',
        'glow-green': '0 0 20px rgba(34, 197, 94, 0.4)',
        'glow-active': '0 0 30px rgba(250, 204, 21, 0.6)',
        'inner-dark': 'inset 0 0 100px rgba(0, 0, 0, 0.5)',
        table: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 0 80px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'felt-gradient':
          'radial-gradient(ellipse at center, #1a5c32 0%, #0f3d23 70%, #0a2918 100%)',
        vignette: 'radial-gradient(circle at center, transparent 0%, rgba(0, 0, 0, 0.6) 100%)',
        'gold-gradient': 'linear-gradient(135deg, #c9a227 0%, #e6c34a 50%, #c9a227 100%)',
        'modal-light': 'linear-gradient(180deg, #ffffff 0%, #f8f8f8 100%)',
      },
      borderRadius: {
        card: '0.5rem',
        modal: '1rem',
        avatar: '9999px',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        float: 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(250, 204, 21, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(250, 204, 21, 0.7)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/plugins/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#070B14',
          secondary: '#0D1322',
          tertiary: '#131B2E',
        },

        surface: {
          DEFAULT: 'rgba(17, 24, 39, 0.72)',
          elevated: 'rgba(20, 28, 48, 0.88)',
          glass: 'rgba(255,255,255,0.04)',
        },

        primary: {
          DEFAULT: '#4F7CFF',
          light: '#6EA0FF',
          dark: '#345DDB',
        },

        accent: {
          purple: '#8B5CF6',
          cyan: '#22D3EE',
          pink: '#EC4899',
        },

        text: {
          DEFAULT: '#F5F7FA',
          secondary: '#A7B0C0',
          muted: '#6B7280',
        },

        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          strong: 'rgba(255,255,255,0.14)',
        },

        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
      },

      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },

      borderRadius: {
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },

      boxShadow: {
        glow: '0 0 0 1px rgba(79,124,255,0.15), 0 10px 40px rgba(79,124,255,0.18)',
        soft: '0 8px 30px rgba(0,0,0,0.35)',
        neon: '0 0 20px rgba(79,124,255,0.45)',
      },

      backdropBlur: {
        xs: '2px',
      },

      backgroundImage: {
        'panel-gradient':
          'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',

        'sidebar-gradient':
          'linear-gradient(180deg, #0B1020 0%, #070B14 100%)',

        'primary-gradient':
          'linear-gradient(135deg, #4F7CFF 0%, #8B5CF6 100%)',
      },

      keyframes: {
        float: {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-4px)',
          },
        },

        pulseGlow: {
          '0%, 100%': {
            boxShadow: '0 0 20px rgba(79,124,255,0.25)',
          },
          '50%': {
            boxShadow: '0 0 30px rgba(79,124,255,0.55)',
          },
        },
      },

      animation: {
        float: 'float 4s ease-in-out infinite',
        glow: 'pulseGlow 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

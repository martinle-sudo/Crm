/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: [
          '"Space Grotesk"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        ink: {
          950: '#06070b',
          900: '#0a0c12',
          850: '#0f1219',
          800: '#141823',
          700: '#1c2130',
          600: '#262c3e',
          500: '#3a4257',
        },
        neon: {
          violet: '#a78bfa',
          cyan: '#67e8f9',
          mint: '#6ee7b7',
          coral: '#fda4af',
          amber: '#fcd34d',
        },
      },
      boxShadow: {
        'glow-violet': '0 0 32px -8px rgba(167, 139, 250, 0.45)',
        'glow-cyan': '0 0 32px -8px rgba(103, 232, 249, 0.45)',
        'glow-mint': '0 0 32px -8px rgba(110, 231, 183, 0.45)',
        'glow-coral': '0 0 32px -8px rgba(253, 164, 175, 0.5)',
        bento: '0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 48px -24px rgba(0,0,0,0.6)',
      },
      backgroundImage: {
        'grid-soft':
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '0.85' },
          '50%': { opacity: '1' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'fade-up': 'fade-up 360ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};

import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          input: 'var(--bg-input)',
        },
        border: {
          default: 'var(--border-default)',
          hover: 'var(--border-hover)',
          active: 'var(--border-active)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          ghost: 'var(--text-ghost)',
        },
        pink: {
          50: 'var(--pink-50)',
          100: 'var(--pink-100)',
          200: 'var(--pink-200)',
          400: 'var(--pink-400)',
          600: 'var(--pink-600)',
          900: 'var(--pink-900)',
        },
        correct: 'var(--correct)',
        'correct-bg': 'var(--correct-bg)',
        'correct-border': 'var(--correct-border)',
        wrong: 'var(--wrong)',
        'wrong-bg': 'var(--wrong-bg)',
        'wrong-border': 'var(--wrong-border)',
        streak: 'var(--streak)',
        'streak-bg': 'var(--streak-bg)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '14px',
        xl: '16px',
      },
    },
  },
  plugins: [],
} satisfies Config;

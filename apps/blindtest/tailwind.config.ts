import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          bg: 'var(--accent-bg)',
          border: 'var(--accent-border)',
        },
        combo: 'var(--combo)',
      },
      backgroundColor: {
        primary: 'var(--bg-primary)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        'accent-subtle': 'var(--bg-accent-subtle)',
        'correct-bg': 'var(--correct-bg)',
        'wrong-bg': 'var(--wrong-bg)',
        'streak-bg': 'var(--streak-bg)',
        correct: 'var(--correct)',
        wrong: 'var(--wrong)',
        streak: 'var(--streak)',
        'daily-from': 'var(--daily-gradient-from)',
        'daily-to': 'var(--daily-gradient-to)',
      },
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        tertiary: 'var(--text-tertiary)',
        ghost: 'var(--text-ghost)',
        correct: 'var(--correct)',
        'correct-text': 'var(--correct-text)',
        wrong: 'var(--wrong)',
        'wrong-text': 'var(--wrong-text)',
        streak: 'var(--streak)',
        daily: 'var(--daily-text)',
      },
      borderColor: {
        DEFAULT: 'var(--border)',
        default: 'var(--border)',
        subtle: 'var(--border-subtle)',
        correct: 'var(--correct)',
        wrong: 'var(--wrong)',
        daily: 'var(--daily-border)',
      },
      stroke: {
        accent: 'var(--accent)',
        border: 'var(--border)',
        elevated: 'var(--bg-elevated)',
        correct: 'var(--correct)',
        wrong: 'var(--wrong)',
      },
      fill: {
        accent: 'var(--accent)',
        primary: 'var(--text-primary)',
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

import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        surface: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
        },
        txt: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        accent: {
          pink: 'var(--accent-pink)',
          'pink-light': 'var(--accent-pink-light)',
          'pink-dark': 'var(--accent-pink-dark)',
          purple: 'var(--accent-purple)',
        },
        border: {
          light: 'var(--border-light)',
          medium: 'var(--border-medium)',
        },
        correct: {
          bg: 'var(--correct-bg)',
          text: 'var(--correct-text)',
          accent: 'var(--correct-accent)',
          border: 'var(--correct-border)',
        },
        wrong: {
          bg: 'var(--wrong-bg)',
          text: 'var(--wrong-text)',
          accent: 'var(--wrong-accent)',
          border: 'var(--wrong-border)',
        },
        timeout: {
          bg: 'var(--timeout-bg)',
          text: 'var(--timeout-text)',
          accent: 'var(--timeout-accent)',
        },
        info: {
          bg: 'var(--info-bg)',
          text: 'var(--info-text)',
        },
        difficulty: {
          'easy-bg': 'var(--easy-bg)',
          'easy-text': 'var(--easy-text)',
          'medium-bg': 'var(--medium-bg)',
          'medium-text': 'var(--medium-text)',
          'hard-bg': 'var(--hard-bg)',
          'hard-text': 'var(--hard-text)',
        },
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        full: '9999px',
      },
      keyframes: {
        fadeSlideIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0)' },
          '70%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        toastIn: {
          from: { opacity: '0', transform: 'translate(-50%, 16px)' },
          to: { opacity: '1', transform: 'translate(-50%, 0)' },
        },
        toastOut: {
          from: { opacity: '1', transform: 'translate(-50%, 0)' },
          to: { opacity: '0', transform: 'translate(-50%, 16px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        clueReveal: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'question-in': 'fadeSlideIn 250ms ease-out',
        'result-in': 'fadeSlideIn 300ms ease-out',
        'bounce-in': 'bounceIn 400ms ease-out',
        'toast-in': 'toastIn 200ms ease-out',
        'toast-out': 'toastOut 200ms ease-in',
        'fade-in': 'fadeIn 500ms ease-out',
        'clue-reveal': 'clueReveal 300ms ease-out',
      },
    },
  },
  plugins: [],
} satisfies Config;

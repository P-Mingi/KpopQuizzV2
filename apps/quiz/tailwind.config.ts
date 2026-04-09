import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-pretendard)', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Shared semantic tokens available to all utilities (bg-, text-, border-, stroke-, fill-).
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          bg: 'var(--accent-bg)',
          light: 'var(--accent-light)',
        },
        combo: 'var(--combo)',
        streak: 'var(--streak)',
        // Quiz type accents (dots on filter pills, etc).
        type: {
          classic: 'var(--type-classic)',
          image: 'var(--type-image)',
          intruder: 'var(--type-intruder)',
          tf: 'var(--type-tf)',
          clue: 'var(--type-clue)',
        },
      },
      backgroundColor: {
        primary: 'var(--bg-primary)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        'accent-subtle': 'var(--bg-accent-subtle)',
        'correct-bg': 'var(--correct-bg)',
        'wrong-bg': 'var(--wrong-bg)',
        correct: 'var(--correct)',
        wrong: 'var(--wrong)',
        // Type badge backgrounds
        'type-classic-bg': 'var(--type-classic-bg)',
        'type-image-bg': 'var(--type-image-bg)',
        'type-intruder-bg': 'var(--type-intruder-bg)',
        'type-tf-bg': 'var(--type-tf-bg)',
        'type-clue-bg': 'var(--type-clue-bg)',
        // Difficulty badges (kept for legacy quiz-card difficulty pills)
        'easy-bg': 'var(--easy-bg)',
        'medium-bg': 'var(--medium-bg)',
        'hard-bg': 'var(--hard-bg)',
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
        // Type badge text
        'type-classic-text': 'var(--type-classic-text)',
        'type-image-text': 'var(--type-image-text)',
        'type-intruder-text': 'var(--type-intruder-text)',
        'type-tf-text': 'var(--type-tf-text)',
        'type-clue-text': 'var(--type-clue-text)',
        // Difficulty text
        'easy-text': 'var(--easy-text)',
        'medium-text': 'var(--medium-text)',
        'hard-text': 'var(--hard-text)',
      },
      borderColor: {
        DEFAULT: 'var(--border)',
        default: 'var(--border)',
        subtle: 'var(--border-subtle)',
        correct: 'var(--correct-border)',
        wrong: 'var(--wrong-border)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '14px',
        xl: '16px',
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

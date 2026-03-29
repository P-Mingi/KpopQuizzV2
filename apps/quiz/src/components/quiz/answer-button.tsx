'use client';

type AnswerState = 'default' | 'correct' | 'wrong' | 'dimmed';

interface AnswerButtonProps {
  label: string;
  text: string;
  state: AnswerState;
  disabled: boolean;
  onClick: () => void;
}

const BUTTON_STYLES: Record<AnswerState, string> = {
  default: 'border-border-light bg-surface-primary hover:border-border-medium',
  correct: 'border-correct-border bg-correct-bg',
  wrong: 'border-wrong-border bg-wrong-bg',
  dimmed: 'opacity-40 border-border-light bg-surface-primary',
};

const CIRCLE_STYLES: Record<AnswerState, string> = {
  default: 'bg-surface-secondary text-txt-secondary',
  correct: 'bg-correct-accent text-white',
  wrong: 'bg-wrong-accent text-white',
  dimmed: 'bg-surface-secondary text-txt-secondary',
};

export function AnswerButton({ label, text, state, disabled, onClick }: AnswerButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left p-3.5 rounded-md border-[1.5px] flex items-center gap-3 transition-colors text-sm ${BUTTON_STYLES[state]} ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
    >
      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0 ${CIRCLE_STYLES[state]}`}>
        {label}
      </span>
      <span>{text}</span>
    </button>
  );
}

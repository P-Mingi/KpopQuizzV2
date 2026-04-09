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
  default: 'border-default bg-surface text-primary hover:border-accent',
  correct: 'border-correct bg-correct-bg text-correct-text scale-[1.02]',
  wrong: 'border-wrong bg-wrong-bg text-wrong-text animate-shake',
  dimmed: 'opacity-30 border-default bg-surface text-primary scale-[0.97]',
};

const CIRCLE_STYLES: Record<AnswerState, string> = {
  default: 'bg-elevated text-secondary',
  correct: 'bg-correct text-white',
  wrong: 'bg-wrong text-white',
  dimmed: 'bg-elevated text-tertiary',
};

export function AnswerButton({ label, text, state, disabled, onClick }: AnswerButtonProps): React.ReactElement {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left px-4 py-3.5 rounded-xl border-[1.5px] flex items-center gap-3 transition-[background-color,border-color,transform] text-[15px] font-medium ${BUTTON_STYLES[state]} ${disabled ? 'cursor-default' : 'cursor-pointer active:scale-[0.98]'}`}
    >
      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${CIRCLE_STYLES[state]}`}>
        {label}
      </span>
      <span className="flex-1">{text}</span>
    </button>
  );
}

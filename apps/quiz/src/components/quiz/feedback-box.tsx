'use client';

type FeedbackType = 'correct' | 'wrong' | 'timeout';

interface FeedbackBoxProps {
  type: FeedbackType;
  title: string;
  text: string;
}

const STYLES: Record<FeedbackType, string> = {
  correct: 'bg-correct-bg text-correct-text',
  wrong: 'bg-wrong-bg text-wrong-text',
  timeout: 'bg-timeout-bg text-timeout-text',
};

export function FeedbackBox({ type, title, text }: FeedbackBoxProps): React.ReactElement {
  return (
    <div className={`px-4 py-3 rounded-md text-sm ${STYLES[type]}`}>
      <span className="font-medium">{title}</span> {text}
    </div>
  );
}

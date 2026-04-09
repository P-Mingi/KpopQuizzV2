'use client';

import { AnswerButton } from '@/components/quiz/answer-button';

const LABELS = ['A', 'B', 'C', 'D'] as const;

interface Props {
  question: {
    question: string;
    image_url: string;
    options: string[];
  };
  correctIndex: number;
  selectedAnswer: number | null;
  isAnswered: boolean;
  onAnswer: (index: number) => void;
}

export function ImageQuestionView({ question, correctIndex, selectedAnswer, isAnswered, onAnswer }: Props): React.ReactElement {
  return (
    <>
      {/* Image */}
      <div className="w-full max-h-[300px] rounded-lg overflow-hidden mb-4 bg-surface flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={question.image_url}
          alt={question.question}
          className="w-full h-full object-contain max-h-[300px]"
          loading="eager"
        />
      </div>

      {/* Question */}
      <p className="text-base font-medium leading-relaxed mb-5 text-primary text-center">
        {question.question}
      </p>

      {/* Answers */}
      <div className="flex flex-col gap-2.5">
        {question.options.map((option, i) => {
          let buttonState: 'default' | 'correct' | 'wrong' | 'dimmed' = 'default';
          if (isAnswered) {
            if (i === correctIndex) buttonState = 'correct';
            else if (i === selectedAnswer) buttonState = 'wrong';
            else buttonState = 'dimmed';
          }
          return (
            <AnswerButton
              key={i}
              label={LABELS[i] ?? ''}
              text={option}
              state={buttonState}
              disabled={isAnswered}
              onClick={() => onAnswer(i)}
            />
          );
        })}
      </div>
    </>
  );
}

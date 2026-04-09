'use client';

interface IntruderOption {
  label: string;
  image_url: string;
}

interface Props {
  question: {
    question: string;
    options: IntruderOption[];
  };
  correctIndex: number;
  selectedAnswer: number | null;
  isAnswered: boolean;
  onAnswer: (index: number) => void;
}

export function IntruderQuestionView({ question, correctIndex, selectedAnswer, isAnswered, onAnswer }: Props): React.ReactElement {
  return (
    <>
      {/* Header */}
      <div className="text-center mb-4">
        <p className="text-xs font-medium text-tertiary uppercase tracking-wider mb-1">
          Find the intruder
        </p>
        <p className="text-base font-medium text-primary">
          {question.question}
        </p>
      </div>

      {/* 2x2 Grid */}
      <div className="grid grid-cols-2 gap-3">
        {question.options.map((option, i) => {
          let borderClass = 'border-2 border-transparent';
          let overlay: React.ReactNode = null;

          if (isAnswered) {
            if (i === correctIndex) {
              borderClass = 'border-2 border-correct';
              overlay = (
                <div className="absolute inset-0 bg-correct/20 flex items-center justify-center rounded-lg">
                  <span className="text-correct text-2xl font-bold">&#10003;</span>
                </div>
              );
            } else if (i === selectedAnswer && i !== correctIndex) {
              borderClass = 'border-2 border-wrong';
              overlay = (
                <div className="absolute inset-0 bg-wrong/20 flex items-center justify-center rounded-lg">
                  <span className="text-wrong text-2xl font-bold">&#10007;</span>
                </div>
              );
            } else {
              borderClass = 'border-2 border-transparent opacity-40';
            }
          }

          return (
            <button
              key={i}
              onClick={() => !isAnswered && onAnswer(i)}
              disabled={isAnswered}
              className={`relative aspect-square rounded-lg overflow-hidden ${borderClass} transition-all active:scale-[0.97]`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={option.image_url}
                alt={option.label}
                className="w-full h-full object-cover"
                loading="eager"
              />
              {overlay}
              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5">
                <p className="text-white text-xs font-medium text-center">
                  {option.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}

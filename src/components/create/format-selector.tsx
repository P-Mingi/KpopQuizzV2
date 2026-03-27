'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { QuizCreator } from '@/components/quiz/quiz-creator';
import { GameCreator } from '@/components/game/game-creator';

interface GroupOption {
  id: number;
  name: string;
  slug: string;
}

interface FormatSelectorProps {
  groups: GroupOption[];
}

export function CreateFormatSelector({ groups }: FormatSelectorProps): React.ReactElement {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const typeParam = searchParams.get('type');

  // If editing a quiz, go straight to QuizCreator
  if (editId) {
    return <QuizCreator groups={groups} />;
  }

  // If type param is set, go to the right creator
  const [format, setFormat] = useState<'quiz' | 'this_or_that' | null>(
    typeParam === 'this_or_that' ? 'this_or_that' : typeParam === 'quiz' ? 'quiz' : null
  );

  if (format === 'quiz') {
    return <QuizCreator groups={groups} />;
  }

  if (format === 'this_or_that') {
    return <GameCreator groups={groups} />;
  }

  // Format selection screen
  return (
    <div>
      <h1 className="text-lg font-medium text-txt-primary mb-1">What do you want to create?</h1>
      <p className="text-sm text-txt-secondary mb-5">Pick a format to get started.</p>

      <div className="flex flex-col gap-3">
        <button
          onClick={() => setFormat('quiz')}
          className="p-5 rounded-lg border border-border-light bg-surface-primary hover:border-border-medium transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent-pink-light flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 2C5.58 2 2 5.58 2 10s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm1 13H9v-2h2v2zm1.07-7.75l-.9.92C10.45 8.9 10 9.5 10 11H8v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H5c0-1.66 1.34-3 3-3s3 1.34 3 3c0 .66-.27 1.26-.7 1.7z" fill="var(--accent-pink)" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-txt-primary">Quiz</p>
              <p className="text-xs text-txt-secondary mt-0.5">Test knowledge with multiple choice, true/false, or guess from clues</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setFormat('this_or_that')}
          className="p-5 rounded-lg border border-border-light bg-surface-primary hover:border-border-medium transition-colors text-left cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EEEDFE] flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M6 4v12M14 4v12M2 10h16" stroke="#3C3489" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-txt-primary">This or That</p>
              <p className="text-xs text-txt-secondary mt-0.5">Pick favorites in matchups and see what % of fans agree</p>
            </div>
          </div>
          <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#EEEDFE] text-[#3C3489] mt-2">New</span>
        </button>
      </div>
    </div>
  );
}

'use client';

import { QuizCreator } from '@/components/quiz/quiz-creator';

interface GroupOption {
  id: number;
  name: string;
  slug: string;
}

interface FormatSelectorProps {
  groups: GroupOption[];
}

export function CreateFormatSelector({ groups }: FormatSelectorProps): React.ReactElement {
  return <QuizCreator groups={groups} />;
}

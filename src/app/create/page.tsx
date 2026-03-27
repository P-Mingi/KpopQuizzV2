import { Suspense } from 'react';

import { getAllGroups } from '@/lib/db/queries/groups';
import { QuizCreator } from '@/components/quiz/quiz-creator';
import { Spinner } from '@/components/ui/spinner';

export const metadata = {
  title: 'Create a Quiz | KpopQuizz',
  description: 'Create a K-pop quiz in under 3 minutes and challenge your fandom.',
};

export default async function CreatePage(): Promise<React.ReactElement> {
  const groups = await getAllGroups();

  const groupOptions = groups.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
  }));

  return (
    <div className="py-6">
      <Suspense fallback={<div className="flex justify-center py-12"><Spinner /></div>}>
        <QuizCreator groups={groupOptions} />
      </Suspense>
    </div>
  );
}

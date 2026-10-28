// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/new/page.tsx, rows 32: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import { getNewQuizzes } from '@/lib/db/queries/quizzes';
import { NEW_CAP, newWeekCut } from '@/lib/quiz/new-week';
import { InfiniteQuizList } from '@/components/home/infinite-quiz-list';
import { safeFetch } from '@/lib/error-handling';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og';

import type { Metadata } from 'next';

// ISR: refresh newest quiz list every 5 minutes.
export const revalidate = 300;

export const metadata: Metadata = {
  title: 'New anime Quizzes',
  description: 'The newest anime quizzes just published by fans, updated as they go live. Fresh trivia about your favorite series: be the first to play.',
  openGraph: {
    title: 'New anime Quizzes | OtakuQuiz',
    description: 'The newest anime quizzes just published by fans.',
    url: '/new',
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/new' },
};

export default async function NewPage(): Promise<React.ReactElement> {
  // every quiz of the last 7 days in the server HTML (at least 10, at most 120): lib/quiz/new-week.ts
  const initialQuizzes = newWeekCut(await safeFetch(
    getNewQuizzes(0, NEW_CAP),
    [],
    '[new] getNewQuizzes',
  ), Date.now());

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-primary mb-4">New quizzes</h1>
      {initialQuizzes.length > 0 ? (
        <InfiniteQuizList initialQuizzes={initialQuizzes} fetchUrl="/api/quizzes?tab=new" />
      ) : (
        <p className="text-sm text-secondary text-center py-8">No quizzes yet.</p>
      )}
    </div>
  );
}

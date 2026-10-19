// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/trending/page.tsx, rows 32c: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import { getTrendingQuizzes } from '@/lib/db/queries/quizzes';
import { InfiniteQuizList } from '@/components/home/infinite-quiz-list';
import { safeFetch } from '@/lib/error-handling';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og';

import type { Metadata } from 'next';

export const revalidate = 600;
export const metadata: Metadata = {
  title: 'Trending anime Quizzes',
  description: 'The most popular anime quizzes right now. Play trending quizzes about BTS, BLACKPINK, Stray Kids, and more - created by real fans.',
  openGraph: {
    title: 'Trending anime Quizzes | OtakuQuiz',
    description: 'The most popular anime quizzes right now.',
    url: '/trending',
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/trending' },
};

export default async function TrendingPage(): Promise<React.ReactElement> {
  const initialQuizzes = await safeFetch(
    getTrendingQuizzes(0, 10),
    [],
    '[trending] getTrendingQuizzes',
  );

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-primary mb-4">Trending quizzes</h1>
      {initialQuizzes.length > 0 ? (
        <InfiniteQuizList initialQuizzes={initialQuizzes} fetchUrl="/api/quizzes?tab=trending" />
      ) : (
        <p className="text-sm text-secondary text-center py-8">No quizzes yet.</p>
      )}
    </div>
  );
}

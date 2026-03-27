import { getTrendingQuizzes } from '@/lib/db/queries/quizzes';
import { InfiniteQuizList } from '@/components/home/infinite-quiz-list';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trending K-pop Quizzes',
  description: 'The most popular K-pop quizzes right now. Play trending quizzes about BTS, BLACKPINK, Stray Kids, and more - created by real fans.',
  openGraph: {
    title: 'Trending K-pop Quizzes | KpopQuizz',
    description: 'The most popular K-pop quizzes right now.',
    url: '/trending',
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/trending' },
};

export default async function TrendingPage(): Promise<React.ReactElement> {
  const initialQuizzes = await getTrendingQuizzes(0, 10);

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-txt-primary mb-4">Trending quizzes</h1>
      {initialQuizzes.length > 0 ? (
        <InfiniteQuizList initialQuizzes={initialQuizzes} fetchUrl="/api/quizzes?tab=trending" />
      ) : (
        <p className="text-sm text-txt-secondary text-center py-8">No quizzes yet.</p>
      )}
    </div>
  );
}

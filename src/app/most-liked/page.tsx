import { getMostLikedQuizzes } from '@/lib/db/queries/quizzes';
import { InfiniteQuizList } from '@/components/home/infinite-quiz-list';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Most Liked K-pop Quizzes',
  description: 'The most loved K-pop quizzes as voted by fans. Play fan-favorite quizzes about BTS, BLACKPINK, Stray Kids, and more.',
  openGraph: {
    title: 'Most Liked K-pop Quizzes | KpopQuizz',
    description: 'The most loved K-pop quizzes as voted by fans.',
    url: '/most-liked',
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/most-liked' },
};

export default async function MostLikedPage(): Promise<React.ReactElement> {
  const initialQuizzes = await getMostLikedQuizzes(0, 10);

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-txt-primary mb-4">Most liked quizzes</h1>
      {initialQuizzes.length > 0 ? (
        <InfiniteQuizList initialQuizzes={initialQuizzes} fetchUrl="/api/quizzes?tab=most_liked" />
      ) : (
        <p className="text-sm text-txt-secondary text-center py-8">No quizzes yet.</p>
      )}
    </div>
  );
}

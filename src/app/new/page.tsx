import { getNewQuizzes } from '@/lib/db/queries/quizzes';
import { InfiniteQuizList } from '@/components/home/infinite-quiz-list';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'New K-pop Quizzes',
  description: 'The newest K-pop quizzes just published by fans. Fresh trivia about your favorite groups - be the first to play.',
  openGraph: {
    title: 'New K-pop Quizzes | KpopQuiz',
    description: 'The newest K-pop quizzes just published by fans.',
    url: '/new',
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/new' },
};

export default async function NewPage(): Promise<React.ReactElement> {
  const initialQuizzes = await getNewQuizzes(0, 10);

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-txt-primary mb-4">New quizzes</h1>
      {initialQuizzes.length > 0 ? (
        <InfiniteQuizList initialQuizzes={initialQuizzes} fetchUrl="/api/quizzes?tab=new" />
      ) : (
        <p className="text-sm text-txt-secondary text-center py-8">No quizzes yet.</p>
      )}
    </div>
  );
}

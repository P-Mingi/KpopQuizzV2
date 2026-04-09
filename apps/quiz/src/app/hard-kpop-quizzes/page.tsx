import Link from 'next/link';

import { getQuizzesByDifficulty } from '@/lib/db/queries/quizzes';
import { InfiniteQuizList } from '@/components/home/infinite-quiz-list';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hardest K-pop Quizzes -- Only True Stans Can Pass',
  description: 'Think you know everything about K-pop? These are the hardest fan-made quizzes on the internet. Average score under 40%. BTS, BLACKPINK, Stray Kids, and more.',
  alternates: { canonical: '/hard-kpop-quizzes' },
  openGraph: {
    title: 'Hardest K-pop Quizzes | KpopQuiz',
    description: 'Only true stans survive these quizzes. Average pass rate under 30%.',
    url: 'https://kpopquiz.org/hard-kpop-quizzes',
  },
  twitter: { card: 'summary_large_image' },
};

export default async function HardQuizzesPage(): Promise<React.ReactElement> {
  const initialQuizzes = await getQuizzesByDifficulty('hard', 0, 10);

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-primary mb-1">Hardest K-pop quizzes</h1>
      <p className="text-sm text-secondary mb-5">
        Only real stans pass these. Average score is under 40%. Think you can beat the odds?
      </p>

      {initialQuizzes.length > 0 ? (
        <InfiniteQuizList initialQuizzes={initialQuizzes} fetchUrl="/api/quizzes?tab=hard" />
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-secondary mb-3">No hard quizzes yet.</p>
          <Link
            href="/create"
            className="inline-block px-5 py-2.5 rounded-full bg-accent text-white text-sm font-medium"
          >
            Create the first one
          </Link>
        </div>
      )}
    </div>
  );
}

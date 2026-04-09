import Link from 'next/link';

import { getQuizzesByDifficulty } from '@/lib/db/queries/quizzes';
import { InfiniteQuizList } from '@/components/home/infinite-quiz-list';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Easy K-pop Quizzes for Beginners',
  description: 'New to K-pop? Start with these easy fan-made quizzes. Perfect for beginners and casual fans who want to test their basic knowledge of BTS, BLACKPINK, Stray Kids, and more.',
  alternates: { canonical: '/easy-kpop-quizzes' },
  openGraph: {
    title: 'Easy K-pop Quizzes for Beginners | KpopQuiz',
    description: 'Start here -- easy K-pop quizzes perfect for new fans.',
    url: 'https://kpopquiz.org/easy-kpop-quizzes',
  },
  twitter: { card: 'summary_large_image' },
};

export default async function EasyQuizzesPage(): Promise<React.ReactElement> {
  const initialQuizzes = await getQuizzesByDifficulty('easy', 0, 10);

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-primary mb-1">Easy K-pop quizzes</h1>
      <p className="text-sm text-secondary mb-5">
        Perfect for new fans or a quick warm-up. These quizzes have an average pass rate above 70%.
      </p>

      {initialQuizzes.length > 0 ? (
        <InfiniteQuizList initialQuizzes={initialQuizzes} fetchUrl="/api/quizzes?tab=easy" />
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-secondary mb-3">No easy quizzes yet.</p>
          <Link
            href="/create"
            className="inline-block px-5 py-2.5 rounded-full bg-txt-primary text-white text-sm font-medium"
          >
            Create the first one
          </Link>
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';

import { getQuizzesByType } from '@/lib/db/queries/quizzes';
import { QuizCard } from '@/components/quiz/quiz-card';

import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Guess the K-pop Idol - Clue-Based Quizzes',
  description:
    'Can you identify K-pop idols and songs from 3 clues? Play fan-made guess-from-clues quizzes for BTS, BLACKPINK, Stray Kids, SEVENTEEN, and more. Fewer clues = more points.',
  alternates: { canonical: '/guess-the-kpop-idol' },
  openGraph: {
    title: 'Guess the K-pop Idol | KpopQuiz',
    description: 'How many clues do you need? Play guess-from-clues K-pop quizzes.',
    url: 'https://kpopquiz.org/guess-the-kpop-idol',
  },
  twitter: { card: 'summary_large_image' },
};

export default async function GuessTheKpopIdolPage(): Promise<React.ReactElement> {
  const quizzes = await getQuizzesByType('guess_from_clues', 0, 30);

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-primary">Guess the K-pop idol</h1>
      <p className="text-sm text-secondary mt-1 leading-relaxed">
        You get 3 clues. Guess with fewer clues for more points.
        How well do you really know your faves?
      </p>

      {quizzes.length > 0 ? (
        <div className="space-y-3 mt-5">
          {quizzes.map((q) => (
            <QuizCard key={q.id} quiz={q} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-secondary">No quizzes yet. Be the first to create one!</p>
          <Link
            href="/create"
            className="inline-block mt-4 px-6 py-3 rounded-full bg-accent text-white text-sm font-medium"
          >
            Create a quiz
          </Link>
        </div>
      )}
    </div>
  );
}

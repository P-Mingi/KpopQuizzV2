import Link from 'next/link';

import { getQuizzesByYear } from '@/lib/db/queries/quizzes';
import { QuizCard } from '@/components/quiz/quiz-card';

import type { Metadata } from 'next';

export const revalidate = 60;

const YEAR = 2026;

export const metadata: Metadata = {
  title: 'K-pop Quizzes 2026 - Latest Comebacks & Events',
  description:
    'The freshest K-pop quizzes of 2026. BTS ARIRANG, new debuts, comebacks, and everything happening in K-pop right now. Updated daily by fans.',
  alternates: { canonical: '/kpop-quiz-2026' },
  openGraph: {
    title: 'K-pop Quizzes 2026 | KpopQuiz',
    description: 'The freshest K-pop quizzes of 2026. Updated daily by fans.',
    url: 'https://kpopquiz.org/kpop-quiz-2026',
  },
  twitter: { card: 'summary_large_image' },
};

export default async function KpopQuiz2026Page(): Promise<React.ReactElement> {
  const quizzes = await getQuizzesByYear(YEAR, 0, 50);

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-primary">K-pop quizzes {YEAR}</h1>
      <p className="text-sm text-secondary mt-1 leading-relaxed">
        The latest quizzes covering this year&apos;s comebacks, debuts,
        and events. Updated daily as fans create new content.
      </p>

      {quizzes.length > 0 ? (
        <div className="space-y-3 mt-5">
          {quizzes.map((q) => (
            <QuizCard key={q.id} quiz={q} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-sm text-secondary">No quizzes yet for {YEAR}. Be the first to create one!</p>
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

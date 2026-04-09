import Link from 'next/link';

import { getQuizzesByType } from '@/lib/db/queries/quizzes';
import { QuizCard } from '@/components/quiz/quiz-card';

import type { Metadata } from 'next';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'K-pop True or False Quizzes',
  description:
    "How well do you really know K-pop facts? Play true or false quizzes about BTS, BLACKPINK, SEVENTEEN, Stray Kids, and 30+ groups. They look easy - they're not.",
  alternates: { canonical: '/kpop-true-or-false' },
  openGraph: {
    title: 'K-pop True or False | KpopQuiz',
    description: "They look easy. They're not. Test your K-pop knowledge.",
    url: 'https://kpopquiz.org/kpop-true-or-false',
  },
  twitter: { card: 'summary_large_image' },
};

export default async function KpopTrueOrFalsePage(): Promise<React.ReactElement> {
  const quizzes = await getQuizzesByType('true_false', 0, 30);

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-primary">K-pop true or false</h1>
      <p className="text-sm text-secondary mt-1 leading-relaxed">
        They look easy until you pick the wrong answer and question
        everything you thought you knew.
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
            className="inline-block mt-4 px-6 py-3 rounded-full bg-txt-primary text-white text-sm font-medium"
          >
            Create a quiz
          </Link>
        </div>
      )}
    </div>
  );
}

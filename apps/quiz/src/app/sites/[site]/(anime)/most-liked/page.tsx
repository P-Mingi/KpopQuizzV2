// Run O1 twin (rule 18) of apps/quiz/src/app/(site)/most-liked/page.tsx, rows 32b: copied by scripts/o1/twins-codemod.mjs; kpop modules imported, not copied.
import { getMostLikedQuizzes } from '@/lib/db/queries/quizzes';
import { InfiniteQuizList } from '@/components/home/infinite-quiz-list';
import { safeFetch } from '@/lib/error-handling';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og';

import type { Metadata } from 'next';

export const revalidate = 600;
export const metadata: Metadata = {
  title: 'Most Liked anime Quizzes',
  description: 'The most loved anime quizzes as voted by fans. Play fan-favorite quizzes about BTS, BLACKPINK, Stray Kids, and more.',
  openGraph: {
    title: 'Most Liked anime Quizzes | OtakuQuiz',
    description: 'The most loved anime quizzes as voted by fans.',
    url: '/most-liked',
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/most-liked' },
};

export default async function MostLikedPage(): Promise<React.ReactElement> {
  const initialQuizzes = await safeFetch(
    getMostLikedQuizzes(0, 10),
    [],
    '[most-liked] getMostLikedQuizzes',
  );

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-primary mb-4">Most liked quizzes</h1>
      {initialQuizzes.length > 0 ? (
        <InfiniteQuizList initialQuizzes={initialQuizzes} fetchUrl="/api/quizzes?tab=most_liked" />
      ) : (
        <p className="text-sm text-secondary text-center py-8">No quizzes yet.</p>
      )}
    </div>
  );
}

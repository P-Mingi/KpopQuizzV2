import { getTrendingQuizzes } from '@/lib/db/queries/quizzes';
import { getAllGroups } from '@/lib/db/queries/groups';
import { QuizFeed } from '@/components/home/quiz-feed';

import type { Metadata } from 'next';
import type { GroupOption } from '@/components/quiz/quiz-filters';

export const metadata: Metadata = {
  title: 'Browse K-pop Quizzes',
  description:
    'Browse every K-pop quiz on kpopquiz.org. Filter by group or quiz type, sort by trending, newest, or most played.',
  openGraph: {
    title: 'Browse K-pop Quizzes | KpopQuiz',
    description: 'Every K-pop quiz, filtered and sorted your way.',
    url: '/quizzes',
  },
  twitter: { card: 'summary_large_image' },
  alternates: { canonical: '/quizzes' },
};

export default async function BrowseQuizzesPage(): Promise<React.ReactElement> {
  const [initialQuizzes, groups] = await Promise.all([
    getTrendingQuizzes(0, 48),
    getAllGroups(),
  ]);

  const groupsForFilter: GroupOption[] = groups
    .filter((g) => g.quiz_count > 0)
    .slice(0, 40)
    .map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      quiz_count: g.quiz_count,
    }));

  return (
    <div className="pt-4 md:pt-6 pb-8">
      <div className="mb-4">
        <h1 className="text-[22px] font-bold text-primary">Browse quizzes</h1>
        <p className="text-xs text-ghost mt-0.5">
          Filter by group or type, sort however you like.
        </p>
      </div>

      <QuizFeed initialQuizzes={initialQuizzes} groups={groupsForFilter} hideBrowseAllLink />
    </div>
  );
}

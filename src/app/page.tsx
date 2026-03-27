import { getTrendingQuizzes, getQuizOfTheDay } from '@/lib/db/queries/quizzes';
import { getAllGroups } from '@/lib/db/queries/groups';
import { getTopCreatorsThisWeek } from '@/lib/db/queries/profiles';
import { QuizFeed } from '@/components/home/quiz-feed';
import { QuizOfTheDay } from '@/components/home/quiz-of-the-day';
import { CreatorLeaderboard } from '@/components/home/creator-leaderboard';
import { CreateCTA } from '@/components/home/create-cta';
import { SearchBar } from '@/components/home/search-bar';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KpopQuiz - K-pop Quizzes Made by Fans',
  description: 'Play and create K-pop quizzes about BTS, BLACKPINK, Stray Kids, aespa, NewJeans and 30+ groups. Made by real fans, played by thousands.',
  openGraph: {
    title: 'KpopQuiz - K-pop Quizzes Made by Fans',
    description: 'Play and create K-pop quizzes about BTS, BLACKPINK, Stray Kids, aespa, NewJeans and 30+ groups. Made by real fans, played by thousands.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KpopQuiz - K-pop Quizzes Made by Fans',
    description: 'Play and create K-pop quizzes about BTS, BLACKPINK, Stray Kids, aespa, NewJeans and 30+ groups.',
  },
  alternates: { canonical: '/' },
};

export default async function HomePage(): Promise<React.ReactElement> {
  const [initialQuizzes, qotd, groups, topCreators] = await Promise.all([
    getTrendingQuizzes(0, 15),
    getQuizOfTheDay(),
    getAllGroups(),
    getTopCreatorsThisWeek(5),
  ]);

  const groupsForGrid = groups.map((g) => ({
    id: g.id,
    name: g.name,
    slug: g.slug,
    display_color: g.display_color,
    text_color: g.text_color,
    quiz_count: g.quiz_count,
  }));

  return (
    <div>
      <h1 className="sr-only">K-pop quizzes made by fans</h1>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'KpopQuiz',
            url: 'https://kpopquiz.org',
            description: 'K-pop quizzes made by fans, played by thousands.',
            potentialAction: {
              '@type': 'SearchAction',
              target: {
                '@type': 'EntryPoint',
                urlTemplate: 'https://kpopquiz.org/search?q={search_term_string}',
              },
              'query-input': 'required name=search_term_string',
            },
          }),
        }}
      />

      {/* Hero */}
      <div className="text-center pt-8 pb-6">
        <p className="text-3xl font-medium">
          <span className="text-txt-primary">kpop</span>
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #ED93B1, #AFA9EC)' }}
          >
            quizz
          </span>
        </p>
        <p className="mt-1 text-sm text-txt-secondary">
          made by fans. played by millions.
        </p>
        <SearchBar />
      </div>

      {/* Quiz of the Day */}
      {qotd && <QuizOfTheDay quiz={qotd} />}

      {/* Feed with tabs */}
      <QuizFeed initialQuizzes={initialQuizzes} groups={groupsForGrid} />

      {/* Top creators */}
      <CreatorLeaderboard creators={topCreators} />

      {/* Create CTA */}
      <CreateCTA />
    </div>
  );
}

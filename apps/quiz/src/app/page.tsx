import { getTrendingQuizzes, getQuizOfTheDay } from '@/lib/db/queries/quizzes';
import { getAllGroups } from '@/lib/db/queries/groups';
import { getTopCreatorsThisWeek } from '@/lib/db/queries/profiles';
import { safeFetch } from '@/lib/error-handling';
import { QuizFeed } from '@/components/home/quiz-feed';
import { QuizOfTheDay } from '@/components/home/quiz-of-the-day';
import { CreatorLeaderboard } from '@/components/home/creator-leaderboard';
import { SocialProofBar } from '@/components/home/social-proof-bar';
import { TrendingCard } from '@/components/home/trending-card';
import { LightstickMascot } from '@/components/ui/lightstick-mascot';

import type { Metadata } from 'next';
import type { GroupOption } from '@/components/quiz/quiz-filters';

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
    safeFetch(getTrendingQuizzes(0, 24), [], '[home] getTrendingQuizzes'),
    safeFetch(getQuizOfTheDay(), null, '[home] getQuizOfTheDay'),
    safeFetch(getAllGroups(), [], '[home] getAllGroups'),
    safeFetch(getTopCreatorsThisWeek(5), [], '[home] getTopCreatorsThisWeek'),
  ]);

  const groupsForFilter: GroupOption[] = groups
    .filter((g) => g.quiz_count > 0)
    .slice(0, 30)
    .map((g) => ({
      id: g.id,
      name: g.name,
      slug: g.slug,
      quiz_count: g.quiz_count,
    }));

  // Top 10 trending feed the horizontal scroller.
  const trendingTop = initialQuizzes.slice(0, 10);

  return (
    <div className="pt-4 md:pt-6 pb-8">
      <h1 className="text-2xl md:text-3xl font-bold text-primary text-center mb-1">
        K-pop quizzes made by fans
      </h1>
      <p className="text-xs md:text-sm text-ghost text-center mb-4">
        Play trivia about BTS, BLACKPINK, Stray Kids and 30+ groups
      </p>

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

      {/* Social proof bar */}
      <SocialProofBar />

      {/* Trending this week (horizontal scroll) */}
      {trendingTop.length > 0 && (
        <section className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[13px] font-bold text-primary">Trending this week</h2>
            <a href="/trending" className="text-[11px] font-medium text-accent hover:underline">
              See all
            </a>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
            {trendingTop.map((q) => (
              <TrendingCard key={q.id} quiz={q} />
            ))}
          </div>
        </section>
      )}

      {/* Quiz of the day (retention card) */}
      {qotd && (
        <section className="mb-5">
          <QuizOfTheDay quiz={qotd} />
        </section>
      )}

      {/* Feed with group + type filters + sort tabs */}
      <QuizFeed initialQuizzes={initialQuizzes} groups={groupsForFilter} />

      {/* Top creators this week */}
      <CreatorLeaderboard creators={topCreators} />

      {/* Floating lightstick mascot (idle on home) */}
      <LightstickMascot mood="idle" />
    </div>
  );
}

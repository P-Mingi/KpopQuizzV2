import { Suspense } from 'react';
import dynamic from 'next/dynamic';

import { getAllQuizzes, getQuizOfTheDay } from '@/lib/db/queries/quizzes';
import { getAllGroups } from '@/lib/db/queries/groups';
import { getTopCreatorsThisWeek } from '@/lib/db/queries/profiles';
import { safeFetch } from '@/lib/error-handling';
import { QuizOfTheDay } from '@/components/home/quiz-of-the-day';
import { TrendingCard } from '@/components/home/trending-card';
import { CreatorLeaderboard } from '@/components/home/creator-leaderboard';
import { ByeolCTABanner } from '@/components/cards/byeol-cta-banner';
import { QuizOfTheDay as DailyQuizCard } from '@/components/quiz/quiz-of-the-day';
import { Spinner } from '@/components/ui/spinner';

import type { Metadata } from 'next';
import type { GroupOption } from '@/components/quiz/quiz-filters';

// Dynamic imports: defer heavy client components to reduce initial JS bundle
const QuizFeed = dynamic(
  () => import('@/components/home/quiz-feed').then((m) => ({ default: m.QuizFeed })),
  { ssr: true },
);
const SocialProofBar = dynamic(
  () => import('@/components/home/social-proof-bar').then((m) => ({ default: m.SocialProofBar })),
);
const LightstickMascot = dynamic(
  () => import('@/components/ui/lightstick-mascot').then((m) => ({ default: m.LightstickMascot })),
);

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

/* ---------- Async streaming sections ---------- */

async function TrendingSection(): Promise<React.ReactElement> {
  const initialQuizzes = await safeFetch(getAllQuizzes(0, 24), [], '[home] getAllQuizzes');
  const trendingTop = initialQuizzes.slice(0, 10);

  if (trendingTop.length === 0) return <></>;

  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[13px] font-bold text-primary">Trending this week</h2>
        <a href="/trending" className="text-[11px] font-medium text-accent hover:underline">
          See all
        </a>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {trendingTop.map((q, i) => (
          <TrendingCard key={q.id} quiz={q} priority={i < 3} />
        ))}
      </div>
    </section>
  );
}

async function QotdSection(): Promise<React.ReactElement> {
  const qotd = await safeFetch(getQuizOfTheDay(), null, '[home] getQuizOfTheDay');
  if (!qotd) return <></>;
  return (
    <section className="mb-5">
      <QuizOfTheDay quiz={qotd} />
    </section>
  );
}

async function FeedSection(): Promise<React.ReactElement> {
  const [initialQuizzes, groups] = await Promise.all([
    safeFetch(getAllQuizzes(0, 24), [], '[home] getAllQuizzes:feed'),
    safeFetch(getAllGroups(), [], '[home] getAllGroups'),
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

  return <QuizFeed initialQuizzes={initialQuizzes} groups={groupsForFilter} />;
}

async function CreatorsSection(): Promise<React.ReactElement> {
  const topCreators = await safeFetch(getTopCreatorsThisWeek(5), [], '[home] getTopCreatorsThisWeek');
  return <CreatorLeaderboard creators={topCreators} />;
}

/* ---------- Skeleton fallbacks ---------- */

function FeedSkeleton(): React.ReactElement {
  return (
    <div className="flex justify-center py-12">
      <Spinner />
    </div>
  );
}

function TrendingSkeleton(): React.ReactElement {
  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <div className="h-4 w-32 bg-subtle rounded animate-pulse" />
        <div className="h-3 w-12 bg-subtle rounded animate-pulse" />
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-[220px] h-[164px] flex-shrink-0 bg-subtle rounded-[14px] animate-pulse" />
        ))}
      </div>
    </section>
  );
}

/* ---------- Page ---------- */

export default function HomePage(): React.ReactElement {
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

      {/* Byeol CTA + Daily Quiz */}
      <div className="flex flex-col gap-2.5 mb-4">
        <ByeolCTABanner />
        <DailyQuizCard />
      </div>

      {/* Social proof bar - deferred, non-critical */}
      <SocialProofBar />

      {/* Trending this week - streams independently */}
      <Suspense fallback={<TrendingSkeleton />}>
        <TrendingSection />
      </Suspense>

      {/* Quiz of the day - streams independently */}
      <Suspense>
        <QotdSection />
      </Suspense>

      {/* Feed with filters - streams independently */}
      <Suspense fallback={<FeedSkeleton />}>
        <FeedSection />
      </Suspense>

      {/* Top creators - streams independently */}
      <Suspense>
        <CreatorsSection />
      </Suspense>

      {/* Floating lightstick mascot - deferred */}
      <LightstickMascot mood="idle" />
    </div>
  );
}

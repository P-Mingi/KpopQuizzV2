import { Suspense } from 'react';

import { getAllQuizzes, getQuizOfTheDay } from '@/lib/db/queries/quizzes';
import { getAllGroups } from '@/lib/db/queries/groups';
import { safeFetch } from '@/lib/error-handling';
import { HomeHero } from '@/components/home/home-hero';
import { HomeQotd } from '@/components/home/home-qotd';
import { HomeTrendingCard } from '@/components/home/home-trending-card';
import { HomeGroupRail } from '@/components/home/home-group-rail';
import { HomeFeed } from '@/components/home/home-feed';
import { CarouselWithArrows } from '@/components/home/carousel-with-arrows';
import { Spinner } from '@/components/ui/spinner';

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

/* ---------- Async streaming sections ---------- */

async function QotdSection(): Promise<React.ReactElement> {
  const qotd = await safeFetch(getQuizOfTheDay(), null, '[home] getQuizOfTheDay');
  if (!qotd) return <></>;
  return <HomeQotd quiz={qotd} />;
}

async function TrendingSection(): Promise<React.ReactElement> {
  const initialQuizzes = await safeFetch(getAllQuizzes(0, 24), [], '[home] getAllQuizzes');
  const trendingTop = initialQuizzes.slice(0, 10);
  if (trendingTop.length === 0) return <></>;

  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.01em', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" aria-hidden="true">
            <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>
          </svg>
          Trending this week
        </h2>
        <a href="/trending" style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em',
          color: 'var(--accent)', textDecoration: 'none',
        }}>
          See all {'\u2192'}
        </a>
      </div>
      <CarouselWithArrows>
        {trendingTop.map((q, i) => (
          <HomeTrendingCard key={q.id} quiz={q} rank={i + 1} priority={i < 3} />
        ))}
      </CarouselWithArrows>
    </section>
  );
}

async function GroupSection(): Promise<React.ReactElement> {
  const groups = await safeFetch(getAllGroups(), [], '[home] getAllGroups:groups');
  return <HomeGroupRail groups={groups} />;
}

async function FeedSection(): Promise<React.ReactElement> {
  const initialQuizzes = await safeFetch(getAllQuizzes(0, 24), [], '[home] getAllQuizzes:feed');
  return <HomeFeed quizzes={initialQuizzes} />;
}

/* ---------- Skeleton fallbacks ---------- */

function TrendingSkeleton(): React.ReactElement {
  return (
    <section style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ height: 16, width: 130, background: 'var(--bg-elevated)', borderRadius: 4, animation: 'skeletonShimmer 1.5s infinite' }} />
        <div style={{ height: 12, width: 50, background: 'var(--bg-elevated)', borderRadius: 4, animation: 'skeletonShimmer 1.5s infinite' }} />
      </div>
      <div className="scrollbar-hide" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ width: 200, height: 192, flexShrink: 0, background: 'var(--bg-elevated)', borderRadius: 14, animation: 'skeletonShimmer 1.5s infinite', animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    </section>
  );
}

function FeedSkeleton(): React.ReactElement {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
      <Spinner />
    </div>
  );
}

/* ---------- Page ---------- */

export default function HomePage(): React.ReactElement {
  return (
    <div>
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

      {/* 1. Hero */}
      <HomeHero />

      {/* 2. Quiz of the Day */}
      <Suspense>
        <QotdSection />
      </Suspense>

      {/* 3. Trending this week */}
      <Suspense fallback={<TrendingSkeleton />}>
        <TrendingSection />
      </Suspense>

      {/* 4. Browse by group */}
      <Suspense>
        <GroupSection />
      </Suspense>

      {/* 5. All quizzes feed with type filters */}
      <Suspense fallback={<FeedSkeleton />}>
        <FeedSection />
      </Suspense>
    </div>
  );
}

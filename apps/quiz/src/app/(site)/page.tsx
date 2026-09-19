import { Suspense } from 'react';
import Link from 'next/link';

import { getBrowseQuizzes, getNewQuizzes, getMostLikedQuizzes, getQuizOfTheDay } from '@/lib/db/queries/quizzes';
import { getAllGroups } from '@/lib/db/queries/groups';
import { safeFetch } from '@/lib/error-handling';
import { HomeHero } from '@/components/home/home-hero';
import { ActivityTicker } from '@/components/home/activity-ticker';
import { HomeStreakNudge } from '@/components/home/home-streak-nudge';
import { HomeQotd } from '@/components/home/home-qotd';
import { HomeBtotd } from '@/components/home/home-btotd';
import { QuizCardHover } from '@/components/quiz/quiz-card-hover';
import { buildTeaser } from '@/lib/quiz/teaser';
import { DiscordCommunityStrip } from '@/components/discord/discord-community';
import { HomeGroupPills } from '@/components/home/home-group-pills';
import { ScrollRow } from '@/components/ui/scroll-row';
import { VerseHomeStrip } from '@/components/verse/verse-home-strip';
import { QuizCard } from '@/components/ui/quiz-card';
import { WorldHomeRedirect } from '@/components/layout/world-home-redirect';

import type { Metadata } from 'next';

// ISR: revalidate hourly. The home page already server-renders its quiz/game
// content as crawlable HTML. force-dynamic was added when NEXT_PUBLIC_SUPABASE_URL
// wasn't available at build prerender; that env is now wired in Production so
// we let Next.js decide: if any descendant reads cookies/headers it auto-dynamic
// (SSR), otherwise this revalidate window kicks in and Supabase load drops.
export const revalidate = 3600;

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
  alternates: {
    canonical: '/',
    languages: {
      en: '/',
      'pt-BR': '/pt',
      'x-default': '/',
    },
  },
};

const SEE_ALL: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--brand)', textDecoration: 'none', whiteSpace: 'nowrap',
};
const HEAD: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14,
};

// Reserved-space skeletons for each streamed section. Heights are measured
// from the resolved content (mobile via PerformanceObserver, desktop via CSS
// grid rules) so the layout shifts neither up nor down when async data lands.
function SkelDaily(): React.ReactElement {
  return (
    <section className="home-section" aria-hidden="true">
      <div className="daily-twoup">
        <div className="home-skel home-skel-card" />
        <div className="home-skel home-skel-card" />
      </div>
    </section>
  );
}
function SkelTrending(): React.ReactElement {
  return (
    <section className="home-section" aria-hidden="true">
      <div className="home-skel home-skel-trending" />
    </section>
  );
}
function SkelGroups(): React.ReactElement {
  return (
    <section className="home-section" aria-hidden="true">
      <div className="home-skel home-skel-groups" />
    </section>
  );
}

/* ---------- Async streaming sections ---------- */

async function QotdSection(): Promise<React.ReactElement> {
  // Premium daily pair: Quiz of the day + Blindtest of the day. BToTD is a
  // client island (always present), so this section always renders.
  const qotd = await safeFetch(getQuizOfTheDay(), null, '[home] getQuizOfTheDay');
  return (
    <section className="home-section">
      <div className="daily-twoup">
        {qotd && <HomeQotd quiz={qotd} />}
        <HomeBtotd />
      </div>
    </section>
  );
}

async function TrendingSection(): Promise<React.ReactElement> {
  const quizzes = await safeFetch(
    getBrowseQuizzes({ sort: 'trending', offset: 0, limit: 6 }),
    [],
    '[home] trending',
  );
  if (quizzes.length === 0) return <></>;

  return (
    <section className="home-section home-section-tight">
      <div style={HEAD}>
        <p className="sec-label" style={{ marginBottom: 0 }}>Trending this week</p>
        <Link href="/quizzes/popular-this-week" style={SEE_ALL}>See all →</Link>
      </div>

      <ScrollRow scrollerClassName="trending-carousel">
        {quizzes.map((q, i) => {
          const teaser = buildTeaser(q);
          return (
            <div className="trending-item" key={q.id}>
              {teaser
                ? <QuizCardHover teaser={teaser}><QuizCard quiz={q} index={i} showScore={false} /></QuizCardHover>
                : <QuizCard quiz={q} index={i} showScore={false} />}
            </div>
          );
        })}
      </ScrollRow>
    </section>
  );
}

async function NewQuizzesSection(): Promise<React.ReactElement> {
  const quizzes = await safeFetch(
    getNewQuizzes(0, 6),
    [],
    '[home] new quizzes',
  );
  if (quizzes.length === 0) return <></>;

  return (
    <section className="home-section home-section-tight">
      <div style={HEAD}>
        <p className="sec-label" style={{ marginBottom: 0 }}>New quizzes</p>
        <Link href="/quizzes/new" style={SEE_ALL}>See all &#8594;</Link>
      </div>
      <ScrollRow scrollerClassName="trending-carousel">
        {quizzes.map((q, i) => {
          const teaser = buildTeaser(q);
          return (
            <div className="trending-item" key={q.id}>
              {teaser
                ? <QuizCardHover teaser={teaser}><QuizCard quiz={q} index={i} showScore={false} /></QuizCardHover>
                : <QuizCard quiz={q} index={i} showScore={false} />}
            </div>
          );
        })}
      </ScrollRow>
    </section>
  );
}

async function AllTimeBestSection(): Promise<React.ReactElement> {
  const quizzes = await safeFetch(
    getMostLikedQuizzes(0, 6),
    [],
    '[home] all-time best',
  );
  if (quizzes.length === 0) return <></>;

  return (
    <section className="home-section">
      <div style={HEAD}>
        <p className="sec-label" style={{ marginBottom: 0 }}>All-time best</p>
        <Link href="/quizzes/most-liked" style={SEE_ALL}>See all &#8594;</Link>
      </div>
      <ScrollRow scrollerClassName="trending-carousel">
        {quizzes.map((q, i) => {
          const teaser = buildTeaser(q);
          return (
            <div className="trending-item" key={q.id}>
              {teaser
                ? <QuizCardHover teaser={teaser}><QuizCard quiz={q} index={i} showScore={false} /></QuizCardHover>
                : <QuizCard quiz={q} index={i} showScore={false} />}
            </div>
          );
        })}
      </ScrollRow>
    </section>
  );
}

async function GroupSection(): Promise<React.ReactElement> {
  const groups = await safeFetch(getAllGroups(), [], '[home] getAllGroups');
  return <HomeGroupPills groups={groups} />;
}

/* ---------- Page ---------- */

export default function HomePage(): React.ReactElement {
  return (
    <div className="pt-1 pb-8">
      {/* W-NAV: returning Verse-preferrers may be opened at /verse (client-side,
          cookie-gated, crawler-safe - see WorldHomeRedirect). No-op for everyone
          else, so the games home stays the games home for crawlers + new visitors. */}
      <WorldHomeRedirect />
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

      {/* 0. Activity ticker (Option A; client island; home stays static/ISR;
          renders nothing when the feed is quiet) */}
      <ActivityTicker />

      {/* 1. Hero */}
      <HomeHero />

      {/* 1b. Streak surface (client island; home stays static/ISR) */}
      <HomeStreakNudge />

      {/* 2. The daily pair (quiz of the day + blindtest of the day) now takes the
          high content slot directly under the hero. The retired tier-list launch
          band and the game/battle-of-the-day rows freed this space; the energy
          re-routes to the two daily surfaces that remain (REFONTE P1). */}
      <Suspense fallback={<SkelDaily />}>
        <QotdSection />
      </Suspense>

      {/* 3. Trending this week */}
      <Suspense fallback={<SkelTrending />}>
        <TrendingSection />
      </Suspense>

      {/* 3b. New quizzes */}
      <Suspense fallback={<SkelTrending />}>
        <NewQuizzesSection />
      </Suspense>

      {/* 3c. All-time best */}
      <Suspense fallback={<SkelTrending />}>
        <AllTimeBestSection />
      </Suspense>

      {/* 4. Verse spaces (portal v1, Option A: additive body strip, no head change) */}
      <VerseHomeStrip />

      {/* 5. Browse by group - the group hubs take the freed mid-page slot the
          games teaser held (REFONTE P1 energy re-route to group hubs). */}
      <Suspense fallback={<SkelGroups />}>
        <GroupSection />
      </Suspense>

      {/* 6. Discord community strip (K4 - subtle, below the fold) */}
      <div className="home-section" style={{ marginTop: 8 }}>
        <DiscordCommunityStrip />
      </div>
    </div>
  );
}

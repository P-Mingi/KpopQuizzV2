import { Suspense } from 'react';
import Link from 'next/link';

import { getBrowseQuizzes, getQuizOfTheDay } from '@/lib/db/queries/quizzes';
import { getAllGroups } from '@/lib/db/queries/groups';
import { getGameOfTheDay } from '@/lib/db/queries/game-of-the-day';
import { safeFetch } from '@/lib/error-handling';
import { HomeHero } from '@/components/home/home-hero';
import { ActivityTicker } from '@/components/home/activity-ticker';
import { HomeStreakNudge } from '@/components/home/home-streak-nudge';
import { HomeQotd } from '@/components/home/home-qotd';
import { HomeBtotd } from '@/components/home/home-btotd';
import { GameOfTheDay } from '@/components/home/game-of-the-day';
import { QuizCardHover } from '@/components/quiz/quiz-card-hover';
import { buildTeaser } from '@/lib/quiz/teaser';
import { DiscordCommunityStrip } from '@/components/discord/discord-community';
import { HomeBattleCta } from '@/components/home/home-battle-cta';
import { HomeGamesTeaser } from '@/components/home/home-games-teaser';
import { HomeGroupPills } from '@/components/home/home-group-pills';
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
function SkelGotd(): React.ReactElement {
  return (
    <section className="home-section" aria-hidden="true">
      <div className="home-skel home-skel-card" />
    </section>
  );
}
// Battle has no .home-section wrapper in resolved output (it's a .home-cta-row).
function SkelBattle(): React.ReactElement {
  return (
    <div className="home-cta-row" aria-hidden="true">
      <div className="home-skel home-skel-battle" />
    </div>
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

async function GotdSection(): Promise<React.ReactElement> {
  // This-or-That / Name-all "of the day", relocated out of the premium slot
  // (now held by the blindtest). Still full home exposure. Renders nothing
  // when there is no game of the day.
  const gotd = await safeFetch(getGameOfTheDay(), null, '[home] getGameOfTheDay');
  if (!gotd) return <></>;
  return (
    <section className="home-section">
      <GameOfTheDay data={gotd} />
    </section>
  );
}

async function BattleOfDay(): Promise<React.ReactElement> {
  // Date-seeded featured quiz so the "Battle of the day" is stable per day.
  const quizzes = await safeFetch(
    getBrowseQuizzes({ sort: 'most_played', offset: 0, limit: 12 }),
    [],
    '[home] battle of the day',
  );
  if (quizzes.length === 0) return <HomeBattleCta />;
  const dayIdx = Math.floor(Date.now() / 86_400_000);
  const q = quizzes[dayIdx % quizzes.length]!;
  return <HomeBattleCta quizId={q.id} groupName={q.group_name} />;
}

async function TrendingSection(): Promise<React.ReactElement> {
  const quizzes = await safeFetch(
    getBrowseQuizzes({ sort: 'trending', offset: 0, limit: 6 }),
    [],
    '[home] trending',
  );
  if (quizzes.length === 0) return <></>;

  return (
    <section className="home-section">
      <div style={HEAD}>
        <p className="sec-label" style={{ marginBottom: 0 }}>Trending this week</p>
        <Link href="/quizzes/popular-this-week" style={SEE_ALL}>See all →</Link>
      </div>

      <div className="trending-carousel">
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
      </div>
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

      {/* Workstream P launch-week banner (one only; ongoing home presence comes
          from the GOTD rotation). */}
      <Link href="/games" className="pq-banner">
        <span className="pq-banner-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /><path d="m17 11 1.5 1.5L21 10" />
          </svg>
        </span>
        <span className="pq-banner-text"><strong>New: personality quizzes.</strong> Which member of your bias group are you? 10 questions, 1 result.</span>
        <span className="pq-banner-arrow" aria-hidden="true">&rarr;</span>
      </Link>

      {/* 1b. Streak surface (client island; home stays static/ISR) */}
      <HomeStreakNudge />

      {/* 2. Quiz of the day */}
      <Suspense fallback={<SkelDaily />}>
        <QotdSection />
      </Suspense>

      {/* 2b. Game of the day (this-or-that / name-all), relocated below the
          premium daily pair now that the blindtest holds the twoup slot. */}
      <Suspense fallback={<SkelGotd />}>
        <GotdSection />
      </Suspense>

      {/* 2c. Battle of the day - date-seeded quiz-anchored 1v1 battle */}
      <Suspense fallback={<SkelBattle />}>
        <BattleOfDay />
      </Suspense>

      {/* 3. Trending this week */}
      <Suspense fallback={<SkelTrending />}>
        <TrendingSection />
      </Suspense>

      {/* 4. Play games */}
      <HomeGamesTeaser />

      {/* 4b. Verse spaces (portal v1, Option A: additive body strip, no head change) */}
      <VerseHomeStrip />

      {/* 5. Browse by group */}
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

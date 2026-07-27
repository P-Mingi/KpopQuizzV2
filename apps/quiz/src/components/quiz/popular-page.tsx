import Link from 'next/link';

import { QuizCard } from '@/components/ui/quiz-card';
import { QuizCardHover } from '@/components/quiz/quiz-card-hover';
import { buildTeaser } from '@/lib/quiz/teaser';
import { getPopularQuizzes } from '@/lib/db/queries/popular';
import { safeFetch } from '@/lib/error-handling';

import type { PopularWindow, PopularResult } from '@/lib/db/queries/popular';
import type { Metadata } from 'next';

const SITE_URL = 'https://kpopquiz.org';

interface WindowCfg {
  slug: string;
  h1: string;
  suffix: string; // "today" / "this week" / "this month"
  interval: string; // for the blurb: "30 minutes" / "hour" / "6 hours"
  title: string;
  description: string;
  ogSub: string;
}

const CONFIG: Record<PopularWindow, WindowCfg> = {
  today: {
    slug: 'popular-today', h1: 'The most played K-pop quizzes today', suffix: 'today', interval: '30 minutes',
    title: 'Most Played K-pop Quizzes Today',
    description: 'The K-pop quizzes fans are playing the most right now, from the last 24 hours. Updated every 30 minutes from real plays. Free to play.',
    ogSub: 'The quizzes fans are playing most in the last 24 hours',
  },
  week: {
    slug: 'popular-this-week', h1: 'The most played K-pop quizzes this week', suffix: 'this week', interval: 'hour',
    title: 'Most Played K-pop Quizzes This Week',
    description: 'The most played K-pop quizzes of the last 7 days, ranked by real plays and refreshed hourly. Free to play.',
    ogSub: 'The most played K-pop quizzes of the last 7 days',
  },
  month: {
    slug: 'popular-this-month', h1: 'The most played K-pop quizzes this month', suffix: 'this month', interval: '6 hours',
    title: 'Most Played K-pop Quizzes This Month',
    description: 'The most played K-pop quizzes of the last 30 days, ranked by real plays. A fresh leaderboard of what fans are into. Free to play.',
    ogSub: 'The most played K-pop quizzes of the last 30 days',
  },
};

/** Per-window page metadata (canonical self, not noindex). */
export function popularMeta(window: PopularWindow): Metadata {
  const c = CONFIG[window];
  const path = `/quizzes/${c.slug}`;
  return {
    title: `${c.title} | KpopQuiz`,
    description: c.description,
    openGraph: {
      title: c.title,
      description: c.ogSub,
      url: path,
      images: [{ url: `/api/og/page?title=${encodeURIComponent(c.title)}&subtitle=${encodeURIComponent(c.ogSub)}&accent=%23e8457a`, width: 1200, height: 630, alt: c.title }],
    },
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: path },
  };
}

function formatTs(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false }) + ' UTC';
}

const EMPTY: PopularResult = { window: 'today', generatedAt: new Date().toISOString(), state: 'fallback', rows: [], rowsScanned: 0, qualifyingCount: 0 };

export async function PopularPage({ window }: { window: PopularWindow }): Promise<React.ReactElement> {
  const c = CONFIG[window];
  const result = await safeFetch(getPopularQuizzes(window, Date.now()), { ...EMPTY, window }, `[popular-${window}]`);
  const { rows, state } = result;

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: c.title,
    numberOfItems: rows.length,
    itemListElement: rows.map((r, i) => ({ '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/q/${r.card.slug}`, name: r.card.title })),
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Quizzes', item: `${SITE_URL}/quizzes` },
      { '@type': 'ListItem', position: 3, name: c.title, item: `${SITE_URL}/quizzes/${c.slug}` },
    ],
  };

  const others: PopularWindow[] = (['today', 'week', 'month'] as PopularWindow[]);

  return (
    <div className="pop-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <nav className="pop-crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link><span className="pop-crumb-sep">/</span>
        <Link href="/quizzes">Quizzes</Link><span className="pop-crumb-sep">/</span>
        <span>{c.suffix.replace(/^this /, '').replace(/^./, (s) => s.toUpperCase())}</span>
      </nav>

      <h1 className="pop-h1 font-display">{c.h1}</h1>
      <p className="pop-blurb">Updated every {c.interval} from real plays. As of {formatTs(result.generatedAt)}.</p>

      {/* Cross-link mesh: the other windows + browse + stats */}
      <nav className="pop-nav" aria-label="Popular windows">
        {others.map((w) => (
          <Link key={w} href={`/quizzes/${CONFIG[w].slug}`} {...(w === window ? { 'aria-current': 'page' as const } : {})}>
            {w === 'today' ? 'Today' : w === 'week' ? 'This week' : 'This month'}
          </Link>
        ))}
        <Link href="/quizzes">All quizzes</Link>
        <Link href="/stats">Stats</Link>
      </nav>

      {state === 'fallback' && (
        <p className="pop-note">Not enough plays {c.suffix} yet. Here are the all-time favorites instead.</p>
      )}
      {state === 'partial' && (
        <p className="pop-note">Only {rows.length} quizzes have enough plays {c.suffix} so far. Here they are.</p>
      )}

      {rows.length === 0 ? (
        <p className="pop-empty">No plays to rank yet. Check back soon.</p>
      ) : (
        <ol className="pop-list">
          {rows.map((r, i) => {
            const teaser = buildTeaser(r.card);
            return (
              <li className="pop-row" key={r.card.id}>
                <span className="pop-rank" aria-hidden="true">{i + 1}</span>
                <div className="pop-card">
                  {teaser
                    ? <QuizCardHover teaser={teaser}><QuizCard quiz={r.card} /></QuizCardHover>
                    : <QuizCard quiz={r.card} />}
                  {r.windowPlays > 0 && (
                    <span className="pop-chip">{r.windowPlays.toLocaleString('en-US')} plays {c.suffix}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <p className="pop-foot">
        Ranked from real, first-party play data on kpopquiz.org. See also the{' '}
        <Link href="/stats" className="pop-foot-link">platform stats</Link> and{' '}
        <Link href="/data/pulse" className="pop-foot-link">monthly Pulse</Link>.
      </p>
    </div>
  );
}

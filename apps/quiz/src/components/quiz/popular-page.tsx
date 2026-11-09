import Link from 'next/link';

import { jsonLdScript } from '@/lib/verse/jsonld';

import { QuizCard } from '@/components/ui/quiz-card';
import { QuizCardHover } from '@/components/quiz/quiz-card-hover';
import { buildTeaser } from '@/lib/quiz/teaser';
import { getPopularQuizzes } from '@/lib/db/queries/popular';
import { safeFetch } from '@/lib/error-handling';
import { GENRE, IS_KPOP, titleCase } from '@/lib/site/genre';
import { SITE } from '@/lib/site/registry';

import type { PopularWindow, PopularResult } from '@/lib/db/queries/popular';
import type { Metadata } from 'next';

const SITE_URL = SITE.url;
// The genre word of the copy: "K-pop" on kpop (the words below read as they always did), the site's own word elsewhere.
const CAP = titleCase(GENRE);

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
    slug: 'popular-today', h1: `The most played ${GENRE} quizzes today`, suffix: 'today', interval: '30 minutes',
    title: `Most Played ${CAP} Quizzes Today`,
    description: `The ${GENRE} quizzes fans are playing the most right now, from the last 24 hours. Updated every 30 minutes from real plays. Free to play.`,
    ogSub: 'The quizzes fans are playing most in the last 24 hours',
  },
  week: {
    slug: 'popular-this-week', h1: `The most played ${GENRE} quizzes this week`, suffix: 'this week', interval: 'hour',
    title: `Most Played ${CAP} Quizzes This Week`,
    description: `The most played ${GENRE} quizzes of the last 7 days, ranked by real plays and refreshed hourly. Free to play.`,
    ogSub: `The most played ${GENRE} quizzes of the last 7 days`,
  },
  month: {
    slug: 'popular-this-month', h1: `The most played ${GENRE} quizzes this month`, suffix: 'this month', interval: '6 hours',
    title: `Most Played ${CAP} Quizzes This Month`,
    description: `The most played ${GENRE} quizzes of the last 30 days, ranked by real plays. A fresh leaderboard of what fans are into. Free to play.`,
    ogSub: `The most played ${GENRE} quizzes of the last 30 days`,
  },
};

/** Per-window page metadata (canonical self, not noindex). */
export function popularMeta(window: PopularWindow): Metadata {
  const c = CONFIG[window];
  const path = `/quizzes/${c.slug}`;
  return {
    title: `${c.title}`,
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

/**
 * O1 audit 03 P1-5 (rulebook 3.1, 3.3, 4): the answer block of the weekly page and the rows of its table, from the
 * same real window counts as the list. Null when no quiz has a window count (the all-time fallback makes no claim).
 * The count is written once, with the same grouping, in the block and in the table.
 */
export function weeklyAnswer(result: PopularResult, asOf: string): { text: string; table: Array<{ rank: number; title: string; slug: string; group: string | null; plays: string }> } | null {
  const rows = result.rows.filter((r) => r.windowPlays > 0);
  const top = rows[0];
  if (!top) return null;
  const plays = (n: number): string => n.toLocaleString('en-US');
  return {
    text: `${top.card.title} is the most played ${GENRE} quiz this week, with ${plays(top.windowPlays)} plays in the last 7 days. The table below ranks the ${rows.length} quizzes with the most plays, counted from real plays on ${SITE.url.replace(/^https?:\/\//, '')} and refreshed every hour. Figures are as of ${asOf}.`,
    table: rows.map((r, i) => ({ rank: i + 1, title: r.card.title, slug: r.card.slug, group: r.card.group_name ?? null, plays: plays(r.windowPlays) })),
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

  const weekly = IS_KPOP && window === 'week' ? weeklyAnswer(result, formatTs(result.generatedAt)) : null;

  const others: PopularWindow[] = (['today', 'week', 'month'] as PopularWindow[]);

  return (
    <div className="pop-page">
      {/* QA class 4: c.title (user-authored quiz titles) escaped at the sink. */}
      {jsonLdScript(itemListLd)}
      {jsonLdScript(breadcrumbLd)}

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
        {SITE.features.dataPages ? <Link href="/stats">Stats</Link> : null}
      </nav>

      {weekly !== null && (
        <>
          <p className="pop-blurb" data-answer="popular-week">{weekly.text}</p>
          <table className="pop-table">
            <caption>Most played quizzes this week, by plays in the last 7 days</caption>
            <thead><tr><th scope="col">Rank</th><th scope="col">Quiz</th><th scope="col">Group</th><th scope="col">Plays this week</th></tr></thead>
            <tbody>
              {weekly.table.map((t) => (
                <tr key={t.slug}><td>{t.rank}</td><td><Link href={`/q/${t.slug}`}>{t.title}</Link></td><td>{t.group ?? ''}</td><td>{t.plays}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

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

      {IS_KPOP ? (
        <p className="pop-foot">
          Ranked from real, first-party play data on kpopquiz.org. See also the{' '}
          <Link href="/stats" className="pop-foot-link">platform stats</Link>, the{' '}
          <Link href="/data/pulse" className="pop-foot-link">monthly Pulse</Link>, and free{' '}
          <Link href="/blindtest" className="pop-foot-link">the K-pop blind test</Link>.
        </p>
      ) : (
        <p className="pop-foot">
          {`Ranked from real, first-party play data on ${SITE.url.replace(/^https?:\/\//, '')}.`}
          {SITE.features.blindTest ? <> See also the <Link href="/blindtest" className="pop-foot-link">blind test</Link>.</> : null}
        </p>
      )}
    </div>
  );
}

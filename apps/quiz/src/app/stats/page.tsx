import Link from 'next/link';

import { Mascot } from '@/components/ui/mascot';
import { getSiteStats, getQuizScoreExtremes } from '@/lib/db/queries/stats';
import { getFandomWarMap, getHotMatchups } from '@/lib/db/queries/community';
import { getRanking } from '@/lib/db/queries/duels';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';
import type { SiteStats, QuizExtremes } from '@/lib/db/queries/stats';

// S1.1 - hourly ISR so the citable first-party data stays fresh without hitting
// the DB per request.
export const revalidate = 3600;

const YEAR = new Date().getFullYear();

export const metadata: Metadata = {
  title: `K-pop Quiz Statistics ${YEAR} - Fan Data from kpopquiz.org`,
  description:
    'Original K-pop fan data from kpopquiz.org: the most-played fandoms this week, hardest and easiest quizzes by real average score, and fan duel verdicts. Free to cite with a link.',
  openGraph: {
    title: 'KpopQuiz Stats',
    description: 'Live data on K-pop quizzes, blind test songs, and fan engagement across 87+ groups.',
    url: '/stats',
    images: [{ url: '/api/og/page?title=KpopQuiz+Stats&subtitle=Live+data+on+quizzes%2C+songs%2C+and+fan+engagement+across+87%2B+groups.&accent=%2310b981', width: 1200, height: 630, alt: 'KpopQuiz Stats' }],
  },
  twitter: { card: 'summary_large_image' },
  alternates: {
    canonical: '/stats',
    languages: {
      en: '/stats',
      'pt-BR': '/pt/stats',
      'x-default': '/stats',
    },
  },
};

const FALLBACK: SiteStats = {
  totalSongs: 0,
  totalQuizzes: 0,
  totalPlays: 0,
  totalGroups: 0,
  generationsCovered: 5,
  topQuizzesByGroup: [],
  updatedAt: new Date().toISOString(),
};

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('en-US');
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function IconQuiz(): React.ReactElement {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconMusic(): React.ReactElement {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function IconPlay(): React.ReactElement {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function IconUsers(): React.ReactElement {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconStar(): React.ReactElement {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconHeadphones(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function IconGamepad(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <line x1="15" y1="13" x2="15.01" y2="13" />
      <line x1="18" y1="11" x2="18.01" y2="11" />
      <rect x="2" y="6" width="20" height="12" rx="2" />
    </svg>
  );
}

function IconTrophy(): React.ReactElement {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function IconArrow(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

const EXTREMES_FALLBACK: QuizExtremes = { hardest: [], easiest: [], minPlays: 30, candidates: 0, updatedAt: new Date().toISOString() };

interface DuelVerdict { prompt: string; groupSlug: string; winner: string; runner: string | null; votes: number; }

export default async function StatsPage(): Promise<React.ReactElement> {
  const [stats, warMap, extremes, matchups] = await Promise.all([
    safeFetch(getSiteStats(), FALLBACK, '[stats] getSiteStats'),
    safeFetch(getFandomWarMap(5), [], '[stats] getFandomWarMap'),
    safeFetch(getQuizScoreExtremes(), EXTREMES_FALLBACK, '[stats] getQuizScoreExtremes'),
    safeFetch(getHotMatchups(3), [], '[stats] getHotMatchups'),
  ]);

  // Duel verdicts: for each top-voted matchup this week, resolve the fan-ranked
  // #1 (and runner-up) by all-time Elo. Real names only; drop any that cannot
  // resolve a winner.
  const verdicts: DuelVerdict[] = (
    await Promise.all(
      matchups.map(async (m) => {
        const ranking = await safeFetch(getRanking(m.groupSlug, m.questionType), null, '[stats] getRanking');
        const top = ranking?.entities?.[0];
        if (!top) return null;
        return {
          prompt: m.prompt,
          groupSlug: m.groupSlug,
          winner: top.name,
          runner: ranking?.entities?.[1]?.name ?? null,
          votes: m.votes,
        } satisfies DuelVerdict;
      }),
    )
  ).filter((v): v is DuelVerdict => v !== null);

  const asOf = formatDate(stats.updatedAt);
  const topFandom = warMap[0] ?? null;

  const heroCards: Array<{ label: string; value: number; icon: React.ReactElement; accent: string }> = [
    { label: 'Quizzes', value: stats.totalQuizzes, icon: <IconQuiz />, accent: 'var(--brand)' },
    { label: 'Songs', value: stats.totalSongs, icon: <IconMusic />, accent: '#7c5cfc' },
    { label: 'Total plays', value: stats.totalPlays, icon: <IconPlay />, accent: '#f59e0b' },
    { label: 'Groups', value: stats.totalGroups, icon: <IconUsers />, accent: '#10b981' },
    { label: 'Generations', value: stats.generationsCovered, icon: <IconStar />, accent: '#f472b6' },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'KpopQuiz Platform Statistics',
    description: `Live statistics from kpopquiz.org: ${stats.totalQuizzes} quizzes, ${stats.totalSongs} blind test songs, ${formatNumber(stats.totalPlays)} total plays across ${stats.totalGroups} K-pop groups and ${stats.generationsCovered} generations.`,
    url: 'https://kpopquiz.org/stats',
    creator: {
      '@type': 'Organization',
      name: 'KpopQuiz',
      url: 'https://kpopquiz.org',
    },
    dateModified: stats.updatedAt,
    temporalCoverage: `2024/${new Date().getFullYear()}`,
    variableMeasured: [
      { '@type': 'PropertyValue', name: 'Total Quizzes', value: stats.totalQuizzes },
      { '@type': 'PropertyValue', name: 'Total Songs', value: stats.totalSongs },
      { '@type': 'PropertyValue', name: 'Total Plays', value: stats.totalPlays },
      { '@type': 'PropertyValue', name: 'Groups Covered', value: stats.totalGroups },
    ],
  };

  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `K-pop Quiz Statistics ${YEAR}`,
    url: 'https://kpopquiz.org/stats',
    description: 'Original K-pop fan data from kpopquiz.org: most-played fandoms this week, hardest and easiest quizzes by real average score, and fan duel verdicts.',
    isPartOf: { '@type': 'WebSite', name: 'KpopQuiz', url: 'https://kpopquiz.org' },
    dateModified: stats.updatedAt,
    license: 'https://kpopquiz.org/stats',
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kpopquiz.org' },
      { '@type': 'ListItem', position: 2, name: 'Stats', item: 'https://kpopquiz.org/stats' },
    ],
  };

  return (
    <div className="stats-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      {/* Header */}
      <div className="stats-header">
        <nav className="stats-breadcrumbs">
          <Link href="/">Home</Link>
          <span className="stats-breadcrumb-sep">/</span>
          <span>Stats</span>
        </nav>
        <div className="stats-title-row">
          <div>
            <h1 className="stats-title font-display">K-pop Quiz Statistics</h1>
            <p className="stats-subtitle">Original fan data from kpopquiz.org, updated hourly</p>
          </div>
          <div className="stats-mascot" aria-hidden="true">
            <Mascot variant="celebrate" size={56} alt="" />
          </div>
        </div>
        <p className="stats-updated">
          Last updated: {formatDate(stats.updatedAt)}
        </p>
      </div>

      {/* AI-extractable summary */}
      <div className="stats-summary">
        <div className="stats-summary-dot" aria-hidden="true" />
        <p className="stats-summary-text">
          KpopQuiz hosts {stats.totalQuizzes.toLocaleString('en-US')} fan-made quizzes
          and {stats.totalSongs.toLocaleString('en-US')} blind test songs
          covering {stats.totalGroups} K-pop groups across {stats.generationsCovered} generations
          (1st through 5th). The platform has recorded {formatNumber(stats.totalPlays)} total
          plays since launch, with new quizzes added daily by the community.
        </p>
      </div>

      {/* Big number cards */}
      <div className="stats-cards">
        {heroCards.map((card, i) => (
          <div
            key={card.label}
            className="stats-card"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="stats-card-icon" style={{ color: card.accent }}>{card.icon}</span>
            <span className="stats-card-value">{formatNumber(card.value)}</span>
            <span className="stats-card-label">{card.label}</span>
          </div>
        ))}
      </div>

      {/* Top groups table */}
      {stats.topQuizzesByGroup.length > 0 && (
        <section className="stats-table-section">
          <h2 className="stats-section-title">Top groups by fan engagement</h2>
          <p className="stats-section-desc">
            The most-played K-pop groups on the platform, ranked by total quiz plays.{' '}
            <Link href="/quizzes/popular-this-month" className="stats-cite-link">See the most-played quizzes this month.</Link>
          </p>
          <div className="stats-table-wrap">
            <table className="stats-table">
              <thead>
                <tr>
                  <th className="stats-th stats-th-rank">#</th>
                  <th className="stats-th">Group</th>
                  <th className="stats-th stats-th-num">Quizzes</th>
                  <th className="stats-th stats-th-num">Total plays</th>
                </tr>
              </thead>
              <tbody>
                {stats.topQuizzesByGroup.map((group, i) => (
                  <tr key={group.groupSlug} className="stats-tr">
                    <td className="stats-td stats-td-rank">
                      <span className={`stats-rank ${i < 3 ? `stats-rank-top stats-rank-${i + 1}` : ''}`}>
                        {i + 1}
                      </span>
                    </td>
                    <td className="stats-td">
                      <Link href={`/${group.groupSlug}-quiz`} className="stats-group-link">
                        {group.groupName}
                      </Link>
                    </td>
                    <td className="stats-td stats-td-num">{group.quizCount}</td>
                    <td className="stats-td stats-td-num">
                      <span className="stats-plays-bar">
                        <span
                          className="stats-plays-fill"
                          style={{
                            width: `${Math.min(100, (group.totalPlays / (stats.topQuizzesByGroup[0]?.totalPlays || 1)) * 100)}%`,
                          }}
                        />
                        <span className="stats-plays-num">{formatNumber(group.totalPlays)}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* State of the fandoms - the citable centerpiece */}
      {warMap.length > 0 && (
        <section className="stats-table-section">
          <h2 className="stats-section-title">State of the fandoms this week</h2>
          <p className="stats-section-desc">
            {topFandom
              ? `According to kpopquiz.org, ${topFandom.name} is the most-played K-pop fandom of the week, with ${topFandom.plays.toLocaleString('en-US')} quiz plays as of ${asOf}.`
              : `The most-played K-pop fandoms this week, by quiz plays, as of ${asOf}.`}
          </p>
          <div className="stats-table-wrap">
            <table className="stats-table">
              <thead>
                <tr>
                  <th className="stats-th stats-th-rank">#</th>
                  <th className="stats-th">Fandom</th>
                  <th className="stats-th stats-th-num">Plays (7d)</th>
                  <th className="stats-th stats-th-num">Fans (7d)</th>
                  <th className="stats-th stats-th-num">Trend</th>
                </tr>
              </thead>
              <tbody>
                {warMap.map((w, i) => (
                  <tr key={w.slug} className="stats-tr">
                    <td className="stats-td stats-td-rank">
                      <span className={`stats-rank ${i < 3 ? `stats-rank-top stats-rank-${i + 1}` : ''}`}>{i + 1}</span>
                    </td>
                    <td className="stats-td">
                      <Link href={`/${w.slug}-quiz`} className="stats-group-link">{w.name}</Link>
                    </td>
                    <td className="stats-td stats-td-num">{w.plays.toLocaleString('en-US')}</td>
                    <td className="stats-td stats-td-num">{w.fans.toLocaleString('en-US')}</td>
                    <td className="stats-td stats-td-num">
                      {w.delta === null
                        ? <span className="stats-trend stats-trend-new">new</span>
                        : <span className={`stats-trend ${w.delta >= 0 ? 'stats-trend-up' : 'stats-trend-down'}`}>{w.delta >= 0 ? '+' : ''}{w.delta}%</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Hardest + easiest quizzes by real average score */}
      {(extremes.hardest.length >= 3 || extremes.easiest.length >= 3) && (
        <section className="stats-table-section">
          <h2 className="stats-section-title">Hardest and easiest K-pop quizzes</h2>
          <p className="stats-section-desc">
            {extremes.hardest[0]
              ? `The hardest quiz on kpopquiz.org is "${extremes.hardest[0].title}", where fans average just ${extremes.hardest[0].avgPct}%. Ranked from ${extremes.candidates} quizzes with at least ${extremes.minPlays} plays, as of ${asOf}.`
              : `Quizzes ranked by real average score, from ${extremes.candidates} quizzes with at least ${extremes.minPlays} plays, as of ${asOf}.`}
          </p>
          <div className="stats-extremes">
            {extremes.hardest.length >= 3 && (
              <div className="stats-extreme-col">
                <h3 className="stats-extreme-head stats-extreme-hard">Hardest</h3>
                <ol className="stats-extreme-list">
                  {extremes.hardest.map((q) => (
                    <li key={q.slug} className="stats-extreme-item">
                      <Link href={`/q/${q.slug}`} className="stats-extreme-title">{q.title}</Link>
                      <span className="stats-extreme-meta">{q.groupName} · {q.plays.toLocaleString('en-US')} plays</span>
                      <span className="stats-extreme-pct stats-extreme-pct-hard">{q.avgPct}%</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {extremes.easiest.length >= 3 && (
              <div className="stats-extreme-col">
                <h3 className="stats-extreme-head stats-extreme-easy">Easiest</h3>
                <ol className="stats-extreme-list">
                  {extremes.easiest.map((q) => (
                    <li key={q.slug} className="stats-extreme-item">
                      <Link href={`/q/${q.slug}`} className="stats-extreme-title">{q.title}</Link>
                      <span className="stats-extreme-meta">{q.groupName} · {q.plays.toLocaleString('en-US')} plays</span>
                      <span className="stats-extreme-pct stats-extreme-pct-easy">{q.avgPct}%</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Fan duel verdicts */}
      {verdicts.length > 0 && (
        <section className="stats-table-section">
          <h2 className="stats-section-title">Fan duel verdicts</h2>
          <p className="stats-section-desc">
            {`In head-to-head fan voting on kpopquiz.org, fans crowned ${verdicts[0]!.winner} the pick for "${verdicts[0]!.prompt}" with ${verdicts[0]!.votes.toLocaleString('en-US')} votes this week, as of ${asOf}.`}
          </p>
          <ul className="stats-verdicts">
            {verdicts.map((v) => (
              <li key={v.prompt} className="stats-verdict">
                <span className="stats-verdict-q">{v.prompt}</span>
                <span className="stats-verdict-result">
                  Fans rank <strong>{v.winner}</strong>{v.runner ? <> over {v.runner}</> : null}
                </span>
                <span className="stats-verdict-votes">{v.votes.toLocaleString('en-US')} votes this week</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Internal links */}
      <section className="stats-links">
        <h2 className="stats-section-title">Explore the platform</h2>
        <div className="stats-link-grid">
          <Link href="/quizzes" className="stats-link-card">
            <span className="stats-link-icon"><IconQuiz /></span>
            <div className="stats-link-body">
              <span className="stats-link-title">Browse quizzes</span>
              <span className="stats-link-desc">Fan-made quizzes for every group</span>
            </div>
            <span className="stats-link-arrow"><IconArrow /></span>
          </Link>
          <Link href="/blindtest" className="stats-link-card">
            <span className="stats-link-icon"><IconHeadphones /></span>
            <div className="stats-link-body">
              <span className="stats-link-title">Blind test</span>
              <span className="stats-link-desc">Guess K-pop songs in 10 seconds</span>
            </div>
            <span className="stats-link-arrow"><IconArrow /></span>
          </Link>
          <Link href="/games" className="stats-link-card">
            <span className="stats-link-icon"><IconGamepad /></span>
            <div className="stats-link-body">
              <span className="stats-link-title">Games hub</span>
              <span className="stats-link-desc">This or That, Name All Members</span>
            </div>
            <span className="stats-link-arrow"><IconArrow /></span>
          </Link>
          <Link href="/leaderboard" className="stats-link-card">
            <span className="stats-link-icon"><IconTrophy /></span>
            <div className="stats-link-body">
              <span className="stats-link-title">Leaderboard</span>
              <span className="stats-link-desc">Top players and creators</span>
            </div>
            <span className="stats-link-arrow"><IconArrow /></span>
          </Link>
        </div>
      </section>

      {/* The polite backlink ask */}
      <p className="stats-cite">
        This data is free to cite with a link to{' '}
        <Link href="/stats" className="stats-cite-link">kpopquiz.org/stats</Link>. Figures are first-party
        and refresh hourly; each section is stamped with the date it was measured.
      </p>
    </div>
  );
}

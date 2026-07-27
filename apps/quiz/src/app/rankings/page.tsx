import Link from 'next/link';

import { getRankingsIndex, RANKING_UNLOCK_VOTES } from '@/lib/db/queries/duels';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

export const revalidate = 3600;

const GROUP_NAMES: Record<string, string> = {
  bts: 'BTS',
  blackpink: 'BLACKPINK',
  aespa: 'aespa',
  seventeen: 'SEVENTEEN',
  'stray-kids': 'Stray Kids',
};

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function heading(group: string, type: string): string {
  const t = type.replace(/-/g, ' ');
  if (group === 'general') return cap(t);
  const g = GROUP_NAMES[group] ?? cap(group.replace(/-/g, ' '));
  return `${g} ${t}`;
}

export async function generateMetadata(): Promise<Metadata> {
  const rankings = await safeFetch(getRankingsIndex(), [], '[rankings/meta] getRankingsIndex');
  const anyPublic = rankings.some((r) => r.public);
  const base: Metadata = {
    title: 'K-pop Fan Rankings | KpopQuiz',
    description:
      'Live fan-voted rankings: who fans pick as the best idols, songs, and groups in head-to-head matchups. Rankings unlock as fans vote.',
    alternates: { canonical: '/rankings' },
  };
  // Nothing public yet -> keep the empty hub out of the index until it fills.
  if (!anyPublic) return { ...base, robots: { index: false, follow: true } };
  return base;
}

export default async function RankingsIndexPage(): Promise<React.ReactElement> {
  const rankings = await safeFetch(getRankingsIndex(), [], '[rankings] getRankingsIndex');
  // U-1a: show ALL rankings, not just the ones past their vote threshold. Public
  // ones are live-ranking cards (view results); locked ones are "vote to unlock"
  // cards that drop into the duel preselected, so "See all" really lists every
  // ranking the trending strip teases.
  const publicRankings = rankings.filter((r) => r.public).sort((a, b) => b.total_votes - a.total_votes);
  // Provisional: real votes, not yet live. Shown as "early results" (real counts).
  const provisionalRankings = rankings.filter((r) => r.provisional).sort((a, b) => b.total_votes - a.total_votes);
  // Locked = zero votes only (nothing real to show is nothing to show).
  const lockedRankings = rankings.filter((r) => !r.public && !r.provisional).sort((a, b) => a.group_slug.localeCompare(b.group_slug));

  return (
    <div className="ranking-page">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Rankings' }]} />

      <p className="duel-label">Fan-voted</p>
      <h1 className="ranking-h1">K-pop fan rankings</h1>
      <p className="ranking-intro">
        Who do fans actually pick? These rankings are built from head-to-head votes and reorder live
        as fans play. They reflect fan opinion, not an official list.
      </p>

      {publicRankings.length > 0 && (
        <ul className="ranking-index-grid">
          {publicRankings.map((r) => (
            <li key={`${r.group_slug}:${r.question_type}`}>
              <Link href={`/rankings/${r.group_slug}/${r.question_type}`} className="ranking-index-card">
                {r.top_entity?.image ? (
                  <img className="ranking-index-avatar" src={r.top_entity.image} alt={`${r.top_entity.name} ranked #1`} loading="lazy" />
                ) : (
                  <span className="ranking-index-avatar" />
                )}
                <span className="ranking-index-body">
                  <span className="ranking-index-name">{heading(r.group_slug, r.question_type)}</span>
                  <span className="ranking-index-meta">
                    {r.top_entity ? `#1 ${r.top_entity.name} · ` : ''}
                    {r.total_votes.toLocaleString('en-US')} votes
                  </span>
                </span>
                <span className="ranking-index-arrow" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {provisionalRankings.length > 0 && (
        <>
          <h2 className="ranking-locked-h2">Early results</h2>
          <p className="ranking-locked-intro">
            These rankings have real votes but are still moving. See the current standings and vote to shape them.
          </p>
          <ul className="ranking-index-grid">
            {provisionalRankings.map((r) => (
              <li key={`${r.group_slug}:${r.question_type}`}>
                <Link href={`/rankings/${r.group_slug}/${r.question_type}`} className="ranking-index-card is-early">
                  {r.top_entity?.image ? (
                    <img className="ranking-index-avatar" src={r.top_entity.image} alt={`${r.top_entity.name} leading so far`} loading="lazy" />
                  ) : (
                    <span className="ranking-index-avatar" />
                  )}
                  <span className="ranking-index-body">
                    <span className="ranking-index-name">{heading(r.group_slug, r.question_type)}</span>
                    <span className="ranking-index-meta">
                      <span className="ranking-early-tag">Early</span>
                      {r.top_entity ? ` #1 ${r.top_entity.name} · ` : ' '}
                      {r.total_votes.toLocaleString('en-US')} votes · still moving
                    </span>
                  </span>
                  <span className="ranking-index-arrow" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {lockedRankings.length > 0 && (
        <>
          <h2 className="ranking-locked-h2">Be the first to vote</h2>
          <p className="ranking-locked-intro">
            No fan has voted on these matchups yet. Play the matchup and start the ranking.
          </p>
          <ul className="ranking-index-grid">
            {lockedRankings.map((r) => (
              <li key={`${r.group_slug}:${r.question_type}`}>
                <Link
                  href={`/games/this-or-that?group=${encodeURIComponent(r.group_slug)}&type=${encodeURIComponent(r.question_type)}`}
                  className="ranking-index-card is-locked"
                >
                  <span className="ranking-index-avatar" />
                  <span className="ranking-index-body">
                    <span className="ranking-index-name">{heading(r.group_slug, r.question_type)}</span>
                    <span className="ranking-index-meta">Be the first · 0 / {RANKING_UNLOCK_VOTES} votes</span>
                  </span>
                  <span className="ranking-index-arrow" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {publicRankings.length === 0 && provisionalRankings.length === 0 && lockedRankings.length === 0 && (
        <div className="rank-locked">
          <p className="rank-locked-title">Rankings unlock as fans vote</p>
          <p className="rank-locked-sub">
            No ranking has crossed its vote threshold yet. Play the head-to-head game and the first
            rankings will appear here.
          </p>
          <Link href="/games/this-or-that" className="btn-primary ranking-cta">
            Play This or That →
          </Link>
        </div>
      )}
    </div>
  );
}

import Link from 'next/link';

import { getRankingsIndex } from '@/lib/db/queries/duels';
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
  const publicRankings = rankings
    .filter((r) => r.public)
    .sort((a, b) => b.total_votes - a.total_votes);

  return (
    <div className="ranking-page">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Rankings' }]} />

      <p className="duel-label">Fan-voted</p>
      <h1 className="ranking-h1">K-pop fan rankings</h1>
      <p className="ranking-intro">
        Who do fans actually pick? These rankings are built from head-to-head votes and reorder live
        as fans play. They reflect fan opinion, not an official list.
      </p>

      {publicRankings.length > 0 ? (
        <ul className="ranking-index-grid">
          {publicRankings.map((r) => (
            <li key={`${r.group_slug}:${r.question_type}`}>
              <Link href={`/rankings/${r.group_slug}/${r.question_type}`} className="ranking-index-card">
                {r.top_entity?.image ? (
                  <img className="ranking-index-avatar" src={r.top_entity.image} alt="" loading="lazy" />
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
      ) : (
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

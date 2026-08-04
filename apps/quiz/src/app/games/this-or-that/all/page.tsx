import Link from 'next/link';

import { getRankingsIndex } from '@/lib/db/queries/duels';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

// U-1b: a real index of every This or That matchup. The "See all" link used to
// drop players straight into the BTS game; this lists ALL categories as cards,
// each launching that matchup preselected. Static segment 'all' takes precedence
// over the sibling [slug] redirect route, and '/games' already allowlists it.
export const revalidate = 600;

export const metadata: Metadata = {
  title: 'All This or That Matchups | KpopQuiz',
  description:
    'Every K-pop This or That matchup in one place. Pick a category and vote in head-to-head fan matchups: biases, best songs, favorite members, and more.',
  alternates: { canonical: '/games/this-or-that/all' },
};

// Group-specific matchups first (recognizable), then the cross-group buckets.
function orderKey(groupSlug: string): number {
  return groupSlug === 'general' ? 1 : 0;
}

export default async function ThisOrThatIndexPage(): Promise<React.ReactElement> {
  const categories = await safeFetch(getRankingsIndex(), [], '[tot/all] getRankingsIndex');
  const sorted = [...categories].sort((a, b) => {
    const g = orderKey(a.group_slug) - orderKey(b.group_slug);
    if (g !== 0) return g;
    return b.total_votes - a.total_votes;
  });

  return (
    <div className="ranking-page">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Games', href: '/games' }, { label: 'This or That' }]} />

      <p className="duel-label">This or That</p>
      <h1 className="ranking-h1">All matchups</h1>
      <p className="ranking-intro">
        Pick a matchup and vote head-to-head. Every vote reorders the live fan ranking. Tap any card to play.
      </p>

      {sorted.length > 0 ? (
        <ul className="ranking-index-grid">
          {sorted.map((c, i) => (
            <li key={`${c.group_slug}:${c.question_type}`}>
              <Link
                href={`/games/this-or-that?group=${encodeURIComponent(c.group_slug)}&type=${encodeURIComponent(c.question_type)}`}
                className="ranking-index-card lmc-card"
              >
                <span className={`lmc-cover lmc-g${(i % 6) + 1}`} aria-hidden="true" />
                <span className="ranking-index-body lmc-body">
                  <span className="ranking-index-name">{c.prompt}</span>
                  <span className="ranking-index-meta">
                    {c.public ? 'Live ranking · ' : ''}
                    {c.total_votes.toLocaleString('en-US')} vote{c.total_votes === 1 ? '' : 's'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rank-locked">
          <p className="rank-locked-title">No matchups yet</p>
          <p className="rank-locked-sub">Check back soon.</p>
        </div>
      )}
    </div>
  );
}

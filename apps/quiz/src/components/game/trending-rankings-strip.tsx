import Link from 'next/link';

import type { RankingIndexItem } from '@/lib/db/queries/duels';

/**
 * Horizontal scroll-snap strip of fan-vote rankings (D0). Public rankings link
 * to their /rankings page with a Live pill; locked ones (all of them pre-launch)
 * link into the duel preselected and read as an inviting "vote to unlock" row,
 * which naturally becomes a trending row once questions go public. Never renders
 * empty (caller passes a non-empty slice).
 */
export function TrendingRankingsStrip({ items }: { items: RankingIndexItem[] }): React.ReactElement | null {
  if (items.length === 0) return null;

  return (
    <section className="trend" aria-label="Fan rankings">
      <div className="trend-head">
        <span className="trend-title">Fan rankings</span>
        <Link href="/rankings" className="trend-see">See all &rarr;</Link>
      </div>
      <ul className="trend-strip">
        {items.map((r, i) => {
          const href = r.public
            ? `/rankings/${r.group_slug}/${r.question_type}`
            : `/games/this-or-that?group=${encodeURIComponent(r.group_slug)}&type=${encodeURIComponent(r.question_type)}`;
          const pct = Math.min(100, Math.round((r.total_votes / r.min_votes) * 100));
          return (
            <li key={`${r.group_slug}:${r.question_type}`} className="trend-item" style={{ animationDelay: `${i * 40}ms` }}>
              <Link href={href} className="trend-card">
                {r.top_entity?.image ? (
                  <img className="trend-avatar" src={r.top_entity.image} alt={r.top_entity.name} loading="lazy" />
                ) : (
                  <span className="trend-avatar" />
                )}
                <span className="trend-prompt">{r.prompt}</span>
                {r.public ? (
                  <span className="trend-live"><span className="rank-live-dot" />Live ranking</span>
                ) : (
                  <span className="trend-locked">
                    <span className="trend-bar"><span className="trend-bar-fill" style={{ width: `${pct}%` }} /></span>
                    <span className="trend-hint">Vote to unlock</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

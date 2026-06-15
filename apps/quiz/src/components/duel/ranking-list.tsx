/**
 * Shared fan-vote ranking card (Pipeline 1, Section 5e / 4d). Presentational and
 * hook-free, so it renders both in the live duel page (variant="delta", with
 * bump + winner delta) and statically on the SSR /rankings/{group}/{type} page
 * (variant="winrate"). Styling lives in the `.rank-*` block (globals.css).
 */

export interface RankRowEntity {
  entity_id: string;
  name: string;
  image: string | null;
  elo: number;
  wins?: number;
  losses?: number;
}

interface Props {
  title: string;
  badge?: React.ReactNode;
  entities: RankRowEntity[];
  variant?: 'delta' | 'winrate';
  bumped?: Set<string>;
  winnerId?: string | null;
  winnerDelta?: number;
  footer?: { href: string; label: string };
}

function winRate(wins?: number, losses?: number): string | null {
  if (wins == null || losses == null) return null;
  const total = wins + losses;
  if (total === 0) return null;
  return `${Math.round((wins / total) * 100)}%`;
}

export function RankingList({
  title,
  badge,
  entities,
  variant = 'delta',
  bumped,
  winnerId,
  winnerDelta,
  footer,
}: Props): React.ReactElement {
  return (
    <div className="rank-card">
      <div className="rank-head">
        <h2 className="rank-title">{title}</h2>
        {badge}
      </div>
      <ul className="rank-list">
        {entities.map((e, i) => {
          const isWinner = winnerId === e.entity_id;
          const wr = winRate(e.wins, e.losses);
          return (
            <li key={e.entity_id} className={`rank-row${bumped?.has(e.entity_id) ? ' bump' : ''}`}>
              <span className={`rank-pos${i < 3 ? ' top' : ''}`}>{i + 1}</span>
              {e.image ? (
                <img className="rank-avatar" src={e.image} alt="" loading="lazy" />
              ) : (
                <span className="rank-avatar" />
              )}
              <span className="rank-name">{e.name}</span>
              {variant === 'delta' ? (
                <span className="rank-delta">
                  {isWinner ? (
                    <span className="up">+{winnerDelta ?? 0}</span>
                  ) : (
                    <span style={{ color: 'var(--txt3)' }}>-</span>
                  )}
                </span>
              ) : (
                <span className="rank-winrate">{wr ?? ''}</span>
              )}
              <span className="rank-elo">{Math.round(e.elo)}</span>
            </li>
          );
        })}
      </ul>
      {footer && (
        <div className="rank-foot">
          <a href={footer.href}>{footer.label}</a>
        </div>
      )}
    </div>
  );
}

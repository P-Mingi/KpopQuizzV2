import Link from 'next/link';

const SEE_ALL: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--brand)', textDecoration: 'none', whiteSpace: 'nowrap',
};
const HEAD: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14,
};

/** §2d + §10g - games teaser. This or That, Sort It, and Name Them All (the
 * newest modes get the home slot; the rest live behind "See all games"). */
export function HomeGamesTeaser(): React.ReactElement {
  return (
    <section className="home-section">
      <div style={HEAD}>
        <p className="sec-label" style={{ marginBottom: 0 }}>Play games</p>
        <Link href="/games" style={SEE_ALL}>See all games →</Link>
      </div>

      <div className="games-row">
        <Link href="/games/this-or-that" className="game-card">
          <div className="game-icon gi-tot" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m16 3 4 4-4 4" /><path d="M20 7H4" /><path d="m8 21-4-4 4-4" /><path d="M4 17h16" />
            </svg>
          </div>
          <p className="game-name">This or That</p>
          <p className="game-desc">Pick your bias in head-to-head matchups. Two options, one winner.</p>
          <span className="game-play">Play →</span>
        </Link>

        <Link href="/games/sort-it" className="game-card">
          <div className="game-icon gi-sit" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="6" rx="1.5" /><path d="M12 9v3" /><path d="M12 12H6v3" /><path d="M12 12h6v3" /><path d="M4 15h4v6H4z" /><path d="M16 15h4v6h-4z" />
            </svg>
          </div>
          <p className="game-name">Sort It</p>
          <p className="game-desc">Boy group or girl group? Sort real K-pop groups against the clock.</p>
          <span className="game-play">Play →</span>
        </Link>

        <Link href="/games/name-them-all" className="game-card">
          <div className="game-icon gi-nam" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
            </svg>
          </div>
          <p className="game-name">Name Them All</p>
          <p className="game-desc">Type every member, group, and generation before the timer runs out.</p>
          <span className="game-play">Play →</span>
        </Link>
      </div>
    </section>
  );
}

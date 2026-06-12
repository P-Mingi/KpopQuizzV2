import Link from 'next/link';

const SEE_ALL: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--brand)', textDecoration: 'none', whiteSpace: 'nowrap',
};
const HEAD: React.CSSProperties = {
  display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14,
};

/** §2d + §10g - games teaser. This or That, Name all members, and Blindtest. */
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

        <Link href="/games/name-all" className="game-card">
          <div className="game-icon gi-nam" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="6" width="20" height="12" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
            </svg>
          </div>
          <p className="game-name">Name all members</p>
          <p className="game-desc">Type every member before the timer runs out. Harder than you think.</p>
          <span className="game-play">Play →</span>
        </Link>

        <Link href="/blindtest" className="game-card">
          <div className="game-icon gi-blind" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
          </div>
          <p className="game-name">Blindtest</p>
          <p className="game-desc">Name the song or group from a 10-second audio clip.</p>
          <span className="game-play">Play →</span>
        </Link>
      </div>
    </section>
  );
}

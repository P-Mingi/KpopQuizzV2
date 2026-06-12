import Link from 'next/link';

/**
 * Thin, full-width home CTA for the blind test. This is the primary mobile
 * discovery path - Blindtest is not in the mobile bottom bar, so this bar sits
 * between the daily two-up and Trending. Sober B0 styling, --blind accent.
 */
export function HomeBlindtestCta(): React.ReactElement {
  return (
    <section className="home-section">
      <Link href="/blindtest" className="bt-cta" aria-label="Play the K-pop blind test">
        <span className="bt-cta-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
        </span>
        <span className="bt-cta-text">
          <span className="bt-cta-title">K-pop Blind Test</span>
          <span className="bt-cta-sub">Guess the song or artist from a 10-second clip</span>
        </span>
        <span className="bt-cta-go">
          <span className="bt-cta-go-label">Play</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </Link>
    </section>
  );
}

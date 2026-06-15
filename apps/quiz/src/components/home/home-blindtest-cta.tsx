import Link from 'next/link';

/**
 * Thin, full-width home CTA for the blind test. Primary mobile discovery path
 * (Blindtest is not in the mobile bottom bar). Sober B0 styling with a soft
 * --blind accent + a faint waveform motif that fills the bar on wider screens.
 */

// A static "audio waveform" silhouette - varied bar heights read as sound.
const WAVE = [
  6, 10, 8, 14, 18, 12, 16, 22, 14, 18, 10, 14, 20, 24, 16, 12, 18, 22, 14, 10,
  16, 20, 12, 18, 24, 16, 10, 14, 18, 12, 8, 14, 18, 10, 16, 8, 12, 7, 11, 6,
];

export function HomeBlindtestCta(): React.ReactElement {
  return (
    <div className="home-cta-row">
      <Link href="/blindtest" className="bt-cta" aria-label="Play the K-pop blind test">
        <span className="bt-cta-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
        </span>

        <span className="bt-cta-text">
          <span className="bt-cta-title">K-pop Blind Test</span>
          <span className="bt-cta-sub">Guess the song or artist from a 10-second clip</span>
        </span>

        <span className="bt-cta-wave" aria-hidden="true">
          <svg height="22" width={WAVE.length * 4} viewBox={`0 0 ${WAVE.length * 4} 24`} fill="currentColor">
            {WAVE.map((h, i) => (
              <rect key={i} x={i * 4} y={(24 - h) / 2} width={2} height={h} rx={1} />
            ))}
          </svg>
        </span>

        <span className="bt-cta-go">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          <span className="bt-cta-go-label">Play</span>
        </span>
      </Link>
    </div>
  );
}

import Link from 'next/link';

// The home launch band for the tier list maker - the newest mode on the site, so
// it gets the high slot above the daily pair and a dramatic dark card (ink -> plum
// -> violet, from docs/design/tier-list/Home.dc.html) that stands apart from the
// cream page without inventing a new system: same brand rose, plum/violet, DM Sans,
// radius 20. The memorable element is a real mini tier board tilted on the right.
// No emoji: the "new" spark + the arrow are inline SVG; the faces are initials
// tiles (decorative, aria-hidden). Static, no data.

const BOARD: Array<{ label: string; color: string; faces: Array<{ ini: string; nm: string; gp: string }> }> = [
  { label: 'S', color: '#E8457A', faces: [{ ini: 'RM', nm: 'RM', gp: 'a' }, { ini: 'JIN', nm: 'Jin', gp: 'b' }, { ini: 'SG', nm: 'SUGA', gp: 'c' }] },
  { label: 'A', color: '#F5894D', faces: [{ ini: 'JH', nm: 'j-hope', gp: 'd' }, { ini: 'JM', nm: 'Jimin', gp: 'a' }] },
  { label: 'B', color: '#EBB33E', faces: [{ ini: 'V', nm: 'V', gp: 'b' }, { ini: 'JK', nm: 'Jung Kook', gp: 'c' }] },
];

export function TierListHomeCta(): React.ReactElement {
  return (
    <section className="tlcta" aria-label="K-pop tier lists" data-testid="home-tier-cta">
      <div className="tlcta-glow" aria-hidden="true" />
      <div className="tlcta-copy">
        <span className="tlcta-kick">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
          </svg>
          New mode · just launched
        </span>
        <h2 className="tlcta-title">Make your K-pop tier list</h2>
        <p className="tlcta-sub">Drag your bias to the top. Rank members, title tracks or a whole discography, then share the card everyone screenshots.</p>
        <div className="tlcta-actions">
          <Link href="/tier-list/new" className="tlcta-btn primary" data-testid="home-cta-start">
            Start ranking
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
          <Link href="/tier-list" className="tlcta-btn ghost" data-testid="home-cta-browse">Browse tier lists</Link>
        </div>
      </div>

      <div className="tlcta-board" aria-hidden="true">
        {BOARD.map((row, i) => (
          <div className="tlcta-row" key={row.label} style={{ animationDelay: `${120 + i * 90}ms` }}>
            <span className="tlcta-label" style={{ background: row.color }}>{row.label}</span>
            <span className="tlcta-faces">
              {row.faces.map((f, j) => (
                <span className={`tlcta-face gp-${f.gp}`} key={j}>
                  <span className="tlcta-ini">{f.ini}</span>
                  <span className="tlcta-nm">{f.nm}</span>
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

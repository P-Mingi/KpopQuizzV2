import Link from 'next/link';

// Home CTA band announcing the tier list maker (Home.dc.html): a full-bleed
// gradient band under the nav. Static, its own colour, does not disturb the
// surrounding blocks. No emoji (the mini tier preview uses coloured letter chips).
export function TierListHomeCta(): React.ReactElement {
  const mini: Array<{ label: string; color: string }> = [
    { label: 'S', color: '#E8457A' }, { label: 'A', color: '#F5894D' }, { label: 'B', color: '#EBB33E' },
  ];
  return (
    <section
      aria-label="K-pop tier lists"
      style={{
        borderRadius: 20, overflow: 'hidden', margin: '24px 0',
        background: 'linear-gradient(120deg, #E8457A, var(--photocard-plum, #A83A8F) 55%, var(--photocard-violet, #7B3FA8))',
        color: '#fff', padding: '26px 24px',
        display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap',
      }}
      data-testid="home-tier-cta"
    >
      <div style={{ flex: 1, minWidth: 260 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#ffd1e2' }}>New on KpopQuiz</div>
        <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.08, margin: '8px 0 8px' }}>Make your K-pop tier list</h2>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', maxWidth: '52ch', margin: '0 0 16px' }}>
          Drag your bias to the top. Rank members, title tracks, whole discographies. Then share the card everyone screenshots.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/tier-list/new" data-testid="home-cta-start"
            style={{ display: 'inline-flex', alignItems: 'center', height: 48, padding: '0 22px', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none', background: '#fff', color: 'var(--brand-dark)' }}>Start a tier list</Link>
          <Link href="/tier-list" data-testid="home-cta-browse"
            style={{ display: 'inline-flex', alignItems: 'center', height: 48, padding: '0 22px', borderRadius: 12, fontWeight: 700, fontSize: 15, textDecoration: 'none', background: 'rgba(255,255,255,0.10)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }}>
            Browse tier lists
          </Link>
        </div>
      </div>
      <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 6, width: 220, flex: 'none' }}>
        {mini.map((m) => (
          <div key={m.label} style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.12)', borderRadius: 12, overflow: 'hidden', minHeight: 44 }}>
            <span style={{ width: 44, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 20, background: m.color, alignSelf: 'stretch' }}>{m.label}</span>
            <span style={{ display: 'flex', gap: 6, padding: '0 10px' }}>
              <span style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.28)' }} />
              <span style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.22)' }} />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

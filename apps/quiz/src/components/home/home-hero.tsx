import Link from 'next/link';

// Hero. The "fans playing now" counter moved into the ActivityTicker (it now
// doubles as the live bar's quiet-state fallback), so it is not duplicated here.
export function HomeHero(): React.ReactElement {
  return (
    <section style={{ padding: '20px 0', textAlign: 'center' }}>
      {/* §14c - challenge-hook headline */}
      <h1 style={{
        fontSize: 'clamp(32px, 6vw, 48px)', fontWeight: 800,
        letterSpacing: '-0.025em', lineHeight: 1.04, margin: 0,
      }}>
        Are you a{' '}
        <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>real fan?</span>
      </h1>
      {/* Keyword subline promoted to H2 for SEO; visible styling unchanged. */}
      <h2 style={{
        marginTop: 12, marginBottom: 0, fontSize: 15, fontWeight: 400, color: 'var(--text-secondary)',
        maxWidth: 460, marginLeft: 'auto', marginRight: 'auto',
      }}>
        Prove it. Play K-pop quizzes and see where you rank.
      </h2>

      {/* §2a - two CTAs */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
        <Link href="/quizzes" className="btn-primary" aria-label="Browse quizzes">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ marginRight: 6 }}><path d="M8 5v14l11-7z" /></svg>
          Browse quizzes
        </Link>
        <Link href="/create" className="btn-outline" aria-label="Create a quiz">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ marginRight: 6 }}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Create a quiz
        </Link>
      </div>
    </section>
  );
}

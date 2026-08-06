import Link from 'next/link';

import { OrbitMark } from '@/components/verse/brand/verse-wordmarks';

// PUSH-GATE-1 (VERSE_PUBLIC): the single honest teaser shown at /verse while the Verse is
// hidden from the public. No countdown, no fake screenshots - one true sentence and the two
// doors we keep open (the covenant, and the games to play meanwhile). Verse-scoped tokens,
// light + dark. This is the ONE Verse page that stays indexable while hidden.
export function VerseTeaser(): React.ReactElement {
  return (
    <div className="verse-scope" style={{ minHeight: '68vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 20px' }}>
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <OrbitMark size={52} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--verse-brand-text, var(--text-tertiary))' }}>
            KpopVerse
          </p>
          <h1 style={{ margin: 0, fontSize: 'clamp(30px, 6vw, 44px)', lineHeight: 1.08, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--verse-ink, var(--text-primary))', textWrap: 'balance' }}>
            The Verse is being built
          </h1>
          <p style={{ margin: '0 auto', maxWidth: 460, fontSize: 16, lineHeight: 1.65, color: 'var(--text-secondary)' }}>
            A fan-built BTS encyclopedia, written by ARMY curators with a source on every fact.
            We are building it in the open and it opens when it is ready.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 4 }}>
          <Link href="/verse/promises" style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 44, padding: '0 20px', borderRadius: 12,
            background: 'var(--verse-cta, var(--verse-accent))', color: 'var(--verse-cta-text, var(--verse-accent-text, #fff))',
            fontSize: 14, fontWeight: 700, textDecoration: 'none',
          }}>
            What we promise <Arrow />
          </Link>
          <Link href="/games" style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 44, padding: '0 20px', borderRadius: 12,
            border: '1px solid var(--verse-line, var(--border))', color: 'var(--verse-ink, var(--text-primary))',
            fontSize: 14, fontWeight: 700, textDecoration: 'none',
          }}>
            Play while you wait <Arrow />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Arrow(): React.ReactElement {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

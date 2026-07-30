'use client';

import Link from 'next/link';

import { OrbitLockup } from '@/components/verse/brand/verse-wordmarks';
import { WorldToggle } from '@/components/layout/world-toggle';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { LocaleSwitcher } from '@/components/layout/locale-switcher';

// V-IDENTITY step 2 (surface: footer) - the Verse world's own footer. Verse voice,
// Verse links, the covenant, the soft network line + the world toggle. No Play
// link farm. Rendered only on Verse routes (SiteFooter picks by world).
const eyebrow: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.14em', margin: '0 0 12px' };
const linkStyle: React.CSSProperties = { display: 'block', fontSize: 13.5, color: 'var(--text-secondary)', textDecoration: 'none', marginBottom: 9 };

export function VerseFooter(): React.ReactElement {
  return (
    <footer style={{ padding: '44px 16px 22px', background: 'var(--surface-alt)', borderTop: '1px solid var(--border)' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 40, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Brand + voice */}
          <div style={{ maxWidth: 380 }}>
            <OrbitLockup height={22} color="var(--text-primary)" />
            <p style={{ margin: '14px 0 0', fontSize: 14, lineHeight: 1.65, color: 'var(--text-secondary)' }}>
              Fans build their fandom&rsquo;s home here. Sourced, fan-run, and yours to shape.
            </p>
            <Link href="/verse" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 13, fontWeight: 700, color: 'var(--verse-brand-text)', textDecoration: 'none' }}>
              Run your fandom&rsquo;s home
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>

          {/* Verse links + the covenant. No Play link farm. */}
          <nav style={{ display: 'flex', gap: 56, flexWrap: 'wrap' }} aria-label="Verse">
            <div>
              <p style={eyebrow}>Explore</p>
              <Link href="/verse" style={linkStyle}>Fandoms</Link>
              <Link href="/leaderboard" style={linkStyle}>Community</Link>
              <Link href="/search" style={linkStyle}>Search</Link>
            </div>
            <div>
              <p style={eyebrow}>The covenant</p>
              <Link href="/verse/promises" style={linkStyle}>Our promises</Link>
              <Link href="/verse" style={linkStyle}>Become a curator</Link>
            </div>
          </nav>
        </div>

        {/* Soft network line + the world toggle + theme/locale. */}
        <div style={{ marginTop: 34, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <Link href="/" style={{ fontSize: 11, color: 'var(--text-tertiary)', textDecoration: 'none' }}>part of the kpopquiz.org network</Link>
            <WorldToggle />
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <LocaleSwitcher />
            <ThemeToggle />
          </span>
        </div>
      </div>
    </footer>
  );
}

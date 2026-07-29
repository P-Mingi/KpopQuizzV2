'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { TopNavLinks } from './top-nav-links';
import { WorldToggle } from './world-toggle';
import { worldForPath } from '@/lib/world';

/**
 * Desktop top-nav shell. Client component so the world (derived from usePathname)
 * is baked into the static HTML per URL - the header carries the right data-world
 * and accent on first paint, no flash, and a crawler fetching /verse/bts sees the
 * Verse chrome exactly as a user would. Server-only bits (logo + the auth islands)
 * are passed in as props so this stays a thin client wrapper. CHROME ONLY.
 */
export function TopNavBar({ logo, themeToggle, bell, profile }: {
  logo: React.ReactNode; themeToggle: React.ReactNode; bell: React.ReactNode; profile: React.ReactNode;
}): React.ReactElement {
  const world = worldForPath(usePathname());
  const verse = world === 'verse';

  return (
    <header
      className="top-nav"
      data-world={world}
      style={{
        position: 'sticky', top: 0, zIndex: 30,
        // Verse world wears a faint violet tint + border so it reads as a different
        // place; Play keeps its exact current chrome.
        background: verse
          ? 'color-mix(in srgb, #7c5cfc 7%, color-mix(in srgb, var(--bg-primary) 92%, transparent))'
          : 'color-mix(in srgb, var(--bg-primary) 92%, transparent)',
        backdropFilter: 'blur(12px)',
        borderBottom: verse
          ? '1px solid color-mix(in srgb, #7c5cfc 32%, var(--border))'
          : '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px', maxWidth: 1240, margin: '0 auto' }}>
        {logo}

        <WorldToggle />

        <TopNavLinks world={world} />

        <div style={{ flex: 1 }} />

        {themeToggle}

        {/* Search */}
        <Link href="/search" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 10,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', textDecoration: 'none',
          fontSize: 13, fontWeight: 600, transition: 'background 120ms ease',
        }}>
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <span className="top-nav-search-label">Search</span>
        </Link>

        {/* Create */}
        <Link href="/create" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 10,
          background: 'var(--brand-btn)', border: 'none',
          color: 'var(--accent-fg)', textDecoration: 'none',
          fontSize: 13, fontWeight: 600, transition: 'background 120ms ease',
        }}>
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="top-nav-create-label">Create</span>
        </Link>

        {bell}
        {profile}
      </div>
    </header>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { worldForPath, OTHER_WORLD, WORLD_HOME, type World } from '@/lib/world';
import { rememberWorld } from '@/lib/world-preference';

// W-NAV - single-button world door. Shows only the OTHER world's label as a
// single link: on Play pages a dark "Verse" button, on Verse pages a pink/light
// "Play" button. One tap switches worlds, cleaner than the old segmented pill.
function WorldGlyph({ world, size = 13 }: { world: World; size?: number }): React.ReactElement {
  if (world === 'play') {
    return (
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="9 7 17 12 9 17 9 7" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2z" /><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2z" />
    </svg>
  );
}

export function WorldToggle({ compact = false }: { compact?: boolean } = {}): React.ReactElement {
  const current = worldForPath(usePathname());
  const target = OTHER_WORLD[current];
  const label = target === 'play' ? 'Play' : 'Verse';

  // On Play pages: dark button (charcoal/purple) labeled "Verse"
  // On Verse pages: pink/light button labeled "Play"
  const isGoingToVerse = target === 'verse';

  const style: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: compact ? 4 : 6,
    padding: compact ? '5px 10px' : '6px 14px',
    borderRadius: compact ? 8 : 10,
    fontSize: compact ? 12 : 13, fontWeight: 700,
    textDecoration: 'none', lineHeight: 1,
    transition: 'opacity 120ms ease, transform 120ms ease',
    flexShrink: 0,
    border: 'none',
    // Play -> Verse: fixed dark charcoal button (not theme-dependent)
    // Verse -> Play: pink brand button
    background: isGoingToVerse ? '#1e1e2e' : 'var(--brand-btn, var(--brand))',
    color: isGoingToVerse ? '#e8e6f0' : '#fff',
  };

  return (
    <Link
      href={WORLD_HOME[target]}
      onClick={() => rememberWorld(target)}
      className="world-toggle"
      aria-label={`Switch to ${label}`}
      data-world-door={target}
      style={style}
    >
      <WorldGlyph world={target} size={compact ? 12 : 13} />
      {label}
    </Link>
  );
}

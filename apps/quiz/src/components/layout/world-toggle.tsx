'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { worldForPath, WORLD_ACCENT, WORLD_HOME, type World } from '@/lib/world';
import { rememberWorld } from '@/lib/world-preference';

// W-NAV - the segmented Play|Verse switcher. CONTEXT-AWARE, never a redirect: it
// highlights the world the current URL belongs to and offers the other world as a
// quiet door. Same component in both worlds, themed by the active world's accent
// (pink in Play, violet in Verse). Client component so usePathname bakes the right
// highlight into the static HTML for each URL (no flash, crawler-correct).
function Segment({ world, current, compact }: { world: World; current: World; compact: boolean }): React.ReactElement {
  const active = world === current;
  const label = world === 'play' ? 'Play' : 'Verse';
  const accent = WORLD_ACCENT[world];

  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: compact ? 0 : 5,
    padding: compact ? '4px 9px' : '5px 12px', borderRadius: compact ? 6 : 7,
    fontSize: compact ? 12 : 13, fontWeight: 700,
    textDecoration: 'none', lineHeight: 1, transition: 'color 120ms ease, background 120ms ease',
  };

  if (active) {
    // The current world: solid accent chip, not a link (you are already here).
    return (
      <span aria-current="true" style={{ ...base, background: accent, color: '#fff' }}>
        {!compact && <WorldGlyph world={world} />}
        {label}
      </span>
    );
  }

  // The other world: a quiet door. A deliberate click records the preference.
  return (
    <Link
      href={WORLD_HOME[world]}
      onClick={() => rememberWorld(world)}
      style={{ ...base, background: 'transparent', color: 'var(--text-secondary)' }}
      data-world-door={world}
    >
      {!compact && <WorldGlyph world={world} />}
      {label}
    </Link>
  );
}

function WorldGlyph({ world }: { world: World }): React.ReactElement {
  if (world === 'play') {
    // Controller-ish play mark.
    return (
      <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="9 7 17 12 9 17 9 7" />
      </svg>
    );
  }
  // Verse: the two-panel mark reused from the old Verse tab.
  return (
    <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2z" /><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2z" />
    </svg>
  );
}

export function WorldToggle({ compact = false }: { compact?: boolean } = {}): React.ReactElement {
  const world = worldForPath(usePathname());
  return (
    <div
      className="world-toggle"
      role="group"
      aria-label="Switch between Play and Verse"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 2, padding: compact ? 2 : 3,
        borderRadius: compact ? 8 : 10, background: 'var(--surface-alt, var(--bg-surface))',
        border: '1px solid var(--border)', flexShrink: 0,
      }}
    >
      <Segment world="play" current={world} compact={compact} />
      <Segment world="verse" current={world} compact={compact} />
    </div>
  );
}

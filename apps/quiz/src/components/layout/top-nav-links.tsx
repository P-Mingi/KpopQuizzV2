'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { worldForPath, type World } from '@/lib/world';

interface NavItem { label: string; href: string; match: readonly string[] }

// PLAY world tabs = the exact current games product (Verse moved to the toggle).
const PLAY_ITEMS: readonly NavItem[] = [
  { label: 'Home', href: '/', match: ['/trending', '/new', '/most-liked'] },
  { label: 'Quizzes', href: '/quizzes', match: ['/quizzes', '/q/'] },
  { label: 'Games', href: '/games', match: ['/games'] },
  { label: 'Blindtest', href: '/blindtest', match: ['/blindtest'] },
  { label: 'Community', href: '/leaderboard', match: ['/leaderboard'] },
] as const;

// VERSE world tabs (launch set): Fandoms (the /verse directory) + Community (shared).
// Discover / Idols are FUTURE - add them here when the Verse discovery home ships.
const VERSE_ITEMS: readonly NavItem[] = [
  { label: 'Fandoms', href: '/verse', match: ['/verse'] },
  { label: 'Community', href: '/leaderboard', match: ['/leaderboard'] },
] as const;

function itemsForWorld(world: World): readonly NavItem[] {
  return world === 'verse' ? VERSE_ITEMS : PLAY_ITEMS;
}

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const size = 14;
  const stroke = 'currentColor';
  const fill = active ? 'currentColor' : 'none';

  switch (name) {
    case 'Home':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'Quizzes':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16v14H8l-4 3z" />
        </svg>
      );
    case 'Games':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z" />
          <path d="M17 4h3v3a3 3 0 01-3 3M7 4H4v3a3 3 0 003 3" />
        </svg>
      );
    case 'Blindtest':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
      );
    case 'Fandoms':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2z" /><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2z" />
        </svg>
      );
    case 'Community':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="7" r="3.4" /><path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1z" />
          <circle cx="17.5" cy="8.5" r="2.4" /><path d="M16.5 13.6A4.6 4.6 0 0 1 21.5 18v1H18" />
        </svg>
      );
    default:
      return null;
  }
}

/**
 * Desktop nav between the toggle and the right-side controls. Renders the tab set
 * for the world the current URL belongs to; active tab is bold + accent underline,
 * themed by the world (pink in Play, violet in Verse).
 */
export function TopNavLinks({ world: forced }: { world?: World } = {}) {
  const pathname = usePathname();
  const world = forced ?? worldForPath(pathname);
  // The active underline uses the world accent token set on the nav header, so
  // per-space theming (W-CUSTOM) can later retint it without touching this file.
  const accent = 'var(--world-accent, var(--brand))';
  const items = itemsForWorld(world);

  function isActive(item: NavItem) {
    if (item.href === '/' && pathname === '/') return true;
    if (item.href === '/') return false;
    if (pathname === item.href || pathname.startsWith(item.href + '/')) return true;
    return item.match.some((m) => pathname.startsWith(m));
  }

  return (
    <nav className="top-nav-tabs" style={{
      display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12,
      // In a tight row the LINKS clip cleanly; the brand and the world toggle
      // are shrink-proof (an overflowing logo once slid under the toggle).
      minWidth: 0, overflow: 'hidden',
    }} aria-label="Main navigation">
      {items.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 6,
              background: 'transparent',
              color: active ? 'var(--txt1)' : 'var(--txt2)',
              border: 'none', textDecoration: 'none',
              fontSize: 14, fontWeight: active ? 700 : 600,
              borderBottom: active ? `2px solid ${accent}` : '2px solid transparent',
              transition: 'color 120ms ease, border-color 120ms ease',
            }}
          >
            <NavIcon name={item.label} active={active} />
            <span className="top-nav-link-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

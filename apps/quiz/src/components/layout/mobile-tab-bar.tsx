'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { worldForPath, WORLD_ACCENT, isBuilderCanvas } from '@/lib/world';

interface Tab { label: string; href: string; match: readonly string[] }

// PLAY bottom bar = the exact current 5 tabs.
const PLAY_TABS: readonly Tab[] = [
  { label: 'Home', href: '/', match: ['/trending', '/new', '/most-liked'] },
  { label: 'Quizzes', href: '/quizzes', match: ['/quizzes', '/q/'] },
  { label: 'Blindtest', href: '/blindtest', match: ['/blindtest', '/blind-test'] },
  { label: 'Games', href: '/games', match: ['/games'] },
  { label: 'Community', href: '/leaderboard', match: ['/leaderboard'] },
] as const;

// VERSE bottom bar = Fandoms + Community (shared) + Profile. Phase B: Community
// and Profile point at their /verse mirrors so you stay in Verse chrome.
const VERSE_TABS: readonly Tab[] = [
  { label: 'Fandoms', href: '/verse', match: ['/verse'] },
  { label: 'Community', href: '/verse/community', match: ['/verse/community'] },
  { label: 'Profile', href: '/verse/me', match: ['/verse/me', '/verse/u/'] },
] as const;

/**
 * Fixed bottom tab bar. Mobile only (hidden on desktop via CSS). Swaps its tab
 * set by world: Play keeps its 5 (Home/Quizzes/Blindtest/Games/Community); Verse
 * shows Fandoms/Community/Profile. Community appears in both. Active tab is tinted
 * by the world accent (pink in Play, violet in Verse). Hidden on fullscreen
 * game/quiz pages for immersion (all Play routes).
 */
export function MobileTabBar() {
  const pathname = usePathname();

  // Hide during active quiz/game play + on the chrome-less builder canvas
  if (pathname.startsWith('/q/') || isBuilderCanvas(pathname)) return null;
  if (pathname.match(/\/games\/this-or-that\/[^/]+$/)) return null;
  if (pathname.match(/\/games\/name-all\/[^/]+$/)) return null;
  // ITERATION 6 PART D - the Verse carries its own mobile nav (top bar + drawer), so the global
  // bottom tab bar is hidden on /verse. Play keeps it everywhere else.
  if (worldForPath(pathname) === 'verse') return null;

  const world = worldForPath(pathname);
  const tabs = world === 'verse' ? VERSE_TABS : PLAY_TABS;
  const accent = WORLD_ACCENT[world];

  function isActive(tab: Tab) {
    if (tab.href === '/' && pathname === '/') return true;
    if (tab.href === '/') return false;
    if (pathname === tab.href || pathname.startsWith(tab.href + '/')) return true;
    return tab.match.some(m => pathname.startsWith(m));
  }
  // Most-specific match wins, so the /verse/community mirror does not also light
  // up Fandoms (/verse). Disjoint Play tabs are unaffected.
  const activeHref = tabs.filter(isActive).sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav
      className="mobile-tab-bar"
      data-world={world}
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'color-mix(in srgb, var(--bg) 95%, transparent)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border)',
        padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
      }}
      aria-label="Main navigation"
    >
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: 0 }}>
        {tabs.map((tab) => {
          const active = tab.href === activeHref;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                background: 'transparent', border: 'none',
                color: active ? accent : 'var(--txt3)',
                fontSize: 10, fontWeight: active ? 700 : 600, padding: '4px 8px',
                textDecoration: 'none',
              }}
            >
              <TabIcon name={tab.label} active={active} accent={accent} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function TabIcon({ name, active, accent }: { name: string; active: boolean; accent: string }) {
  const stroke = active ? accent : 'var(--txt3)';
  const fill = active ? 'currentColor' : 'none';
  const size = 20;

  switch (name) {
    case 'Fandoms':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5a2 2 0 0 1 2-2h5v18H6a2 2 0 0 1-2-2z" /><path d="M20 5a2 2 0 0 0-2-2h-5v18h5a2 2 0 0 0 2-2z" />
        </svg>
      );
    case 'Profile':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="8" r="3.6" /><path d="M5 20v-1a7 7 0 0 1 14 0v1z" />
        </svg>
      );
    case 'Home':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'Quizzes':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 4h16v14H8l-4 3z" />
        </svg>
      );
    case 'Games':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z" />
          <path d="M17 4h3v3a3 3 0 01-3 3M7 4H4v3a3 3 0 003 3" />
        </svg>
      );
    case 'Blindtest':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
      );
    case 'Community':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9" cy="7" r="3.4" /><path d="M3.5 20v-1a5.5 5.5 0 0 1 11 0v1z" />
          <circle cx="17.5" cy="8.5" r="2.4" /><path d="M16.5 13.6A4.6 4.6 0 0 1 21.5 18v1H18" />
        </svg>
      );
    default:
      return null;
  }
}

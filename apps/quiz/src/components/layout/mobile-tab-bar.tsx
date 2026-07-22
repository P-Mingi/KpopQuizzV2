'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Home', href: '/', match: ['/trending', '/new', '/most-liked'] },
  { label: 'Quizzes', href: '/quizzes', match: ['/quizzes', '/q/'] },
  { label: 'Blindtest', href: '/blindtest', match: ['/blindtest', '/blind-test'] },
  { label: 'Games', href: '/games', match: ['/games'] },
  { label: 'Community', href: '/leaderboard', match: ['/leaderboard'] },
] as const;

/**
 * Fixed bottom tab bar. Mobile only (hidden on desktop via CSS).
 * 5 items: Home · Quizzes · Blindtest · Games · Community. Create left the bar
 * (still reachable from the top nav and the home hero) so all five destinations
 * are first-class tabs. Hidden on fullscreen game/quiz pages for immersion.
 */
export function MobileTabBar() {
  const pathname = usePathname();

  // Hide during active quiz/game play
  if (pathname.startsWith('/q/')) return null;
  if (pathname.match(/\/games\/this-or-that\/[^/]+$/)) return null;
  if (pathname.match(/\/games\/name-all\/[^/]+$/)) return null;

  function isActive(tab: typeof TABS[number]) {
    if (tab.href === '/' && pathname === '/') return true;
    if (tab.href === '/') return false;
    if (pathname === tab.href || pathname.startsWith(tab.href + '/')) return true;
    return tab.match.some(m => pathname.startsWith(m));
  }

  return (
    <nav
      className="mobile-tab-bar"
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
        {TABS.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                background: 'transparent', border: 'none',
                color: active ? 'var(--brand)' : 'var(--txt3)',
                fontSize: 10, fontWeight: active ? 700 : 600, padding: '4px 8px',
                textDecoration: 'none',
              }}
            >
              <TabIcon name={tab.label} active={active} />
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function TabIcon({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? 'var(--brand)' : 'var(--txt3)';
  const fill = active ? 'currentColor' : 'none';
  const size = 20;

  switch (name) {
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

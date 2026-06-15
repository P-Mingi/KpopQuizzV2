'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Home', href: '/', match: ['/trending', '/new', '/most-liked'] },
  { label: 'Quizzes', href: '/quizzes', match: ['/quizzes', '/q/'] },
  { label: 'Create', href: '/create', match: ['/create'], cta: true },
  { label: 'Games', href: '/games', match: ['/games'] },
  { label: 'Leaderboard', href: '/leaderboard', match: ['/leaderboard'] },
] as const;

/**
 * Fixed bottom tab bar. Mobile only (hidden on desktop via CSS).
 * 5 items max (§1): Home · Quizzes · + Create · Games · Leaderboard.
 * Hidden on fullscreen game/quiz pages for immersion.
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
          if ('cta' in tab && tab.cta) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label="Create a quiz"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 44, height: 44, borderRadius: 9999, marginTop: -4,
                  background: 'var(--brand)', color: '#fff',
                  textDecoration: 'none', boxShadow: '0 4px 14px rgba(232,69,122,0.35)',
                }}
              >
                <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </Link>
            );
          }
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
    case 'Leaderboard':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2" />
        </svg>
      );
    default:
      return null;
  }
}

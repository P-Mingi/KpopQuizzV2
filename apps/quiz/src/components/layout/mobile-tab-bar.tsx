'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  {
    label: 'Home',
    href: '/',
    match: ['/q/', '/quizzes', '/trending', '/new', '/most-liked'],
  },
  {
    label: 'Games',
    href: '/games',
    match: ['/games'],
  },
  {
    label: 'Cards',
    href: '/cards',
    match: ['/cards'],
  },
  {
    label: 'Ranks',
    href: '/hall-of-fame',
    match: ['/hall-of-fame'],
  },
  {
    label: 'You',
    href: '/profile',
    match: ['/profile', '/u/'],
  },
] as const;

/**
 * Fixed bottom tab bar. Mobile only (hidden on desktop via CSS).
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
    return tab.match.some(m => pathname.startsWith(m));
  }

  return (
    <nav
      className="mobile-tab-bar"
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'color-mix(in srgb, var(--bg-primary) 95%, transparent)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--border)',
        padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
      }}
      aria-label="Main navigation"
    >
      <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', justifyContent: 'space-around', padding: 0 }}>
        {TABS.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                background: 'transparent', border: 'none',
                color: active ? 'var(--accent)' : 'var(--text-tertiary)',
                fontSize: 10, fontWeight: 600, padding: '4px 8px',
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
  const stroke = active ? 'var(--accent)' : 'var(--text-tertiary)';
  const fill = active ? 'currentColor' : 'none';
  const size = 20;

  switch (name) {
    case 'Home':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'Games':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z" />
          <path d="M17 4h3v3a3 3 0 01-3 3M7 4H4v3a3 3 0 003 3" />
        </svg>
      );
    case 'Cards':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z" />
        </svg>
      );
    case 'Ranks':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2" />
        </svg>
      );
    case 'You':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      );
    default:
      return null;
  }
}

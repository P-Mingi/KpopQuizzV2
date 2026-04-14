'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  {
    label: 'Quizzes',
    href: '/',
    match: ['/q/', '/quizzes', '/trending', '/new', '/most-liked'],
  },
  {
    label: 'Games',
    href: '/games',
    match: ['/games'],
  },
  {
    label: 'Create',
    href: '/create',
    match: ['/create'],
  },
  {
    label: 'Ranks',
    href: '/hall-of-fame',
    match: ['/hall-of-fame'],
  },
  {
    label: 'Profile',
    href: '/profile',
    match: ['/profile', '/u/'],
  },
] as const;

/**
 * Fixed bottom tab bar. Mobile only.
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
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-subtle bg-primary/95 backdrop-blur-sm"
      aria-label="Main navigation"
    >
      <div className="max-w-[960px] mx-auto">
        <div className="flex pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {TABS.map((tab) => {
            const active = isActive(tab);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center gap-[3px] pt-1 text-[9px] font-medium ${
                  active ? 'text-accent' : 'text-tertiary'
                }`}
              >
                <TabIcon name={tab.label} active={active} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function TabIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? 'var(--accent)' : 'var(--text-tertiary)';
  const size = 18;

  switch (name) {
    case 'Quizzes':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <circle cx="10" cy="10" r="7.5" />
          <path d="M8 8c0-1.1.9-2 2-2s2 .9 2 2c0 .7-.4 1.3-1 1.6-.4.2-.5.4-.5.5V11" />
          <circle cx="10.5" cy="13" r="0.6" fill={color} />
        </svg>
      );
    case 'Games':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" />
          <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" />
          <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" />
          <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" />
        </svg>
      );
    case 'Create':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M10 3V17M3 10H17" />
        </svg>
      );
    case 'Ranks':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 2.5l2.5 5 5.5 1-4 3.5 1 5.5L10 14.5l-5 3 1-5.5-4-3.5 5.5-1z" />
        </svg>
      );
    case 'Profile':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
          <circle cx="10" cy="7" r="3.5" />
          <path d="M4 17C4 14 6.5 12 10 12C13.5 12 16 14 16 17" />
        </svg>
      );
    default:
      return null;
  }
}

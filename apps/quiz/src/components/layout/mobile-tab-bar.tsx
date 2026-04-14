'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Play', icon: 'play' },
  { href: '/create', label: 'Create', icon: 'create' },
  { href: '/games', label: 'Games', icon: 'games' },
  { href: '/hall-of-fame', label: 'Ranks', icon: 'chart' },
  { href: '/profile', label: 'Profile', icon: 'user' },
] as const;

type TabIcon = (typeof TABS)[number]['icon'];

/**
 * Fixed bottom tab bar. Mobile only. Hidden on quiz play routes for full
 * immersion.
 */
export function MobileTabBar() {
  const pathname = usePathname();

  // Hide during active quiz/game play so the answers get the full screen.
  if (pathname.startsWith('/q/') || pathname.startsWith('/games/name-all/')) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-subtle bg-primary/95 backdrop-blur-sm"
      aria-label="Main navigation"
    >
      <div className="max-w-[960px] mx-auto">
        <div className="flex pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {TABS.map((tab) => {
            const isActive =
              tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center gap-[3px] pt-1 text-[9px] font-medium ${
                  isActive ? 'text-accent' : 'text-tertiary'
                }`}
              >
                <TabIconSvg name={tab.icon} active={isActive} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function TabIconSvg({ name, active }: { name: TabIcon; active: boolean }) {
  const color = active ? 'var(--accent)' : 'var(--text-tertiary)';
  const size = 18;
  switch (name) {
    case 'play':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M6 4L16 10L6 16V4Z" fill={color} />
        </svg>
      );
    case 'create':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 3V17M3 10H17" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'chart':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M5 15V8M10 15V5M15 15V10" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'games':
      return (
        <svg width={size} height={size} viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="5.5" height="5.5" rx="1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <rect x="10.5" y="2" width="5.5" height="5.5" rx="1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <rect x="2" y="10.5" width="5.5" height="5.5" rx="1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
          <rect x="10.5" y="10.5" width="5.5" height="5.5" rx="1" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'user':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="7" r="3.5" stroke={color} strokeWidth="1.5" />
          <path d="M4 17C4 14 6.5 12 10 12C13.5 12 16 14 16 17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

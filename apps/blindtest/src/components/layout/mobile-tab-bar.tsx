'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Play', icon: 'play' },
  { href: '/leaderboard', label: 'Ranks', icon: 'chart' },
  { href: '/profile', label: 'Profile', icon: 'user' },
] as const;

type TabIcon = (typeof tabs)[number]['icon'];

export function MobileTabBar() {
  const pathname = usePathname();

  // Hidden during active gameplay and party
  if (pathname.startsWith('/play') || pathname.startsWith('/party/')) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 border-t border-subtle bg-primary/95 backdrop-blur-sm z-50"
      aria-label="Main navigation"
    >
      <div className="max-w-[960px] mx-auto">
        <div className="flex pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {tabs.map((tab) => {
            const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center gap-0.5 pt-1 text-[9px] font-medium ${
                  isActive ? 'text-accent' : 'text-ghost'
                }`}
              >
                <TabIcon name={tab.icon} active={isActive} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function TabIcon({ name, active }: { name: TabIcon; active: boolean }) {
  const color = active ? 'var(--accent)' : 'var(--text-ghost)';
  const size = 18;

  switch (name) {
    case 'play':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <path d="M3 9l3.5-3.5 3.5 3.5 3.5-3.5 3.5 3.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M3 14l3.5-3.5 3.5 3.5 3.5-3.5 3.5 3.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'chart':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <path d="M10 2l2.3 4.6L17 7.5l-3.5 3.4.8 4.8L10 13.5l-4.3 2.2.8-4.8L3 7.5l4.7-.9z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'user':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="7" r="3.5" stroke={color} strokeWidth="1.5" />
          <path d="M4 17C4 14 6.5 12 10 12C13.5 12 16 14 16 17" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

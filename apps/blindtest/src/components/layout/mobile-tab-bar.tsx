'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Play', icon: 'play' },
  { href: '/daily', label: 'Daily', icon: 'clock' },
  { href: '/leaderboard', label: 'Ranks', icon: 'chart' },
  { href: '/profile', label: 'Profile', icon: 'user' },
] as const;

type TabIcon = (typeof tabs)[number]['icon'];

export function MobileTabBar() {
  const pathname = usePathname();

  // Hidden during gameplay for full immersion.
  if (pathname.startsWith('/play')) return null;

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
          <path d="M6 4L16 10L6 16V4Z" fill={color} />
        </svg>
      );
    case 'clock':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7" stroke={color} strokeWidth="1.5" />
          <path d="M10 6V10L13 13" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
    case 'chart':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <path d="M5 15V8M10 15V5M15 15V10" stroke={color} strokeWidth="2" strokeLinecap="round" />
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

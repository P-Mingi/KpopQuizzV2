'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/', label: 'Home', icon: 'home' },
  { href: '/daily', label: 'Daily', icon: 'clock' },
  { href: '/leaderboard', label: 'Ranks', icon: 'chart' },
  { href: '/profile', label: 'Profile', icon: 'user' },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border-default bg-bg-primary/95 backdrop-blur-sm z-50">
      <div className="max-w-[960px] mx-auto">
        <div className="flex py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {tabs.map((tab) => {
            const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex-1 flex flex-col items-center gap-0.5 pt-1 text-[10px] font-medium ${
                  isActive ? 'text-pink-400' : 'text-text-tertiary'
                }`}
              >
                <NavIcon name={tab.icon} active={isActive} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const color = active ? 'var(--pink-400)' : 'var(--text-tertiary)';
  const size = 20;

  switch (name) {
    case 'home':
      return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
          <path d="M3 10L10 3L17 10V17H12V13H8V17H3V10Z" fill={color} />
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

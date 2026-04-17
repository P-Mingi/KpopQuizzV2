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

  // Hidden during active gameplay, party, and challenge
  if (pathname.startsWith('/play') || pathname.startsWith('/party/') || pathname.startsWith('/challenge/')) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 flex pt-1.5 pb-5 border-t border-[#E8E6E0] dark:border-[#1a1a22] bg-white dark:bg-[#0D0D12] z-40"
      aria-label="Main navigation"
    >
      {tabs.map((tab) => {
        const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 flex flex-col items-center gap-[2px] text-[8px] font-semibold ${
              isActive ? 'text-[#D4537E]' : 'text-[#B4B2A9] dark:text-[rgba(255,255,255,0.3)]'
            }`}
          >
            <TabIconSvg name={tab.icon} active={isActive} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function TabIconSvg({ name, active }: { name: TabIcon; active: boolean }) {
  const color = active ? '#D4537E' : 'currentColor';
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

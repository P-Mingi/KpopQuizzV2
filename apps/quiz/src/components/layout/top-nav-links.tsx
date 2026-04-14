'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Quizzes', href: '/', match: ['/q/', '/quizzes', '/trending', '/new', '/most-liked'] },
  { label: 'Games', href: '/games', match: ['/games'] },
  { label: 'Create', href: '/create', match: ['/create'] },
  { label: 'Ranks', href: '/hall-of-fame', match: ['/hall-of-fame'] },
] as const;

/** Desktop segmented control nav between the logo and the identity pill. */
export function TopNavLinks() {
  const pathname = usePathname();

  function isActive(item: typeof NAV_ITEMS[number]) {
    if (item.href === '/' && pathname === '/') return true;
    return item.match.some(m => pathname.startsWith(m));
  }

  return (
    <nav className="hidden md:flex gap-[1px] bg-elevated rounded-[10px] p-[3px]" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`px-3 py-[6px] rounded-[8px] text-[11px] font-medium transition-all relative ${
            isActive(item)
              ? 'bg-surface text-primary shadow-sm'
              : 'text-tertiary hover:text-secondary'
          }`}
        >
          {item.label}
          {item.label === 'Games' && (
            <span className="absolute top-1 right-1 w-[5px] h-[5px] rounded-full bg-accent" />
          )}
        </Link>
      ))}
    </nav>
  );
}

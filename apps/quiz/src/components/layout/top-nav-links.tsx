'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { label: 'Home', href: '/', match: ['/trending', '/new', '/most-liked'] },
  { label: 'Quizzes', href: '/quizzes', match: ['/quizzes', '/q/'] },
  { label: 'Games', href: '/games', match: ['/games'] },
  { label: 'Leaderboard', href: '/leaderboard', match: ['/leaderboard'] },
] as const;

function NavIcon({ name, active }: { name: string; active: boolean }) {
  const size = 14;
  const stroke = 'currentColor';
  const fill = active ? 'currentColor' : 'none';

  switch (name) {
    case 'Home':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'Quizzes':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16v14H8l-4 3z" />
        </svg>
      );
    case 'Games':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0z" />
          <path d="M17 4h3v3a3 3 0 01-3 3M7 4H4v3a3 3 0 003 3" />
        </svg>
      );
    case 'Leaderboard':
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2" />
        </svg>
      );
    default:
      return null;
  }
}

/** Desktop nav between the logo and the right-side controls. Active = bold + underline (§1). */
export function TopNavLinks() {
  const pathname = usePathname();

  function isActive(item: typeof NAV_ITEMS[number]) {
    if (item.href === '/' && pathname === '/') return true;
    if (item.href === '/') return false;
    if (pathname === item.href || pathname.startsWith(item.href + '/')) return true;
    return item.match.some(m => pathname.startsWith(m));
  }

  return (
    <nav className="top-nav-tabs" style={{
      display: 'flex', alignItems: 'center', gap: 4, marginLeft: 12,
    }} aria-label="Main navigation">
      {NAV_ITEMS.map((item) => {
        const active = isActive(item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 12px', borderRadius: 6,
              background: 'transparent',
              color: active ? 'var(--txt1)' : 'var(--txt2)',
              border: 'none', textDecoration: 'none',
              fontSize: 14, fontWeight: active ? 700 : 600,
              borderBottom: active ? '2px solid var(--brand)' : '2px solid transparent',
              transition: 'color 120ms ease, border-color 120ms ease',
            }}
          >
            <NavIcon name={item.label} active={active} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

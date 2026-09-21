'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// DESIGN-SPEC 3 mobile bottom nav: 5 tabs (Home, Quizzes, Blindtest, Social, You).
// Shown only <= 760px via CSS (.uxv1-mnav). Social -> /leaderboard until Phase 7.
type Tab = { label: string; href: string; icon: React.ReactNode; match: (p: string) => boolean };

const TABS: Tab[] = [
  { label: 'Home', href: '/', icon: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" strokeWidth="1.8" stroke="currentColor" fill="none" strokeLinejoin="round" strokeLinecap="round" />, match: (p) => p === '/' },
  { label: 'Quizzes', href: '/quizzes', icon: <path d="M4 5h16M4 12h16M4 19h10" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />, match: (p) => p.startsWith('/quizzes') || p.startsWith('/q/') },
  { label: 'Blindtest', href: '/blindtest', icon: <path d="M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm10-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" strokeWidth="1.7" stroke="currentColor" fill="none" strokeLinejoin="round" />, match: (p) => p.startsWith('/blindtest') },
  { label: 'Social', href: '/leaderboard', icon: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" strokeWidth="1.7" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />, match: (p) => p.startsWith('/leaderboard') || p.startsWith('/community') },
  { label: 'You', href: '/profile', icon: <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" strokeWidth="1.7" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />, match: (p) => p.startsWith('/profile') || p.startsWith('/me') || p.startsWith('/u/') },
];

export function UxMobileNav(): React.ReactElement {
  const pathname = usePathname() || '/';
  return (
    <nav className="uxv1-mnav" aria-label="Primary mobile">
      {TABS.map((t) => {
        const active = t.match(pathname);
        return (
          <Link key={t.label} href={t.href} className={`uxv1-mnav-item${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">{t.icon}</svg>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

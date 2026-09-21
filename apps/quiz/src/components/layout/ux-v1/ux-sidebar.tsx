'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Logo } from '@/components/layout/logo';
import { UxQuizCount } from './ux-quiz-count';
import { UxSidebarUser } from './ux-sidebar-user';

// DESIGN-SPEC 3 sidebar. Client only for the active-route highlight (usePathname);
// its markup is still server-rendered to HTML then hydrated, so the nav links are
// in the initial document. Order + labels are the spec's. Community points at
// /leaderboard until Phase 7 ships /community (no dead-end link in the interim).
type Item = { label: string; href: string; icon: React.ReactNode; match?: (p: string) => boolean; badge?: 'quizCount' };

const ICON = {
  dashboard: <path d="M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6V11h-6v9zm0-16v5h6V4h-6z" />,
  quizzes: <path d="M4 5h16M4 12h16M4 19h10" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />,
  blindtest: <path d="M9 18V6l10-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm10-2a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" strokeWidth="1.7" stroke="currentColor" fill="none" strokeLinejoin="round" />,
  community: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm14 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" strokeWidth="1.7" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  leaderboard: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" strokeWidth="1.7" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round" />,
  create: <path d="M12 5v14M5 12h14" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" />,
};

const PLAY: Item[] = [
  { label: 'Dashboard', href: '/', icon: ICON.dashboard, match: (p) => p === '/' },
  { label: 'Quizzes', href: '/quizzes', icon: ICON.quizzes, badge: 'quizCount', match: (p) => p.startsWith('/quizzes') || p.startsWith('/q/') },
  { label: 'Blindtest', href: '/blindtest', icon: ICON.blindtest, match: (p) => p.startsWith('/blindtest') },
];
const SOCIAL: Item[] = [
  { label: 'Community', href: '/leaderboard', icon: ICON.community, match: (p) => p.startsWith('/community') },
  { label: 'Leaderboard', href: '/leaderboard', icon: ICON.leaderboard, match: (p) => p.startsWith('/leaderboard') },
  { label: 'Create', href: '/create', icon: ICON.create, match: (p) => p.startsWith('/create') },
];

function NavItem({ item, active }: { item: Item; active: boolean }): React.ReactElement {
  return (
    <Link href={item.href} className={`uxv1-nav-item${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
      <svg className="uxv1-nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{item.icon}</svg>
      <span className="uxv1-nav-label">{item.label}</span>
      {item.badge === 'quizCount' ? <UxQuizCount /> : null}
    </Link>
  );
}

export function UxSidebar(): React.ReactElement {
  const pathname = usePathname() || '/';
  const isActive = (item: Item): boolean => (item.match ? item.match(pathname) : pathname.startsWith(item.href));

  return (
    <aside className="uxv1-sidebar" aria-label="Primary">
      <div className="uxv1-sidebar-logo"><Logo size="md" /></div>
      <nav className="uxv1-nav">
        <p className="uxv1-nav-section">Play</p>
        {PLAY.map((it) => <NavItem key={it.label} item={it} active={isActive(it)} />)}
        <p className="uxv1-nav-section">Social</p>
        {SOCIAL.map((it) => <NavItem key={it.label} item={it} active={isActive(it)} />)}
      </nav>
      <div className="uxv1-sidebar-foot"><UxSidebarUser /></div>
    </aside>
  );
}

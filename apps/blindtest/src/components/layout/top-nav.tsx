'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme-provider';
import { PlayerIdentityPill } from '@/components/layout/player-identity-pill';
import { useDailyStatus } from '@/hooks/use-daily-status';

interface NavUser {
  username: string;
  streak: number;
  level: number;
  xpProgress: number;
  avatarBg?: string;
  avatarText?: string;
}

export function TopNav({ user }: { user?: NavUser }) {
  const dailyStatus = useDailyStatus();
  const dailyUnplayed = dailyStatus !== null && !dailyStatus.hasPlayed;

  return (
    <header className="px-4 md:px-6 pt-4 md:pt-0 md:h-12 md:border-b md:border-subtle flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold text-lg md:text-base leading-none">
          <span className="text-primary">kpop</span>
          <span className="text-accent">blind</span>
          <span className="text-primary">test</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="/" label="Play" />
          <NavLink href="/daily" label="Daily" dot={dailyUnplayed} />
          <NavLink href="/leaderboard" label="Ranks" />
          <NavLink href="/profile" label="Profile" />
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        {user && user.streak > 0 && (
          <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-semibold text-streak">
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1C6 1 3 4 3 7C3 8.7 4.3 10 6 10C7.7 10 9 8.7 9 7C9 4 6 1 6 1Z" fill="currentColor"/>
            </svg>
            {user.streak}d
          </span>
        )}
        {user ? <PlayerIdentityPill {...user} /> : <PlayerIdentityPill />}
      </div>
    </header>
  );
}

function NavLink({ href, label, dot }: { href: string; label: string; dot?: boolean }) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`text-xs font-medium px-3.5 py-2 rounded-lg transition-colors inline-flex items-center gap-1.5 ${
        isActive ? 'text-accent bg-accent-bg' : 'text-ghost hover:text-tertiary'
      }`}
    >
      {label}
      {dot && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full bg-accent"
          aria-label="New"
        />
      )}
    </Link>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-elevated transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 1V2.5M8 13.5V15M1 8H2.5M13.5 8H15M3.05 3.05L4.11 4.11M11.89 11.89L12.95 12.95M3.05 12.95L4.11 11.89M11.89 4.11L12.95 3.05" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M14 8.5A6 6 0 017.5 2 6 6 0 1014 8.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  );
}

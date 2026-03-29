'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/components/theme-provider';

export function TopNav({ user }: { user?: { username: string; streak: number } }) {
  return (
    <nav className="flex justify-between items-center px-4 md:px-6 py-3.5 border-b border-border-default">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-base font-semibold">
          kpop<span style={{ color: 'var(--logo-accent)' }}>blind</span>test
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-4">
          <NavLink href="/" label="Home" />
          <NavLink href="/daily" label="Daily" />
          <NavLink href="/leaderboard" label="Leaderboard" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        {user && user.streak > 0 && (
          <span className="text-xs text-streak font-medium flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1C6 1 3 4 3 7C3 8.7 4.3 10 6 10C7.7 10 9 8.7 9 7C9 4 6 1 6 1Z" fill="currentColor"/>
            </svg>
            {user.streak}d
          </span>
        )}
        {user ? (
          <Link href="/profile" className="w-8 h-8 rounded-full bg-pink-400 flex items-center justify-center text-xs font-semibold text-bg-primary">
            {user.username.charAt(0).toUpperCase()}
          </Link>
        ) : (
          <Link href="/login" className="text-xs text-text-secondary font-medium hover:text-text-primary transition-colors">
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <Link href={href} className={`text-sm font-medium transition-colors ${
      isActive ? 'text-pink-400' : 'text-text-tertiary hover:text-text-secondary'
    }`}>
      {label}
    </Link>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
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

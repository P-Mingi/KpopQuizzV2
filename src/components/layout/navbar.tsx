import Link from 'next/link';

import { createServerClient } from '@/lib/supabase/server';
import { UserDropdown } from '@/components/layout/user-dropdown';

export async function Navbar(): Promise<React.ReactElement> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: { username: string; avatar_url: string | null; avatar_bg: string; avatar_text: string; xp: number } | null = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url, avatar_bg, avatar_text, xp')
      .eq('id', user.id)
      .maybeSingle();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-50 bg-surface-primary border-b border-border-light">
      <nav className="flex items-center justify-between h-14 max-w-2xl mx-auto px-4">
        <Link href="/" className="text-lg font-medium">
          <span className="text-txt-primary">kpop</span>
          <span className="text-accent-pink">quiz</span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/games"
            className="text-sm text-txt-secondary hover:text-txt-primary transition-colors hidden sm:inline"
          >
            Games
          </Link>
          <Link
            href="/create"
            aria-label="Create quiz"
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium bg-surface-primary border border-border-light rounded-full hover:border-border-medium transition-colors"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className="text-txt-primary"
            >
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <span className="hidden sm:inline">Create</span>
          </Link>

          {profile ? (
            <UserDropdown
              username={profile.username}
              avatarUrl={profile.avatar_url}
              avatarBg={profile.avatar_bg}
              avatarText={profile.avatar_text}
              xp={profile.xp}
            />
          ) : (
            <Link
              href="/login"
              className="text-sm text-txt-secondary hover:text-txt-primary transition-colors"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

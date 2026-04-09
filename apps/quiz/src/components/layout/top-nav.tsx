import { createServerClient } from '@/lib/supabase/server';
import { getLevelInfo } from '@/lib/constants';
import { Logo } from './logo';
import { PlayerIdentityPill } from './player-identity-pill';
import { TopNavLinks } from './top-nav-links';

interface NavProfile {
  username: string;
  avatar_url: string | null;
  avatar_bg: string;
  avatar_text: string;
  xp: number;
  current_streak: number;
  level: number;
  progress: number;
}

async function fetchNavProfile(): Promise<NavProfile | null> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('username, avatar_url, avatar_bg, avatar_text, xp')
      .eq('id', user.id)
      .maybeSingle();
    if (!data) return null;
    const info = getLevelInfo((data.xp as number) ?? 0);
    return {
      username: data.username as string,
      avatar_url: (data.avatar_url as string | null) ?? null,
      avatar_bg: (data.avatar_bg as string) ?? '#ED93B1',
      avatar_text: (data.avatar_text as string) ?? '#FFFFFF',
      xp: (data.xp as number) ?? 0,
      current_streak: 0, // profiles table has no streak field yet; hidden until available
      level: info.level,
      progress: info.progress,
    };
  } catch {
    return null;
  }
}

/**
 * Top nav. Server component: fetches the user's profile + level.
 * Mobile: shows logo + PlayerIdentityPill.
 * Desktop: shows logo + center nav links + streak + identity pill.
 */
export async function TopNav(): Promise<React.ReactElement> {
  const profile = await fetchNavProfile();

  return (
    <header className="sticky top-0 z-40 bg-primary border-b border-subtle">
      <nav className="h-12 md:h-12 flex items-center justify-between px-4 md:px-6 max-w-[960px] mx-auto">
        {/* Left: logo */}
        <Logo size="md" />

        {/* Center: desktop nav links */}
        <TopNavLinks />

        {/* Right: streak + identity pill */}
        <div className="flex items-center gap-2.5">
          {profile && profile.current_streak > 0 && (
            <span className="hidden md:inline text-[11px] font-semibold text-streak tabular-nums">
              {profile.current_streak} streak
            </span>
          )}
          {profile ? (
            <PlayerIdentityPill
              username={profile.username}
              level={profile.level}
              xpProgress={profile.progress / 100}
              avatarBg={profile.avatar_bg}
              avatarText={profile.avatar_text}
            />
          ) : (
            <PlayerIdentityPill />
          )}
        </div>
      </nav>
    </header>
  );
}

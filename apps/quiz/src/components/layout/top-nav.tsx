import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import { getLevelInfo } from '@/lib/constants';
import { getByeolBalance } from '@/lib/byeol';
import { Logo } from './logo';
import { TopNavLinks } from './top-nav-links';

interface NavProfile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  avatar_bg: string;
  avatar_text: string;
  xp: number;
  current_streak: number;
  level: number;
  progress: number;
  byeol: number;
}

async function fetchNavProfile(): Promise<NavProfile | null> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url, avatar_bg, avatar_text, xp')
      .eq('id', user.id)
      .maybeSingle();
    if (!data) return null;
    const info = getLevelInfo((data.xp as number) ?? 0);
    const byeol = await getByeolBalance(user.id);
    return {
      username: data.username as string,
      display_name: (data.display_name as string | null) ?? null,
      avatar_url: (data.avatar_url as string | null) ?? null,
      avatar_bg: (data.avatar_bg as string) ?? '#ED93B1',
      avatar_text: (data.avatar_text as string) ?? '#FFFFFF',
      xp: (data.xp as number) ?? 0,
      current_streak: 0,
      level: info.level,
      progress: info.progress,
      byeol,
    };
  } catch {
    return null;
  }
}

/**
 * Top nav. Server component: fetches the user's profile + level.
 * Desktop: Logo + pill tabs (Home/Games/Cards/Ranks) + Search + Create + Profile chip.
 * Hidden on mobile via CSS (.top-nav).
 */
export async function TopNav(): Promise<React.ReactElement> {
  const profile = await fetchNavProfile();
  const initial = (profile?.display_name || profile?.username || 'K').charAt(0).toUpperCase();

  return (
    <header className="top-nav" style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'color-mix(in srgb, var(--bg-primary) 92%, transparent)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '12px 20px', maxWidth: 1240, margin: '0 auto',
      }}>
        {/* Logo */}
        <Logo size="md" />

        {/* Tabs (desktop) */}
        <TopNavLinks />

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Search */}
        <Link href="/search" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 10,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', textDecoration: 'none',
          fontSize: 13, fontWeight: 600,
          transition: 'background 120ms ease',
        }}>
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
          </svg>
          <span className="top-nav-search-label">Search</span>
        </Link>

        {/* Create */}
        <Link href="/create" style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 10,
          background: 'var(--accent)', border: 'none',
          color: 'var(--accent-fg)', textDecoration: 'none',
          fontSize: 13, fontWeight: 600,
          transition: 'background 120ms ease',
        }}>
          <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="top-nav-create-label">Create</span>
        </Link>

        {/* Profile chip with byeol */}
        {profile ? (
          <Link href="/profile" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '4px 10px 4px 4px', borderRadius: 9999,
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            textDecoration: 'none',
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: '50%',
              background: profile.avatar_bg, color: profile.avatar_text,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: 12, flexShrink: 0,
            }}>{initial}</span>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 12, fontWeight: 700, color: 'var(--text-primary)',
            }}>
              <svg viewBox="0 0 24 24" width={11} height={11} fill="#F2C037" stroke="#F2C037" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.1 8.3 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 8.9 8.3 12 2" />
              </svg>
              <span className="tabular-nums">{profile.byeol.toLocaleString()}</span>
            </span>
          </Link>
        ) : (
          <Link href="/login" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 10,
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--text-primary)', textDecoration: 'none',
            fontSize: 13, fontWeight: 600,
          }}>Sign in</Link>
        )}
      </div>
    </header>
  );
}

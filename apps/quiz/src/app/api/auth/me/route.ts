import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { getLevelInfo } from '@/lib/constants';

// Returns the signed-in user's nav profile or null. Hit by the client-side
// <TopNavProfile> chip so the TopNav server tree never touches cookies() and
// the layout shell stays static/ISR-cacheable on every public page.
export const dynamic = 'force-dynamic';

// Hard cap so a slow/saturated Supabase auth never holds the route open long
// enough to 504 Vercel (and therefore break client hydration upstream). On
// timeout we return null - the chip falls back to the signed-out state and the
// page stays fully interactive while auth is degraded.
const AUTH_TIMEOUT_MS = 2500;

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createServerClient();
    type UserResult = { data: { user: { id: string; user_metadata?: Record<string, unknown> } | null } };
    const userRes = await withTimeout<UserResult>(
      supabase.auth.getUser() as unknown as Promise<UserResult>,
      AUTH_TIMEOUT_MS,
      { data: { user: null } },
    );
    const user = userRes.data?.user ?? null;
    if (!user) return NextResponse.json({ profile: null });

    const profileRes = await withTimeout(
      Promise.resolve(
        supabase
          .from('profiles')
          .select('username, display_name, avatar_url, avatar_bg, avatar_text, xp, daily_streak, last_daily_date')
          .eq('id', user.id)
          .maybeSingle(),
      ),
      AUTH_TIMEOUT_MS,
      { data: null } as { data: unknown },
    );
    const data = (profileRes as { data: Record<string, unknown> | null }).data;
    if (!data) return NextResponse.json({ profile: null });

    const info = getLevelInfo((data.xp as number) ?? 0);
    const meta = (user.user_metadata ?? {}) as { avatar_url?: string; picture?: string };
    const avatarUrl =
      (data.avatar_url as string | null) ??
      meta.avatar_url ??
      meta.picture ??
      null;

    return NextResponse.json({
      profile: {
        username: data.username as string,
        display_name: (data.display_name as string | null) ?? null,
        avatar_url: avatarUrl,
        avatar_bg: (data.avatar_bg as string) ?? '#ED93B1',
        avatar_text: (data.avatar_text as string) ?? '#FFFFFF',
        xp: (data.xp as number) ?? 0,
        level: info.level,
        progress: info.progress,
        daily_streak: (data.daily_streak as number | null) ?? 0,
        last_daily_date: (data.last_daily_date as string | null) ?? null,
      },
    });
  } catch (err) {
    // Fail-soft: any error (AuthUnknownError, network timeout, schema cache
    // hiccup) returns null with 200 so the client island never throws on
    // hydrate. Logged so the cause is debuggable in Vercel.
    console.warn('[api/auth/me] degraded - returning null:', (err as Error)?.message ?? err);
    return NextResponse.json({ profile: null });
  }
}

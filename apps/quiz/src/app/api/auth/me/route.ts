import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { getLevelInfo } from '@/lib/constants';

// Returns the signed-in user's nav profile or null. Hit by the client-side
// <TopNavProfile> chip so the TopNav server tree never touches cookies() and
// the layout shell stays static/ISR-cacheable on every public page.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ profile: null });

    const { data } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url, avatar_bg, avatar_text, xp')
      .eq('id', user.id)
      .maybeSingle();
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
      },
    });
  } catch {
    return NextResponse.json({ profile: null });
  }
}

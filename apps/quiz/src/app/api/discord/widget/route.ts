import { NextResponse } from 'next/server';

import { DISCORD_GUILD_ID, discordInviteWithUtm } from '@kpopquiz/shared/social-links';

import type { NextRequest } from 'next/server';

// K4 - GET /api/discord/widget
// Server-side proxy to Discord's public widget.json, cached ~60s. Returns the
// online presence count, a few member avatars, and the invite. If the upstream
// fetch fails (CDN hiccup, widget disabled, rate limit), returns a graceful
// fallback with only the invite so the page never breaks.
export const dynamic = 'force-dynamic';

const FALLBACK_PLACEMENT = 'widget-fallback';

interface WidgetMember {
  id: string;
  username: string;
  avatar_url?: string;
  status?: string;
}

interface WidgetUpstream {
  name?: string;
  presence_count?: number;
  members?: WidgetMember[];
  instant_invite?: string | null;
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const fallback = {
    online: null as number | null,
    members: [] as Array<{ username: string; avatar_url: string | null }>,
    invite: discordInviteWithUtm(FALLBACK_PLACEMENT),
    ok: false as boolean,
  };

  try {
    const res = await fetch(`https://discord.com/api/guilds/${DISCORD_GUILD_ID}/widget.json`, {
      next: { revalidate: 60 },
      headers: { Accept: 'application/json', 'User-Agent': 'kpopquiz.org/1.0 (+widget)' },
    });
    if (!res.ok) return NextResponse.json(fallback);
    const data = (await res.json()) as WidgetUpstream;
    const members = (data.members ?? []).slice(0, 5).map((m) => ({
      username: m.username ?? 'fan',
      avatar_url: m.avatar_url ?? null,
    }));
    return NextResponse.json({
      online: typeof data.presence_count === 'number' ? data.presence_count : null,
      members,
      invite: discordInviteWithUtm('widget'),
      ok: true,
    });
  } catch {
    return NextResponse.json(fallback);
  }
}

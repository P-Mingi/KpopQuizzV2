import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { readStanding, SIGNED_OUT } from '@/lib/ux-v1/p9/standing';

// GET /api/ux-v1/p9/standing - the signed-in fan's pinned rows on the v11
// leaderboard: their main fandom's war rank + the points they added this week,
// their player rank (XP) and creator rank (plays received). READ ONLY (selects and
// head counts). The /leaderboard page itself stays static/ISR: only this island
// call reads the session. Flag off: 404, like any unknown path today.
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };
// Same cap as /api/auth/me: a slow auth never holds the request open.
const AUTH_TIMEOUT_MS = 2500;

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

export async function GET(): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  try {
    const supabase = await createServerClient();
    type UserResult = { data: { user: { id: string } | null } };
    const res = await withTimeout<UserResult>(
      supabase.auth.getUser() as unknown as Promise<UserResult>,
      AUTH_TIMEOUT_MS,
      { data: { user: null } },
    );
    const user = res.data?.user ?? null;
    if (!user) return NextResponse.json(SIGNED_OUT, { headers: NO_STORE });
    return NextResponse.json(await readStanding(supabase, user.id), { headers: NO_STORE });
  } catch (err) {
    // Fail soft: the pinned rows hide; the board itself is static and unaffected.
    console.warn('[api/ux-v1/p9/standing] degraded:', (err as Error)?.message ?? err);
    return NextResponse.json({ error: 'standing_unavailable' }, { status: 503, headers: NO_STORE });
  }
}

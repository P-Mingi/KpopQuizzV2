import { NextResponse } from 'next/server';

import { createPublicReadClient } from '@/lib/supabase/server';

/**
 * GET /api/stats/live
 * Live social-proof counters for the home page. Counts recent and total
 * plays from the existing `plays` table.
 *
 * Fail-soft: any DB error (timeout under crawl load, RLS hiccup, NANO disk IO
 * exhaustion) returns 200 with null counts so HomeHero's useEffect catches a
 * non-OK gracefully and never blocks hydration. The route also uses the
 * cookie-free public client so it can't trip on session refresh during a
 * Supabase auth wave.
 */
export async function GET(): Promise<NextResponse> {
  const supabase = createPublicReadClient();

  const now = Date.now();
  const fifteenMinAgo = new Date(now - 15 * 60 * 1000).toISOString();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  try {
    const TIMEOUT_MS = 2000;
    const result = await Promise.race([
      Promise.all([
        supabase.from('plays').select('*', { count: 'exact', head: true }).gte('created_at', fifteenMinAgo),
        supabase.from('plays').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
        supabase.from('plays').select('*', { count: 'exact', head: true }),
      ]),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ]);

    if (!result) {
      console.warn('[api/stats/live] timed out - returning null counts');
      return NextResponse.json({ online: null, todayPlays: null, totalPlays: null });
    }

    const [recentRes, todayRes, totalRes] = result;
    return NextResponse.json({
      online: Math.max(recentRes.count ?? 0, 1),
      todayPlays: todayRes.count ?? 0,
      totalPlays: totalRes.count ?? 0,
    });
  } catch (err) {
    console.warn('[api/stats/live] degraded - returning null:', (err as Error)?.message ?? err);
    return NextResponse.json({ online: null, todayPlays: null, totalPlays: null });
  }
}

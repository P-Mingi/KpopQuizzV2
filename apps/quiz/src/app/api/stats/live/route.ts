import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';

interface LiveStats { online: number; todayPlays: number; totalPlays: number }

// FREE-VIABILITY: this route is fetched on mount by the home/community activity
// ticker, so it ran 3 fresh `plays` head counts per JS pageview. Wrapping them in
// unstable_cache (60s) collapses every pageview inside a minute to ONE set of
// reads. Only a successful read is cached; a timeout/error is never cached, so the
// fail-soft below still returns live null counts when the DB is choking.
const getLiveStats = unstable_cache(
  async (): Promise<LiveStats> => {
    const supabase = createPublicReadClient();
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [recentRes, todayRes, totalRes] = await Promise.all([
      supabase.from('plays').select('*', { count: 'exact', head: true }).gte('created_at', fifteenMinAgo),
      supabase.from('plays').select('*', { count: 'exact', head: true }).gte('created_at', todayStart.toISOString()),
      supabase.from('plays').select('*', { count: 'exact', head: true }),
    ]);

    return {
      online: Math.max(recentRes.count ?? 0, 1),
      todayPlays: todayRes.count ?? 0,
      totalPlays: totalRes.count ?? 0,
    };
  },
  ['api:stats:live:v1'],
  { revalidate: 60, tags: ['plays'] },
);

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
  try {
    const TIMEOUT_MS = 2000;
    const result = await Promise.race([
      getLiveStats(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
    ]);

    if (!result) {
      console.warn('[api/stats/live] timed out - returning null counts');
      return NextResponse.json({ online: null, todayPlays: null, totalPlays: null });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.warn('[api/stats/live] degraded - returning null:', (err as Error)?.message ?? err);
    return NextResponse.json({ online: null, todayPlays: null, totalPlays: null });
  }
}

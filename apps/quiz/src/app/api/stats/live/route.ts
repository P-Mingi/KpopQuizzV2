import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';

/**
 * GET /api/stats/live
 * Live social-proof counters for the home page. Counts recent and total
 * plays from the existing `plays` table - no new infra needed.
 */
export async function GET(): Promise<NextResponse> {
  const supabase = await createServerClient();

  const now = Date.now();
  const fifteenMinAgo = new Date(now - 15 * 60 * 1000).toISOString();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [recentRes, todayRes, totalRes] = await Promise.all([
    supabase
      .from('plays')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fifteenMinAgo),
    supabase
      .from('plays')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString()),
    supabase
      .from('plays')
      .select('*', { count: 'exact', head: true }),
  ]);

  return NextResponse.json({
    // Always show at least 1 so the UI never says "0 fans playing"
    online: Math.max(recentRes.count ?? 0, 1),
    todayPlays: todayRes.count ?? 0,
    totalPlays: totalRes.count ?? 0,
  });
}

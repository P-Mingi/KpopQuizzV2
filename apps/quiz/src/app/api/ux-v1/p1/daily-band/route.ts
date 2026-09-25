import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';

// GET /api/ux-v1/p1/daily-band (UX v11 home, P1). READ ONLY. The signed-in fan's
// Blindtest of the day on the home band: today's score and rank ("You scored 8/10
// today", "#212 of 1,205 fans") and their best daily score ("Your best 8/10"), from
// daily_blindtest_scores (public-read table, the same rank rule as
// /api/daily/blindtest/leaderboard). Guests get { signedIn: false } and the band
// uses the browser's "played today" flag. 404 when the UX v1 flag is off.
export const dynamic = 'force-dynamic';

interface BandMe {
  signedIn: boolean;
  date: string;
  today: { score: number; rank: number; of: number } | null;
  best: number | null;
}

export async function GET(): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const date = new Date().toISOString().slice(0, 10);
  const headers = { 'cache-control': 'private, no-store' };
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ signedIn: false, date, today: null, best: null } satisfies BandMe, { headers });

    const [{ data: mine }, { data: bestRow }, { count: of }] = await Promise.all([
      supabase.from('daily_blindtest_scores').select('score, time_ms').eq('date', date).eq('user_id', user.id).maybeSingle(),
      supabase.from('daily_blindtest_scores').select('score').eq('user_id', user.id).order('score', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('daily_blindtest_scores').select('user_id', { count: 'exact', head: true }).eq('date', date),
    ]);
    let today: BandMe['today'] = null;
    const row = mine as { score: number; time_ms: number } | null;
    if (row) {
      const score = Number(row.score);
      const timeMs = Number(row.time_ms);
      const { count: ahead } = await supabase
        .from('daily_blindtest_scores')
        .select('user_id', { count: 'exact', head: true })
        .eq('date', date)
        .or(`score.gt.${score},and(score.eq.${score},time_ms.lt.${timeMs})`);
      today = { score, rank: (ahead ?? 0) + 1, of: of ?? 0 };
    }
    const best = (bestRow as { score: number } | null)?.score;
    return NextResponse.json({ signedIn: true, date, today, best: typeof best === 'number' ? best : null } satisfies BandMe, { headers });
  } catch {
    return NextResponse.json({ signedIn: false, date, today: null, best: null } satisfies BandMe, { headers });
  }
}

import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// N2.3 - GET /api/daily/blindtest/leaderboard?date=YYYY-MM-DD
// Today's top 20 (or a given past date). If the signed-in user finished but is
// outside the top 20, their own ranked row is appended as user_entry so the
// result screen can show "...your rank" at the bottom.
export const dynamic = 'force-dynamic';

interface Entry {
  rank: number;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  score: number;
  time_ms: number;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const date = req.nextUrl.searchParams.get('date') || todayUtc();
  const svc = createServiceRoleClient();

  const { data: lb, error } = await svc.rpc('get_daily_bt_leaderboard', { p_date: date });
  if (error) {
    return NextResponse.json({ error: 'could not load leaderboard' }, { status: 500 });
  }
  const entries = ((lb ?? []) as Array<Record<string, unknown>>).map((r): Entry => ({
    rank: Number(r.rank),
    user_id: String(r.user_id),
    username: (r.username as string | null) ?? null,
    display_name: (r.display_name as string | null) ?? null,
    avatar_url: (r.avatar_url as string | null) ?? null,
    score: Number(r.score),
    time_ms: Number(r.time_ms),
  }));

  // If signed in and not already in the top 20, compute the user's own rank.
  let userEntry: Entry | null = null;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user && !entries.some((e) => e.user_id === user.id)) {
    const { data: mine } = await svc
      .from('daily_blindtest_scores')
      .select('score, time_ms')
      .eq('date', date)
      .eq('user_id', user.id)
      .maybeSingle();
    if (mine) {
      const score = Number(mine.score);
      const timeMs = Number(mine.time_ms);
      // Rank = how many rows beat me (higher score, or same score + faster) + 1.
      const { count: ahead } = await svc
        .from('daily_blindtest_scores')
        .select('user_id', { count: 'exact', head: true })
        .eq('date', date)
        .or(`score.gt.${score},and(score.eq.${score},time_ms.lt.${timeMs})`);
      const { data: prof } = await svc
        .from('profiles')
        .select('username, display_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      userEntry = {
        rank: (ahead ?? 0) + 1,
        user_id: user.id,
        username: (prof?.username as string | null) ?? null,
        display_name: (prof?.display_name as string | null) ?? null,
        avatar_url: (prof?.avatar_url as string | null) ?? null,
        score,
        time_ms: timeMs,
      };
    }
  }

  return NextResponse.json({ date, entries, user_entry: userEntry });
}

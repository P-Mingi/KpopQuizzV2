import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { getTodayKST } from '@/lib/daily';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date') ?? getTodayKST();

  const supabase = createServiceRoleClient();

  const { data: challenge } = await supabase
    .from('daily_challenges')
    .select('id, date, day_number')
    .eq('date', date)
    .maybeSingle();

  if (!challenge) {
    return NextResponse.json({ challenge: null, leaderboard: [] });
  }

  const { data: rows } = await supabase
    .from('daily_challenge_plays')
    .select('player_id, score, correct, total_time, best_combo, players!inner(username, avatar_bg, avatar_text)')
    .eq('challenge_id', challenge.id)
    .order('score', { ascending: false })
    .limit(50);

  const leaderboard = (rows ?? []).map((row: Record<string, unknown>) => {
    const p = row.players as { username: string; avatar_bg: string; avatar_text: string } | null;
    return {
      player_id: row.player_id as string,
      score: row.score as number,
      correct: (row.correct as number | null) ?? 0,
      total_time: (row.total_time as number | null) ?? 0,
      best_combo: (row.best_combo as number | null) ?? 0,
      username: p?.username ?? 'Anonymous',
      avatar_bg: p?.avatar_bg ?? '#ED93B1',
      avatar_text: p?.avatar_text ?? '#0D0D0F',
    };
  });

  return NextResponse.json({
    challenge: {
      id: challenge.id,
      date: challenge.date,
      day_number: challenge.day_number,
    },
    leaderboard,
  });
}

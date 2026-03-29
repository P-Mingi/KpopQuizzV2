import { NextResponse } from 'next/server';
import { createServerClient } from '@kpopquiz/shared/supabase/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get('period') ?? 'today';
  const mode = searchParams.get('mode') ?? null;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100);

  const supabase = await createServerClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let entries: any[] = [];

  if (period === 'alltime') {
    // All time: read directly from players table (pre-aggregated)
    const { data } = await supabase
      .from('players')
      .select('id, username, avatar_bg, avatar_text, level, total_points')
      .gt('total_points', 0)
      .order('total_points', { ascending: false })
      .limit(limit);

    entries = (data ?? []).map(p => ({
      player_id: p.id,
      username: p.username,
      avatar_bg: p.avatar_bg,
      avatar_text: p.avatar_text,
      level: p.level,
      total_points: p.total_points,
    }));
  } else if (period === 'weekly') {
    // Weekly: use the DB function
    const { data } = await supabase.rpc('get_weekly_leaderboard', { p_limit: limit });
    entries = (data ?? []).map((row: Record<string, unknown>) => ({
      player_id: row.player_id,
      username: row.username,
      avatar_bg: row.avatar_bg,
      avatar_text: row.avatar_text,
      level: row.level,
      total_points: row.total_points,
      games_played: row.games_played,
    }));
  } else {
    // Today: aggregate from bt_plays
    const today = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('bt_plays')
      .select('player_id, score, mode_id, players!inner(username, avatar_bg, avatar_text, level)')
      .gte('created_at', `${today}T00:00:00Z`)
      .not('player_id', 'is', null)
      .order('score', { ascending: false })
      .limit(200);

    if (mode) {
      query = query.eq('mode_id', mode);
    }

    const { data } = await query;

    // Aggregate: best score per player
    const playerBest = new Map<string, { player_id: string; username: string; avatar_bg: string; avatar_text: string; level: number; total_points: number }>();
    for (const row of data ?? []) {
      const p = row.players as unknown as { username: string; avatar_bg: string; avatar_text: string; level: number } | null;
      if (!p || !row.player_id) continue;
      const existing = playerBest.get(row.player_id);
      if (!existing || row.score > existing.total_points) {
        playerBest.set(row.player_id, {
          player_id: row.player_id,
          username: p.username,
          avatar_bg: p.avatar_bg,
          avatar_text: p.avatar_text,
          level: p.level,
          total_points: row.score,
        });
      }
    }

    entries = [...playerBest.values()]
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, limit);
  }

  return NextResponse.json({ entries, period, mode });
}

import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { getTodayKST } from '@/lib/daily';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServiceRoleClient();
  const today = getTodayKST();

  // Check if today's challenge exists
  let { data: challenge } = await supabase
    .from('daily_challenges')
    .select('*')
    .eq('date', today)
    .single();

  if (!challenge) {
    challenge = await generateDailyChallenge(supabase, today);
  }

  if (!challenge) {
    return NextResponse.json({ error: 'Could not create daily challenge' }, { status: 500 });
  }

  // Play count
  const { count: playCount } = await supabase
    .from('daily_challenge_plays')
    .select('id', { count: 'exact', head: true })
    .eq('challenge_id', challenge.id);

  // Average score
  const { data: scoreData } = await supabase
    .from('daily_challenge_plays')
    .select('score')
    .eq('challenge_id', challenge.id);

  const avgScore = scoreData && scoreData.length > 0
    ? Math.round(scoreData.reduce((s: number, p: { score: number }) => s + p.score, 0) / scoreData.length)
    : 0;

  return NextResponse.json({
    challenge: {
      id: challenge.id,
      date: challenge.date,
      song_count: (challenge.song_ids as string[]).length,
      clip_duration: challenge.clip_duration,
    },
    stats: {
      play_count: playCount ?? 0,
      avg_score: avgScore,
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function generateDailyChallenge(supabase: any, date: string) {
  const { data: allSongs } = await supabase
    .from('blind_test_songs')
    .select('id, group_id, gender')
    .eq('status', 'active')
    .not('clip_chorus', 'is', null);

  if (!allSongs || allSongs.length < 10) return null;

  // Avoid songs from last 7 days
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { data: recentDailies } = await supabase
    .from('daily_challenges')
    .select('song_ids')
    .gte('date', weekAgo.toISOString().split('T')[0]);

  const recentSongIds = new Set(
    (recentDailies ?? []).flatMap((d: { song_ids: string[] }) => d.song_ids)
  );

  let pool = allSongs.filter((s: { id: string }) => !recentSongIds.has(s.id));
  if (pool.length < 10) pool = allSongs;

  // Max 2 songs per group for variety
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const selected: typeof pool = [];
  const groupCount: Record<string, number> = {};

  for (const song of shuffled) {
    const gid = String(song.group_id ?? 'none');
    if ((groupCount[gid] ?? 0) >= 2) continue;
    selected.push(song);
    groupCount[gid] = (groupCount[gid] ?? 0) + 1;
    if (selected.length >= 10) break;
  }

  const songIds = selected.map((s: { id: string }) => s.id);

  const { data: challenge } = await supabase
    .from('daily_challenges')
    .insert({ date, song_ids: songIds, clip_point: 'chorus', clip_duration: 10 })
    .select()
    .single();

  return challenge;
}

import Link from 'next/link';
import { createServerClient } from '@kpopquiz/shared/supabase/server';
import { getTodayKST } from '@/lib/daily';

async function fetchDailyData() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3022';
  try {
    const res = await fetch(`${baseUrl}/api/daily`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function DailyPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let player = null;
  if (user) {
    const { data } = await supabase.from('players').select('*').eq('id', user.id).single();
    player = data;
  }

  const dailyData = await fetchDailyData();
  const challenge = dailyData?.challenge;
  const stats = dailyData?.stats ?? { play_count: 0, avg_score: 0 };

  // Check if player already played today
  let playerResult = null;
  if (player && challenge) {
    const { data: play } = await supabase
      .from('daily_challenge_plays')
      .select('score, correct, total_time')
      .eq('player_id', player.id)
      .eq('challenge_id', challenge.id)
      .maybeSingle();

    if (play) {
      // Get rank
      const { data: allPlays } = await supabase
        .from('daily_challenge_plays')
        .select('player_id, score')
        .eq('challenge_id', challenge.id)
        .order('score', { ascending: false });

      const rank = (allPlays ?? []).findIndex((p: { player_id: string }) => p.player_id === player!.id) + 1;
      playerResult = { ...play, rank, total_players: allPlays?.length ?? 0 };
    }
  }

  // Leaderboard
  let leaderboard: { player_id: string; score: number; username: string; avatar_bg: string; avatar_text: string }[] = [];
  if (challenge) {
    const { data } = await supabase
      .from('daily_challenge_plays')
      .select('player_id, score, players!inner(username, avatar_bg, avatar_text)')
      .eq('challenge_id', challenge.id)
      .order('score', { ascending: false })
      .limit(20);

    leaderboard = (data ?? []).map((row: Record<string, unknown>) => {
      const p = row.players as { username: string; avatar_bg: string; avatar_text: string } | null;
      return {
        player_id: row.player_id as string,
        score: row.score as number,
        username: p?.username ?? '?',
        avatar_bg: p?.avatar_bg ?? '#ED93B1',
        avatar_text: p?.avatar_text ?? '#0D0D0F',
      };
    });
  }

  const today = getTodayKST();

  return (
    <div className="pt-5 pb-8">
      <p className="text-xl font-semibold mb-1">Daily challenge</p>
      <p className="text-[13px] text-text-secondary mb-5">
        {today} - {stats.play_count} player{stats.play_count !== 1 ? 's' : ''} today
      </p>

      {!challenge ? (
        <div className="py-12 text-center">
          <p className="text-sm text-text-tertiary">Daily challenge not available yet</p>
        </div>
      ) : !playerResult ? (
        <div className="text-center mb-6">
          <p className="text-sm text-text-secondary mb-4">
            10 songs. One shot. Same songs for everyone.
          </p>
          {player ? (
            <Link
              href="/play/daily"
              className="inline-block px-8 py-3.5 rounded-[14px] bg-pink-400 text-bg-primary text-sm font-semibold"
            >
              Play today&apos;s challenge
            </Link>
          ) : (
            <>
              <div className="inline-block px-8 py-3.5 rounded-[14px] bg-bg-tertiary text-text-tertiary text-sm font-semibold cursor-not-allowed">
                Play today&apos;s challenge
              </div>
              <p className="text-xs text-text-tertiary mt-3">
                <Link href="/login" className="text-pink-400">Sign in</Link> to play the daily challenge
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="mb-6 p-4 rounded-2xl bg-bg-secondary border border-border-default shadow-card text-center">
          <p className="text-3xl font-semibold">{playerResult.correct}/10</p>
          <p className="text-sm text-text-secondary mt-1">
            {playerResult.score} pts - Rank #{playerResult.rank} of {playerResult.total_players}
          </p>
          {stats.avg_score > 0 && (
            <p className="text-xs text-text-tertiary mt-1">Average: {stats.avg_score} pts</p>
          )}
        </div>
      )}

      {/* Today's leaderboard */}
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-2.5">
        Today&apos;s ranking
      </p>
      <div className="rounded-[14px] bg-bg-secondary border border-border-default shadow-card overflow-hidden">
        {leaderboard.length > 0 ? (
          leaderboard.map((entry, i) => {
            const isMe = entry.player_id === player?.id;
            return (
              <div
                key={entry.player_id}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border-default last:border-b-0 ${
                  isMe ? 'bg-pink-50' : ''
                }`}
              >
                <span className={`text-xs font-semibold w-5 text-center ${
                  i === 0 ? 'text-streak' : i === 1 ? 'text-text-secondary' : i === 2 ? 'text-wrong' : 'text-text-tertiary'
                }`}>
                  {i + 1}
                </span>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold"
                  style={{ backgroundColor: entry.avatar_bg, color: entry.avatar_text }}
                >
                  {entry.username.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-xs font-medium">
                  {entry.username}
                  {isMe && <span className="text-text-tertiary font-normal"> (you)</span>}
                </span>
                <span className="text-xs font-medium text-pink-400">{entry.score.toLocaleString()}</span>
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center">
            <p className="text-xs text-text-tertiary">No plays yet today</p>
            <p className="text-[10px] text-text-ghost mt-0.5">Be the first to set a score</p>
          </div>
        )}
      </div>
    </div>
  );
}

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

function getResetCountdown(): string {
  // Daily challenge resets at 00:00 KST (UTC+9).
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 3600 * 1000);
  const hours = 23 - kstNow.getUTCHours();
  const minutes = 59 - kstNow.getUTCMinutes();
  return `${hours}h ${minutes}m`;
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
  let playerResult: { score: number; correct: number; total_time: number; rank: number; total_players: number } | null = null;
  if (player && challenge) {
    const { data: play } = await supabase
      .from('daily_challenge_plays')
      .select('score, correct, total_time')
      .eq('player_id', player.id)
      .eq('challenge_id', challenge.id)
      .maybeSingle();

    if (play) {
      const { data: allPlays } = await supabase
        .from('daily_challenge_plays')
        .select('player_id, score')
        .eq('challenge_id', challenge.id)
        .order('score', { ascending: false });

      const rank = (allPlays ?? []).findIndex((p: { player_id: string }) => p.player_id === player!.id) + 1;
      playerResult = {
        score: play.score as number,
        correct: play.correct as number,
        total_time: play.total_time as number,
        rank,
        total_players: allPlays?.length ?? 0,
      };
    }
  }

  // Leaderboard
  let leaderboard: { player_id: string; score: number; correct: number; total_time: number; username: string; avatar_bg: string; avatar_text: string }[] = [];
  if (challenge) {
    const { data } = await supabase
      .from('daily_challenge_plays')
      .select('player_id, score, correct, total_time, players!inner(username, avatar_bg, avatar_text)')
      .eq('challenge_id', challenge.id)
      .order('score', { ascending: false })
      .limit(20);

    leaderboard = (data ?? []).map((row: Record<string, unknown>) => {
      const p = row.players as { username: string; avatar_bg: string; avatar_text: string } | null;
      return {
        player_id: row.player_id as string,
        score: row.score as number,
        correct: (row.correct as number | null) ?? 0,
        total_time: (row.total_time as number | null) ?? 0,
        username: p?.username ?? '?',
        avatar_bg: p?.avatar_bg ?? '#ED93B1',
        avatar_text: p?.avatar_text ?? '#0D0D0F',
      };
    });
  }

  const today = getTodayKST();
  const resetIn = getResetCountdown();

  return (
    <div className="pt-3 md:pt-6 pb-8 max-w-[560px] mx-auto">
      {/* Hero card */}
      <div
        className="p-6 rounded-[18px] mb-5"
        style={{
          background: 'linear-gradient(135deg, var(--daily-gradient-from), var(--daily-gradient-to))',
          border: '1px solid var(--daily-border)',
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-daily mb-2">
          Daily challenge
        </p>
        <h1 className="text-[32px] font-bold text-primary leading-tight">
          {playerResult ? `${playerResult.correct}/10` : '10 songs.'}
        </h1>
        <p className="text-[13px] text-daily mt-1">
          {playerResult
            ? `${playerResult.score.toLocaleString()} pts - rank #${playerResult.rank} of ${playerResult.total_players}`
            : 'One shot. Same songs for everyone.'}
        </p>
        {!challenge ? (
          <p className="mt-5 text-sm text-tertiary">Daily challenge not available yet.</p>
        ) : !playerResult ? (
          <div className="mt-5">
            {player ? (
              <Link
                href="/play/daily"
                className="inline-block px-10 py-3.5 rounded-[14px] bg-accent text-primary text-sm font-bold active:scale-[0.98] transition-transform"
              >
                PLAY
              </Link>
            ) : (
              <>
                <span className="inline-block px-10 py-3.5 rounded-[14px] bg-elevated text-tertiary text-sm font-bold cursor-not-allowed">
                  PLAY
                </span>
                <p className="text-xs text-tertiary mt-2.5">
                  <Link href="/login" className="text-accent">Sign in</Link> to play the daily challenge
                </p>
              </>
            )}
          </div>
        ) : null}
        <p className="text-[11px] text-ghost mt-4">
          {today} - resets in {resetIn}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-px bg-default rounded-[12px] overflow-hidden mb-5">
        <StatCell value={stats.play_count.toLocaleString()} label="players today" />
        <StatCell value={stats.avg_score > 0 ? stats.avg_score.toLocaleString() : '-'} label="average score" />
        <StatCell
          value={playerResult ? `#${playerResult.rank}` : '-'}
          label="your rank"
        />
      </div>

      {/* Today's leaderboard */}
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ghost mb-2.5">
        Today&apos;s ranking
      </p>
      {leaderboard.length > 0 ? (
        <div className="rounded-[14px] bg-surface border border-default shadow-card overflow-hidden">
          {leaderboard.map((entry, i) => {
            const isMe = entry.player_id === player?.id;
            const rankColor =
              i === 0 ? 'text-combo'
              : i === 1 ? 'text-secondary'
              : i === 2 ? 'text-streak'
              : 'text-tertiary';
            return (
              <div
                key={entry.player_id}
                className={`flex items-center gap-3 px-4 py-3 border-b border-subtle last:border-0 ${
                  isMe ? 'bg-accent-bg' : ''
                }`}
              >
                <span className={`text-sm font-bold w-6 text-center tabular-nums ${rankColor}`}>
                  {i + 1}
                </span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0"
                  style={{ backgroundColor: entry.avatar_bg, color: entry.avatar_text }}
                >
                  {entry.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-[13px] font-medium block truncate ${isMe ? 'text-accent' : 'text-primary'}`}>
                    {entry.username}
                    {isMe && <span className="font-normal text-tertiary"> (you)</span>}
                  </span>
                  <span className="text-[11px] text-ghost tabular-nums">
                    {entry.correct}/10 - {entry.total_time.toFixed(1)}s
                  </span>
                </div>
                <span className="text-sm font-semibold text-primary tabular-nums">
                  {entry.score.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[14px] bg-surface border border-default shadow-card py-8 text-center">
          <p className="text-xs text-tertiary">No plays yet today</p>
          <p className="text-[10px] text-ghost mt-0.5">Be the first to set a score</p>
        </div>
      )}
    </div>
  );
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-surface px-3 py-3 text-center">
      <p className="text-lg font-bold text-primary tabular-nums">{value}</p>
      <p className="text-[9px] text-ghost mt-0.5 uppercase tracking-wide">{label}</p>
    </div>
  );
}

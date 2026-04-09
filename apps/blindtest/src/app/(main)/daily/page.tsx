import Link from 'next/link';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { getTodayKST } from '@/lib/daily';
import { DailyPlayedCard } from '@/components/daily/daily-played-card';
import { CountdownTimer } from '@/components/daily/countdown-timer';

interface ChallengeRow {
  id: string;
  day_number: number | null;
  playlist: string | null;
}

interface PlayerPlay {
  score: number;
  correct: number;
  total_time: number | null;
  best_combo: number | null;
  songs: unknown;
}

interface LeaderboardRow {
  player_id: string;
  score: number;
  correct: number;
  total_time: number;
  username: string;
  avatar_bg: string;
  avatar_text: string;
}

interface SongResult {
  correct: boolean;
  answered: string | null;
}

function msUntilKstMidnight(): number {
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 3600 * 1000);
  const kstMidnightUTCms = Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate() + 1,
    0, 0, 0, 0,
  );
  const kstMidnightAsUtc = kstMidnightUTCms - 9 * 3600 * 1000;
  return Math.max(0, kstMidnightAsUtc - now.getTime());
}

export default async function DailyPage() {
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  const supabase = createServiceRoleClient();
  const today = getTodayKST();

  // Fetch the challenge row. If the v2 columns aren't populated yet, hit our
  // own /api/daily endpoint which lazily generates them.
  let { data: challengeRow } = await supabase
    .from('daily_challenges')
    .select('id, day_number, playlist, questions')
    .eq('date', today)
    .maybeSingle();

  if (!challengeRow || !Array.isArray(challengeRow.questions)) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3022';
      await fetch(`${baseUrl}/api/daily`, { cache: 'no-store' });
      const { data: refreshed } = await supabase
        .from('daily_challenges')
        .select('id, day_number, playlist, questions')
        .eq('date', today)
        .maybeSingle();
      challengeRow = refreshed;
    } catch {
      // Ignore; we'll render the not-available state below.
    }
  }

  const challenge: ChallengeRow | null = challengeRow
    ? { id: challengeRow.id as string, day_number: (challengeRow.day_number as number | null) ?? null, playlist: (challengeRow.playlist as string | null) ?? 'all' }
    : null;

  // Stats for today.
  let playCount = 0;
  let avgCorrect = 0;
  let avgTime = 0;
  if (challenge) {
    const { data: stats } = await supabase
      .from('daily_challenge_plays')
      .select('score, correct, total_time')
      .eq('challenge_id', challenge.id);
    if (stats && stats.length > 0) {
      playCount = stats.length;
      avgCorrect = Number((stats.reduce((s, r) => s + (r.correct as number), 0) / stats.length).toFixed(1));
      avgTime = Math.round(stats.reduce((s, r) => s + ((r.total_time as number | null) ?? 0), 0) / stats.length);
    }
  }

  // Player's own attempt.
  let playerPlay: PlayerPlay | null = null;
  let playerRank = 0;
  if (user && challenge) {
    const { data: mine } = await supabase
      .from('daily_challenge_plays')
      .select('score, correct, total_time, best_combo, songs')
      .eq('player_id', user.id)
      .eq('challenge_id', challenge.id)
      .maybeSingle();
    if (mine) {
      playerPlay = mine as PlayerPlay;
      const { data: ranked } = await supabase
        .from('daily_challenge_plays')
        .select('player_id, score')
        .eq('challenge_id', challenge.id)
        .order('score', { ascending: false });
      playerRank = (ranked ?? []).findIndex((r: { player_id: string }) => r.player_id === user.id) + 1;
    }
  }

  // Leaderboard (top 20).
  let leaderboard: LeaderboardRow[] = [];
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
        username: p?.username ?? 'Anonymous',
        avatar_bg: p?.avatar_bg ?? '#ED93B1',
        avatar_text: p?.avatar_text ?? '#0D0D0F',
      };
    });
  }

  const dayNumber = challenge?.day_number ?? null;
  const hasPlayed = Boolean(playerPlay);
  const resetMs = msUntilKstMidnight();

  return (
    <div className="pt-3 md:pt-6 pb-8 max-w-[560px] mx-auto">
      {/* Hero card: swaps between "play now" and "completed" based on state */}
      <div
        className="p-6 rounded-[18px] mb-5"
        style={{
          background: 'linear-gradient(135deg, var(--daily-gradient-from), var(--daily-gradient-to))',
          border: '1px solid var(--daily-border)',
        }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-daily mb-2">
          Daily challenge{dayNumber ? ` #${dayNumber}` : ''}
        </p>

        {!challenge ? (
          <>
            <h1 className="text-[28px] font-bold text-primary leading-tight">
              Not available yet
            </h1>
            <p className="text-[13px] text-daily mt-1">Come back in a bit.</p>
          </>
        ) : hasPlayed && playerPlay ? (
          <DailyPlayedCard
            correct={playerPlay.correct}
            score={playerPlay.score}
            totalTime={playerPlay.total_time ?? 0}
            bestCombo={playerPlay.best_combo ?? 0}
            rank={playerRank}
            totalPlayers={playCount}
            songs={playerPlay.songs as SongResult[]}
            {...(dayNumber !== null ? { dayNumber } : {})}
            playlist={challenge.playlist ?? 'all'}
            resetMs={resetMs}
          />
        ) : (
          <>
            <h1 className="text-[32px] font-bold text-primary leading-tight">
              10 songs.
            </h1>
            <p className="text-[13px] text-daily mt-1">
              Same 10 songs for everyone. Who&apos;s the real fan?
            </p>
            <div className="mt-5 flex items-center gap-3">
              {user ? (
                <Link
                  href="/play/daily"
                  className="inline-block px-10 py-3.5 rounded-[14px] bg-accent text-primary text-sm font-bold active:scale-[0.98] transition-transform"
                >
                  PLAY
                </Link>
              ) : (
                <div>
                  <span className="inline-block px-10 py-3.5 rounded-[14px] bg-elevated text-tertiary text-sm font-bold cursor-not-allowed">
                    PLAY
                  </span>
                  <p className="text-xs text-tertiary mt-2.5">
                    <Link href="/login" className="text-accent">Sign in</Link> to play the daily challenge
                  </p>
                </div>
              )}
            </div>
            <p className="text-[11px] text-ghost mt-4">
              <CountdownTimer msUntilReset={resetMs} prefix="Resets in " showSeconds={false} />
            </p>
          </>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-px bg-default rounded-[12px] overflow-hidden mb-5">
        <StatCell value={playCount.toLocaleString()} label="players today" />
        <StatCell value={playCount > 0 ? avgCorrect.toFixed(1) : '-'} label="average score" />
        <StatCell
          value={hasPlayed && playerRank > 0 ? `#${playerRank}` : playCount > 0 ? `${avgTime}s` : '-'}
          label={hasPlayed && playerRank > 0 ? 'your rank' : 'avg time'}
        />
      </div>

      {/* Today's leaderboard */}
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ghost mb-2.5">
        Today&apos;s ranking
      </p>
      {leaderboard.length > 0 ? (
        <div className="rounded-[14px] bg-surface border border-default shadow-card overflow-hidden">
          {leaderboard.map((entry, i) => {
            const isMe = entry.player_id === user?.id;
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
          <p className="text-[10px] text-ghost mt-0.5">
            {hasPlayed ? "You're the first!" : 'Be the first to set a score'}
          </p>
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

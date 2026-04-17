import Link from 'next/link';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { getTodayKST } from '@/lib/daily';
import { DailyPlayedCard } from '@/components/daily/daily-played-card';
import { CountdownTimer } from '@/components/daily/countdown-timer';
import { TipBanner } from '@/components/shared/tip-banner';

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

function formatTodayDate(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  const formattedDate = formatTodayDate();

  return (
    <div className="max-w-[500px] mx-auto px-3.5 md:px-7 py-4 md:py-6 relative pb-16">
      {/* Back button + title with date */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="w-[30px] h-[30px] rounded-full bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary"><path d="M8 1.5L3 6l5 4.5" /></svg>
          </Link>
          <h1 className="text-base md:text-lg font-medium text-primary">Daily challenge{dayNumber ? ` #${dayNumber}` : ''}</h1>
        </div>
        <span className="text-[10px] text-[#888780] dark:text-[rgba(255,255,255,0.35)] font-medium">{formattedDate}</span>
      </div>

      {/* Hero card */}
      {!challenge ? (
        <div className="p-4 md:p-5 rounded-2xl border-[1.5px] border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
          <p className="text-sm font-semibold text-primary">Not available yet</p>
          <p className="text-[11px] text-[#888780] dark:text-[rgba(255,255,255,0.35)] mt-1">Come back in a bit.</p>
        </div>
      ) : hasPlayed && playerPlay ? (
        <div className="p-4 md:p-5 rounded-2xl border-[1.5px] border-[#C0DD97] dark:border-[rgba(99,153,34,0.3)] bg-[#EAF3DE] dark:bg-[rgba(99,153,34,0.08)]">
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
        </div>
      ) : (
        <div className="p-4 md:p-5 rounded-2xl border-[1.5px] border-[#C0DD97] dark:border-[rgba(99,153,34,0.3)] bg-[#EAF3DE] dark:bg-[rgba(99,153,34,0.08)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#C0DD97] dark:bg-[rgba(99,153,34,0.2)] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#3B6D11" strokeWidth="1.5" strokeLinecap="round"><circle cx="9" cy="9" r="7" /><path d="M9 5v4l3 2" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#173404] dark:text-[rgba(255,255,255,0.9)]">Today&apos;s challenge</p>
              <p className="text-[10px] text-[#639922] dark:text-[#97C459]">10 songs - Same for everyone</p>
            </div>
          </div>
          <p className="text-[11px] text-[#639922] dark:text-[#97C459] mb-3">One attempt only. +30% XP bonus.</p>

          {user ? (
            <Link href="/play/daily" className="block w-full py-3 rounded-xl bg-[#639922] dark:bg-[#4CAF50] text-white text-sm font-semibold text-center hover:bg-[#3B6D11] active:scale-[0.97] transition-all">
              Play today&apos;s challenge
            </Link>
          ) : (
            <div>
              <span className="block w-full py-3 rounded-xl bg-[#C0DD97]/50 dark:bg-[rgba(99,153,34,0.15)] text-[#639922] text-sm font-semibold text-center cursor-not-allowed">
                Play today&apos;s challenge
              </span>
              <p className="text-xs text-[#639922] dark:text-[#97C459] mt-2.5 text-center">
                <Link href="/login" className="text-[#3B6D11] dark:text-[#97C459] underline">Sign in</Link> to play the daily challenge
              </p>
            </div>
          )}
        </div>
      )}

      {/* Countdown */}
      <div className="flex items-center justify-center gap-1.5 mt-4 mb-6">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-[#888780] dark:text-[rgba(255,255,255,0.35)]"><circle cx="6" cy="6" r="4.5" /><path d="M6 3.5v2.5l2 1.5" /></svg>
        <span className="text-[11px] text-[#888780] dark:text-[rgba(255,255,255,0.35)] font-medium">Resets in </span>
        <CountdownTimer msUntilReset={resetMs} className="text-[11px] text-[#639922] dark:text-[#97C459] font-semibold" showSeconds={false} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <StatCell value={playCount.toLocaleString()} label="players today" />
        <StatCell value={playCount > 0 ? avgCorrect.toFixed(1) : '-'} label="average score" />
        <StatCell
          value={hasPlayed && playerRank > 0 ? `#${playerRank}` : playCount > 0 ? `${avgTime}s` : '-'}
          label={hasPlayed && playerRank > 0 ? 'your rank' : 'avg time'}
        />
      </div>

      {/* Today's leaderboard */}
      <p className="text-xs font-semibold text-primary mb-2.5">Today&apos;s ranking</p>
      {leaderboard.length > 0 ? (
        <div>
          {leaderboard.map((entry, i) => {
            const isMe = entry.player_id === user?.id;
            return (
              <div
                key={entry.player_id}
                className={`flex items-center gap-3 px-3.5 md:px-0 py-2.5 border-b border-[#F0EDE8] dark:border-[rgba(255,255,255,0.04)] ${
                  isMe ? 'bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.08)] rounded-lg' : ''
                }`}
              >
                <span className="w-6 text-[11px] font-semibold text-[#888780] dark:text-[rgba(255,255,255,0.35)] tabular-nums text-right">{i + 1}</span>
                <div className="w-9 h-9 rounded-full bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.12)] border border-[#F4C0D1] dark:border-[rgba(212,83,126,0.2)] flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-[#D4537E]">{(entry.username || 'A').charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${isMe ? 'text-[#D4537E]' : 'text-primary'}`}>
                    {entry.username}
                    {isMe && <span className="font-normal text-[#888780] dark:text-[rgba(255,255,255,0.35)]"> (you)</span>}
                  </p>
                  <p className="text-[9px] text-[#888780] dark:text-[rgba(255,255,255,0.35)] tabular-nums">
                    {entry.correct}/10 - {entry.total_time.toFixed(1)}s
                  </p>
                </div>
                <span className="text-xs font-semibold text-primary tabular-nums">{entry.score.toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[rgba(255,255,255,0.04)] py-8 text-center">
          <p className="text-xs text-[#888780] dark:text-[rgba(255,255,255,0.35)]">No plays yet today</p>
          <p className="text-[10px] text-[#888780] dark:text-[rgba(255,255,255,0.35)] mt-0.5">
            {hasPlayed ? "You're the first!" : 'Be the first to set a score'}
          </p>
        </div>
      )}

      <TipBanner tips={['Same songs for everyone worldwide', 'Play daily to maintain your streak']} />
    </div>
  );
}

function StatCell({ value, label }: { value: string; label: string }) {
  return (
    <div className="p-3 rounded-xl border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[rgba(255,255,255,0.04)] text-center">
      <p className="text-lg font-bold text-primary tabular-nums">{value}</p>
      <p className="text-[9px] text-[#888780] dark:text-[rgba(255,255,255,0.35)] mt-0.5 uppercase tracking-wide">{label}</p>
    </div>
  );
}

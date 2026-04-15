import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { getLevelFromXP } from '@/lib/progression';
import { getRank, getNextRank } from '@/lib/ranks';
import { PlayButton } from '@/components/lobby/play-button';
import { LobbyDaily } from '@/components/lobby/lobby-daily';
import { StatsRow } from '@/components/lobby/stats-row';
import { StreakCalendar } from '@/components/lobby/streak-calendar';
import { XpProgressBar } from '@/components/lobby/xp-progress-bar';
import { LightstickMascot } from '@/components/mascot/lightstick-mascot';

interface PlayerData {
  display_name: string | null;
  total_xp: number;
  total_games: number;
  total_correct: number;
  total_songs_played: number;
  current_streak: number;
  longest_streak: number;
  rank_title: string;
  rank_level: number;
}

async function fetchPlayer(): Promise<PlayerData | null> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const adminDb = createServiceRoleClient();
    const { data } = await adminDb
      .from('bt_players')
      .select('display_name, total_xp, total_games, total_correct, total_songs_played, current_streak, longest_streak, rank_title, rank_level')
      .eq('user_id', user.id)
      .single();

    return (data as PlayerData) ?? null;
  } catch {
    return null;
  }
}

async function fetchSongCount(): Promise<number> {
  try {
    const supabase = createServiceRoleClient();
    const { count } = await supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function HomePage() {
  const [player, songCount] = await Promise.all([
    fetchPlayer(),
    fetchSongCount(),
  ]);

  const totalXp = player?.total_xp ?? 0;
  const rank = getRank(totalXp);
  const username = player?.display_name?.replace(/#\d+$/, '') ?? null;

  return (
    <div className="pt-4 md:pt-8 pb-8">
      {/* Desktop: 2-column layout */}
      <div className="flex gap-8 items-start">
        {/* Left column: main CTA */}
        <div className="flex-1 flex flex-col items-center text-center pt-2 md:pt-8">
          {/* Mascot */}
          <div className="mb-4 md:mb-6">
            <LightstickMascot mood="idle" />
          </div>

          {/* Headline */}
          <h1 className="text-xl md:text-2xl font-bold text-primary leading-tight mb-1">
            {username ? `Hey ${username}` : 'Ready to play?'}
          </h1>
          <p className="text-xs text-ghost mb-4 md:mb-5">
            Guess the K-pop song faster than anyone
            {songCount > 0 && <span className="hidden md:inline"> &middot; {songCount.toLocaleString()} songs</span>}
          </p>

          {/* XP progress bar */}
          {player && (
            <div className="mb-5 md:mb-6">
              <XpProgressBar totalXp={totalXp} />
            </div>
          )}

          {/* PLAY button */}
          <PlayButton />

          <p className="text-[10px] text-ghost mt-3">Choose your mode after pressing play</p>
        </div>

        {/* Right column: sidebar cards (desktop only) */}
        <div className="hidden md:flex flex-col gap-2.5 w-[280px] pt-2">
          <LobbyDaily />

          {player && (
            <StatsRow
              totalGames={player.total_games}
              totalCorrect={player.total_correct}
              totalSongsPlayed={player.total_songs_played}
              longestStreak={player.longest_streak}
            />
          )}

          {player && (
            <StreakCalendar currentStreak={player.current_streak} />
          )}
        </div>
      </div>

      {/* Mobile: stacked cards below the play button */}
      <div className="md:hidden flex flex-col gap-2.5 mt-6 max-w-[400px] mx-auto">
        <LobbyDaily />

        {player && (
          <StatsRow
            totalGames={player.total_games}
            totalCorrect={player.total_correct}
            totalSongsPlayed={player.total_songs_played}
            longestStreak={player.longest_streak}
          />
        )}

        {player && (
          <StreakCalendar currentStreak={player.current_streak} />
        )}
      </div>

      {/* SEO content for anonymous visitors */}
      {!player && (
        <section className="mt-10 pt-6 border-t border-subtle max-w-lg mx-auto">
          <h2 className="text-sm font-semibold mb-2 text-primary">The best K-pop blind test on the web</h2>
          <p className="text-xs text-tertiary leading-relaxed mb-3">
            Test your K-pop knowledge with over {songCount.toLocaleString()} songs.
            From BTS and BLACKPINK to NewJeans and LE SSERAFIM, can you name the song from just a clip?
            Play free, no app download, no subscription.
          </p>
          <h3 className="text-xs font-semibold mb-1 mt-3 text-primary">How it works</h3>
          <p className="text-xs text-tertiary leading-relaxed">
            Listen to a 30-second preview of a K-pop song. Pick the correct answer from 4 choices or type it yourself.
            The faster you answer, the more points you earn. Build combos, level up, and compete on leaderboards.
          </p>
        </section>
      )}
    </div>
  );
}

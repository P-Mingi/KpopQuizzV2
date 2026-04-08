import Link from 'next/link';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { GameSelector } from '@/components/home/game-selector';

interface Player {
  username: string;
  current_streak: number | null;
}

async function fetchPlayer(): Promise<Player | null> {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('players')
      .select('username, current_streak')
      .eq('id', user.id)
      .single();
    return (data as Player) ?? null;
  } catch {
    return null;
  }
}

async function fetchPlaylistStats() {
  try {
    const supabase = createServiceRoleClient();
    const { data: songs } = await supabase
      .from('songs')
      .select('artist_name, gender, generation, difficulty')
      .eq('status', 'active');

    if (!songs) return { categories: [], groups: [], total: 0, difficultyStats: { easy: 0, medium: 0, hard: 0 } };

    const total = songs.length;

    const categories = [
      { id: 'all', name: 'All K-pop', count: total },
      { id: 'gg', name: 'Girl groups', count: songs.filter((s) => s.gender === 'gg').length },
      { id: 'bg', name: 'Boy groups', count: songs.filter((s) => s.gender === 'bg').length },
      { id: 'solo', name: 'Solo', count: songs.filter((s) => s.gender === 'solo_female' || s.gender === 'solo_male').length },
      { id: '4th-gen', name: '4th gen', count: songs.filter((s) => s.generation === '4th').length },
      { id: '3rd-gen', name: '3rd gen', count: songs.filter((s) => s.generation === '3rd').length },
      { id: '2nd-gen', name: '2nd gen', count: songs.filter((s) => s.generation === '2nd').length },
    ].filter((c) => c.count >= 10);

    const artistCounts: Record<string, number> = {};
    for (const s of songs) {
      artistCounts[s.artist_name] = (artistCounts[s.artist_name] ?? 0) + 1;
    }

    const groups = Object.entries(artistCounts)
      .filter(([, count]) => count >= 10)
      .map(([name, count]) => ({
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    const difficultyStats = {
      easy: songs.filter((s) => s.difficulty === 'easy').length,
      medium: songs.filter((s) => s.difficulty === 'medium').length,
      hard: songs.filter((s) => s.difficulty === 'hard').length,
    };

    return { categories, groups, total, difficultyStats };
  } catch {
    return { categories: [], groups: [], total: 0, difficultyStats: { easy: 0, medium: 0, hard: 0 } };
  }
}

async function fetchDailyTeaserCount(): Promise<number> {
  try {
    const supabase = createServiceRoleClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data: challenge } = await supabase
      .from('daily_challenges')
      .select('id')
      .eq('date', today)
      .maybeSingle();
    if (!challenge) return 0;
    const { count } = await supabase
      .from('daily_challenge_plays')
      .select('player_id', { count: 'exact', head: true })
      .eq('challenge_id', challenge.id);
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function HomePage() {
  const [playlists, player, dailyPlays] = await Promise.all([
    fetchPlaylistStats(),
    fetchPlayer(),
    fetchDailyTeaserCount(),
  ]);

  const streak = player?.current_streak ?? 0;

  return (
    <div className="pt-3 md:pt-6 pb-8 max-w-[560px] mx-auto">
      {/* Streak ribbon */}
      {streak > 0 && (
        <p className="text-center text-xs font-semibold text-streak mb-3">
          {streak} day streak
        </p>
      )}

      {/* Hero */}
      <div className="text-center mb-6">
        <h1 className="text-[28px] md:text-3xl font-bold text-primary leading-tight">
          {player ? `Hey ${player.username}` : 'Ready to play?'}
        </h1>
        <p className="text-[13px] text-ghost mt-1">
          {playlists.total.toLocaleString()} songs across {playlists.groups.length} artists
        </p>
      </div>

      {/* Game selector lobby (mode + playlist + groups + difficulty + PLAY) */}
      <GameSelector playlists={playlists} />

      {/* Daily teaser */}
      <div className="mt-6">
        <Link
          href="/daily"
          className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-surface border border-default shadow-card hover:border-accent transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" aria-hidden="true" />
          <span className="flex-1 text-xs text-tertiary">
            <span className="font-semibold text-primary">Daily challenge</span>
            {dailyPlays > 0 && (
              <span className="text-ghost"> - {dailyPlays.toLocaleString()} {dailyPlays === 1 ? 'play' : 'plays'} today</span>
            )}
          </span>
          <span className="text-[11px] font-semibold text-accent">Play</span>
        </Link>
      </div>

      {/* SEO content for anonymous visitors */}
      {!player && (
        <section className="mt-8 pt-6 border-t border-subtle">
          <h2 className="text-sm font-semibold mb-2 text-primary">The best K-pop blind test on the web</h2>
          <p className="text-xs text-tertiary leading-relaxed mb-3">
            Test your K-pop knowledge with over {playlists.total.toLocaleString()} songs from {playlists.groups.length}+ artists.
            From BTS and BLACKPINK to NewJeans and LE SSERAFIM, can you name the song from just a clip? Play free, no app download, no subscription.
          </p>
          <h3 className="text-xs font-semibold mb-1 mt-3 text-primary">How it works</h3>
          <p className="text-xs text-tertiary leading-relaxed mb-3">
            Listen to a 30-second preview of a K-pop song. Pick the correct answer from 4 choices (Quick Play) or type it yourself (Challenge Mode).
            The faster you answer, the more points you earn. Build combos, level up, and compete on leaderboards.
          </p>
          <h3 className="text-xs font-semibold mb-1 mt-3 text-primary">Available artists</h3>
          <p className="text-xs text-tertiary leading-relaxed">
            {playlists.groups.slice(0, 30).map((g) => g.name).join(', ')}, and many more.
          </p>
        </section>
      )}
    </div>
  );
}

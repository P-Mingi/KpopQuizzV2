import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { GameSelector } from '@/components/home/game-selector';
import { DailyTeaser } from '@/components/home/daily-teaser';
import { LightstickMascot } from '@/components/mascot/lightstick-mascot';
import { KOREAN_MOMENTS } from '@/lib/korean-moments';

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
    // Supabase has a server-side max-rows cap (1000 by default) that .limit() can't
    // override. Paginate via .range() to pull the full ~22K active song catalog so
    // per-artist and per-category counts are accurate.
    const PAGE_SIZE = 1000;
    type Row = { artist_name: string; gender: string | null; generation: string | null; difficulty: string | null };
    const songs: Row[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from('songs')
        .select('artist_name, gender, generation, difficulty')
        .eq('status', 'active')
        .range(from, from + PAGE_SIZE - 1);
      if (error || !data || data.length === 0) break;
      songs.push(...(data as Row[]));
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
      if (from > 100000) break; // safety stop
    }

    if (songs.length === 0) return { categories: [], groups: [], total: 0, difficultyStats: { easy: 0, medium: 0, hard: 0 } };

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

    // Per-artist aggregate: count + first-seen gender + first-seen generation.
    const artistMeta: Record<string, { count: number; gender: string | null; generation: string | null }> = {};
    for (const s of songs) {
      const existing = artistMeta[s.artist_name];
      if (existing) {
        existing.count += 1;
        if (!existing.gender && s.gender) existing.gender = s.gender;
        if (!existing.generation && s.generation) existing.generation = s.generation;
      } else {
        artistMeta[s.artist_name] = { count: 1, gender: s.gender, generation: s.generation };
      }
    }

    const groups = Object.entries(artistMeta)
      .filter(([, meta]) => meta.count >= 10)
      .map(([name, meta]) => ({
        id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name,
        count: meta.count,
        gender: meta.gender,
        generation: meta.generation,
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

export default async function HomePage() {
  const [playlists, player] = await Promise.all([
    fetchPlaylistStats(),
    fetchPlayer(),
  ]);

  const streak = player?.current_streak ?? 0;

  return (
    <div className="pt-3 md:pt-6 pb-8 max-w-[560px] mx-auto">
      {/* Mascot hidden on mobile home to avoid overlap with the daily teaser
          card's Play link. Still visible on desktop home and during gameplay. */}
      <div className="hidden md:block">
        <LightstickMascot mood="idle" />
      </div>

      {/* Streak ribbon */}
      {streak > 0 && (
        <p className="text-center text-xs font-semibold text-streak mb-3">
          {streak} day streak <span className="text-ghost font-normal">{KOREAN_MOMENTS.streakGrow!.text}</span>
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

      {/* Daily teaser (context-aware: shows urgency if not played, result if played) */}
      <div className="mt-6">
        <DailyTeaser />
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

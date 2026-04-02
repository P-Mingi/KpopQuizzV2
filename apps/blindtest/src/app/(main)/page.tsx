import Link from 'next/link';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { GameSelector } from '@/components/home/game-selector';

async function fetchPlayer() {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase.from('players').select('*').eq('id', user.id).single();
    return data;
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

export default async function HomePage() {
  const [playlists, player] = await Promise.all([fetchPlaylistStats(), fetchPlayer()]);

  return (
    <div className="pt-5 pb-8">
      {/* Greeting */}
      {player ? (
        <div className="mb-5">
          <p className="text-xl font-semibold">Hey {(player as Record<string, unknown>).username as string}</p>
          <p className="text-[13px] text-text-secondary mt-0.5">Ready to play?</p>
        </div>
      ) : (
        <div className="mb-5">
          <p className="text-xl font-semibold">K-pop blind test</p>
          <p className="text-[13px] text-text-secondary mt-0.5">
            {playlists.total.toLocaleString()} songs from {playlists.groups.length}+ artists
          </p>
        </div>
      )}

      {/* Daily challenge card */}
      <DailyChallengeCard />

      {/* Game selector */}
      <GameSelector playlists={playlists} />

      {/* Stats (logged in) */}
      {player && (
        <div className="mt-7">
          <SectionLabel>Your stats</SectionLabel>
          <PlayerStatsCard player={player as Record<string, unknown>} />
        </div>
      )}

      {/* Leaderboard - mobile only */}
      <div className="md:hidden mt-7">
        <SectionLabel>Leaderboard</SectionLabel>
        <LeaderboardPreview />
      </div>

      {/* SEO content for anonymous visitors */}
      {!player && (
        <section className="mt-8 pt-6 border-t border-border-default">
          <h2 className="text-sm font-semibold mb-2">The best K-pop blind test on the web</h2>
          <p className="text-xs text-text-secondary leading-relaxed mb-3">
            Test your K-pop knowledge with over {playlists.total.toLocaleString()} songs from {playlists.groups.length}+ artists. From BTS and BLACKPINK to NewJeans and LE SSERAFIM,
            can you name the song from just a clip? Play free - no app download, no subscription.
          </p>
          <h3 className="text-xs font-semibold mb-1 mt-3">How it works</h3>
          <p className="text-xs text-text-secondary leading-relaxed mb-3">
            Listen to a 30-second preview of a K-pop song. Pick the correct answer from 4 choices (Quick Play) or type it yourself (Challenge Mode).
            The faster you answer, the more points you earn. Build combos, level up, and compete on leaderboards.
          </p>
          <h3 className="text-xs font-semibold mb-1 mt-3">Available artists</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            {playlists.groups.slice(0, 30).map((g) => g.name).join(', ')}, and many more.
          </p>
        </section>
      )}
    </div>
  );
}

// ---- Sub-components ----

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-2.5">
      {children}
    </p>
  );
}

function DailyChallengeCard() {
  return (
    <Link href="/play?playlist=all&mode=quick&difficulty=all">
      <div className="mb-6 p-4 rounded-2xl border relative overflow-hidden shadow-card" style={{ background: 'linear-gradient(135deg, var(--daily-card-from), var(--daily-card-to))', borderColor: 'var(--daily-card-border)' }}>
        <div className="absolute top-3 right-4 w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z" fill="var(--pink-400)"/>
          </svg>
        </div>
        <span className="inline-block px-2 py-0.5 rounded-md bg-pink-400 text-white text-[10px] font-semibold uppercase tracking-wide mb-2">
          Daily Challenge
        </span>
        <p className="text-[15px] font-semibold mb-0.5">Today&apos;s 10 songs</p>
        <p className="text-xs text-text-secondary mb-3">
          Same songs for everyone - compete on the leaderboard
        </p>
        <div className="inline-block px-5 py-2.5 rounded-xl bg-pink-400 text-bg-primary text-[13px] font-semibold">
          Play daily
        </div>
      </div>
    </Link>
  );
}

function PlayerStatsCard({ player }: { player: Record<string, unknown> }) {
  const totalPlayed = (player.total_songs_played as number) ?? 0;
  const totalCorrect = (player.total_songs_correct as number) ?? 0;
  const accuracy = totalPlayed > 0 ? Math.round(totalCorrect / totalPlayed * 100) : 0;

  return (
    <div className="p-3.5 rounded-[14px] bg-bg-secondary border border-border-default shadow-card mb-7">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-pink-400 flex items-center justify-center text-sm font-semibold text-bg-primary">
          {((player.username as string) ?? '?').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-[13px] font-medium">
            Level {(player.level as number) ?? 1} <span className="text-text-tertiary font-normal">- {((player.xp as number) ?? 0).toLocaleString()} XP</span>
          </p>
          <p className="text-[11px] text-text-tertiary">
            {totalCorrect.toLocaleString()} songs - {accuracy}% accuracy
          </p>
        </div>
      </div>
    </div>
  );
}

function LeaderboardPreview() {
  return (
    <div className="rounded-[14px] bg-bg-secondary border border-border-default shadow-card overflow-hidden mb-4">
      <div className="py-6 text-center">
        <p className="text-xs text-text-tertiary">No plays yet</p>
        <p className="text-[10px] text-text-ghost mt-0.5">Be the first to set a score</p>
      </div>
      <Link href="/leaderboard" className="block text-center py-2.5 text-[11px] text-text-tertiary border-t border-border-default">
        View full leaderboard
      </Link>
    </div>
  );
}

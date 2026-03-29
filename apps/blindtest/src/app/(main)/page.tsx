import Link from 'next/link';
import { createServerClient } from '@kpopquiz/shared/supabase/server';
import { GameSelector } from '@/components/home/game-selector';
import { getSongCounts } from '@/lib/get-song-counts';

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

export default async function HomePage() {
  const [songCounts, player] = await Promise.all([getSongCounts(), fetchPlayer()]);

  return (
    <div className="pt-5 pb-8">
      {/* Greeting */}
      {player ? (
        <div className="mb-5">
          <p className="text-xl font-semibold">Hey {player.username}</p>
          <p className="text-[13px] text-text-secondary mt-0.5">Ready to play?</p>
        </div>
      ) : (
        <div className="mb-5">
          <p className="text-xl font-semibold">K-pop blind test</p>
          <p className="text-[13px] text-text-secondary mt-0.5">How well do you REALLY know K-pop?</p>
        </div>
      )}

      {/* Daily challenge card */}
      <DailyChallengeCard />

      {/* Game selector (mode + filter + group + play) */}
      <GameSelector songCounts={songCounts} />

      {/* Stats (logged in) */}
      {player && (
        <div className="mt-7">
          <SectionLabel>Your stats</SectionLabel>
          <PlayerStatsCard player={player} />
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
            Test your K-pop knowledge with over 600 songs from 45+ groups. From BTS and BLACKPINK to NewJeans and LE SSERAFIM,
            can you name the song from just a clip? Play free - no app download, no subscription.
          </p>
          <h3 className="text-xs font-semibold mb-1 mt-3">How it works</h3>
          <p className="text-xs text-text-secondary leading-relaxed mb-3">
            Listen to a short clip of a K-pop song. Pick the correct answer from 4 choices. The faster you answer,
            the more points you earn. Build combos, level up your group mastery, and compete on leaderboards.
          </p>
          <h3 className="text-xs font-semibold mb-1 mt-3">Available groups</h3>
          <p className="text-xs text-text-secondary leading-relaxed">
            BTS, BLACKPINK, Stray Kids, TWICE, EXO, SEVENTEEN, aespa, NewJeans, IVE, LE SSERAFIM, ITZY,
            (G)I-DLE, Red Velvet, TXT, ENHYPEN, ATEEZ, SHINee, Girls&apos; Generation, BIGBANG, 2NE1, NCT 127,
            NCT DREAM, MAMAMOO, GOT7, MONSTA X, and many more.
          </p>
        </section>
      )}
    </div>
  );
}

// ── Sub-components ──

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-2.5">
      {children}
    </p>
  );
}

function DailyChallengeCard() {
  return (
    <Link href="/daily">
      <div className="mb-6 p-4 rounded-2xl border relative overflow-hidden shadow-card" style={{ background: 'linear-gradient(135deg, var(--daily-card-from), var(--daily-card-to))', borderColor: 'var(--daily-card-border)' }}>
        <div className="absolute top-3 right-4 w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1L9.5 6.5L15 8L9.5 9.5L8 15L6.5 9.5L1 8L6.5 6.5L8 1Z" fill="var(--pink-400)"/>
          </svg>
        </div>
        <p className="text-[15px] font-semibold mb-0.5">Today&apos;s challenge</p>
        <p className="text-xs text-text-secondary mb-3">
          10 songs everyone plays. One shot. How do you rank?
        </p>
        <div className="inline-block px-5 py-2.5 rounded-xl bg-pink-400 text-bg-primary text-[13px] font-semibold">
          Play daily
        </div>
      </div>
    </Link>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PlayerStatsCard({ player }: { player: any }) {
  const accuracy = player.total_songs_played > 0
    ? Math.round(player.total_songs_correct / player.total_songs_played * 100)
    : 0;

  return (
    <div className="p-3.5 rounded-[14px] bg-bg-secondary border border-border-default shadow-card mb-7">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-pink-400 flex items-center justify-center text-sm font-semibold text-bg-primary">
          {player.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-[13px] font-medium">
            Level {player.level} <span className="text-text-tertiary font-normal">- {player.xp.toLocaleString()} XP</span>
          </p>
          <p className="text-[11px] text-text-tertiary">
            {player.total_songs_correct.toLocaleString()} songs - {accuracy}% accuracy
          </p>
        </div>
      </div>
    </div>
  );
}

function LeaderboardPreview() {
  return (
    <div className="rounded-[14px] bg-bg-secondary border border-border-default shadow-card overflow-hidden mb-4">
      <div className="flex border-b border-border-default">
        <button className="flex-1 py-2.5 text-[11px] font-medium text-pink-400 border-b-2 border-pink-400">Today</button>
        <button className="flex-1 py-2.5 text-[11px] font-medium text-text-tertiary">Weekly</button>
        <button className="flex-1 py-2.5 text-[11px] font-medium text-text-tertiary">All time</button>
      </div>
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

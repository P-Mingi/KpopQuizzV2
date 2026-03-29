import Link from 'next/link';
import { createServerClient } from '@kpopquiz/shared/supabase/server';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ModeData = any;

async function fetchModes() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3022';
  const res = await fetch(`${baseUrl}/api/modes`, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  return res.json();
}

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
  const [modesData, player] = await Promise.all([fetchModes(), fetchPlayer()]);

  const modes = modesData?.modes ?? { difficulty: [], group: [], era: [], special: [] };
  const stats = modesData?.stats ?? { total_songs: 0, total_plays: 0, available_modes: 0 };

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

      {/* Pick your challenge */}
      <SectionLabel>Pick your challenge</SectionLabel>
      {/* Desktop: grid, Mobile: horizontal scroll */}
      <div className="hidden md:grid md:grid-cols-3 gap-2.5 mb-7">
        {modes.difficulty.filter((m: ModeData) => m.song_count_available > 0).map((m: ModeData) => (
          <DifficultyModeCard key={m.id} mode={m} responsive />
        ))}
      </div>
      <div className="md:hidden flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 mb-7">
        {modes.difficulty.filter((m: ModeData) => m.song_count_available > 0).map((m: ModeData) => (
          <DifficultyModeCard key={m.id} mode={m} />
        ))}
      </div>

      {/* By group */}
      {modes.group.length > 0 && (
        <>
          <SectionLabel>By group</SectionLabel>
          <div className="hidden md:flex md:flex-wrap gap-2 mb-7">
            {modes.group.map((m: ModeData) => (
              <GroupModeCard key={m.id} mode={m} responsive />
            ))}
          </div>
          <div className="md:hidden flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4 mb-7">
            {modes.group.map((m: ModeData) => (
              <GroupModeCard key={m.id} mode={m} />
            ))}
          </div>
        </>
      )}

      {/* By era */}
      <SectionLabel>By era</SectionLabel>
      <div className="grid grid-cols-3 gap-2 mb-7">
        {modes.era.map((m: ModeData) => (
          <EraModeCard key={m.id} mode={m} />
        ))}
      </div>

      {/* Special modes */}
      <SectionLabel>Special modes</SectionLabel>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 mb-7">
        {modes.special.filter((m: ModeData) => m.song_count_available > 0).map((m: ModeData) => (
          <SpecialModeCard key={m.id} mode={m} />
        ))}
      </div>

      {/* Stats (logged in) */}
      {player && (
        <>
          <SectionLabel>Your stats</SectionLabel>
          <PlayerStatsCard player={player} />
        </>
      )}

      {/* Leaderboard - mobile only (sidebar has it on desktop) */}
      <div className="md:hidden">
        <SectionLabel>Leaderboard</SectionLabel>
        <LeaderboardPreview />
      </div>

      {/* Global stats */}
      <div className="text-center mt-6 pt-6 border-t border-border-default">
        <p className="text-xs text-text-tertiary">
          {stats.total_songs} songs - {stats.available_modes} modes - {stats.total_plays} plays
        </p>
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

function DifficultyModeCard({ mode, responsive }: { mode: ModeData; responsive?: boolean }) {
  const isAvailable = mode.available;
  const isHard = mode.difficulty === 'hard' || mode.difficulty === 'expert';

  return (
    <Link href={isAvailable ? `/play/${mode.id}` : '#'} className={!isAvailable ? 'pointer-events-none' : ''}>
      <div className={`${responsive ? 'w-auto' : 'w-[130px] flex-shrink-0'} rounded-[14px] overflow-hidden bg-bg-secondary border border-border-default shadow-card transition-colors ${
        isAvailable ? 'hover:border-border-hover' : 'opacity-40'
      }`}>
        {isHard ? (
          <div className="h-14 bg-bg-tertiary flex items-center justify-center gap-[2px]">
            {[12, 22, 30, 18, 8].map((h, i) => (
              <div key={i} className="w-[3px] rounded-sm bg-wrong" style={{ height: h }} />
            ))}
          </div>
        ) : (
          <div className="h-14 flex overflow-hidden bg-bg-tertiary">
            {(mode.thumbnails ?? []).slice(0, 2).map((ytId: string, i: number) => (
              <img key={i} src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                alt="" className="flex-1 object-cover min-w-0" />
            ))}
          </div>
        )}
        <div className="p-2.5">
          <DifficultyBadge difficulty={mode.difficulty} />
          <p className="text-[13px] font-medium mt-1">{mode.title}</p>
          <p className="text-[10px] text-text-tertiary">{mode.clip_duration}s - {mode.song_count} songs</p>
        </div>
      </div>
    </Link>
  );
}

function GroupModeCard({ mode, responsive }: { mode: ModeData; responsive?: boolean }) {
  return (
    <Link href={mode.available ? `/play/${mode.id}` : '#'} className={!mode.available ? 'pointer-events-none' : ''}>
      <div className={`${responsive ? 'w-auto' : 'w-[130px] flex-shrink-0'} rounded-xl overflow-hidden bg-bg-secondary border border-border-default shadow-card ${
        mode.available ? 'hover:border-border-hover' : 'opacity-40'
      }`}>
        <div className="h-14 flex overflow-hidden bg-bg-tertiary">
          {(mode.thumbnails ?? []).slice(0, 2).map((ytId: string, i: number) => (
            <img key={i} src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
              alt="" className="flex-1 object-cover min-w-0" />
          ))}
        </div>
        <div className="p-2.5">
          <p className="text-[13px] font-medium">{mode.title}</p>
          <p className="text-[10px] text-text-tertiary">{mode.song_count_available} songs</p>
        </div>
      </div>
    </Link>
  );
}

function EraModeCard({ mode }: { mode: ModeData }) {
  return (
    <Link href={mode.available ? `/play/${mode.id}` : '#'}>
      <div className={`rounded-xl p-3 border border-border-default bg-bg-secondary shadow-card ${
        mode.available ? 'hover:border-border-hover' : 'opacity-40'
      }`}>
        <p className="text-[13px] font-medium">{mode.title}</p>
        <p className="text-[10px] text-text-tertiary mt-0.5">{mode.song_count_available} songs</p>
      </div>
    </Link>
  );
}

function SpecialModeCard({ mode }: { mode: ModeData }) {
  const isHard = mode.difficulty === 'hard' || mode.difficulty === 'expert';
  return (
    <Link href={mode.available ? `/play/${mode.id}` : '#'}>
      <div className={`rounded-xl overflow-hidden border border-border-default bg-bg-secondary shadow-card ${
        mode.available ? 'hover:border-border-hover' : 'opacity-40'
      }`}>
        {isHard ? (
          <div className="h-12 bg-bg-tertiary flex items-center justify-center gap-[2px]">
            {[10, 18, 26, 16, 8].map((h, i) => (
              <div key={i} className="w-[3px] rounded-sm bg-wrong" style={{ height: h }} />
            ))}
          </div>
        ) : (
          <div className="h-12 flex overflow-hidden bg-bg-tertiary">
            {(mode.thumbnails ?? []).slice(0, 4).map((ytId: string, i: number) => (
              <img key={i} src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                alt="" className="flex-1 object-cover min-w-0" />
            ))}
          </div>
        )}
        <div className="p-2.5">
          <DifficultyBadge difficulty={mode.difficulty} />
          <p className="text-[13px] font-medium mt-1">{mode.title}</p>
          <p className="text-[10px] text-text-tertiary line-clamp-1">
            {mode.available ? mode.description : `Coming soon (${mode.song_count_available}/${mode.song_count})`}
          </p>
        </div>
      </div>
    </Link>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const styles: Record<string, string> = {
    easy: 'bg-correct-bg text-correct',
    medium: 'bg-streak-bg text-streak',
    hard: 'bg-wrong-bg text-wrong',
    expert: 'bg-wrong-bg text-wrong',
  };
  return (
    <span className={`text-[9px] font-semibold px-1.5 py-px rounded-md ${styles[difficulty] ?? styles.easy}`}>
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </span>
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

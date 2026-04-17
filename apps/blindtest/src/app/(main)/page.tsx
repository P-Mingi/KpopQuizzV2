import Link from 'next/link';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { LightstickMascot } from '@/components/mascot/lightstick-mascot';
import { TipBanner } from '@/components/shared/tip-banner';
import { getLevelFromXP } from '@/lib/progression';
import { SEO } from '@/lib/seo';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: SEO.home.title,
  description: SEO.home.description,
};

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

  const username = player?.display_name?.replace(/#\d+$/, '') ?? null;
  const accuracy = player?.total_songs_played && player.total_songs_played > 0
    ? Math.round((player.total_correct / player.total_songs_played) * 100)
    : 0;
  const xpProgress = getLevelFromXP(player?.total_xp || 0).progressPercent;

  return (
    <div className="relative min-h-screen pb-14">
      {/* Top bar */}
      <div className="flex justify-between items-center px-3.5 md:px-7 py-3">
        {/* Logo */}
        <div className="flex items-center gap-[5px]">
          <LightstickMascot size={18} />
          <span className="text-[13px] md:text-[16px] font-semibold text-primary">kpop</span>
          <span className="text-[13px] md:text-[16px] font-semibold text-[#D4537E] -ml-[3px]">blindtest</span>
        </div>
        {/* Right: streak badge + rank pill + settings */}
        <div className="flex items-center gap-1.5 md:gap-2.5">
          {/* Streak badge - only if streak > 0 */}
          {player?.current_streak && player.current_streak > 0 && (
            <div className="flex items-center gap-[3px] px-[7px] py-1 bg-[#FAEEDA] dark:bg-[rgba(186,117,23,0.15)] rounded-md">
              <svg width="10" height="10" viewBox="0 0 14 14" fill="currentColor" className="text-[#BA7517] dark:text-[#EF9F27]">
                <path d="M7 2c0 2.5-1.5 3.5-1.5 5.5C5.5 9.5 6 10.5 7 10.5s1.5-1 1.5-3C8.5 5.5 7 4.5 7 2z" />
              </svg>
              <span className="text-[9px] font-semibold text-[#854F0B] dark:text-[#EF9F27]">{player.current_streak}</span>
            </div>
          )}
          {/* Rank pill */}
          <div className="flex items-center gap-[3px] px-[7px] py-1 md:px-2.5 md:py-1.5 bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.15)] rounded-full border border-[#F4C0D1] dark:border-[rgba(212,83,126,0.3)]">
            <div className="w-[18px] h-[18px] md:w-[22px] md:h-[22px] rounded-full border-[1.5px] md:border-2 border-[#D4537E] flex items-center justify-center text-[7px] md:text-[9px] font-semibold text-[#D4537E]">
              {player?.rank_level || 1}
            </div>
            <span className="text-[9px] md:text-[10px] font-semibold text-[#993556] dark:text-[#ED93B1] capitalize">
              {player?.rank_title || 'Trainee'}
            </span>
          </div>
          {/* Settings - desktop only */}
          <button className="hidden md:flex w-7 h-7 rounded-full bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-[#888780] dark:text-white/40">
              <circle cx="7" cy="7" r="5.5" /><path d="M7 4.5v2.5" /><circle cx="7" cy="9.5" r="0.5" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-center md:gap-16 md:pt-12 max-w-[960px] mx-auto">
        {/* Left column: mascot + play */}
        <div className="flex flex-col items-center text-center md:w-[380px] pt-6 md:pt-4 px-3.5 md:px-0">
          {/* Mascot with rank ring */}
          <div className="w-[100px] h-[100px] md:w-[140px] md:h-[140px] rounded-full bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.12)] flex items-center justify-center relative mb-3 md:mb-4">
            <div className="absolute -inset-1 md:-inset-[6px] rounded-full border-2 md:border-[3px] border-[#F4C0D1] dark:border-[rgba(212,83,126,0.3)]" />
            <div className="absolute -inset-1 md:-inset-[6px] rounded-full border-2 md:border-[3px] border-[#D4537E] border-r-transparent border-b-transparent -rotate-45" />
            <LightstickMascot mood="idle" />
          </div>

          <h1 className="text-xl md:text-[28px] font-semibold text-primary mb-1">
            {username ? `Hey ${username}` : 'Ready to play?'}
          </h1>
          <p className="text-xs md:text-sm text-secondary mb-2 md:mb-2.5">
            Guess the K-pop song faster than anyone
            {songCount > 0 && <> &middot; {songCount.toLocaleString()} songs</>}
          </p>

          {/* XP bar */}
          <div className="flex items-center gap-1.5 md:gap-2 mb-5 md:mb-8">
            <div className="w-[160px] md:w-[200px] h-1 md:h-1.5 rounded-full bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.08)] overflow-hidden">
              <div className="h-full rounded-full bg-[#D4537E]" style={{ width: `${xpProgress}%` }} />
            </div>
            <span className="text-[9px] md:text-[11px] text-secondary tabular-nums">{player?.total_xp || 0} XP</span>
          </div>

          {/* PLAY button */}
          <Link href="/modes" className="w-[130px] h-[130px] md:w-[160px] md:h-[160px] rounded-full relative cursor-pointer group mb-3 md:mb-5 block">
            <div className="absolute inset-0 rounded-full border-2 md:border-[3px] border-[#F4C0D1] dark:border-[rgba(212,83,126,0.3)]" />
            <div className="absolute inset-2 md:inset-3 rounded-full border-[1.5px] md:border-2 border-[#FBEAF0] dark:border-[rgba(212,83,126,0.15)]" />
            <div className="absolute inset-4 md:inset-5 rounded-full bg-[#D4537E] flex flex-col items-center justify-center transition-colors group-hover:bg-[#C44A72] group-active:scale-95">
              <svg width="24" height="24" className="md:w-[30px] md:h-[30px] mb-[2px]" viewBox="0 0 22 22" fill="#fff"><path d="M6 3l12 8-12 8z" /></svg>
              <span className="text-[11px] md:text-[13px] font-semibold text-white tracking-[0.8px]">PLAY</span>
            </div>
          </Link>
          <p className="text-[10px] md:text-xs text-secondary">Choose your mode after pressing play</p>
        </div>

        {/* Right column: cards */}
        <div className="flex flex-col gap-2.5 md:gap-3 md:w-[420px] max-w-[480px] mx-auto md:mx-0 mt-6 md:mt-4 px-3.5 md:px-0">
          {/* Daily challenge card */}
          <Link href="/daily" className="w-full flex items-center gap-3 md:gap-3.5 px-3.5 md:px-4 py-3 md:py-4 rounded-xl md:rounded-[14px] border-[1.5px] border-[#C0DD97] dark:border-[rgba(99,153,34,0.3)] bg-white dark:bg-[rgba(99,153,34,0.08)] relative hover:border-[#97C459] transition-colors">
            <div className="absolute top-2 right-2 md:top-2.5 md:right-2.5 w-[6px] h-[6px] md:w-2 md:h-2 rounded-full bg-[#639922]" />
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-xl bg-[#EAF3DE] dark:bg-[rgba(99,153,34,0.15)] flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" className="md:w-[18px] md:h-[18px]" viewBox="0 0 14 14" fill="none" stroke="#639922" strokeWidth="1.3" strokeLinecap="round">
                <circle cx="7" cy="7" r="5" /><path d="M7 4.5v2.5l2 1.5" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs md:text-[13px] font-semibold text-primary">Daily challenge</p>
              <p className="text-[10px] md:text-[11px] text-secondary">Same songs for everyone. One attempt.</p>
            </div>
          </Link>

          {/* Stats card */}
          {player && (
            <div className="w-full flex items-center gap-3 md:gap-3.5 px-3.5 md:px-4 py-3 md:py-4 rounded-xl md:rounded-[14px] border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-xl bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.1)] flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" className="md:w-[18px] md:h-[18px]" viewBox="0 0 14 14" fill="none" stroke="#D4537E" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 2l1.5 3 3.5 0.5-2.5 2.5.6 3.5L7 9.5l-3.1 2L4.5 8 2 5.5l3.5-.5z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs md:text-[13px] font-semibold text-primary">Your stats</p>
                <p className="text-[10px] md:text-[11px] text-secondary">{player.total_games} games / {accuracy}% accuracy / best streak: {player.longest_streak}</p>
              </div>
              <span className="text-[10px] md:text-[11px] font-semibold text-[#D4537E] capitalize whitespace-nowrap">{player.rank_title}</span>
            </div>
          )}

          {/* Challenge a friend card */}
          <Link href="/modes" className="w-full flex items-center gap-3 md:gap-3.5 px-3.5 md:px-4 py-3 md:py-4 rounded-xl md:rounded-[14px] border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[rgba(255,255,255,0.04)] hover:border-[#D4537E] transition-colors">
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-lg md:rounded-xl bg-[#EEEDFE] dark:bg-[rgba(83,74,183,0.12)] flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" className="md:w-[18px] md:h-[18px]" viewBox="0 0 16 16" fill="none" stroke="#534AB7" strokeWidth="1.3" strokeLinecap="round">
                <circle cx="5.5" cy="5.5" r="3" /><circle cx="10.5" cy="10.5" r="3" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs md:text-[13px] font-semibold text-primary">Challenge a friend</p>
              <p className="text-[10px] md:text-[11px] text-secondary">Send a link, compare scores.</p>
            </div>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-[#D3D1C7] dark:text-white/20 flex-shrink-0"><path d="M5 2.5L9.5 7 5 11.5" /></svg>
          </Link>

          {/* Streak calendar */}
          <div className="w-full flex items-center gap-1 md:gap-1.5 px-3.5 md:px-4 py-2.5 md:py-3.5 rounded-xl md:rounded-[14px] bg-white dark:bg-[rgba(255,255,255,0.04)] border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)]">
            {['M','T','W','T','F','S','S'].map((day, i) => (
              <div key={i} className="w-[28px] h-[28px] md:w-[34px] md:h-[34px] rounded-md md:rounded-lg flex items-center justify-center text-[8px] md:text-[10px] font-semibold bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] text-[#D3D1C7] dark:text-[rgba(255,255,255,0.2)]">
                {day}
              </div>
            ))}
            <span className="text-[9px] md:text-[11px] text-secondary ml-auto font-medium whitespace-nowrap">
              {player?.current_streak || 0} day streak
            </span>
          </div>
        </div>
      </div>

      {/* SEO content for anonymous visitors */}
      {!player && (
        <section className="mt-10 pt-6 border-t border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] max-w-lg mx-auto px-3.5">
          <h2 className="text-sm font-semibold mb-2 text-primary">The best K-pop blind test on the web</h2>
          <p className="text-xs text-secondary leading-relaxed mb-3">
            Test your K-pop knowledge with over {songCount.toLocaleString()} songs.
            From BTS and BLACKPINK to NewJeans and LE SSERAFIM, can you name the song from just a clip?
            Play free, no app download, no subscription.
          </p>
          <h3 className="text-xs font-semibold mb-1 mt-3 text-primary">How it works</h3>
          <p className="text-xs text-secondary leading-relaxed">
            Listen to a 30-second preview of a K-pop song. Pick the correct answer from 4 choices or type it yourself.
            The faster you answer, the more points you earn. Build combos, level up, and compete on leaderboards.
          </p>
        </section>
      )}

      {/* Cross-site link */}
      <div className="text-center mt-8 mb-4">
        <a
          href="https://kpopquiz.org?utm_source=blindtest&utm_medium=crosslink"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-secondary hover:text-[#D4537E] transition-colors"
        >
          K-pop quizzes on kpopquiz.org
        </a>
      </div>

      {/* Tip banner */}
      <TipBanner tips={['Choose your mode after pressing play', 'Play daily to maintain your streak', 'Faster answers score more points']} />
    </div>
  );
}

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
    const curationEnabled = process.env.SONGS_IS_CURATED === 'true';

    let query = supabase
      .from('songs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')
      .not('preview_url', 'is', null)
      .not('title', 'ilike', '%remix%')
      .not('title', 'ilike', '%instrumental%')
      .not('title', 'ilike', '%inst.%')
      .not('title', 'ilike', '%(inst)%')
      .not('title', 'ilike', '%karaoke%')
      .not('title', 'ilike', '%MR removed%')
      .not('title', 'ilike', '%sped up%')
      .not('title', 'ilike', '%speed up%');

    if (curationEnabled) {
      query = query.eq('is_curated', true);
    }

    const { count } = await query;
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
      {/* Cross-site CTA banner */}
      <div className="flex justify-center py-2 md:py-2.5 bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.08)] border-b border-[#F4C0D1] dark:border-[rgba(212,83,126,0.15)]">
        <a
          href="https://kpopquiz.org?utm_source=blindtest&utm_medium=crosslink"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[11px] md:text-xs font-medium text-[#993556] dark:text-[#ED93B1] hover:text-[#D4537E] transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M4.5 7.5l3-3M3.5 5.5L2 7a2 2 0 0 0 2.83 2.83L6.5 8.17M8.5 6.5L10 5a2 2 0 0 0-2.83-2.83L5.5 3.83" /></svg>
          Try K-pop quizzes on kpopquiz.org
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"><path d="M3 1h6v6M9 1L4 6" /></svg>
        </a>
      </div>

      {/* Top bar */}
      <div className="flex justify-between items-center px-5 md:px-10 py-4 md:py-5">
        {/* Logo */}
        <div className="flex items-center gap-1.5">
          <LightstickMascot size={24} />
          <span className="text-[15px] md:text-[20px] font-semibold text-primary">kpop</span>
          <span className="text-[15px] md:text-[20px] font-semibold text-[#D4537E] -ml-[2px]">blindtest</span>
        </div>
        {/* Right: streak badge + rank pill + settings */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Streak badge */}
          {player?.current_streak && player.current_streak > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1.5 md:px-3 md:py-2 bg-[#FAEEDA] dark:bg-[rgba(186,117,23,0.15)] rounded-lg">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="currentColor" className="text-[#BA7517] dark:text-[#EF9F27]">
                <path d="M7 2c0 2.5-1.5 3.5-1.5 5.5C5.5 9.5 6 10.5 7 10.5s1.5-1 1.5-3C8.5 5.5 7 4.5 7 2z" />
              </svg>
              <span className="text-[11px] md:text-xs font-semibold text-[#854F0B] dark:text-[#EF9F27]">{player.current_streak}</span>
            </div>
          )}
          {/* Rank pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3.5 md:py-2 bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.15)] rounded-full border border-[#F4C0D1] dark:border-[rgba(212,83,126,0.3)]">
            <div className="w-[22px] h-[22px] md:w-[26px] md:h-[26px] rounded-full border-2 md:border-[2.5px] border-[#D4537E] flex items-center justify-center text-[8px] md:text-[10px] font-semibold text-[#D4537E]">
              {player?.rank_level || 1}
            </div>
            <span className="text-[11px] md:text-[13px] font-semibold text-[#993556] dark:text-[#ED93B1] capitalize">
              {player?.rank_title || 'Trainee'}
            </span>
          </div>
          {/* Settings */}
          <Link href="/settings" className="hidden md:flex w-9 h-9 rounded-full bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-[#888780] dark:text-white/40">
              <circle cx="7" cy="7" r="5.5" /><path d="M7 4.5v2.5" /><circle cx="7" cy="9.5" r="0.5" fill="currentColor" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-center md:gap-20 md:pt-10 max-w-[1100px] mx-auto">
        {/* Left column: mascot + play */}
        <div className="flex flex-col items-center text-center md:w-[440px] pt-4 md:pt-6 px-5 md:px-0">
          {/* Mascot with rank ring */}
          <div className="w-[120px] h-[120px] md:w-[180px] md:h-[180px] rounded-full bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.12)] flex items-center justify-center relative mb-4 md:mb-5">
            <div className="absolute -inset-[5px] md:-inset-2 rounded-full border-[2.5px] md:border-[3px] border-[#F4C0D1] dark:border-[rgba(212,83,126,0.3)]" />
            <div className="absolute -inset-[5px] md:-inset-2 rounded-full border-[2.5px] md:border-[3px] border-[#D4537E] border-r-transparent border-b-transparent -rotate-45" />
            <LightstickMascot mood="idle" size={60} />
          </div>

          <h1 className="text-2xl md:text-[34px] font-semibold text-primary mb-1.5">
            {username ? `Hey ${username}` : 'Ready to play?'}
          </h1>
          <p className="text-sm md:text-base text-secondary mb-3 md:mb-3">
            Guess the K-pop song faster than anyone
            {songCount > 0 && <> &middot; {songCount.toLocaleString()} songs</>}
          </p>

          {/* XP bar */}
          <div className="flex items-center gap-2 md:gap-2.5 mb-6 md:mb-10">
            <div className="w-[180px] md:w-[240px] h-1.5 md:h-2 rounded-full bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.08)] overflow-hidden">
              <div className="h-full rounded-full bg-[#D4537E]" style={{ width: `${xpProgress}%` }} />
            </div>
            <span className="text-[10px] md:text-xs text-secondary tabular-nums">{player?.total_xp || 0} XP</span>
          </div>

          {/* PLAY button */}
          <Link href="/modes" className="w-[150px] h-[150px] md:w-[200px] md:h-[200px] rounded-full relative cursor-pointer group mb-4 md:mb-6 block">
            <div className="absolute inset-0 rounded-full border-[2.5px] md:border-[3px] border-[#F4C0D1] dark:border-[rgba(212,83,126,0.3)]" />
            <div className="absolute inset-2.5 md:inset-3.5 rounded-full border-2 md:border-[2.5px] border-[#FBEAF0] dark:border-[rgba(212,83,126,0.15)]" />
            <div className="absolute inset-5 md:inset-7 rounded-full bg-[#D4537E] flex flex-col items-center justify-center transition-colors group-hover:bg-[#C44A72] group-active:scale-95">
              <svg width="28" height="28" className="md:w-[36px] md:h-[36px] mb-[2px]" viewBox="0 0 22 22" fill="#fff"><path d="M6 3l12 8-12 8z" /></svg>
              <span className="text-[12px] md:text-[15px] font-semibold text-white tracking-[1px]">PLAY</span>
            </div>
          </Link>
          <p className="text-[11px] md:text-sm text-secondary">Choose your mode after pressing play</p>
        </div>

        {/* Right column: cards */}
        <div className="flex flex-col gap-3 md:gap-3.5 md:w-[480px] max-w-[540px] mx-auto md:mx-0 mt-6 md:mt-6 px-5 md:px-0">
          {/* Daily challenge card */}
          <Link href="/daily" className="w-full flex items-center gap-3.5 md:gap-4 px-4 md:px-5 py-3.5 md:py-5 rounded-xl md:rounded-2xl border-[1.5px] border-[#C0DD97] dark:border-[rgba(99,153,34,0.3)] bg-white dark:bg-[rgba(99,153,34,0.08)] relative hover:border-[#97C459] transition-colors">
            <div className="absolute top-2.5 right-2.5 md:top-3 md:right-3 w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-[#639922]" />
            <div className="w-11 h-11 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-[#EAF3DE] dark:bg-[rgba(99,153,34,0.15)] flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" className="md:w-[22px] md:h-[22px]" viewBox="0 0 14 14" fill="none" stroke="#639922" strokeWidth="1.3" strokeLinecap="round">
                <circle cx="7" cy="7" r="5" /><path d="M7 4.5v2.5l2 1.5" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm md:text-base font-semibold text-primary">Daily challenge</p>
              <p className="text-[11px] md:text-xs text-secondary">Same songs for everyone. One attempt.</p>
            </div>
          </Link>

          {/* Stats card */}
          {player && (
            <div className="w-full flex items-center gap-3.5 md:gap-4 px-4 md:px-5 py-3.5 md:py-5 rounded-xl md:rounded-2xl border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
              <div className="w-11 h-11 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.1)] flex items-center justify-center flex-shrink-0">
                <svg width="18" height="18" className="md:w-[22px] md:h-[22px]" viewBox="0 0 14 14" fill="none" stroke="#D4537E" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 2l1.5 3 3.5 0.5-2.5 2.5.6 3.5L7 9.5l-3.1 2L4.5 8 2 5.5l3.5-.5z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm md:text-base font-semibold text-primary">Your stats</p>
                <p className="text-[11px] md:text-xs text-secondary">{player.total_games} games / {accuracy}% accuracy / best streak: {player.longest_streak}</p>
              </div>
              <span className="text-[11px] md:text-xs font-semibold text-[#D4537E] capitalize whitespace-nowrap">{player.rank_title}</span>
            </div>
          )}

          {/* Challenge a friend card */}
          <Link href="/modes" className="w-full flex items-center gap-3.5 md:gap-4 px-4 md:px-5 py-3.5 md:py-5 rounded-xl md:rounded-2xl border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[rgba(255,255,255,0.04)] hover:border-[#D4537E] transition-colors">
            <div className="w-11 h-11 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-[#EEEDFE] dark:bg-[rgba(83,74,183,0.12)] flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" className="md:w-[22px] md:h-[22px]" viewBox="0 0 16 16" fill="none" stroke="#534AB7" strokeWidth="1.3" strokeLinecap="round">
                <circle cx="5.5" cy="5.5" r="3" /><circle cx="10.5" cy="10.5" r="3" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm md:text-base font-semibold text-primary">Challenge a friend</p>
              <p className="text-[11px] md:text-xs text-secondary">Send a link, compare scores.</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-[#D3D1C7] dark:text-white/20 flex-shrink-0"><path d="M5 2.5L9.5 7 5 11.5" /></svg>
          </Link>

          {/* Streak calendar */}
          <div className="w-full flex items-center gap-1.5 md:gap-2 px-4 md:px-5 py-3 md:py-4 rounded-xl md:rounded-2xl bg-white dark:bg-[rgba(255,255,255,0.04)] border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)]">
            {['M','T','W','T','F','S','S'].map((day, i) => (
              <div key={i} className="w-[32px] h-[32px] md:w-[40px] md:h-[40px] rounded-lg md:rounded-xl flex items-center justify-center text-[9px] md:text-[11px] font-semibold bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] text-[#D3D1C7] dark:text-[rgba(255,255,255,0.2)]">
                {day}
              </div>
            ))}
            <span className="text-[10px] md:text-xs text-secondary ml-auto font-medium whitespace-nowrap">
              {player?.current_streak || 0} day streak
            </span>
          </div>
        </div>
      </div>

      {/* SEO content for anonymous visitors */}
      {!player && (
        <section className="mt-10 pt-6 border-t border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] max-w-xl mx-auto px-5">
          <h2 className="text-base font-semibold mb-2 text-primary">The best K-pop blind test on the web</h2>
          <p className="text-sm text-secondary leading-relaxed mb-3">
            Test your K-pop knowledge with over {songCount.toLocaleString()} songs.
            From BTS and BLACKPINK to NewJeans and LE SSERAFIM, can you name the song from just a clip?
            Play free, no app download, no subscription.
          </p>
          <h3 className="text-sm font-semibold mb-1 mt-3 text-primary">How it works</h3>
          <p className="text-sm text-secondary leading-relaxed">
            Listen to a 30-second preview of a K-pop song. Pick the correct answer from 4 choices or type it yourself.
            The faster you answer, the more points you earn. Build combos, level up, and compete on leaderboards.
          </p>
        </section>
      )}

      {/* Tip banner */}
      <TipBanner tips={['Choose your mode after pressing play', 'Play daily to maintain your streak', 'Faster answers score more points']} />
    </div>
  );
}

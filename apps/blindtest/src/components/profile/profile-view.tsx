'use client';

import Link from 'next/link';
import { getLevelFromXP } from '@/lib/progression';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { MasteryCard } from './mastery-card';
import { AchievementRow } from './achievement-row';
import { TipBanner } from '@/components/shared/tip-banner';
import { useTheme } from '@/components/theme-provider';

interface MasteryRow {
  id: string;
  playlist: string;
  play_count: number;
  best_score: number;
  total_correct: number;
  total_songs_played: number;
  mastery_stars: number;
}

interface PlayRow {
  mode: string;
  playlist: string;
  score: number;
  correct_count: number;
  total_songs: number;
  played_at: string;
}

interface Props {
  player: {
    id: string;
    display_name: string | null;
    avatar_url: string | null;
    level: number;
    total_xp: number;
    total_games: number;
    total_correct: number;
    total_songs_played: number;
    best_score: number;
    best_combo: number;
    current_streak: number;
    longest_streak: number;
  };
  masteries: MasteryRow[];
  achievements: { achievement_id: string }[];
  recentPlays: PlayRow[];
  isOwnProfile: boolean;
}

function formatPlaylistName(playlist: string): string {
  if (playlist === 'all') return 'All K-pop';
  if (playlist === 'gg') return 'Girl groups';
  if (playlist === 'bg') return 'Boy groups';
  if (playlist === 'solo') return 'Solo';
  if (playlist.endsWith('-gen')) return playlist.replace('-gen', ' gen');
  return playlist;
}

function formatModeName(mode: string): string {
  if (mode === 'daily') return 'Daily';
  if (mode === 'quick') return 'Quick play';
  if (mode === 'challenge') return 'Challenge';
  return mode.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ProfileView({ player, masteries, achievements, recentPlays, isOwnProfile }: Props) {
  const username = player.display_name?.replace(/#\d+$/, '') ?? 'Player';
  const accuracy = player.total_songs_played > 0
    ? Math.round((player.total_correct / player.total_songs_played) * 100)
    : 0;

  const earnedIds = new Set(achievements.map((a) => a.achievement_id));
  const levelInfo = getLevelFromXP(player.total_xp);
  const xpProgress = Math.max(0, Math.min(1, levelInfo.progressPercent / 100));
  const initial = username.charAt(0).toUpperCase();
  const { toggleTheme } = useTheme();

  async function shareProfile() {
    const url = `${window.location.origin}/player/${username}`;
    const text = `Level ${levelInfo.level} - ${player.total_correct} songs guessed - ${accuracy}% accuracy`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `${username} - K-pop Blind Test`, text, url });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  const displayName = username;
  const rankTitle = levelInfo.title;
  const rankLevel = levelInfo.level;
  const totalGames = player.total_games;
  const bestCombo = player.best_combo;
  const longestStreak = player.longest_streak;

  return (
    <div className="max-w-[500px] mx-auto px-3.5 md:px-7 py-4 md:py-6 relative pb-16">
      {/* Top bar with theme toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <Link href="/" className="w-[30px] h-[30px] rounded-full bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-primary"><path d="M8 1.5L3 6l5 4.5" /></svg>
          </Link>
          <h1 className="text-base md:text-lg font-medium text-primary">Profile</h1>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggleTheme} className="w-8 h-8 rounded-full bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#888780" strokeWidth="1.2" strokeLinecap="round">
              <circle cx="7" cy="7" r="3.5" /><path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.8 2.8l1 1M10.2 10.2l1 1M2.8 11.2l1-1M10.2 3.8l1-1" />
            </svg>
          </button>
          <Link href="/settings" className="w-8 h-8 rounded-full bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#888780" strokeWidth="1.2" strokeLinecap="round"><circle cx="7" cy="7" r="5.5" /><path d="M7 4.5v2.5" /><circle cx="7" cy="9.5" r="0.5" fill="#888780" /></svg>
          </Link>
        </div>
      </div>

      {/* Avatar with rank ring (centered) */}
      <div className="flex flex-col items-center text-center">
        <div className="w-[100px] h-[100px] md:w-[120px] md:h-[120px] rounded-full bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.12)] flex items-center justify-center relative mb-3">
          <div className="absolute -inset-1 rounded-full border-[2.5px] border-[#F4C0D1] dark:border-[rgba(212,83,126,0.3)]" />
          <div className="absolute -inset-1 rounded-full border-[2.5px] border-[#D4537E] border-r-transparent border-b-transparent -rotate-45" />
          <span className="text-3xl font-semibold text-[#D4537E]">{initial}</span>
        </div>
        <p className="text-lg font-semibold text-primary">{displayName}</p>
        <div className="flex items-center gap-2 mt-2 mb-4">
          <span className="px-3 py-1.5 rounded-full bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.1)] border border-[#F4C0D1] dark:border-[rgba(212,83,126,0.2)] text-[11px] font-semibold text-[#993556] dark:text-[#ED93B1] capitalize">
            {rankTitle} - Level {rankLevel}
          </span>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="max-w-[200px] mx-auto mb-5">
        <div className="h-[5px] rounded-full bg-[#F0EDE8] dark:bg-[rgba(255,255,255,0.06)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#D4537E] transition-all"
            style={{ width: `${xpProgress * 100}%` }}
          />
        </div>
        <p className="text-[10px] text-[#888780] dark:text-[rgba(255,255,255,0.35)] mt-1 tabular-nums text-center">
          {levelInfo.progressXP.toLocaleString()} / {(levelInfo.nextLevelXP - levelInfo.currentLevelXP).toLocaleString()} XP
        </p>
      </div>

      {/* Stats grid 2x2 */}
      <div className="grid grid-cols-2 gap-2 md:gap-2.5 w-full mb-6">
        {[
          { label: 'Games played', value: totalGames },
          { label: 'Accuracy', value: `${accuracy}%` },
          { label: 'Best combo', value: `x${bestCombo}` },
          { label: 'Best streak', value: `${longestStreak} days` },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2.5 p-3 md:p-3.5 rounded-xl border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[rgba(255,255,255,0.04)]">
            <div className="w-8 h-8 rounded-lg bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.1)] flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#D4537E" strokeWidth="1.2" strokeLinecap="round"><circle cx="7" cy="7" r="5" /></svg>
            </div>
            <div>
              <p className="text-[9px] text-[#888780] dark:text-[rgba(255,255,255,0.35)] font-medium">{s.label}</p>
              <p className="text-sm font-semibold text-primary">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Mastery + Achievements (side by side on desktop) */}
      <div className="md:grid md:grid-cols-2 md:gap-6">
        {/* Playlist mastery */}
        <section className="mb-6 md:mb-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#888780] dark:text-[rgba(255,255,255,0.35)] mb-2.5">Stan card</p>
          {masteries.length > 0 ? (
            <div className="grid grid-cols-3 gap-1.5">
              {masteries.slice(0, 9).map((m) => (
                <MasteryCard
                  key={m.id}
                  name={formatPlaylistName(m.playlist)}
                  stars={m.mastery_stars}
                  plays={m.play_count}
                />
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-[#888780] dark:text-[rgba(255,255,255,0.35)]">Play some games to start tracking mastery.</p>
          )}
          {masteries.length > 9 && (
            <p className="text-[10px] text-[#888780] dark:text-[rgba(255,255,255,0.35)] mt-2">+{masteries.length - 9} more playlists</p>
          )}
        </section>

        {/* Achievements */}
        <section className="mb-6 md:mb-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#888780] dark:text-[rgba(255,255,255,0.35)] mb-2.5">Badges</p>
          <div>
            {ACHIEVEMENTS.slice(0, 8).map((a) => (
              <AchievementRow
                key={a.id}
                name={a.name}
                description={a.description}
                earned={earnedIds.has(a.id)}
              />
            ))}
          </div>
        </section>
      </div>

      {/* Recent games */}
      {recentPlays.length > 0 && (
        <section className="mt-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#888780] dark:text-[rgba(255,255,255,0.35)] mb-2.5">Recent plays</p>
          <div>
            {recentPlays.slice(0, 5).map((play, i) => (
              <div key={i} className="py-2.5 border-b border-[#F0EDE8] dark:border-[rgba(255,255,255,0.04)] last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-primary">
                    {formatPlaylistName(play.playlist)}
                  </span>
                  <span className="text-[13px] font-semibold text-[#D4537E] tabular-nums">
                    {play.correct_count}/{play.total_songs}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#888780] dark:text-[rgba(255,255,255,0.35)]">
                  <span className="tabular-nums">{play.score.toLocaleString()} pts</span>
                  <span>{formatModeName(play.mode)}</span>
                  <span>{formatTimeAgo(play.played_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Share button */}
      <button
        type="button"
        onClick={shareProfile}
        className="w-full mt-6 py-3.5 rounded-2xl bg-[#D4537E] text-white text-sm font-bold active:scale-[0.98] transition-transform"
      >
        Share profile
      </button>

      {/* Settings */}
      {isOwnProfile && (
        <Link href="/settings" className="block text-center text-xs text-[#888780] dark:text-[rgba(255,255,255,0.35)] mt-3 hover:text-primary transition-colors">
          Settings
        </Link>
      )}

      <TipBanner tips={['Play daily to maintain your streak', 'Ranked mode gives +20% bonus XP']} />
    </div>
  );
}

'use client';

import Link from 'next/link';
import { getLevelFromXP } from '@/lib/progression';
import { ACHIEVEMENTS } from '@/lib/achievements';
import { MasteryCard } from './mastery-card';
import { AchievementRow } from './achievement-row';

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
  const ringBg = `conic-gradient(var(--accent) ${xpProgress * 360}deg, var(--border) ${xpProgress * 360}deg 360deg)`;
  const initial = username.charAt(0).toUpperCase();

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

  return (
    <div className="pt-5 pb-8 max-w-[640px] mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div
          className="w-[72px] h-[72px] rounded-full mx-auto mb-3 flex items-center justify-center"
          style={{ background: ringBg, padding: '3px' }}
        >
          <div
            className="w-full h-full rounded-full flex items-center justify-center text-2xl font-semibold bg-elevated text-primary"
            style={{ border: '3px solid var(--bg-primary)' }}
          >
            {initial}
          </div>
        </div>
        <p className="text-lg font-bold text-primary">{username}</p>
        <p className="text-xs font-semibold text-accent mt-0.5">
          Level {levelInfo.level} - {levelInfo.title}
        </p>
        <div className="max-w-[200px] mx-auto mt-2">
          <div className="h-[5px] rounded-full bg-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${xpProgress * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-ghost mt-1 tabular-nums">
            {levelInfo.progressXP.toLocaleString()} / {(levelInfo.nextLevelXP - levelInfo.currentLevelXP).toLocaleString()} XP
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-1 mb-6">
        <StatCell value={player.total_correct.toLocaleString()} label="songs" />
        <StatCell value={`${accuracy}%`} label="accuracy" />
        <StatCell value={`${player.best_combo}x`} label="best combo" />
        <StatCell value={player.current_streak.toString()} label="streak" highlight />
      </div>

      {/* Mastery + Achievements (side by side on desktop) */}
      <div className="md:grid md:grid-cols-2 md:gap-6">
        {/* Playlist mastery */}
        <section className="mb-6 md:mb-0">
          <SectionLabel>Playlist mastery</SectionLabel>
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
            <p className="text-[11px] text-ghost">Play some games to start tracking mastery.</p>
          )}
          {masteries.length > 9 && (
            <p className="text-[10px] text-ghost mt-2">+{masteries.length - 9} more playlists</p>
          )}
        </section>

        {/* Achievements */}
        <section className="mb-6 md:mb-0">
          <SectionLabel>Achievements</SectionLabel>
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
          <SectionLabel>Recent games</SectionLabel>
          <div>
            {recentPlays.slice(0, 5).map((play, i) => (
              <div key={i} className="py-2.5 border-b border-subtle last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-primary">
                    {formatPlaylistName(play.playlist)}
                  </span>
                  <span className="text-[13px] font-semibold text-accent tabular-nums">
                    {play.correct_count}/{play.total_songs}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-ghost">
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
        className="w-full mt-6 py-3.5 rounded-2xl bg-accent text-primary text-sm font-bold active:scale-[0.98] transition-transform"
      >
        Share profile
      </button>

      {/* Settings */}
      {isOwnProfile && (
        <Link href="/settings" className="block text-center text-xs text-ghost mt-3 hover:text-tertiary transition-colors">
          Settings
        </Link>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ghost mb-2.5">
      {children}
    </p>
  );
}

function StatCell({ value, label, highlight }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div className="px-2 py-3 rounded-[10px] bg-surface border border-default text-center">
      <p className={`text-lg font-bold tabular-nums ${highlight ? 'text-streak' : 'text-primary'}`}>{value}</p>
      <p className="text-[8px] text-ghost mt-0.5 uppercase tracking-wide">{label}</p>
    </div>
  );
}

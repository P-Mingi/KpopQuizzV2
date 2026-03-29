'use client';

import Link from 'next/link';
import { getMasteryProgress } from '@/lib/progression';
import { ACHIEVEMENTS } from '@/lib/achievements';

interface MasteryRow {
  group_id: number;
  mastery_level: number;
  mastery_xp: number;
  groups: { name: string; slug: string } | null;
}

interface PlayRow {
  mode_id: string;
  score: number;
  correct: number;
  total: number;
  created_at: string;
}

interface Props {
  player: {
    id: string;
    username: string;
    level: number;
    xp: number;
    total_songs_played: number;
    total_songs_correct: number;
    total_points: number;
    best_combo: number;
    current_streak: number;
  };
  masteries: MasteryRow[];
  achievements: { achievement_id: string }[];
  recentPlays: PlayRow[];
  isOwnProfile: boolean;
}

function formatModeName(modeId: string): string {
  if (modeId === 'daily') return 'Daily';
  if (modeId.startsWith('group-')) return modeId.replace('group-', '').replace(/-/g, ' ');
  return modeId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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
  const accuracy = player.total_songs_played > 0
    ? Math.round(player.total_songs_correct / player.total_songs_played * 100)
    : 0;

  const earned = achievements.map(a => a.achievement_id);

  async function shareProfile() {
    const url = `${window.location.origin}/player/${player.username}`;
    const text = `Level ${player.level} - ${player.total_songs_correct} songs guessed - ${accuracy}% accuracy`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `${player.username} - K-pop Blind Test`, text, url });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }

  return (
    <div className="pt-7 pb-8">
      {/* Header */}
      <div className="text-center mb-5">
        <div className="w-16 h-16 rounded-full bg-pink-400 flex items-center justify-center text-2xl font-semibold text-bg-primary mx-auto mb-2.5">
          {player.username.charAt(0).toUpperCase()}
        </div>
        <p className="text-lg font-semibold">{player.username}</p>
        <p className="text-[13px] text-pink-400 font-medium mt-0.5">
          Level {player.level} - {player.xp.toLocaleString()} XP
        </p>
        {player.current_streak > 0 && (
          <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 rounded-[10px] bg-streak-bg text-streak text-xs font-medium">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1C6 1 3 4 3 7C3 8.7 4.3 10 6 10C7.7 10 9 8.7 9 7C9 4 6 1 6 1Z" fill="currentColor"/>
            </svg>
            {player.current_streak}-day streak
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="flex gap-px mb-5 bg-border-default rounded-[14px] overflow-hidden">
        <div className="flex-1 py-3.5 text-center bg-bg-secondary">
          <p className="text-lg font-semibold">{player.total_songs_correct.toLocaleString()}</p>
          <p className="text-[10px] text-text-tertiary mt-0.5">songs guessed</p>
        </div>
        <div className="flex-1 py-3.5 text-center bg-bg-secondary">
          <p className="text-lg font-semibold">{accuracy}%</p>
          <p className="text-[10px] text-text-tertiary mt-0.5">accuracy</p>
        </div>
        <div className="flex-1 py-3.5 text-center bg-bg-secondary">
          <p className="text-lg font-semibold">{player.best_combo}x</p>
          <p className="text-[10px] text-text-tertiary mt-0.5">best combo</p>
        </div>
      </div>

      {/* Group mastery */}
      {masteries.length > 0 && (
        <>
          <SectionLabel>Group mastery</SectionLabel>
          <div className="mb-5">
            {masteries.slice(0, 5).map(m => (
              <div key={m.group_id} className="flex items-center gap-2.5 mb-2">
                <span className="text-[13px] font-medium min-w-[90px]">{m.groups?.name ?? 'Unknown'}</span>
                <div className="flex-1 h-1.5 bg-border-default rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-pink-400" style={{ width: `${getMasteryProgress(m.mastery_xp) * 100}%` }} />
                </div>
                <span className="text-[11px] font-semibold text-pink-400 min-w-[36px] text-right">
                  Lv.{m.mastery_level}
                </span>
              </div>
            ))}
            {masteries.length > 5 && (
              <p className="text-[11px] text-text-ghost mt-1">+{masteries.length - 5} more groups</p>
            )}
          </div>
        </>
      )}

      {/* Badges */}
      <SectionLabel>Badges</SectionLabel>
      <BadgeGrid earned={earned} />

      {/* Recent games */}
      {recentPlays.length > 0 && (
        <>
          <SectionLabel className="mt-5">Recent games</SectionLabel>
          <div className="space-y-1.5 mb-5">
            {recentPlays.slice(0, 5).map((play, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-bg-secondary rounded-xl shadow-card">
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="text-xs font-medium">{formatModeName(play.mode_id)}</span>
                    <span className="text-xs font-medium text-correct">{play.correct}/{play.total}</span>
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[11px] text-text-tertiary">{play.score.toLocaleString()} pts</span>
                    <span className="text-[10px] text-text-ghost">{formatTimeAgo(play.created_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Share button */}
      <button
        onClick={shareProfile}
        className="w-full py-3.5 rounded-[14px] bg-pink-400 text-bg-primary text-sm font-semibold mb-3"
      >
        Share profile
      </button>

      {/* Settings (own profile only) */}
      {isOwnProfile && (
        <Link href="/settings" className="block text-center text-xs text-text-tertiary">
          Settings
        </Link>
      )}
    </div>
  );
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-2.5 ${className ?? ''}`}>
      {children}
    </p>
  );
}

function BadgeGrid({ earned }: { earned: string[] }) {
  const colorMap: Record<string, { active: string; }> = {
    gold: { active: 'bg-streak-bg border-streak text-streak' },
    pink: { active: 'bg-pink-50 border-pink-100 text-pink-400' },
    green: { active: 'bg-correct-bg border-correct-border text-correct' },
    default: { active: 'bg-bg-tertiary border-border-hover text-text-primary' },
  };

  return (
    <div className="flex flex-wrap gap-1.5 mb-5">
      {ACHIEVEMENTS.map(a => {
        const isEarned = earned.includes(a.id);
        return (
          <span
            key={a.id}
            className={`text-[11px] font-medium px-3 py-1.5 rounded-[10px] border ${
              isEarned
                ? (colorMap[a.color]?.active ?? 'bg-bg-tertiary border-border-hover text-text-primary')
                : 'bg-transparent border-border-default text-text-ghost'
            }`}
          >
            {a.name}
          </span>
        );
      })}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { getLevelFromXP } from '@/lib/progression';

interface PlayerData {
  display_name: string;
  level: number;
  title: string;
  total_xp: number;
  nextLevelXP: number;
  progressPercent: number;
  total_games: number;
  accuracy: number;
  best_combo: number;
  current_streak: number;
  mastery: Array<{ playlist: string; mastery_stars: number }>;
}

export function PlayerStatsCard() {
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/player/me')
      .then((r) => r.json())
      .then((data) => {
        setPlayer(data.player ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-surface rounded-xl border border-default mb-3 animate-pulse">
        <div className="h-4 bg-elevated rounded w-1/2 mb-2" />
        <div className="h-1.5 bg-elevated rounded-full mb-3" />
        <div className="grid grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 bg-elevated rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="p-4 bg-surface rounded-xl border border-default mb-3 text-center">
        <p className="text-sm text-primary font-medium mb-1">Track your progress</p>
        <p className="text-xs text-tertiary mb-3">Sign in to save scores and level up</p>
        <a href="/login" className="inline-block px-4 py-2 rounded-lg bg-accent text-white text-xs font-semibold">
          Sign in
        </a>
      </div>
    );
  }

  const levelInfo = getLevelFromXP(player.total_xp);

  return (
    <div className="p-4 bg-surface rounded-xl border border-default mb-3">
      {/* Level + XP bar */}
      <div className="flex justify-between items-center text-xs mb-1">
        <span className="text-accent font-medium">Lv.{levelInfo.level} {levelInfo.title}</span>
        <span className="text-ghost tabular-nums">{player.total_xp.toLocaleString()} / {levelInfo.nextLevelXP.toLocaleString()}</span>
      </div>
      <div className="h-1.5 bg-elevated rounded-full overflow-hidden mb-3">
        <div className="h-1.5 bg-accent rounded-full" style={{ width: `${levelInfo.progressPercent}%` }} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { value: String(player.total_games), label: 'games' },
          { value: `${player.accuracy}%`, label: 'accuracy' },
          { value: player.best_combo ? `${player.best_combo}x` : '-', label: 'best combo' },
          { value: String(player.current_streak), label: 'streak', color: player.current_streak > 0 ? 'text-[var(--streak)]' : undefined },
        ].map((stat, i) => (
          <div key={i} className="py-2 bg-elevated rounded-lg text-center">
            <p className={`text-base font-semibold tabular-nums ${stat.color ?? 'text-primary'}`}>{stat.value}</p>
            <p className="text-[9px] text-ghost">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Mastery preview */}
      {player.mastery.length > 0 && (
        <div className="mt-3 pt-3 border-t border-default">
          <p className="text-[10px] text-ghost uppercase tracking-wider mb-1.5">Mastery</p>
          <div className="flex flex-col gap-1">
            {player.mastery.slice(0, 5).map((m, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-xs text-secondary">{m.playlist}</span>
                <span className="text-xs" style={{ color: 'var(--streak)' }}>
                  {'\u2605'.repeat(m.mastery_stars)}{'\u2606'.repeat(5 - m.mastery_stars)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

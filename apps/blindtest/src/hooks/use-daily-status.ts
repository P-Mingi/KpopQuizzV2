'use client';

import { useEffect, useState } from 'react';

export interface DailyStatus {
  hasPlayed: boolean;
  dayNumber: number | null;
  playCount: number;
  avgCorrect: number;
  avgTime: number;
  playerResult: {
    score: number;
    correct: number;
    total_time: number;
    best_combo: number;
    rank: number;
    total_players: number;
    songs: unknown[];
  } | null;
  msUntilReset: number;
}

/**
 * Fetches /api/daily on mount and exposes the daily status for decorating
 * the home page teaser, the TopNav / MobileTabBar notification dot, and
 * anywhere else that needs to know whether the player already played today.
 *
 * Also hydrates from localStorage immediately so the notification dot clears
 * without waiting for the network round-trip after the player finishes.
 */
export function useDailyStatus(): DailyStatus | null {
  const [status, setStatus] = useState<DailyStatus | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Fast client-side hint: the game-player.tsx save path sets this flag
    // after finishing today's daily. Reading it up front means the dot
    // disappears immediately on results screen -> home nav.
    const todayKey = `kbt-daily-played-${new Date().toISOString().slice(0, 10)}`;
    let localHasPlayed = false;
    try {
      localHasPlayed = localStorage.getItem(todayKey) === 'true';
    } catch {
      // ignore
    }

    async function load() {
      try {
        const res = await fetch('/api/daily', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setStatus({
          hasPlayed: Boolean(data.hasPlayed) || localHasPlayed,
          dayNumber: data.challenge?.day_number ?? null,
          playCount: data.stats?.play_count ?? 0,
          avgCorrect: data.stats?.avg_correct ?? 0,
          avgTime: data.stats?.avg_time ?? 0,
          playerResult: data.playerResult ?? null,
          msUntilReset: data.msUntilReset ?? 0,
        });
      } catch {
        if (cancelled) return;
        setStatus({
          hasPlayed: localHasPlayed,
          dayNumber: null,
          playCount: 0,
          avgCorrect: 0,
          avgTime: 0,
          playerResult: null,
          msUntilReset: 0,
        });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return status;
}

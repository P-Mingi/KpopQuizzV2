// F6 - anonymous "played today" tracking for the home daily row (D1), via
// localStorage. Keyed by today's UTC date, which is the SAME midnight basis the
// daily countdown uses (tomorrow.setUTCHours(24,0,0,0)), so it resets exactly
// when the daily quiz/game rotates. Tolerant when localStorage is unavailable.
// This also seeds D2 (the streak will reuse hasPlayedDaily later).

import { analytics } from '@/lib/analytics';

export type DailyKind = 'quiz' | 'game';

function todayKey(): string {
  // UTC YYYY-MM-DD - matches the UTC-midnight daily rotation.
  return new Date().toISOString().slice(0, 10);
}

function storageKey(kind: DailyKind): string {
  return `kq_daily_${kind}_played`;
}

export function markDailyPlayed(kind: DailyKind): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey(kind), todayKey());
  } catch {
    // storage blocked / full - silently skip; the card just stays in its normal state
  }
}

export function hasPlayedDaily(kind: DailyKind): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(storageKey(kind)) === todayKey();
  } catch {
    return false;
  }
}

// L4 result the client can use to surface streak XP / day-N feedback.
export interface DailyCompleteResult {
  signed_in: boolean;
  awarded: number;
  base: number;
  milestone: number;
  streak: number;
  already_today: boolean;
  leveled_up?: boolean;
  new_level?: number | null;
  new_level_name?: string | null;
}

/**
 * Mark the daily as played AND (if signed in) award the server-side streak XP.
 * Safe to call when not signed in: the server returns awarded:0.
 */
export async function completeDaily(kind: DailyKind): Promise<DailyCompleteResult | null> {
  markDailyPlayed(kind);
  try {
    const res = await fetch('/api/daily/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }),
    });
    if (!res.ok) return null;
    const result = (await res.json()) as DailyCompleteResult;
    // Workstream LOOP B2 - the daily retention signal, fired from the one place
    // every daily funnels through. already_today is excluded so a replay on the
    // same day does not double count the streak day.
    if (!result.already_today) analytics.dailyComplete(kind, result.streak ?? 0);
    return result;
  } catch {
    return null;
  }
}

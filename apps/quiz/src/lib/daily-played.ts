// F6 - anonymous "played today" tracking for the home daily row (D1), via
// localStorage. Keyed by today's UTC date, which is the SAME midnight basis the
// daily countdown uses (tomorrow.setUTCHours(24,0,0,0)), so it resets exactly
// when the daily quiz/game rotates. Tolerant when localStorage is unavailable.
// This also seeds D2 (the streak will reuse hasPlayedDaily later).

import { analytics } from '@/lib/analytics';
import { localDate } from '@/lib/daily-rest';
import { guestStreak } from '@/lib/guest-streak';

// Bunnyverse: this build's base path, inlined by Next at build time ('' on kpop and hub, so the code is today's; '/anime' on the anime build).
const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

export type DailyKind = 'quiz' | 'game' | 'blindtest';

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

export interface CompleteDailyOptions {
  /**
   * Is this the first completion of the kind today on this browser? Compute it with hasPlayedDaily(kind)
   * BEFORE any markDailyPlayed. Defaults to that check, made here before this function marks.
   */
  first?: boolean;
  /** What the caller already knows of the session, used when the server does not answer. */
  signedIn?: boolean | null;
}

/**
 * Mark the daily as played AND (if signed in) award the server-side streak XP.
 * Safe to call when not signed in: the server returns awarded:0.
 *
 * The daily_complete event is the browser's own: once per kind per UTC day per browser, fired at the
 * result whatever the server answers (a replay, a failed request and a guest all count the same way).
 * Call recordGuestDaily() first so a fallback streak is the local one.
 */
export async function completeDaily(kind: DailyKind, opts: CompleteDailyOptions = {}): Promise<DailyCompleteResult | null> {
  const first = opts.first ?? !hasPlayedDaily(kind);
  markDailyPlayed(kind);
  let result: DailyCompleteResult | null = null;
  try {
    const res = await fetch(`${BASE_PATH}/api/daily/complete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, local_date: localDate() }),
    });
    if (res.ok) result = (await res.json()) as DailyCompleteResult;
  } catch {
    result = null;
  }
  if (first && (kind === 'quiz' || kind === 'blindtest')) {
    analytics.dailyComplete({
      game: kind,
      signedIn: result ? Boolean(result.signed_in) : opts.signedIn === true,
      streak: result && result.signed_in && result.streak > 0 ? result.streak : guestStreak(),
    });
  }
  return result;
}

'use client';

// W3b PART 2 moment 2 - the guest's own streak, kept in this browser.
//
// The doctrine (docs/PLAY-GUEST-CONVERSION.md) assumes guests already have real
// localStorage streaks. They did not: lib/daily-played.ts only recorded "played
// today", with no count, so there was nothing to back up. This adds the count.
//
// It is a TRUE statement about this browser and nothing more. It is not synced, not
// server-backed, and it ends when site data is cleared, which is exactly why the
// backup line is honest rather than a scare.

const KEY = 'nq_guest_streak';
const MILESTONE_KEY = 'nq_streak_milestone_seen';

/** Milestones the backup line may appear at. Nothing in between, ever. */
export const STREAK_MILESTONES = [3, 7, 14] as const;

type Stored = { last: string; count: number };

const todayUTC = (now: Date): string => now.toISOString().slice(0, 10);
const dayBefore = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/** Pure core, so the day maths can be tested without a browser. */
export function nextStreak(stored: Stored | null, now: Date): Stored {
  const today = todayUTC(now);
  if (!stored) return { last: today, count: 1 };
  if (stored.last === today) return stored; // same day never double counts
  if (stored.last === dayBefore(today)) return { last: today, count: stored.count + 1 };
  return { last: today, count: 1 }; // a gap resets, honestly
}

function read(): Stored | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Stored;
    return typeof p?.last === 'string' && typeof p?.count === 'number' ? p : null;
  } catch {
    return null;
  }
}

/** Record a completed daily for this browser and return the resulting streak. */
export function recordGuestDaily(now = new Date()): number {
  if (typeof window === 'undefined') return 0;
  try {
    const next = nextStreak(read(), now);
    window.localStorage.setItem(KEY, JSON.stringify(next));
    return next.count;
  } catch {
    return 0;
  }
}

export function guestStreak(): number {
  if (typeof window === 'undefined') return 0;
  return read()?.count ?? 0;
}

/**
 * Should the backup line show for this streak?
 * Only at 3, 7 and 14, and only ONCE per milestone, ever. No countdown, no nagging.
 */
export function shouldOfferBackup(streak: number): boolean {
  if (typeof window === 'undefined') return false;
  if (!(STREAK_MILESTONES as readonly number[]).includes(streak)) return false;
  try {
    const seen = JSON.parse(window.localStorage.getItem(MILESTONE_KEY) ?? '[]') as number[];
    return !seen.includes(streak);
  } catch {
    return false;
  }
}

/** Mark a milestone as offered, so it never appears twice. */
export function markBackupOffered(streak: number): void {
  if (typeof window === 'undefined') return;
  try {
    const seen = JSON.parse(window.localStorage.getItem(MILESTONE_KEY) ?? '[]') as number[];
    if (!seen.includes(streak)) window.localStorage.setItem(MILESTONE_KEY, JSON.stringify([...seen, streak]));
  } catch {
    // storage blocked: the line simply does not persist its "seen" flag
  }
}

// F6 - anonymous "played today" tracking for the home daily row (D1), via
// localStorage. Keyed by today's UTC date, which is the SAME midnight basis the
// daily countdown uses (tomorrow.setUTCHours(24,0,0,0)), so it resets exactly
// when the daily quiz/game rotates. Tolerant when localStorage is unavailable.
// This also seeds D2 (the streak will reuse hasPlayedDaily later).

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

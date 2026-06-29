// Shared streak-state derivation (Workstream M, M1.3). Pure + dependency-free so
// both the client home island and the server passport view agree. No new streak
// logic: it just classifies the canonical daily_streak (M0.3) against today.
//
//  - played_today: last active day is today (quiet confirmation).
//  - at_risk:      last active day is yesterday, not today (loss-aversion nudge).
//  - none:         no streak, logged out, or stale (older than yesterday). The
//                  caller renders NOTHING for this (no empty/zero state).

export type StreakState = 'played_today' | 'at_risk' | 'none';

export function streakState(current: number, lastActive: string | null): StreakState {
  if (!lastActive || current <= 0) return 'none';
  const today = new Date().toISOString().slice(0, 10);
  const y = new Date(today + 'T00:00:00Z');
  y.setUTCDate(y.getUTCDate() - 1);
  const yesterday = y.toISOString().slice(0, 10);
  if (lastActive === today) return 'played_today';
  if (lastActive === yesterday) return 'at_risk';
  return 'none';
}

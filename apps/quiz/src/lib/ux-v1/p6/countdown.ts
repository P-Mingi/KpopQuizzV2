// The blind test countdown (audit 02 P1-4, risk 3). The ring is drawn by a CSS animation, so React state only needs
// the whole seconds left: it changes once a second instead of every 50 ms. Pure, so it is unit tested.

/** How often the clock is read. State changes only when the whole second changes, so this is not a render rate. */
export const COUNTDOWN_POLL_MS = 250;

/** Whole seconds left (what the old fractional value showed through Math.ceil) and whether the time is up. */
export function countdown(elapsedMs: number, totalS: number): { left: number; done: boolean } {
  const remaining = totalS - Math.max(0, elapsedMs) / 1000;
  if (remaining <= 0) return { left: 0, done: true };
  return { left: Math.min(totalS, Math.ceil(remaining)), done: false };
}

// The daily reset is UTC midnight: the daily blind test is keyed on the UTC date
// (daily_blindtests.date = new Date().toISOString().slice(0,10)), so "today"
// rolls over at 00:00 UTC for everyone. This returns ms until the next UTC
// midnight, and formats it H:MM:SS. Pure + injectable so the countdown is
// unit-testable without the clock.
export function msUntilUtcMidnight(now: number = Date.now()): number {
  const next = Math.floor(now / 86_400_000 + 1) * 86_400_000;
  return next - now;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

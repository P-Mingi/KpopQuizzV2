// KpopCards: Paris-time wording for the lobby and the history ("Today, 14:32", "Yesterday, 09:05", "4 November 2026, 18:10"). Pure, with the clock passed in.
const TZ = 'Europe/Paris';
const fmt = (o: Intl.DateTimeFormatOptions): Intl.DateTimeFormat => new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...o });

function parts(t: number): { day: string; h: number; m: number } {
  const o: Record<string, string> = {};
  for (const p of fmt({ year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(t))) o[p.type] = p.value;
  return { day: `${o.year}-${o.month}-${o.day}`, h: Number(o.hour) % 24, m: Number(o.minute) };
}

export function parisDay(t: number): string {
  return parts(t).day;
}

/** "Today, 14:32" / "Yesterday, 09:05" / "4 November 2026, 18:10" (Paris time). */
export function whenLabel(t: number, now: number): string {
  const p = parts(t);
  const day = p.day === parisDay(now) ? 'Today' : p.day === parisDay(now - 86400000) ? 'Yesterday' : fmt({ day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(t));
  return `${day}, ${String(p.h).padStart(2, '0')}:${String(p.m).padStart(2, '0')}`;
}

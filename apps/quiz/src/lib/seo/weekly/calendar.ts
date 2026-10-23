// Events of docs/seo/CALENDAR.md for the Monday e-mail (SEO Mission 3, parts C and E). The
// calendar file belongs to part E; this reader only assumes what any reasonable version of it
// has: one Markdown table row (or list line) per event, with its date written YYYY-MM-DD, and
// optionally a second YYYY-MM-DD for an event over several days. The other plain cells (group,
// type) make the label; links and status words are left out of it.

import { addDays, isIsoDate } from './weeks';

export interface CalendarEvent {
  start: string;
  end: string;
  label: string;
}

const DATE = /\b(\d{4}-\d{2}-\d{2})\b/g;

export function parseCalendar(markdown: string): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const raw of markdown.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith('|') && !/^[-*]\s/.test(line)) continue;
    if (/^\|\s*:?-{2,}/.test(line)) continue;
    const dates = [...line.matchAll(DATE)].map((m) => m[1]!).filter(isIsoDate);
    if (dates.length === 0) continue;
    const start = dates[0]!;
    const end = dates[1] && dates[1] >= start ? dates[1] : start;
    const cells = line.startsWith('|') ? line.replace(/^\|/, '').replace(/\|$/, '').split('|') : [line.replace(/^[-*]\s+/, '')];
    const label = cells
      .map((c) => c.replace(DATE, ' ').replace(/https?:\/\/\S+/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[`*_]/g, '').replace(/\s+/g, ' ').trim())
      .filter((c) => c && !/^(to|au|à|a|-|confirm|à confirmer|confirmé|confirmed|source|tbc)$/i.test(c))
      .slice(0, 2)
      .join(', ');
    if (!label) continue;
    out.push({ start, end, label: label.slice(0, 80) });
  }
  return out;
}

/** Events that touch the next `days` days, starting today, soonest first. */
export function upcomingEvents(events: CalendarEvent[], today: string, days = 14): CalendarEvent[] {
  const last = addDays(today, days);
  return events.filter((e) => e.end >= today && e.start <= last).sort((a, b) => a.start.localeCompare(b.start));
}

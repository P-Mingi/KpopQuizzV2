import { describe, expect, it } from 'vitest';

import { parseCalendar, upcomingEvents } from './calendar';
import { CALENDAR_MD } from './fixtures';
import { addDays, completedWeeks, dateInZone, isIsoDate, mondayOf, shortDateFr } from './weeks';

describe('weeks', () => {
  it('finds the Monday of an ISO week', () => {
    expect(mondayOf('2026-10-15')).toBe('2026-10-12'); // Thursday
    expect(mondayOf('2026-10-12')).toBe('2026-10-12'); // Monday
    expect(mondayOf('2026-10-18')).toBe('2026-10-12'); // Sunday
  });

  it('lists the completed weeks before today, newest first', () => {
    expect(completedWeeks('2026-10-19', 2)).toEqual([
      { start: '2026-10-12', end: '2026-10-18' },
      { start: '2026-10-05', end: '2026-10-11' },
    ]);
  });

  it('reads the date in Pacific time (Monday 05:00 UTC is still Sunday there)', () => {
    expect(dateInZone(new Date('2026-10-19T05:00:00Z'), 'America/Los_Angeles')).toBe('2026-10-18');
    expect(dateInZone(new Date('2026-10-19T12:00:00Z'), 'America/Los_Angeles')).toBe('2026-10-19');
  });

  it('small helpers', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(shortDateFr('2026-10-05')).toBe('5 oct.');
  });
});

describe('calendar', () => {
  const events = parseCalendar(CALENDAR_MD);

  it('reads one event per dated row, with a range when two dates are given', () => {
    expect(events).toEqual([
      { start: '2026-10-26', end: '2026-10-26', label: 'ILLIT, mini album' },
      { start: '2026-11-13', end: '2026-11-13', label: 'ATEEZ, comeback' },
      { start: '2026-11-20', end: '2026-11-21', label: 'MAMA, awards (Osaka)' },
    ]);
  });

  it('keeps the events of the next 14 days', () => {
    expect(upcomingEvents(events, '2026-10-19').map((e) => e.label)).toEqual(['ILLIT, mini album']);
    expect(upcomingEvents(events, '2026-11-10').map((e) => e.label)).toEqual(['ATEEZ, comeback', 'MAMA, awards (Osaka)']);
    expect(upcomingEvents(events, '2026-11-21').map((e) => e.label)).toEqual(['MAMA, awards (Osaka)']);
    expect(upcomingEvents(events, '2026-12-01')).toEqual([]);
  });

  it('reads list lines too, and ignores undated lines', () => {
    expect(parseCalendar('- 2027-01-09 Golden Disc Awards (Hanoi)\n- someday something')).toEqual([{ start: '2027-01-09', end: '2027-01-09', label: 'Golden Disc Awards (Hanoi)' }]);
  });
});

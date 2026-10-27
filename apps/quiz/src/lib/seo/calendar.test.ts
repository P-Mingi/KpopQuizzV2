import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  CHECKLIST_LEAD_DAYS,
  PREP_CHECKLISTS,
  SEO_EVENTS,
  addDays,
  checklistOpensOn,
  dayMs,
  daysBetween,
  eventProblem,
  isChecklistOpen,
  loadCalendar,
  upcomingEvents,
  type SeoEvent,
} from './calendar';

const CALENDAR_MD = fileURLToPath(new URL('../../../../../docs/seo/CALENDAR.md', import.meta.url));

const ev = (over: Partial<SeoEvent> = {}): SeoEvent => ({
  id: 'test-event',
  date: '2026-11-13',
  group: 'ateez',
  type: 'comeback',
  title: 'Test event',
  status: 'confirmed',
  sources: [{ url: 'https://www.koreajoongangdaily.com/x', kind: 'press', label: 'x' }],
  ...over,
});

/** The rows of the calendar table in CALENDAR.md. */
function mdRows(): Array<Record<string, string>> {
  const lines = readFileSync(CALENDAR_MD, 'utf8').split('\n');
  const start = lines.findIndex((l) => /^\|\s*id\s*\|\s*date\s*\|/.test(l));
  expect(start).toBeGreaterThan(-1);
  const header = lines[start]!.split('|').slice(1, -1).map((c) => c.trim());
  const rows: Array<Record<string, string>> = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith('|')) break;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    rows.push(Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ''])));
  }
  return rows;
}

describe('the shipped calendar', () => {
  it('has only valid rows, and loadCalendar keeps all of them in date order', () => {
    for (const e of SEO_EVENTS) expect(eventProblem(e), e.id).toBeNull();
    const loaded = loadCalendar();
    expect(loaded).toHaveLength(SEO_EVENTS.length);
    for (let i = 1; i < loaded.length; i++) expect(dayMs(loaded[i]!.date)).toBeGreaterThanOrEqual(dayMs(loaded[i - 1]!.date));
    expect(new Set(SEO_EVENTS.map((e) => e.id)).size).toBe(SEO_EVENTS.length);
  });

  it('holds the dates of the brief, checked at a source', () => {
    const byId = new Map(SEO_EVENTS.map((e) => [e.id, e]));
    const want: Array<[string, string, string | undefined, string | null, SeoEvent['type']]> = [
      ['illit-break-even', '2026-10-26', undefined, 'illit', 'comeback'],
      ['ateez-golden-hour-6', '2026-11-13', undefined, 'ateez', 'comeback'],
      ['txt-perfect-storm', '2026-11-16', undefined, 'txt', 'comeback'],
      ['mama-2026', '2026-11-20', '2026-11-21', null, 'awards'],
      // The brief said 26 to 27 Dec; BigHit Music added a third show on 29 Dec.
      ['bts-arirang-tour-jakarta', '2026-12-26', '2026-12-29', 'bts', 'concert'],
      ['golden-disc-41', '2027-01-09', '2027-01-10', null, 'awards'],
      ['bts-arirang-1-year', '2027-03-20', undefined, 'bts', 'anniversary'],
    ];
    for (const [id, date, end, group, type] of want) {
      const e = byId.get(id);
      expect(e, id).toBeDefined();
      expect([e!.date, e!.endDate, e!.group, e!.type]).toEqual([date, end, group, type]);
    }
  });

  it('cites official pages or bylined outlets only, never fan databases', () => {
    const allowed = /(^|\.)(koreaherald\.com|koreajoongangdaily\.com|koreatimes\.co\.kr|sports\.khan\.co\.kr|cjenm\.com|wikipedia\.org|yna\.co\.kr)$/;
    for (const e of SEO_EVENTS) {
      for (const s of e.sources) {
        const host = new URL(s.url).hostname;
        expect(host, `${e.id} ${s.url}`).toMatch(allowed);
        expect(host).not.toMatch(/kprofiles|fandom/);
      }
    }
  });

  it('matches docs/seo/CALENDAR.md row for row', () => {
    const rows = mdRows();
    const fromMd = rows.map((r) => ({
      id: r.id, date: r.date, end: r.end === '-' ? undefined : r.end, group: r.group === '-' ? null : r.group,
      type: r.type, status: r.status, event: r.event, source: r.source,
    }));
    const fromCode = loadCalendar().map((e) => ({
      id: e.id, date: e.date, end: e.endDate, group: e.group, type: e.type, status: e.status, event: e.title, source: e.sources[0]!.url,
    }));
    expect(fromMd).toEqual(fromCode);
  });

  it('has no em dash or en dash in the data, the checklists or CALENDAR.md', () => {
    const dash = /[\u2013\u2014]/;
    expect(JSON.stringify(SEO_EVENTS)).not.toMatch(dash);
    expect(JSON.stringify(PREP_CHECKLISTS)).not.toMatch(dash);
    expect(readFileSync(CALENDAR_MD, 'utf8')).not.toMatch(dash);
  });
});

describe('eventProblem', () => {
  it('refuses broken rows', () => {
    expect(eventProblem(ev({ date: '2026-02-30' }))).toBe('bad date');
    expect(eventProblem(ev({ endDate: '2026-11-12' }))).toBe('bad end date');
    expect(eventProblem(ev({ sources: [] }))).toBe('no source');
    expect(eventProblem(ev({ sources: [{ url: 'http://example.com/a', kind: 'press', label: 'x' }] }))).toBe('source is not https');
    expect(eventProblem(ev({ sources: [{ url: 'https://kprofiles.com/ateez', kind: 'press', label: 'x' }] }))).toMatch(/banned source/);
    expect(eventProblem(ev({ sources: [{ url: 'https://kpop.fandom.com/wiki/ATEEZ', kind: 'press', label: 'x' }] }))).toMatch(/banned source/);
    expect(eventProblem(ev({ status: 'unconfirmed' }))).toBe('unconfirmed without a note');
    expect(eventProblem(ev({ status: 'unconfirmed', note: 'Only a fan post says so.' }))).toBeNull();
  });

  it('loadCalendar drops a broken row and keeps the rest', () => {
    const out = loadCalendar([ev({ id: 'ok-one' }), ev({ id: 'bad-one', date: 'soon' })]);
    expect(out.map((e) => e.id)).toEqual(['ok-one']);
  });
});

describe('date helpers', () => {
  it('count whole days across months and years', () => {
    expect(daysBetween('2026-10-12', '2026-10-26')).toBe(14);
    expect(daysBetween('2026-12-30', '2027-01-09')).toBe(10);
    expect(addDays('2027-03-01', -10)).toBe('2027-02-19');
    expect(Number.isNaN(dayMs('2026-13-01'))).toBe(true);
  });
});

describe('the 10-day preparation checklist window', () => {
  const one = ev({ date: '2026-10-26' });
  const multi = ev({ date: '2026-12-26', endDate: '2026-12-29', type: 'concert' });

  it('opens exactly 10 days before the first day', () => {
    expect(CHECKLIST_LEAD_DAYS).toBe(10);
    expect(checklistOpensOn(one)).toBe('2026-10-16');
    expect(isChecklistOpen(one, '2026-10-15')).toBe(false); // 11 days before
    expect(isChecklistOpen(one, '2026-10-16')).toBe(true); // 10 days before
    expect(isChecklistOpen(one, '2026-10-26')).toBe(true); // the day itself
    expect(isChecklistOpen(one, '2026-10-27')).toBe(false); // over
  });

  it('stays open through the last day of a multi-day event', () => {
    expect(isChecklistOpen(multi, '2026-12-15')).toBe(false);
    expect(isChecklistOpen(multi, '2026-12-16')).toBe(true);
    expect(isChecklistOpen(multi, '2026-12-28')).toBe(true);
    expect(isChecklistOpen(multi, '2026-12-29')).toBe(true);
    expect(isChecklistOpen(multi, '2026-12-30')).toBe(false);
  });

  it('crosses a year boundary (Golden Disc Awards opens on 30 Dec 2026)', () => {
    const gda = SEO_EVENTS.find((e) => e.id === 'golden-disc-41')!;
    expect(checklistOpensOn(gda)).toBe('2026-12-30');
    expect(isChecklistOpen(gda, '2026-12-29')).toBe(false);
    expect(isChecklistOpen(gda, '2026-12-30')).toBe(true);
    expect(isChecklistOpen(gda, '2027-01-10')).toBe(true);
    expect(isChecklistOpen(gda, '2027-01-11')).toBe(false);
  });

  it('has tasks for every event type', () => {
    for (const t of ['comeback', 'concert', 'awards', 'anniversary'] as const) expect(PREP_CHECKLISTS[t].length).toBeGreaterThan(2);
  });
});

describe('upcomingEvents', () => {
  it('lists events starting within the window and the ones on now, soonest first', () => {
    const list = upcomingEvents(SEO_EVENTS, '2026-11-08', 14).map((e) => e.id);
    expect(list).toEqual(['ateez-golden-hour-6', 'txt-perfect-storm', 'mama-2026']);
    expect(upcomingEvents(SEO_EVENTS, '2026-12-28', 14).map((e) => e.id)).toEqual(['bts-arirang-tour-jakarta', 'golden-disc-41']);
    expect(upcomingEvents(SEO_EVENTS, '2026-10-27', 5)).toEqual([]);
  });
});

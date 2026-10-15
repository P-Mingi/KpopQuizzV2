import { describe, expect, it } from 'vitest';

import { SEO_EVENTS, type SeoEvent } from './calendar';
import {
  NO_SEARCH_SIGNALS,
  REFRESH,
  dropPoints,
  eventPoints,
  monthOf,
  parseApproval,
  rankRefreshQueue,
  stalePoints,
  weekOf,
  type HubFreshness,
  type SearchSignals,
  type WeeklyChange,
} from './refresh-queue';

const WEEK = '2026-10-12'; // a Monday
const OFF: SearchSignals = { clicks: null, citations: null };

const hub = (slug: string, lastUpdated: string, plays = 0, name = slug.toUpperCase()): HubFreshness => ({
  path: `/${slug}-quiz`, groupSlug: slug, groupName: name, lastUpdated: `${lastUpdated}T12:00:00+00:00`, plays,
});
const event = (over: Partial<SeoEvent>): SeoEvent => ({
  id: 'e', date: '2026-10-20', group: 'illit', type: 'comeback', title: 'A release', status: 'confirmed',
  sources: [{ url: 'https://www.koreaherald.com/a', kind: 'press', label: 'x' }], ...over,
});
const fresh = '2026-10-01';

describe('weekOf and monthOf', () => {
  it('anchors any day on the Monday of its week (UTC)', () => {
    expect(weekOf(new Date('2026-10-15T09:00:00Z'))).toBe('2026-10-12'); // Thursday
    expect(weekOf(new Date('2026-10-12T00:00:00Z'))).toBe('2026-10-12'); // Monday
    expect(weekOf(new Date('2026-10-18T23:59:00Z'))).toBe('2026-10-12'); // Sunday
    expect(weekOf(new Date('2027-01-01T10:00:00Z'))).toBe('2026-12-28'); // across the year
    expect(monthOf('2026-10-15')).toBe('2026-10-01');
  });
});

describe('points', () => {
  it('give more to a sooner event, a bigger fall and an older hub, within their bounds', () => {
    expect(eventPoints(14)).toBe(60);
    expect(eventPoints(0)).toBe(88);
    expect(eventPoints(3)).toBeGreaterThan(eventPoints(10));
    expect(dropPoints(0.3)).toBe(52);
    expect(dropPoints(1)).toBe(80);
    expect(stalePoints(90)).toBe(30);
    expect(stalePoints(96)).toBe(31);
    expect(stalePoints(1000)).toBe(50);
  });
});

describe('rankRefreshQueue: event_soon', () => {
  it('counts an event 0 to 14 days after Monday, and one on now; not 15 days out, not over', () => {
    const hubs = [hub('illit', fresh)];
    const at = (date: string, endDate?: string) =>
      rankRefreshQueue({ weekOf: WEEK, hubs, events: [event(endDate ? { date, endDate } : { date })], search: OFF });
    expect(at('2026-10-26')).toHaveLength(1); // 14 days
    expect(at('2026-10-26')[0]!.score).toBe(60);
    expect(at('2026-10-27')).toHaveLength(0); // 15 days
    expect(at('2026-10-12')[0]!.score).toBe(88); // this Monday
    expect(at('2026-10-10', '2026-10-13')[0]!.reasons[0]!.text).toMatch(/on now/); // ongoing
    expect(at('2026-10-09', '2026-10-11')).toHaveLength(0); // over before Monday
  });

  it('targets the group hub only when it exists, plus the pages the event lists', () => {
    const none = rankRefreshQueue({ weekOf: WEEK, hubs: [], events: [event({})], search: OFF });
    expect(none).toEqual([]);
    const award = rankRefreshQueue({ weekOf: WEEK, hubs: [], events: [event({ group: null, type: 'awards', pages: ['/blindtest'] })], search: OFF });
    expect(award.map((i) => i.path)).toEqual(['/blindtest']);
  });

  it('counts the soonest of two events of the same page once', () => {
    const items = rankRefreshQueue({
      weekOf: WEEK, hubs: [hub('bts', fresh)], search: OFF,
      events: [event({ id: 'a', group: 'bts', date: '2026-10-20' }), event({ id: 'b', group: 'bts', date: '2026-10-14' })],
    });
    expect(items).toHaveLength(1);
    expect(items[0]!.reasons).toHaveLength(1);
    expect(items[0]!.score).toBe(eventPoints(2));
  });
});

describe('rankRefreshQueue: hub_stale', () => {
  it('flags a hub from 90 days without a new published quiz', () => {
    const r89 = rankRefreshQueue({ weekOf: WEEK, hubs: [hub('txt', '2026-07-15')], events: [], search: OFF });
    const r90 = rankRefreshQueue({ weekOf: WEEK, hubs: [hub('txt', '2026-07-14')], events: [], search: OFF });
    expect(r89).toHaveLength(0);
    expect(r90).toHaveLength(1);
    expect(r90[0]!.reasons[0]).toMatchObject({ code: 'hub_stale', points: 30 });
    expect(r90[0]!.reasons[0]!.text).toMatch(/90 days/);
    expect(r90[0]!.label).toBe('TXT quiz hub');
  });
});

describe('rankRefreshQueue: search signals', () => {
  const hubs = [hub('bts', fresh, 100), hub('ateez', fresh, 50)];
  const map = (o: Record<string, WeeklyChange>) => new Map(Object.entries(o));

  it('adds nothing while Search Console and Bing have no data (no-op)', async () => {
    const search = await NO_SEARCH_SIGNALS.read(WEEK);
    expect(search).toEqual({ clicks: null, citations: null });
    expect(rankRefreshQueue({ weekOf: WEEK, hubs, events: [], search })).toEqual([]);
  });

  it('counts a fall of 30% or more above the floor, and nothing below', () => {
    const search: SearchSignals = {
      clicks: map({
        '/bts-quiz': { current: 70, baseline: 100 }, // -30%: counts
        '/ateez-quiz': { current: 72, baseline: 100 }, // -28%: no
        '/q/small': { current: 0, baseline: REFRESH.minBaselineClicks - 1 }, // under the floor
      }),
      citations: map({ '/q/cited': { current: 5, baseline: 10 } }), // -50% at the floor
    };
    const items = rankRefreshQueue({ weekOf: WEEK, hubs, events: [], search });
    expect(items.map((i) => i.path)).toEqual(['/q/cited', '/bts-quiz']);
    expect(items[0]!.reasons[0]).toMatchObject({ code: 'citations_down', points: dropPoints(0.5) });
    expect(items[1]!.reasons[0]).toMatchObject({ code: 'clicks_down', points: 52 });
    expect(items[1]!.reasons[0]!.text).toMatch(/down 30%/);
  });
});

describe('rankRefreshQueue: order', () => {
  it('sums signals, puts an event above age alone, and breaks ties by plays then path', () => {
    const hubs = [
      hub('aaa', '2026-01-01', 10), // stale only, very old: capped at 50
      hub('bbb', '2026-06-01', 999), // stale 133 days + event 14 days: 37 + 60
      hub('ccc', fresh, 5), // event 14 days only: 60
      hub('ddd', fresh, 50), // event 14 days only: 60, more plays than ccc
    ];
    const events = ['bbb', 'ccc', 'ddd'].map((g) => event({ id: g, group: g, date: '2026-10-26' }));
    const items = rankRefreshQueue({ weekOf: WEEK, hubs, events, search: OFF });
    expect(items.map((i) => [i.rank, i.path, i.score])).toEqual([
      [1, '/bbb-quiz', 60 + stalePoints(133)],
      [2, '/ddd-quiz', 60],
      [3, '/ccc-quiz', 60],
      [4, '/aaa-quiz', 50],
    ]);
    // Same score and plays: alphabetical path, so the order never flips between runs.
    const tie = rankRefreshQueue({ weekOf: WEEK, hubs: [hub('zzz', '2026-01-01'), hub('yyy', '2026-01-01')], events: [], search: OFF });
    expect(tie.map((i) => i.path)).toEqual(['/yyy-quiz', '/zzz-quiz']);
    // The event reason is listed before the age reason.
    expect(items[0]!.reasons.map((r) => r.code)).toEqual(['event_soon', 'hub_stale']);
  });

  it('with the real calendar, the week of 12 Oct 2026 puts the ILLIT hub first', () => {
    const hubs = [hub('illit', '2026-09-27', 1, 'ILLIT'), hub('ateez', '2026-07-28', 1, 'ATEEZ'), hub('txt', '2026-06-04', 1, 'TXT'), hub('bts', '2026-10-15', 1, 'BTS')];
    const items = rankRefreshQueue({ weekOf: WEEK, hubs, events: SEO_EVENTS, search: OFF });
    expect(items[0]).toMatchObject({ path: '/illit-quiz', score: 60 });
    expect(items[0]!.reasons[0]!.text).toMatch(/^ILLIT comeback in 14 days \(26 Oct 2026\)/);
    // TXT: newest quiz 4 Jun 2026, 130 days before the Monday: stale, its comeback still 35 days away.
    expect(items.find((i) => i.path === '/txt-quiz')!.reasons.map((r) => r.code)).toEqual(['hub_stale']);
    expect(items.find((i) => i.path === '/bts-quiz')).toBeUndefined();
  });
});

describe('parseApproval', () => {
  const top = ['/a-quiz', '/b-quiz', '/c-quiz', '/d-quiz', '/e-quiz', '/f-quiz'];

  it('accepts up to 5 pages of the current top 5, in queue order, once each', () => {
    expect(parseApproval({ paths: ['/c-quiz', '/a-quiz', '/a-quiz'] }, top)).toEqual({ paths: ['/a-quiz', '/c-quiz'] });
    expect(parseApproval({ paths: top.slice(0, 5) }, top)).toEqual({ paths: top.slice(0, 5) });
  });

  it('refuses anything else', () => {
    expect(parseApproval(null, top)).toHaveProperty('error');
    expect(parseApproval({ paths: '/a-quiz' }, top)).toHaveProperty('error');
    expect(parseApproval({ paths: [] }, top)).toHaveProperty('error');
    expect(parseApproval({ paths: [1] }, top)).toHaveProperty('error');
    expect(parseApproval({ paths: ['/f-quiz'] }, top)).toEqual({ error: '/f-quiz is not in the current top 5' });
    expect(parseApproval({ paths: top }, top)).toHaveProperty('error');
    expect(parseApproval({ paths: ['/a-quiz'] }, [])).toHaveProperty('error');
  });
});

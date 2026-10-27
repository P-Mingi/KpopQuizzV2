// Run O1, lot (c), lane B6: the eligibility rules of the cross-site links (types.ts NetEligibilityFns; Q 2.3 and 2.4).
import { describe, expect, it } from 'vitest';

import { NET_CAPS } from './types';
import { canShow, eligibleFor } from './eligibility';

import type { NetCapState, NetMe, NetSiteStamp } from './types';

const stamp = (id: 'kpop' | 'anime' | 'hub', plays: number): NetSiteStamp => ({ id, level: 3, plays, joinedAt: '2026-01-01T00:00:00Z', activated: plays > 0 });
const me = (over: Partial<NetMe> = {}): NetMe => ({
  sites: [stamp('kpop', 12), stamp('anime', 4)], worlds: {}, suggestions: true, dismissed: {}, welcomed: [], yourSitesMenu: 'auto', ...over,
});
const NONE: NetCapState = { pageShown: 0, today: 0, week: 0, dismissals: 0 };
const NOW = Date.parse('2026-10-20T12:00:00Z');

// The build is the kpop site (SITE_ID kpop), so dst 'anime' and 'hub' are the other sites.
describe('eligibleFor', () => {
  it('is false without a viewer', () => expect(eligibleFor(null, 'anime')).toBe(false));
  it('is false when suggestions are off, whatever the memberships', () => {
    expect(eligibleFor(me({ suggestions: false }), 'anime')).toBe(false);
    expect(eligibleFor(me({ suggestions: false, worlds: { anime: 'yes' } }), 'anime')).toBe(false);
  });
  it('is never true for the site itself', () => {
    expect(eligibleFor(me({ worlds: { kpop: 'yes' } }), 'kpop')).toBe(false);
  });
  it('a no beats a membership', () => {
    expect(eligibleFor(me({ worlds: { anime: 'no' } }), 'anime')).toBe(false);
  });
  it('a yes is enough without a membership', () => {
    expect(eligibleFor(me({ sites: [stamp('kpop', 3)], worlds: { anime: 'yes' } }), 'anime')).toBe(true);
  });
  it('a membership with plays is eligible', () => expect(eligibleFor(me(), 'anime')).toBe(true));
  it('a membership with no play is not', () => {
    expect(eligibleFor(me({ sites: [stamp('kpop', 3), stamp('anime', 0)] }), 'anime')).toBe(false);
  });
  it('no answer and no membership is not eligible', () => {
    expect(eligibleFor(me({ sites: [stamp('kpop', 3)] }), 'anime')).toBe(false);
  });
});

describe('canShow', () => {
  it('needs eligibility', () => expect(canShow(me({ suggestions: false }), 'anime', 'menu', NONE, NOW)).toBe(false));
  it('passes with fresh caps', () => expect(canShow(me(), 'anime', 'menu', NONE, NOW)).toBe(true));
  it('a dismissal hides that link id until its time, then expires', () => {
    const m = me({ dismissed: { menu: '2026-10-21T00:00:00Z' } });
    expect(canShow(m, 'anime', 'menu', NONE, NOW)).toBe(false);
    expect(canShow(m, 'anime', 'xfact', NONE, NOW)).toBe(true);
    expect(canShow(m, 'anime', 'menu', NONE, Date.parse('2026-10-21T00:00:01Z'))).toBe(true);
  });
  it('an unreadable dismissal date hides nothing', () => {
    expect(canShow(me({ dismissed: { menu: 'soon' } }), 'anime', 'menu', NONE, NOW)).toBe(true);
  });
  it('the caps: one per page, three a day, ten a week, three dismissals', () => {
    expect(canShow(me(), 'anime', 'menu', { ...NONE, pageShown: NET_CAPS.perPage }, NOW)).toBe(false);
    expect(canShow(me(), 'anime', 'menu', { ...NONE, today: NET_CAPS.perDay - 1 }, NOW)).toBe(true);
    expect(canShow(me(), 'anime', 'menu', { ...NONE, today: NET_CAPS.perDay }, NOW)).toBe(false);
    expect(canShow(me(), 'anime', 'menu', { ...NONE, week: NET_CAPS.perWeek - 1 }, NOW)).toBe(true);
    expect(canShow(me(), 'anime', 'menu', { ...NONE, week: NET_CAPS.perWeek }, NOW)).toBe(false);
    expect(canShow(me(), 'anime', 'menu', { ...NONE, dismissals: NET_CAPS.dismissalsOff - 1 }, NOW)).toBe(true);
    expect(canShow(me(), 'anime', 'menu', { ...NONE, dismissals: NET_CAPS.dismissalsOff }, NOW)).toBe(false);
  });
});

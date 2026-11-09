import { describe, expect, it } from 'vitest';

import { ALLOWED_CATEGORIES, AWARD_SHOWS, checkAwardShows, prepWindow } from './calendar';

import type { AwardShow } from './calendar';

// Audit 04 P0-5: the award calendar is linted on every run.

const good = (over: Partial<AwardShow> = {}): AwardShow => ({ ...structuredClone(AWARD_SHOWS[0]!), ...over });

describe('award-shows.json', () => {
  it('has the five shows of the audit and passes the lint', () => {
    expect(AWARD_SHOWS.map((s) => s.id)).toEqual(['mma-2026', 'mama-2026', 'aaa-2026', 'sbs-gayo-daejeon-2026', 'golden-disc-41']);
    expect(checkAwardShows(AWARD_SHOWS)).toEqual([]);
  });
  it('MMA and MAMA are confirmed on an official source; the others are reported until one exists', () => {
    const by = Object.fromEntries(AWARD_SHOWS.map((s) => [s.id, s.status]));
    expect(by['mma-2026']).toBe('confirmed');
    expect(by['mama-2026']).toBe('confirmed');
    expect(by['aaa-2026']).toBe('reported');
    expect(by['sbs-gayo-daejeon-2026']).toBe('reported');
    expect(by['golden-disc-41']).toBe('reported');
  });
  it('SBS Gayo Daejeon gives no awards: show facts and history only', () => {
    const sbs = AWARD_SHOWS.find((s) => s.id === 'sbs-gayo-daejeon-2026')!;
    expect(sbs.gives_awards).toBe(false);
    expect(sbs.allowed_categories.every((c) => c === 'show_facts' || c === 'history')).toBe(true);
  });
  it('no category is a fan vote or a prediction', () => {
    expect(ALLOWED_CATEGORIES.join(' ')).not.toMatch(/vote|fan|predict|nominee/);
  });
  it('the preparation window opens 10 days before the first day', () => {
    const w = prepWindow(AWARD_SHOWS[0]!);
    expect(new Date(w.from).toISOString()).toBe('2026-11-04T00:00:00.000Z');
    expect(new Date(w.to).toISOString()).toBe('2026-11-13T23:59:59.999Z');
  });
});

describe('checkAwardShows catches a bad calendar', () => {
  it('confirmed needs an official source', () => {
    const s = good({ sources: [{ url: 'https://example.com/a/', publisher: 'x', kind: 'outlet', read_on: '2026-11-09' }] });
    expect(checkAwardShows([s]).join('\n')).toContain('confirmed needs an official source');
  });
  it('refuses a blocked source, a fake date, a repeated id, a year in the slug, a dash, a fan-vote category', () => {
    expect(checkAwardShows([good({ sources: [{ url: 'https://www.soompi.com/article/1', publisher: 'x', kind: 'outlet', read_on: '2026-11-09' }], status: 'reported' })]).join('\n')).toContain('not an allowed source');
    expect(checkAwardShows([good({ days: ['2026-02-30'] })]).join('\n')).toContain('real YYYY-MM-DD');
    expect(checkAwardShows([good(), good()]).join('\n')).toContain('the id repeats');
    expect(checkAwardShows([good({ quiz_slug: 'mma-2026-quiz' })]).join('\n')).toContain('no year');
    expect(checkAwardShows([good({ venue: 'Gocheok \u2013 Seoul' })]).join('\n')).toContain('dash');
    expect(checkAwardShows([good({ allowed_categories: ['fan_vote' as never] })]).join('\n')).toContain('allowed list');
  });
  it('a show with no awards cannot ask for winners', () => {
    expect(checkAwardShows([good({ gives_awards: false, status: 'confirmed' })]).join('\n')).toContain('no awards');
  });
});

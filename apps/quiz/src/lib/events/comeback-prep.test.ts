import { describe, expect, it } from 'vitest';

import { MAX_FANDOM_DRAFTS_PER_DAY, phaseAt, planComebackPrep } from './comeback-prep';

import type { ComebackContext } from './comeback-prep';
import type { ComebackRow } from '@/lib/editorial/templates';

// Audit 04 P2-3: the comeback timeline on fixtures: T-14 list, T-7 draft, T-2 publish, T+2 revise; announced rows with a source only; 3 drafts a day.

const at = (iso: string): number => Date.parse(iso);
const SRC = { source_url: 'https://news.example-label.com/notice/1', source_type: 'official', verified_at: '2026-11-01', status: 'announced' };
const row = (id: number, group: number | null, release: string, over: Partial<ComebackRow> = {}): ComebackRow => ({ id, group_id: group, artist: `Group ${id}`, title: `Title ${id}`, release_date: release, kind: 'ep', ...SRC, ...over });
const ctx = (over: Partial<ComebackContext> = {}): ComebackContext => ({ draftsToday: 0, done: new Set(), groupsWithTest: new Set(), titleTrackOnMusicBrainz: new Set(), ...over });

describe('phaseAt', () => {
  it('days to the release: 14 to 8 list, 7 to 3 draft, 2 to 0 publish, after +2 revise', () => {
    const now = at('2026-11-10T08:00:00Z');
    expect(phaseAt('2026-11-24', now)).toBe('list');     // T-14
    expect(phaseAt('2026-11-18', now)).toBe('list');     // T-8
    expect(phaseAt('2026-11-17', now)).toBe('draft');    // T-7
    expect(phaseAt('2026-11-13', now)).toBe('draft');    // T-3
    expect(phaseAt('2026-11-12', now)).toBe('publish');  // T-2
    expect(phaseAt('2026-11-10', now)).toBe('publish');  // release day
    expect(phaseAt('2026-11-09', now)).toBeNull();       // T+1: nothing yet
    expect(phaseAt('2026-11-08', now)).toBe('revise');   // T+2
    expect(phaseAt('2026-11-01', now)).toBe('revise');   // T+9
    expect(phaseAt('2026-10-31', now)).toBeNull();       // T+10
    expect(phaseAt('2026-12-30', now)).toBeNull();
  });
});

describe('planComebackPrep', () => {
  const now = at('2026-11-10T08:00:00Z');
  it('plans each phase of announced comebacks with their source', () => {
    const { actions } = planComebackPrep([row(1, 1, '2026-11-22'), row(2, 2, '2026-11-15'), row(3, 3, '2026-11-11'), row(4, 4, '2026-11-08')], now, ctx({ titleTrackOnMusicBrainz: new Set([4]) }));
    expect(actions.map((a) => `${a.comeback}:${a.phase}`)).toEqual(['4:revise', '3:publish', '2:draft', '1:list']);
    expect(actions.every((a) => a.source_url.startsWith('https://'))).toBe(true);
  });
  it('ignores a reported row, a row with no source, a lead, and any row before L24 (no columns)', () => {
    const rows = [
      row(1, 1, '2026-11-15', { status: 'reported' }),
      row(2, 2, '2026-11-15', { source_url: null }),
      row(3, 3, '2026-11-15', { source_url: 'https://www.soompi.com/article/1' }),
      row(4, 4, '2026-11-15', { source_type: 'lead' }),
      { id: 5, group_id: 5, artist: 'x', title: 'y', release_date: '2026-11-15', kind: 'ep' } as ComebackRow,
    ];
    const r = planComebackPrep(rows, now, ctx());
    expect(r.actions).toEqual([]);
    expect(r.skipped.every((s) => s.reason === 'not_announced_with_source')).toBe(true);
    expect(r.skipped).toHaveLength(5);
  });
  it(`at most ${MAX_FANDOM_DRAFTS_PER_DAY} fandom drafts a day, one per group, earliest release first`, () => {
    const rows = [row(1, 1, '2026-11-14'), row(2, 2, '2026-11-15'), row(3, 3, '2026-11-15'), row(4, 4, '2026-11-16'), row(5, 1, '2026-11-17')];
    const r = planComebackPrep(rows, now, ctx());
    expect(r.actions.map((a) => a.comeback)).toEqual([1, 2, 3]);
    expect(r.skipped).toContainEqual({ comeback: 4, reason: 'day_cap' });
    expect(r.skipped).toContainEqual({ comeback: 5, reason: 'group_has_test' });
    expect(planComebackPrep(rows, now, ctx({ draftsToday: 2 })).actions.map((a) => a.comeback)).toEqual([1]);
    expect(planComebackPrep(rows, now, ctx({ groupsWithTest: new Set([1]) })).actions.map((a) => a.comeback)).toEqual([2, 3, 4]);
  });
  it('is idempotent: a phase already done is not planned again', () => {
    const r = planComebackPrep([row(2, 2, '2026-11-15')], now, ctx({ done: new Set(['comeback:2:draft']) }));
    expect(r.actions).toEqual([]);
    expect(r.skipped).toEqual([{ comeback: 2, reason: 'done' }]);
  });
  it('a revision waits for the title track on MusicBrainz', () => {
    const rows = [row(1, 1, '2026-11-08')];
    expect(planComebackPrep(rows, now, ctx()).skipped).toEqual([{ comeback: 1, reason: 'title_track_not_on_musicbrainz' }]);
    expect(planComebackPrep(rows, now, ctx({ titleTrackOnMusicBrainz: new Set([1]) })).actions).toHaveLength(1);
  });
});

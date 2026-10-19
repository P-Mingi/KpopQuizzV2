import { describe, expect, it } from 'vitest';

import { FIXTURE_SLUGS, readFixture } from '../test-support';
import { ANIME_SPOILER_STORE_KEY, SPOILER_SHOW_ALL } from '../types';

import {
  SHOW_EVERYTHING_VIEW, SPOILER_FREE_VIEW, computeSpoilerLevel, isRevealedTo, isSafeFor, levelOfRow, maskTaggedQuestions,
  parseStore, readGuestProgress, withoutTaggedQuestions, writeGuestProgress,
} from './index';

import type { KeyValueStorage } from './index';

const q = (arc: number, scope: 'anime' | 'manga' | 'both') => ({ spoiler: { arc, scope } });

describe('computeSpoilerLevel', () => {
  it('is {0, null} with no tag or only arc 0', () => {
    expect(computeSpoilerLevel([])).toEqual({ arcOrd: 0, scope: null });
    expect(computeSpoilerLevel([{}, q(0, 'both'), q(0, 'manga')])).toEqual({ arcOrd: 0, scope: null });
  });

  it('takes the highest arc', () => {
    expect(computeSpoilerLevel([q(2, 'both'), q(7, 'both'), q(3, 'both')]).arcOrd).toBe(7);
  });

  it("is 'manga' when a tagged question is manga, or sits in a manga-only arc", () => {
    expect(computeSpoilerLevel([q(2, 'anime'), q(3, 'manga')]).scope).toBe('manga');
    expect(computeSpoilerLevel([q(2, 'anime'), q(3, 'anime')], new Set([3])).scope).toBe('manga');
  });

  it("is 'anime' when every tagged question is anime, else 'both'", () => {
    expect(computeSpoilerLevel([q(0, 'both'), q(2, 'anime'), q(3, 'anime')])).toEqual({ arcOrd: 3, scope: 'anime' });
    expect(computeSpoilerLevel([q(2, 'anime'), q(3, 'both')])).toEqual({ arcOrd: 3, scope: 'both' });
  });

  it('ignores an arc 0 question whatever its scope (it spoils nothing)', () => {
    expect(computeSpoilerLevel([q(0, 'manga'), q(2, 'anime')])).toEqual({ arcOrd: 2, scope: 'anime' });
  });

  for (const slug of FIXTURE_SLUGS) {
    it(`gives the expected level of each quiz of the ${slug} fixture`, () => {
      for (const quiz of readFixture(slug).quizzes) {
        const level = computeSpoilerLevel(quiz.questions);
        expect({ arc_ord: level.arcOrd, scope: level.scope }, quiz.slug).toEqual(quiz.expected_level);
      }
    });
  }
});

describe('isSafeFor', () => {
  const lvl = (arcOrd: number, scope: 'anime' | 'manga' | 'both' | null) => ({ arcOrd, scope });
  it('is always true at arc 0, even for a reader on the spoiler-free view', () => {
    expect(isSafeFor(lvl(0, null), SPOILER_FREE_VIEW)).toBe(true);
  });
  it('needs the reader to have seen up to the arc', () => {
    expect(isSafeFor(lvl(3, 'both'), { arc: 2, scope: 'anime' })).toBe(false);
    expect(isSafeFor(lvl(3, 'both'), { arc: 3, scope: 'anime' })).toBe(true);
    expect(isSafeFor(lvl(3, 'anime'), { arc: 9, scope: 'manga' })).toBe(true);
  });
  it('keeps a manga level away from a reader who follows the anime only', () => {
    expect(isSafeFor(lvl(3, 'manga'), { arc: 9, scope: 'anime' })).toBe(false);
    expect(isSafeFor(lvl(3, 'manga'), { arc: 3, scope: 'manga' })).toBe(true);
  });
  it('the spoiler-free view sees nothing above arc 0, Show everything sees all', () => {
    expect(isSafeFor(lvl(1, 'both'), SPOILER_FREE_VIEW)).toBe(false);
    expect(isSafeFor(lvl(40, 'manga'), SHOW_EVERYTHING_VIEW)).toBe(true);
    expect(SHOW_EVERYTHING_VIEW.arc).toBe(SPOILER_SHOW_ALL);
  });
});

describe('helpers', () => {
  it('isRevealedTo compares a character level with the progress', () => {
    expect(isRevealedTo(0, SPOILER_FREE_VIEW)).toBe(true);
    expect(isRevealedTo(2, { arc: 1, scope: 'anime' })).toBe(false);
    expect(isRevealedTo(2, { arc: 2, scope: 'anime' })).toBe(true);
  });
  it('levelOfRow reads the stored columns, a missing value is spoiler-free', () => {
    expect(levelOfRow({ spoiler_arc_ord: null, spoiler_scope: null })).toEqual({ arcOrd: 0, scope: null });
    expect(levelOfRow({ spoiler_arc_ord: 4, spoiler_scope: 'manga' })).toEqual({ arcOrd: 4, scope: 'manga' });
    expect(levelOfRow({ spoiler_arc_ord: 4, spoiler_scope: null })).toEqual({ arcOrd: 4, scope: 'both' });
  });
  it('removes or masks the tagged questions, keeping the others and the count', () => {
    const list: Array<{ question: string; spoiler?: { arc: number; scope: 'anime' | 'manga' | 'both' } }> = [{ question: 'free', ...q(0, 'both') }, { question: 'secret', ...q(3, 'both') }, { question: 'plain' }];
    expect(withoutTaggedQuestions(list).map((x) => x.question)).toEqual(['free', 'plain']);
    const masked = maskTaggedQuestions(list);
    expect(masked).toHaveLength(3);
    expect(JSON.stringify(masked)).not.toContain('secret');
  });
});

function memory(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = v; } };
}

describe('the guest store anime.spoiler.v1', () => {
  it('reads nothing as no value (the spoiler-free view)', () => {
    expect(readGuestProgress('death-note', memory())).toBeNull();
    expect(readGuestProgress('death-note', null)).toBeNull();
  });

  it('writes {[seriesSlug]: {arc, scope}} under the frozen key and keeps the other series', () => {
    const s = memory();
    expect(writeGuestProgress('death-note', { arc: 1, scope: 'anime' }, s)).toBe(true);
    expect(writeGuestProgress('one-piece', { arc: 4, scope: 'manga' }, s)).toBe(true);
    expect(JSON.parse(s.data[ANIME_SPOILER_STORE_KEY]!)).toEqual({ 'death-note': { arc: 1, scope: 'anime' }, 'one-piece': { arc: 4, scope: 'manga' } });
    expect(readGuestProgress('one-piece', s)).toEqual({ arc: 4, scope: 'manga' });
  });

  it('reads a damaged or foreign value as no value, never throws', () => {
    expect(parseStore('not json')).toEqual({});
    expect(parseStore('[1,2]')).toEqual({});
    expect(parseStore(JSON.stringify({ a: { arc: -1, scope: 'anime' }, b: { arc: 2, scope: 'both' }, c: { arc: 1.5, scope: 'anime' }, d: { arc: 3, scope: 'manga' } }))).toEqual({ d: { arc: 3, scope: 'manga' } });
  });

  it('survives a storage that throws on every access (private window, blocked site data)', () => {
    const broken: KeyValueStorage = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('quota'); } };
    expect(readGuestProgress('death-note', broken)).toBeNull();
    expect(writeGuestProgress('death-note', SPOILER_FREE_VIEW, broken)).toBe(false);
  });
});

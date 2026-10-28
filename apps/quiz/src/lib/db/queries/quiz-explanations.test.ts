import { afterEach, describe, expect, it, vi } from 'vitest';

import type { StoredExplanation } from '@/lib/quiz/answers';

const state = vi.hoisted(() => ({ result: { data: null as unknown, error: null as null | { code?: string; message: string } }, filters: [] as string[], pages: [] as Array<{ data: unknown; error: null | { code?: string; message: string } }>, ranges: [] as number[] }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => {
    const q = {
      select: () => q, order: () => q,
      eq: (c: string, v: string) => { state.filters.push(`${c}=${v}`); return q; },
      range: (from: number) => { state.ranges.push(from); return Promise.resolve(state.pages.shift() ?? { data: [], error: null }); },
      then: (r: (v: unknown) => void) => r(state.result),
    };
    return { from: () => q };
  },
}));

import { getQuizExplanations, quizLastModified, readExplanationDates } from './quiz-explanations';

const row: StoredExplanation = { q_index: 0, question: 'Which year did BTS debut?', answer: '2013', explanation: 'BTS debuted on 13 June 2013 under Big Hit Entertainment.', source_url: 'https://en.wikipedia.org/wiki/BTS' };
afterEach(() => { state.filters = []; state.pages = []; state.ranges = []; });

describe('getQuizExplanations', () => {
  it('reads the verified rows of the quiz', async () => {
    state.result = { data: [row], error: null };
    expect(await getQuizExplanations('quiz-1')).toEqual([row]);
    expect(state.filters).toEqual(['quiz_id=quiz-1', 'status=verified']);
  });

  it('answers [] while the table does not exist, and throws on any other error', async () => {
    state.result = { data: null, error: { code: 'PGRST205', message: 'not found' } };
    expect(await getQuizExplanations('quiz-1')).toEqual([]);
    state.result = { data: null, error: { code: '42P01', message: 'relation does not exist' } };
    expect(await getQuizExplanations('quiz-1')).toEqual([]);
    state.result = { data: null, error: { code: '57014', message: 'canceling statement due to statement timeout' } };
    await expect(getQuizExplanations('quiz-1')).rejects.toThrow('quiz explanations');
  });
});

describe('readExplanationDates and quizLastModified: the sitemap lastmod of a quiz', () => {
  it('keeps the newest verified explanation per quiz, across pages', async () => {
    const page = (n: number, quiz: string, day: string): Array<{ quiz_id: string; created_at: string }> => Array.from({ length: n }, () => ({ quiz_id: quiz, created_at: `2026-10-${day}T10:00:00+00:00` }));
    state.pages = [{ data: [...page(999, 'a', '20'), ...page(1, 'b', '21')], error: null }, { data: page(3, 'a', '28'), error: null }];
    const dates = await readExplanationDates();
    expect(state.ranges).toEqual([0, 1000]);
    expect(dates.get('a')).toBe(Date.parse('2026-10-28T10:00:00Z'));
    expect(dates.get('b')).toBe(Date.parse('2026-10-21T10:00:00Z'));
  });

  it('is empty while the table does not exist, and throws on another error', async () => {
    state.pages = [{ data: null, error: { code: 'PGRST205', message: 'not found' } }];
    expect((await readExplanationDates()).size).toBe(0);
    state.pages = [{ data: null, error: { code: '57014', message: 'timeout' } }];
    await expect(readExplanationDates()).rejects.toThrow('explanation dates');
  });

  it('a quiz page moves only when an explanation is newer than the quiz', () => {
    expect(quizLastModified('2026-05-01T00:00:00Z', undefined).toISOString()).toBe('2026-05-01T00:00:00.000Z');
    expect(quizLastModified('2026-05-01T00:00:00Z', Date.parse('2026-10-28T09:00:00Z')).toISOString()).toBe('2026-10-28T09:00:00.000Z');
    expect(quizLastModified('2026-10-29T00:00:00Z', Date.parse('2026-10-28T09:00:00Z')).toISOString()).toBe('2026-10-29T00:00:00.000Z');
  });
});

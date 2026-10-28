import { afterEach, describe, expect, it, vi } from 'vitest';

import type { StoredExplanation } from '@/lib/quiz/answers';

const state = vi.hoisted(() => ({ result: { data: null as unknown, error: null as null | { code?: string; message: string } }, filters: [] as string[] }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => {
    const q = { select: () => q, eq: (c: string, v: string) => { state.filters.push(`${c}=${v}`); return q; }, then: (r: (v: unknown) => void) => r(state.result) };
    return { from: () => q };
  },
}));

import { getQuizExplanations } from './quiz-explanations';

const row: StoredExplanation = { q_index: 0, question: 'Which year did BTS debut?', answer: '2013', explanation: 'BTS debuted on 13 June 2013 under Big Hit Entertainment.', source_url: 'https://en.wikipedia.org/wiki/BTS' };
afterEach(() => { state.filters = []; });

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

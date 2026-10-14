import { beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ tags: [] as Array<[string, unknown]>, paths: [] as string[], after: [] as Array<() => Promise<void>>, pinged: [] as string[][] }));
vi.mock('next/cache', () => ({
  revalidateTag: (tag: string, profile: unknown) => { calls.tags.push([tag, profile]); },
  revalidatePath: (p: string) => { calls.paths.push(p); },
}));
vi.mock('next/server', () => ({ after: (fn: () => Promise<void>) => { calls.after.push(fn); } }));
vi.mock('@/lib/indexnow', () => ({ pingIndexNow: async (urls: string[]) => { calls.pinged.push(urls); return { submitted: urls.length, batches: 1 }; } }));

import { onQuizChanged, quizChangePaths } from './quiz-freshness';

// Every new quiz ready to be indexed the moment it is published (owner, 2026-10-13: SEO).

beforeEach(() => { calls.tags = []; calls.paths = []; calls.after = []; calls.pinged = []; });

describe('quiz freshness', () => {
  it('the pages that show a quiz: its page, each of its hubs once, /new', () => {
    expect(quizChangePaths('bts-era-quiz', ['bts', null, 'bts', 'seventeen'])).toEqual(['/q/bts-era-quiz', '/bts-quiz', '/seventeen-quiz', '/new']);
    expect(quizChangePaths('x', [])).toEqual(['/q/x', '/new']);
  });

  it('a published quiz expires the lists and counts at once, refreshes its pages and the sitemap, pings after the response', async () => {
    onQuizChanged('published', 'bts-era-quiz', ['bts']);
    expect(calls.tags).toEqual([['quizzes', { expire: 0 }], ['groups', { expire: 0 }]]);
    expect(calls.paths).toEqual(['/q/bts-era-quiz', '/bts-quiz', '/new', '/', '/sitemap.xml']);
    expect(calls.pinged).toEqual([]); // nothing sent before the response
    await calls.after[0]!();
    expect(calls.pinged).toEqual([['/q/bts-era-quiz', '/bts-quiz', '/new']]);
  });

  it('an edit leaves the group counts alone', () => {
    onQuizChanged('edited', 'bts-era-quiz', ['bts']);
    expect(calls.tags.map(([t]) => t)).toEqual(['quizzes']);
  });

  it('never throws, even outside a request', async () => {
    const cache = await import('next/cache');
    const spy = vi.spyOn(cache, 'revalidateTag').mockImplementation(() => { throw new Error('outside a request'); });
    expect(() => onQuizChanged('removed', 'x', ['bts'])).not.toThrow();
    spy.mockRestore();
  });
});

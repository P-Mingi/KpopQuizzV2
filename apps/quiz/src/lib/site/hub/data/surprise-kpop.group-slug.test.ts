// Surprise me on the kpopquiz.org home (owner, 2026-11-04): each card of the K-pop pool carries the slug of its group, from the rows the pool already
// reads (groups!inner(name, slug)), so the tile of the pick can show the group's picture. The reads are what they were: one select of quizzes, no
// other table; and the cards of the hub and OtakuQuiz pools (sitePool) get no slug.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fakeDb, ORIGINS, quizRow } from './test-support';

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const NOW = new Date('2026-11-04T12:00:00Z');

describe('the K-pop pool cards', () => {
  it('carry the slug of their group, and the read is the one it was: quizzes only, no other table', async () => {
    const { readKpopSurprisePool } = await import('./surprise-kpop');
    const db = fakeDb({
      quizzes: [
        quizRow({ id: 'k-1', slug: 'k-1', group_id: 1, play_count: 30, groups: { name: 'Loossemble', slug: 'loossemble' } }),
        quizRow({ id: 'k-2', slug: 'k-2', group_id: 2, play_count: 20, groups: { name: 'General K-pop', slug: 'general-kpop' } }),
        quizRow({ id: 'k-3', slug: 'k-3', group_id: 3, play_count: 10, groups: [{ name: 'BTS', slug: 'bts' }] }),
      ],
    });
    const pool = (await readKpopSurprisePool(ORIGINS, NOW, db as never))!;
    expect(Object.fromEntries(pool.map((c) => [c.id, c.groupSlug]))).toEqual({ 'k-1': 'loossemble', 'k-2': 'general-kpop', 'k-3': 'bts' });
    expect(pool[0]).toMatchObject({ site: 'kpop', siteName: 'KpopQuiz', group: 'Loossemble', href: `${ORIGINS.kpop}/q/k-1` });
    expect(db.calls.map((c) => c.table)).toEqual(['quizzes']);
    expect(db.calls[0]!.ops.filter((o) => o[0] === 'select')).toEqual([['select', expect.stringContaining('groups!inner(name, slug)')]]);
  });

  it('are the same cards as sitePool gives, plus the slug; the hub and OtakuQuiz cards carry none', async () => {
    const { readKpopSurprisePool } = await import('./surprise-kpop');
    const { sitePool } = await import('./surprise');
    const rows = [quizRow({ id: 'k-1', slug: 'k-1', group_id: 1, groups: { name: 'Loossemble', slug: 'loossemble' } })];
    const pool = (await readKpopSurprisePool(ORIGINS, NOW, fakeDb({ quizzes: rows }) as never))!;
    const plain = sitePool('kpop', rows as never, new Map(), ORIGINS, NOW);
    expect(pool.map(({ groupSlug: _slug, ...rest }) => rest)).toEqual(plain);
    expect(plain.every((c) => !('groupSlug' in c))).toBe(true);
    const anime = sitePool('anime', [{ ...rows[0]!, site_id: 'anime' }] as never, new Map(), ORIGINS, NOW);
    expect(anime.every((c) => !('groupSlug' in c))).toBe(true);
  });

  it('give no pool when there is no quiz', async () => {
    const { readKpopSurprisePool } = await import('./surprise-kpop');
    expect(await readKpopSurprisePool(ORIGINS, NOW, fakeDb({ quizzes: [] }) as never)).toBeNull();
  });
});

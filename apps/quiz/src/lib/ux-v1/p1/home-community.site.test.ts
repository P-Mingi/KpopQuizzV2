// Guard (owner, 2026-10-23): the anime home must never show a K-pop debate. The debate tables carry no site_id, so a world build never
// reads them (lib/ux-v1/p1/home-data.ts). This test fails if a world build reads daily_debates again or shows a debate row.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const reads: string[] = [];
function fakeDb() {
  const rows: Record<string, unknown> = {
    daily_debates: { date: '2026-10-23', question_id: 'q1' },
    debate_questions: { question: 'English-language singles lose the K-pop feel' },
  };
  const chain = (table: string) => {
    const result = { data: rows[table] ?? null, error: null, count: 0 };
    const q: Record<string, unknown> = {};
    for (const m of ['select', 'lte', 'order', 'limit', 'eq', 'in', 'not', 'gte']) q[m] = () => q;
    q.maybeSingle = async () => result;
    q.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null, count: 0 }).then(ok);
    return q;
  };
  return { from: (table: string) => { reads.push(table); return chain(table); } };
}

vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => fakeDb() }));
vi.mock('@/lib/verse/visibility', () => ({ verseHidden: () => true, spaceUnpublished: () => false }));

describe('home community row by site', () => {
  beforeEach(() => { reads.length = 0; vi.resetModules(); });
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it('on the anime build: no read of the debate tables and no debate row', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    const { getHomeCommunity } = await import('./home-data');
    const c = await getHomeCommunity(new Date('2026-10-23T12:00:00Z'));
    expect(reads).not.toContain('daily_debates');
    expect(reads).not.toContain('debate_questions');
    expect(c.rows.some((r) => r.kind === 'debate')).toBe(false);
  });

  it('on the hub build: no read of the debate tables either', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'hub');
    const { getHomeCommunity } = await import('./home-data');
    await getHomeCommunity(new Date('2026-10-23T12:00:00Z'));
    expect(reads).not.toContain('daily_debates');
  });

  it('on the kpop build: the debate is still read and shown', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'kpop');
    const { getHomeCommunity } = await import('./home-data');
    const c = await getHomeCommunity(new Date('2026-10-23T12:00:00Z'));
    expect(reads).toContain('daily_debates');
    expect(c.rows.some((r) => r.kind === 'debate')).toBe(true);
  });
});

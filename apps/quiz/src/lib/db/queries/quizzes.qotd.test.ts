// Run O1, lot (e) part 1 (K1): getQuizOfTheDay(site). kpop (the default on the kpop build) sends today's queries, with no
// site filter while SITE_SCOPE is off; a call for another site always filters on site_id, in the read of the day and in the
// replay fallback.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface Call { table: string; filters: Array<[string, ...unknown[]]> }
const state = vi.hoisted(() => ({
  calls: [] as Array<{ table: string; filters: Array<[string, ...unknown[]]> }>,
  today: null as unknown,
  pool: [] as unknown[],
}));

vi.mock('next/cache', () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => ({}),
  createServiceRoleClient: () => ({
    from(table: string) {
      const c = { table, filters: [] as Array<[string, ...unknown[]]> };
      state.calls.push(c);
      const b: Record<string, unknown> = {};
      b.select = () => b;
      for (const m of ['eq', 'not', 'order']) b[m] = (...a: unknown[]) => { c.filters.push([m, ...a] as [string, ...unknown[]]); return b; };
      b.maybeSingle = async () => ({ data: state.today, error: null });
      b.then = (ok: (v: unknown) => unknown) => ok({ data: state.pool, error: null });
      return b;
    },
  }),
}));

const row = (id: string) => ({
  id, title: 'T', slug: id, quiz_type: 'multiple_choice', difficulty: 'easy', play_count: 0, total_score_sum: 0, total_completions: 0,
  like_count: 0, question_count: 3, created_at: '2026-10-01T00:00:00Z', cover_image_url: null, first_question: null,
  groups: { name: 'G', slug: 'g', display_color: '#000', text_color: '#fff', fandom_name: null, logo_url: null },
  profiles: { username: 'u', avatar_url: null, avatar_bg: '#000', avatar_text: 'U', xp: 0 },
});
const siteEqs = (c: Call): unknown[] => c.filters.filter(([m, k]) => m === 'eq' && k === 'site_id').map((f) => f[2]);

beforeEach(() => { state.calls = []; state.today = null; state.pool = []; vi.resetModules(); });
afterEach(() => { vi.unstubAllEnvs(); delete process.env.SITE_SCOPE; });

describe('getQuizOfTheDay', () => {
  it('kpop (the default site of the kpop build): the read of the day has no site filter while SITE_SCOPE is off', async () => {
    state.today = row('q-kpop');
    const { getQuizOfTheDay } = await import('./quizzes');
    expect((await getQuizOfTheDay())?.slug).toBe('q-kpop');
    expect(state.calls).toHaveLength(1);
    expect(state.calls[0]!.table).toBe('quizzes');
    expect(state.calls[0]!.filters.map(([m, k]) => `${m}:${k}`)).toEqual(['eq:status', 'eq:is_quiz_of_the_day', 'eq:quiz_of_the_day_date']);
  });

  it('kpop with SITE_SCOPE on: site_id kpop is added', async () => {
    process.env.SITE_SCOPE = '1';
    state.today = row('q-kpop');
    const { getQuizOfTheDay } = await import('./quizzes');
    await getQuizOfTheDay('kpop');
    expect(siteEqs(state.calls[0]!)).toEqual(['kpop']);
  });

  it('anime: the read of the day and the replay fallback both filter on site_id anime', async () => {
    state.today = null;
    state.pool = [row('a1'), row('a2')];
    const { getQuizOfTheDay } = await import('./quizzes');
    const q = await getQuizOfTheDay('anime');
    expect(q).not.toBeNull();
    expect(state.calls).toHaveLength(2);
    expect(state.calls.map(siteEqs)).toEqual([['anime'], ['anime']]);
  });

  it('the anime build defaults to anime', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    vi.stubEnv('SITE_ID', '');
    state.today = row('a1');
    const { getQuizOfTheDay } = await import('./quizzes');
    expect((await getQuizOfTheDay())?.slug).toBe('a1');
    expect(siteEqs(state.calls[0]!)).toEqual(['anime']);
  });

  it('no quiz and an empty pool: null', async () => {
    const { getQuizOfTheDay } = await import('./quizzes');
    expect(await getQuizOfTheDay('anime')).toBeNull();
  });
});

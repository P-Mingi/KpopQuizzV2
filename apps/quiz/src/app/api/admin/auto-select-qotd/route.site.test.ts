// Run O1, lot (e) part 1 (K1): /api/admin/auto-select-qotd per site. The kpop build reads with today's filters; the anime
// build reads the log, the quizzes and the bank of site anime only, and files its pick under anime.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface Call { table: string; op: string; arg?: unknown; filters: Array<[string, unknown]> }
const state = vi.hoisted(() => ({
  calls: [] as Array<{ table: string; op: string; arg?: unknown; filters: Array<[string, unknown]> }>,
  quizzes: [] as unknown[],
}));

vi.mock('@/lib/cron-auth', () => ({ isCronAuthorized: () => true }));
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from(table: string) {
      const c = { table, op: 'select', filters: [] as Array<[string, unknown]> } as { table: string; op: string; arg?: unknown; filters: Array<[string, unknown]> };
      state.calls.push(c);
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.update = (arg: unknown) => { c.op = 'update'; c.arg = arg; return b; };
      b.insert = (arg: unknown) => { c.op = 'insert'; c.arg = arg; return Promise.resolve({ data: null, error: null }); };
      for (const m of ['eq', 'gte', 'lt', 'in', 'order', 'limit']) b[m] = (k: string, v: unknown) => { c.filters.push([m === 'eq' ? k : `${m}:${k}`, v]); return b; };
      b.maybeSingle = async () => ({ data: null, error: null });
      const rows = (): unknown[] => {
        if (table === 'quizzes' && c.op === 'select') return state.quizzes;
        if (table === 'qotd_log' && c.op === 'select') return [{ quiz_id: 'old', featured_date: '2026-10-18' }];
        return [];
      };
      b.then = (ok: (v: unknown) => unknown) => ok({ data: rows(), error: null });
      return b;
    },
  }),
}));

async function post(site: string): Promise<Response> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('SITE_ID', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'not-a-credential-unit-test-placeholder');
  const { POST } = await import('./route');
  return POST(new Request('https://example.test/api/admin/auto-select-qotd', { method: 'POST' }));
}

const quiz = (id: string) => ({
  id, group_id: 1, quiz_type: 'multiple_choice', play_count: 40, like_count: 10, total_completions: 30, total_score_sum: 150,
  question_count: 8, created_at: '2026-10-01T00:00:00Z', quiz_of_the_day_date: null,
});
const siteFilters = (c: Call): unknown[] => c.filters.filter(([k]) => k === 'site_id').map(([, v]) => v);

beforeEach(() => { state.calls = []; state.quizzes = []; });
afterEach(() => { vi.unstubAllEnvs(); });

describe('POST /api/admin/auto-select-qotd', () => {
  it('kpop build: no site filter on any read while SITE_SCOPE is off; the log insert is today\'s row', async () => {
    state.quizzes = [quiz('q1'), quiz('q2')];
    const res = await post('');
    expect(res.status).toBe(200);
    const calls = state.calls as Call[];
    expect(calls.flatMap(siteFilters)).toEqual([]);
    const insert = calls.find((c) => c.op === 'insert')!;
    expect(insert.table).toBe('qotd_log');
    expect(Object.keys(insert.arg as object).sort()).toEqual(['featured_date', 'quiz_id', 'score', 'selection_method']);
  });

  it('anime build: every read of the log, the quizzes and the bank, and both updates, carry site_id anime; the log row is filed under anime', async () => {
    state.quizzes = [quiz('q1'), quiz('q2')];
    const res = await post('anime');
    expect(res.status).toBe(200);
    const calls = state.calls as Call[];
    const scoped = calls.filter((c) => ['qotd_log', 'quizzes', 'quiz_bank'].includes(c.table) && c.op !== 'insert');
    // the recent-groups read is by quiz id (in) and is the one query that needs no site
    const missing = scoped.filter((c) => siteFilters(c).length === 0).map((c) => `${c.table}:${c.filters.map(([k]) => k).join(',')}`);
    expect(missing).toEqual(['quizzes:in:id']);
    expect(scoped.filter((c) => c.op === 'update').map(siteFilters)).toEqual([['anime'], ['anime']]);
    expect((calls.find((c) => c.op === 'insert')!.arg as { site_id: string }).site_id).toBe('anime');
  });

  it('anime build with no eligible quiz: answers skipped, writes nothing', async () => {
    const res = await post('anime');
    expect(await res.json()).toMatchObject({ skipped: true });
    expect((state.calls as Call[]).filter((c) => c.op !== 'select')).toEqual([]);
  });
});

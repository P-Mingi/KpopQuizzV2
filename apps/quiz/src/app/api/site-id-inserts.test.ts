// Run O1, C2 fix S2: the inserts that must carry the build's site_id (reports, community replies, bell notifications).
// On a world build (anime) the row names its site; on the kpop build with the flag off the payload is today's, with no
// site_id (the column default 'kpop' fills it). A recording fake stands in for supabase: nothing leaves the process.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const db = vi.hoisted(() => ({
  inserts: [] as Array<{ table: string; row: Record<string, unknown> }>,
  rows: {} as Record<string, unknown>,
}));

function builder(table: string): unknown {
  const b: Record<string, unknown> = {};
  const self = (): unknown => b;
  for (const m of ['select', 'eq', 'in', 'ilike', 'is', 'order', 'limit', 'range', 'gte', 'lt', 'update', 'delete']) b[m] = self;
  b.insert = (row: Record<string, unknown>) => { db.inserts.push({ table, row }); return b; };
  b.maybeSingle = async () => ({ data: db.rows[table] ?? null, error: null });
  b.single = async () => ({ data: db.rows[`${table}:single`] ?? db.rows[table] ?? null, error: null });
  b.then = (resolve: (v: unknown) => void) => resolve({ data: db.rows[`${table}:list`] ?? [], error: null });
  return b;
}
const client = {
  auth: { getUser: async () => ({ data: { user: { id: 'u1', created_at: '2020-01-01T00:00:00Z' } } }) },
  from: (t: string) => builder(t),
  rpc: async (fn: string) => ({ data: fn === 'create_quiz_bypass' ? { id: 'q1', slug: 'a-quiz' } : null, error: null }),
};
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => client,
  createServiceRoleClient: () => client,
  createPublicReadClient: () => client,
}));
vi.mock('@/lib/quiz-validation', () => ({ validateQuestions: () => [] }));
vi.mock('@/lib/seo/quiz-freshness', () => ({ onQuizChanged: () => undefined }));
vi.mock('@/lib/passport/xp', () => ({ awardXpForSite: async () => null, awardXp: async () => null }));
vi.mock('@/lib/editorial/accounts', () => ({ isEditorialUser: async () => false }));
vi.mock('@/lib/ux-v1/p8/features', () => ({ tableLive: async () => true }));
vi.mock('@/lib/verse/moderation', () => ({
  checkText: async () => null, isBlockedInSpace: async () => false, isTrusted: () => true, underRateCap: async () => true,
}));

type Config = 'kpop' | 'anime';
async function setup(config: Config): Promise<void> {
  vi.resetModules();
  vi.unstubAllEnvs();
  delete process.env.SITE_SCOPE;
  if (config === 'anime') vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', '1');
  db.inserts = [];
  db.rows = {};
}
const post = (url: string, body: unknown): NextRequest =>
  new NextRequest(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const only = (table: string): Array<Record<string, unknown>> => db.inserts.filter((i) => i.table === table).map((i) => i.row);

beforeEach(() => { db.inserts = []; });
afterEach(() => { vi.unstubAllEnvs(); delete process.env.SITE_SCOPE; vi.resetModules(); });

describe('reports carry the site_id of the build', () => {
  const cases: Array<[string, () => Promise<Response>]> = [
    ['POST /api/quiz/[id]/report', async () => {
      const { POST } = await import('./quiz/[id]/report/route');
      return POST(post('https://x.test/api/quiz/q1/report', { reason: 'spam' }), { params: Promise.resolve({ id: 'q1' }) });
    }],
    ['POST /api/debate/report', async () => {
      const { POST } = await import('./debate/report/route');
      return POST(post('https://x.test/api/debate/report', { vote_id: 'a-vote-id-long-enough', reason: 'spam' }));
    }],
  ];
  for (const [name, go] of cases) {
    it(`${name}: anime build writes site_id anime`, async () => {
      await setup('anime');
      const res = await go();
      expect(res.status).toBe(200);
      const rows = only('reports');
      expect(rows).toHaveLength(1);
      expect(rows[0]!.site_id).toBe('anime');
    });
    it(`${name}: kpop with the flag off writes today's payload (no site_id)`, async () => {
      await setup('kpop');
      const res = await go();
      expect(res.status).toBe(200);
      const rows = only('reports');
      expect(rows).toHaveLength(1);
      expect(rows[0]).not.toHaveProperty('site_id');
    });
  }

  it('POST /api/quiz/create: the auto-mod report of an uploaded image carries the site_id', async () => {
    const quiz = {
      title: 'A fine quiz title', quiz_type: 'true_false', group_id: 7, settings: {},
      cover_image_url: 'https://x.supabase.co/storage/v1/object/public/quiz-images/c.png',
      questions: [{ question: 'q', correct: true }],
    };
    for (const config of ['anime', 'kpop'] as const) {
      await setup(config);
      db.rows.groups = { id: 7, slug: 'a-group' };
      db.rows['quizzes:single'] = { id: 'q1', slug: 'a-quiz' };
      const { POST } = await import('./quiz/create/route');
      const res = await POST(post('https://x.test/api/quiz/create', quiz));
      expect(res.status, config).toBe(200);
      const rows = only('reports');
      expect(rows, config).toHaveLength(1);
      if (config === 'anime') expect(rows[0]!.site_id).toBe('anime');
      else expect(rows[0]).not.toHaveProperty('site_id');
    }
  });
});

describe('community replies and the bell carry the site_id of the build', () => {
  async function reply(): Promise<Response> {
    db.rows.community_debates = { id: 5, group_id: null, status: 'visible', author: 'u2' };
    db.rows['community_replies:single'] = { id: 99 };
    const { POST } = await import('./ux-v1/p8/replies/route');
    return POST(post('https://x.test/api/ux-v1/p8/replies', { target_type: 'debate', target_id: 5, body: 'hello there' }));
  }
  for (const config of ['anime', 'kpop'] as const) {
    it(`POST /api/ux-v1/p8/replies on ${config}: the reply and the bell row`, async () => {
      await setup(config);
      const res = await reply();
      expect(res.status).toBe(200);
      const replies = only('community_replies');
      expect(replies).toHaveLength(1);
      const bell = only('creator_notifications');
      expect(bell).toHaveLength(1);
      for (const row of [replies[0]!, bell[0]!]) {
        if (config === 'anime') expect(row.site_id).toBe('anime');
        else expect(row).not.toHaveProperty('site_id');
      }
    });
  }
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// POST /api/ux-v1/p8/replies (owner, 2026-10-06): the daily debate takes comments open or
// closed, replies nest under any visible reply of the same post down to 10 levels, a vote
// comment takes replies, and a banned word refuses the reply before any write. The
// database is an in-memory fake that honours eq filters (no network).

type Row = Record<string, unknown>;
const h = vi.hoisted(() => ({ tables: {} as Record<string, Row[]>, inserts: [] as Row[], blockedWords: ['fuck'] }));

function query(table: string): unknown {
  const filters: [string, unknown][] = [];
  const rows = (): Row[] => (h.tables[table] ?? []).filter((r) => filters.every(([k, v]) => String(r[k]) === String(v)));
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'order', 'in', 'is', 'not', 'gte', 'limit']) b[m] = () => b;
  b.eq = (k: string, v: unknown) => { filters.push([k, v]); return b; };
  b.maybeSingle = async () => ({ data: rows()[0] ?? null, error: null });
  b.range = async (from: number, to: number) => ({ data: rows().slice(from, to + 1), error: null });
  b.insert = (obj: Row) => { h.inserts.push({ table, ...obj }); return { select: () => ({ single: async () => ({ data: { id: 999 }, error: null }) }) }; };
  return b;
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u-fan', created_at: '2025-01-01T00:00:00Z' } } }) } }),
  createServiceRoleClient: () => ({ from: (t: string) => query(t) }),
}));
vi.mock('@/lib/ux-v1/p8/features', () => ({ tableLive: async () => true }));
vi.mock('@/lib/editorial/accounts', () => ({ isEditorialUser: async () => false }));
vi.mock('@/lib/editorial/live', () => ({ getEditorialLive: async () => true }));
vi.mock('@/lib/verse/moderation', () => ({
  checkText: async (t: string) => (h.blockedWords.some((w) => t.toLowerCase().includes(w)) ? { action: 'block', term: 'x' } : null),
  isBlockedInSpace: async () => false,
  isTrusted: () => true,
  underRateCap: async () => true,
}));

const VOTE = 'a1b2c3d4-0000-4000-8000-00000000abcd';
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
const TOMORROW = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const KEY = Number(YESTERDAY.replace(/-/g, ''));

/** Replies 1..n of fan debate 4, each under the one before (reply k is level k). */
function chainOnDebate(n: number): Row[] {
  return Array.from({ length: n }, (_x, i) => ({ id: i + 1, target_type: 'debate', target_id: 4, parent_id: i === 0 ? null : i, parent_vote: null, status: 'visible' }));
}

async function post(body: unknown): Promise<{ status: number; data: Record<string, unknown> }> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', '1');
  const { POST } = await import('./route');
  const res = await POST(new Request('http://localhost/api/ux-v1/p8/replies', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }) as never);
  return { status: res.status, data: await res.json() as Record<string, unknown> };
}

beforeEach(() => {
  h.inserts = [];
  h.tables = {
    daily_debates: [{ date: YESTERDAY, question_id: 'q1' }],
    debate_questions: [{ id: 'q1', side_a: 'Agree', side_b: 'Disagree' }],
    debate_votes: [{ id: VOTE, date: YESTERDAY, user_id: 'u-fan', side: 'a', comment: 'Obviously', comment_hidden_at: null }],
    community_debates: [{ id: 4, group_id: null, status: 'visible' }, { id: 5, group_id: null, status: 'visible' }],
    community_replies: [],
  };
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('the daily debate takes comments of its own', () => {
  it('a closed debate (yesterday): the comment is stored with target_id = its day, and says how the fan voted', async () => {
    const r = await post({ target_type: 'daily_debate', target_id: YESTERDAY, body: 'Still agree' });
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ ok: true, id: 999, meta: 'voted Agree' });
    expect(h.inserts).toEqual([expect.objectContaining({ table: 'community_replies', target_type: 'daily_debate', target_id: KEY, parent_id: null, body: 'Still agree' })]);
  });
  it('a reply to a vote comment rides on parent_vote', async () => {
    const r = await post({ target_type: 'daily_debate', target_id: YESTERDAY, body: 'Why?', parent_vote: VOTE });
    expect(r.status).toBe(200);
    expect(h.inserts[0]).toMatchObject({ parent_vote: VOTE, parent_id: null });
  });
  it('a day not published yet is not found; nothing is written', async () => {
    const r = await post({ target_type: 'daily_debate', target_id: TOMORROW, body: 'hi' });
    expect(r.status).toBe(404);
    expect(h.inserts).toEqual([]);
  });
  it('a vote comment hidden by its reports takes no reply', async () => {
    h.tables.debate_votes![0]!.comment_hidden_at = '2026-10-06T10:00:00Z';
    const r = await post({ target_type: 'daily_debate', target_id: YESTERDAY, body: 'Why?', parent_vote: VOTE });
    expect(r.status).toBe(400);
    expect(r.data.error).toBe('bad_parent');
  });
  it('v12 off: the daily debate keeps only the reply that rides with the vote', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
    vi.stubEnv('NEXT_PUBLIC_UX_V12', '');
    const { POST } = await import('./route');
    const res = await POST(new Request('http://localhost/x', { method: 'POST', body: JSON.stringify({ target_type: 'daily_debate', target_id: YESTERDAY, body: 'hi' }) }) as never);
    expect(res.status).toBe(404);
  });
});

describe('replies nest under any visible reply of the same post, 10 levels at most', () => {
  it('a reply to a reply to a reply (level 3) is stored under its parent', async () => {
    h.tables.community_replies = chainOnDebate(2);
    const r = await post({ target_type: 'debate', target_id: 4, body: 'level three', parent_id: 2 });
    expect(r.status).toBe(200);
    expect(h.inserts[0]).toMatchObject({ target_type: 'debate', target_id: 4, parent_id: 2 });
  });
  it('under level 9 a reply passes (level 10); under level 10 it is refused', async () => {
    h.tables.community_replies = chainOnDebate(10);
    expect((await post({ target_type: 'debate', target_id: 4, body: 'ten', parent_id: 9 })).status).toBe(200);
    h.inserts = [];
    const deep = await post({ target_type: 'debate', target_id: 4, body: 'eleven', parent_id: 10 });
    expect(deep.status).toBe(400);
    expect(deep.data.error).toBe('too_deep');
    expect(h.inserts).toEqual([]);
  });
  it('a parent of another post, or a hidden parent, is refused', async () => {
    h.tables.community_replies = [...chainOnDebate(1), { id: 7, target_type: 'debate', target_id: 5, parent_id: null, parent_vote: null, status: 'visible' }, { id: 8, target_type: 'debate', target_id: 4, parent_id: null, parent_vote: null, status: 'hidden' }];
    expect((await post({ target_type: 'debate', target_id: 4, body: 'x', parent_id: 7 })).data.error).toBe('bad_parent');
    expect((await post({ target_type: 'debate', target_id: 4, body: 'x', parent_id: 8 })).data.error).toBe('bad_parent');
    expect(h.inserts).toEqual([]);
  });
  it('a banned word in a nested reply is refused with blocked_term; nothing is written', async () => {
    h.tables.community_replies = chainOnDebate(2);
    const r = await post({ target_type: 'debate', target_id: 4, body: 'this is fucking great', parent_id: 2 });
    expect(r.status).toBe(422);
    expect(r.data.error).toBe('blocked_term');
    expect(h.inserts).toEqual([]);
  });
});

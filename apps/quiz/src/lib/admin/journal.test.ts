// ADMIN-2: the journal helper on a recording stand-in of the service-role client (no database, no network). What is stored, what is dropped,
// and that a failure of the journal never reaches the write it records.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const s = vi.hoisted(() => ({
  inserts: [] as Array<{ table: string; row: Record<string, unknown> }>,
  insertError: null as { code?: string } | null,
  throws: false,
  rows: [] as unknown[],
  readError: null as unknown,
  eqs: [] as Array<[string, unknown]>,
  limit: 0,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => {
    if (s.throws) throw new Error('no service key');
    return {
      from(table: string) {
        const q: Record<string, unknown> = {};
        q.insert = (row: Record<string, unknown>) => { s.inserts.push({ table, row }); return Promise.resolve({ error: s.insertError }); };
        q.select = () => q;
        q.order = () => q;
        q.limit = (n: number) => { s.limit = n; return q; };
        q.eq = (k: string, v: unknown) => { s.eqs.push([k, v]); return q; };
        q.maybeSingle = () => Promise.resolve({ data: s.rows[0] ?? null, error: s.readError });
        q.then = (ok: (v: unknown) => unknown) => ok({ data: s.rows, error: s.readError });
        return q;
      },
    };
  },
}));

import { lastActionDetail, logAdminAction, readJournal, requestIdOf, sanitizeDetail } from './journal';

const ACTOR = { user: { id: '00000000-0000-4000-8000-000000000001' } };

beforeEach(() => { s.inserts = []; s.insertError = null; s.throws = false; s.rows = []; s.readError = null; s.eqs = []; s.limit = 0; vi.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => { vi.restoreAllMocks(); });

describe('logAdminAction', () => {
  it('inserts one line into admin_actions with the verified admin, the site, the action and the target', async () => {
    const stored = await logAdminAction(ACTOR, { site: 'anime', action: 'quiz.remove', targetType: 'quiz', targetId: 'q-1', detail: { cache: 'ok' }, requestId: 'fra1::abc' });
    expect(stored).toBe(true);
    expect(s.inserts).toEqual([{ table: 'admin_actions', row: {
      admin_id: ACTOR.user.id, site_id: 'anime', action: 'quiz.remove', target_type: 'quiz', target_id: 'q-1', detail: { cache: 'ok' }, request_id: 'fra1::abc',
    } }]);
  });

  it('turns a numeric target into text and fills the optional columns with null', async () => {
    await logAdminAction(ACTOR, { site: 'kpop', action: 'group.delete', targetType: 'group', targetId: 12 });
    expect(s.inserts[0]!.row).toMatchObject({ target_id: '12', request_id: null, detail: {} });
    await logAdminAction(ACTOR, { site: 'hub', action: 'asset.save' });
    expect(s.inserts[1]!.row).toMatchObject({ target_type: null, target_id: null });
  });

  it('refuses a site that is not one of the three and an action that is not a short dotted code, without a query', async () => {
    expect(await logAdminAction(ACTOR, { site: 'fanquiz' as never, action: 'quiz.remove' })).toBe(false);
    for (const action of ['', 'Quiz.Remove', 'quiz remove', 'quiz.', '.quiz', 'a.b.c.d.e', 'quiz;drop', '1quiz']) expect(await logAdminAction(ACTOR, { site: 'kpop', action }), action).toBe(false);
    expect(s.inserts).toEqual([]);
  });

  it('never throws and never blocks: a refused insert, a missing table and a missing service key all answer false', async () => {
    s.insertError = { code: '42P01' };
    await expect(logAdminAction(ACTOR, { site: 'kpop', action: 'quiz.remove' })).resolves.toBe(false);
    s.insertError = null;
    s.throws = true;
    await expect(logAdminAction(ACTOR, { site: 'kpop', action: 'quiz.remove' })).resolves.toBe(false);
  });

  it('prints an error code or a name on failure, never the entry', async () => {
    s.insertError = { code: '42P01' };
    await logAdminAction(ACTOR, { site: 'kpop', action: 'user.edit', targetId: 'person-id', detail: { fields: ['username'], marker: 'SECRET-MARKER' } });
    const printed = JSON.stringify((console.error as unknown as { mock: { calls: unknown[][] } }).mock.calls);
    expect(printed).not.toContain('SECRET-MARKER');
    expect(printed).not.toContain('person-id');
    expect(printed).not.toContain(ACTOR.user.id);
  });

  it('caps the target and the type', async () => {
    await logAdminAction(ACTOR, { site: 'kpop', action: 'x.y', targetType: 't'.repeat(100), targetId: 'i'.repeat(500) });
    const row = s.inserts[0]!.row as { target_type: string; target_id: string };
    expect(row.target_type).toHaveLength(40);
    expect(row.target_id).toHaveLength(200);
  });
});

describe('sanitizeDetail: ids, counts and short codes only', () => {
  it('keeps scalars and short lists under plain keys', () => {
    expect(sanitizeDetail({ removed: 3, cache: 'ok', verified: true, parent: null, quiz_ids: ['a', 'b'], n: [1, 2] })).toEqual({ removed: 3, cache: 'ok', verified: true, parent: null, quiz_ids: ['a', 'b'], n: [1, 2] });
  });

  it('drops every key that names personal data or free text, whatever it holds', () => {
    const dirty = {
      email: 'a@b.c', user_email: 'a@b.c', mail: 'x', password: 'p', token: 't', secret: 's', phone: '1', address: 'a', ip: '1.2.3.4', client_ip: '1.2.3.4',
      text: 't', body: 'b', message: 'm', comment: 'c', content: 'c', bio: 'b', reason: 'r', note: 'n', username: 'u', display_name: 'd', title: 't', label: 'l', link_url: 'u', url: 'u',
    };
    expect(sanitizeDetail(dirty)).toEqual({});
    expect(sanitizeDetail({ ...dirty, removed: 2 })).toEqual({ removed: 2 });
  });

  it('drops keys that are not plain, nested objects, functions, undefined and non-finite numbers', () => {
    expect(sanitizeDetail({ 'Bad Key': 1, '1abc': 1, 'a-b': 1, nested: { a: 1 }, fn: () => 1, undef: undefined, nan: Number.NaN, inf: Number.POSITIVE_INFINITY, ok_key: 1 })).toEqual({ ok_key: 1 });
  });

  it('cuts long strings, long lists and too many keys', () => {
    const out = sanitizeDetail({ s: 'x'.repeat(500), list: Array.from({ length: 400 }, (_, i) => i) });
    expect((out.s as string).length).toBe(120);
    expect((out.list as number[]).length).toBe(150);
    const many = Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`k${i}`, i]));
    expect(Object.keys(sanitizeDetail(many))).toHaveLength(20);
  });

  it('keeps the largest detail under the 8 KB the table allows', () => {
    const uuid = '00000000-0000-4000-8000-000000000001';
    const worst = sanitizeDetail({ cache: 'ok', removed: 150, quiz_ids: Array.from({ length: 400 }, () => uuid), ids_cut: true });
    expect(JSON.stringify(worst).length).toBeLessThan(8192);
  });

  it('answers an empty object for anything that is not an object', () => {
    for (const v of [null, undefined, 'x', 5, ['a'], true]) expect(sanitizeDetail(v)).toEqual({});
  });
});

describe('requestIdOf', () => {
  it('keeps the platform request id, capped, else nothing', () => {
    expect(requestIdOf({ headers: new Headers({ 'x-vercel-id': 'fra1::abc' }) })).toBe('fra1::abc');
    expect(requestIdOf({ headers: new Headers({ 'x-request-id': 'r1' }) })).toBe('r1');
    expect(requestIdOf({ headers: new Headers({ 'x-vercel-id': 'v'.repeat(300) }) })).toHaveLength(100);
    expect(requestIdOf({ headers: new Headers() })).toBeNull();
  });
});

describe('readJournal', () => {
  it('reads the newest lines, 200 at most, of one site or of all, and says when the table is there', async () => {
    s.rows = [{ id: 2 }, { id: 1 }];
    expect(await readJournal('anime', 9999)).toEqual({ rows: [{ id: 2 }, { id: 1 }], available: true });
    expect(s.limit).toBe(200);
    expect(s.eqs).toEqual([['site_id', 'anime']]);
    s.eqs = [];
    await readJournal(null, 0);
    expect(s.eqs).toEqual([]);
    expect(s.limit).toBe(1);
  });

  it('says "not available" instead of an empty list when the table is missing or the read fails', async () => {
    s.readError = { code: '42P01' };
    expect(await readJournal(null)).toEqual({ rows: [], available: false });
    s.readError = null;
    s.throws = true;
    expect(await readJournal(null)).toEqual({ rows: [], available: false });
  });
});

describe('lastActionDetail', () => {
  it('returns the detail of the latest line of an action on a target, else null', async () => {
    s.rows = [{ detail: { quiz_ids: ['a'] } }];
    expect(await lastActionDetail('user.ban', 'u1')).toEqual({ quiz_ids: ['a'] });
    expect(s.eqs).toEqual([['action', 'user.ban'], ['target_id', 'u1']]);
    s.rows = [];
    expect(await lastActionDetail('user.ban', 'u1')).toBeNull();
    s.rows = [{ detail: ['x'] }];
    expect(await lastActionDetail('user.ban', 'u1')).toBeNull();
    s.readError = { code: '42P01' };
    expect(await lastActionDetail('user.ban', 'u1')).toBeNull();
  });
});


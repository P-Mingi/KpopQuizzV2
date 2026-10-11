import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Community notifications (owner, 2026-10-07): titles, grouping of unread rows, the Social
// category, never yourself, never a Team account. The database is an in-memory fake that
// honours eq filters (no network).

type Row = Record<string, unknown>;
const h = vi.hoisted(() => ({ tables: {} as Record<string, Row[]>, team: new Set<string>(), insertError: null as null | { code: string } }));

function query(table: string): unknown {
  const filters: [string, unknown][] = [];
  const rows = (): Row[] => (h.tables[table] ?? []).filter((r) => filters.every(([k, v]) => r[k] === v));
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = (k: string, v: unknown) => { filters.push([k, v]); return b; };
  b.maybeSingle = async () => ({ data: rows()[0] ?? null, error: null });
  b.insert = async (obj: Row) => {
    if (h.insertError) { const e = h.insertError; h.insertError = null; h.tables[table]!.push({ id: 'race', is_read: false, ...obj, title: 'A rival', sources: [] }); return { error: e }; }
    (h.tables[table] ??= []).push({ id: `n${(h.tables[table] ?? []).length + 1}`, is_read: false, ...obj });
    return { error: null };
  };
  b.update = (obj: Row) => ({ eq: async (k: string, v: unknown) => { for (const r of h.tables[table] ?? []) if (r[k] === v) Object.assign(r, obj); return { error: null }; } });
  return b;
}

vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => ({ from: (t: string) => query(t) }) }));
vi.mock('@/lib/editorial/accounts', () => ({ isEditorialUser: async (id: string) => h.team.has(id) }));

const OWNER = 'u-owner';
const notice = (actor: string, ref: string, text = 'Great point, I agree with the second half.') => ({
  type: 'community_reply' as const, recipient: OWNER, actor, groupKey: 'reply:comment:7', ref, link: `/community/thread/3?reply=${ref.split(':')[1]}`, text,
});

async function load(v12 = true): Promise<typeof import('./notify')> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
  return import('./notify');
}

beforeEach(() => {
  h.team = new Set(['u-team']);
  h.insertError = null;
  h.tables = {
    creator_notifications: [],
    notification_prefs: [],
    profiles: [{ id: 'u-ana', username: 'ana', display_name: 'Ana' }, { id: 'u-bo', username: 'bo', display_name: null }, { id: 'u-cy', username: 'cy', display_name: 'Cy' }],
  };
});
afterEach(() => { vi.unstubAllEnvs(); });

describe('titles and texts', () => {
  it('one, two, three fans; the same fan twice counts once', async () => {
    const { titleOf } = await load();
    const s = (sender: string, name: string, ref: string) => ({ ref, sender, name, excerpt: '', link: '', at: '' });
    expect(titleOf('community_reply', [s('a', 'Ana', 'r:1')])).toBe('Ana replied to your comment');
    expect(titleOf('community_reply', [s('a', 'Ana', 'r:1'), s('b', 'bo', 'r:2')])).toBe('bo and 1 other replied to your comment');
    expect(titleOf('community_comment', [s('a', 'Ana', 'r:1'), s('b', 'bo', 'r:2'), s('c', 'Cy', 'r:3')])).toBe('Cy and 2 others commented on your post');
    expect(titleOf('community_reply', [s('a', 'Ana', 'r:1'), s('a', 'Ana', 'r:2')])).toBe('Ana replied to your comment');
  });
  it('the start of the reply on one line; Social off read as the gate reads it', async () => {
    const { excerptOf, socialOff } = await load();
    expect(excerptOf('Line one\n\nline   two')).toBe('Line one line two');
    expect(excerptOf('x'.repeat(150))).toBe(`${'x'.repeat(97)}...`);
    expect(socialOff({ social: false })).toBe(true);
    expect(socialOff({ social: 'false' })).toBe(true);
    expect(socialOff({ social: true })).toBe(false);
    expect(socialOff({})).toBe(false);
  });
});

describe('notifyCommunity', () => {
  it('a first reply adds one unread row with the name, the start of the reply and the link', async () => {
    const { notifyCommunity } = await load();
    await notifyCommunity(notice('u-ana', 'comment:11'));
    expect(h.tables.creator_notifications).toEqual([expect.objectContaining({
      user_id: OWNER, type: 'community_reply', title: 'Ana replied to your comment', body: 'Great point, I agree with the second half.',
      link_url: '/community/thread/3?reply=11', sender_id: 'u-ana', group_key: 'reply:comment:7', is_read: false,
    })]);
  });
  it('a second reply while the first is unread updates the same row: "X and 1 other", newest text and link', async () => {
    const { notifyCommunity } = await load();
    await notifyCommunity(notice('u-ana', 'comment:11'));
    await notifyCommunity(notice('u-bo', 'comment:12', 'Not sure about that.'));
    await notifyCommunity(notice('u-cy', 'comment:13', 'Same here'));
    expect(h.tables.creator_notifications).toHaveLength(1);
    expect(h.tables.creator_notifications![0]).toMatchObject({ title: 'Cy and 2 others replied to your comment', body: 'Same here', link_url: '/community/thread/3?reply=13', sender_id: 'u-cy' });
    expect((h.tables.creator_notifications![0]!.sources as unknown[])).toHaveLength(3);
  });
  it('once read, the next reply starts a new row', async () => {
    const { notifyCommunity } = await load();
    await notifyCommunity(notice('u-ana', 'comment:11'));
    h.tables.creator_notifications![0]!.is_read = true;
    await notifyCommunity(notice('u-bo', 'comment:12'));
    expect(h.tables.creator_notifications!.map((r) => r.title)).toEqual(['Ana replied to your comment', 'bo replied to your comment']);
  });
  it('a reply that loses the race to add the row updates it instead', async () => {
    const { notifyCommunity } = await load();
    h.insertError = { code: '23505' };
    await notifyCommunity(notice('u-ana', 'comment:11'));
    expect(h.tables.creator_notifications).toHaveLength(1);
    expect(h.tables.creator_notifications![0]).toMatchObject({ id: 'race', title: 'Ana replied to your comment' });
  });
  it('never to yourself, never to a Team account, never with Social off, never with v12 off', async () => {
    let m = await load();
    await m.notifyCommunity({ ...notice('u-ana', 'comment:11'), recipient: 'u-ana' });
    await m.notifyCommunity({ ...notice('u-ana', 'comment:11'), recipient: 'u-team' });
    await m.notifyCommunity({ ...notice('u-ana', 'comment:11'), recipient: null });
    h.tables.notification_prefs = [{ user_id: OWNER, categories: { social: false } }];
    await m.notifyCommunity(notice('u-ana', 'comment:11'));
    expect(h.tables.creator_notifications).toEqual([]);
    h.tables.notification_prefs = [];
    m = await load(false);
    await m.notifyCommunity(notice('u-ana', 'comment:11'));
    expect(h.tables.creator_notifications).toEqual([]);
  });
  it('Social switched off after a row exists: the unread row is not updated either', async () => {
    const { notifyCommunity } = await load();
    await notifyCommunity(notice('u-ana', 'comment:11'));
    h.tables.notification_prefs = [{ user_id: OWNER, categories: { social: false } }];
    await notifyCommunity(notice('u-bo', 'comment:12'));
    expect(h.tables.creator_notifications![0]).toMatchObject({ title: 'Ana replied to your comment' });
  });
});

// FLAW-1 (integrator fix, 2026-11-12): a curator of one space can no longer write or read another space by
// naming its own space and sending another space's row id. The tree, tags and era color routes run against an
// in-memory stand-in for Supabase (nothing leaves the process): for every action, a curator of ANOTHER space is
// refused (403, and the write function is never reached) and a curator of the RIGHT space is accepted.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Row = Record<string, unknown>;

const h = vi.hoisted(() => {
  const s = {
    user: null as { id: string } | null,
    curates: {} as Record<string, number[]>,
    roleChecks: [] as Array<[string, number]>,
    rows: {} as Record<string, Record<string, unknown>[]>,
    calls: [] as Array<{ fn: string; args: unknown[] }>,
    updates: [] as Array<{ table: string; patch: Record<string, unknown>; filters: Array<[string, unknown]> }>,
    // a recording stand-in for a data function: logs its arguments, answers `out`.
    rec: (fn: string, out: unknown) => async (...args: unknown[]): Promise<unknown> => { s.calls.push({ fn, args }); return out; },
  };
  return s;
});

// a tiny query builder: select / eq / update / maybeSingle over h.rows, updates recorded when awaited.
function table(name: string): unknown {
  const filters: Array<[string, unknown]> = [];
  let patch: Row | null = null;
  const match = (): Row[] => (h.rows[name] ?? []).filter((r) => filters.every(([c, v]) => r[c] === v));
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = (c: string, v: unknown) => { filters.push([c, v]); return b; };
  b.update = (p: Row) => { patch = p; return b; };
  b.maybeSingle = async () => ({ data: match()[0] ?? null, error: null });
  b.then = (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => {
    if (patch) h.updates.push({ table: name, patch, filters: [...filters] });
    return Promise.resolve({ data: null, error: null }).then(ok, bad);
  };
  return b;
}
const db = { from: (t: string) => table(t) };

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: h.user } }) } }),
  createServiceRoleClient: () => db,
}));
// the Verse-hidden / parked-space gate has its own tests (lib/verse/api-gate.test.ts).
vi.mock('@/lib/verse/api-gate', () => ({ verseWriteGate: async () => null }));
vi.mock('@/lib/verse/roles', () => ({
  canCurateSpace: async (uid: string | null, gid: number) => {
    h.roleChecks.push([String(uid), gid]);
    return !!uid && (h.curates[uid] ?? []).includes(gid);
  },
}));
vi.mock('@/lib/verse/tree/data', () => ({
  createPage: h.rec('createPage', { page: { id: 99 } }),
  savePage: h.rec('savePage', { page: { id: 20 } }),
  renamePage: h.rec('renamePage', { page: { id: 20 }, redirected: false }),
  movePage: h.rec('movePage', { page: { id: 20 } }),
  publishPage: h.rec('publishPage', { page: { id: 20 } }),
  trashPage: h.rec('trashPage', { page: { id: 20 } }),
  restorePage: h.rec('restorePage', { page: { id: 20 } }),
  revertToRevision: h.rec('revertToRevision', { page: { id: 20 } }),
  listRevisions: h.rec('listRevisions', [{ rev: 1 }]),
  recentChanges: h.rec('recentChanges', []),
}));
vi.mock('@/lib/verse/tree/links', () => ({ wantedPages: h.rec('wantedPages', []), orphanPages: h.rec('orphanPages', []) }));
vi.mock('@/lib/verse/tree/tags', () => ({
  ensureTag: h.rec('ensureTag', { id: 300 }),
  listTags: h.rec('listTags', []),
  attachTag: h.rec('attachTag', undefined),
  detachTag: h.rec('detachTag', undefined),
  mergeTags: h.rec('mergeTags', undefined),
  renameTag: h.rec('renameTag', { ok: true }),
}));

import { GET as treeGet, POST as treePost } from './tree/route';
import { POST as tagsPost } from './tags/route';
import { POST as eraColor } from './eras/color/route';

// Space A = 1 (curated by curA), space B = 2 (curated by curB).
const A = 1;
const B = 2;
const ORIGIN = 'http://localhost:3021';
const post = (path: string, body: unknown): NextRequest =>
  new NextRequest(`${ORIGIN}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const get = (path: string): NextRequest => new NextRequest(`${ORIGIN}${path}`);
const as = (uid: string | null): void => { h.user = uid ? { id: uid } : null; };
const called = (fn: string): Array<{ fn: string; args: unknown[] }> => h.calls.filter((c) => c.fn === fn);

beforeEach(() => {
  h.user = null;
  h.curates = { curA: [A], curB: [B] };
  h.roleChecks = [];
  h.calls = [];
  h.updates = [];
  h.rows = {
    // pages 10, 11 in A; 20, 21 in B.
    pages: [{ id: 10, space_id: A }, { id: 11, space_id: A }, { id: 20, space_id: B }, { id: 21, space_id: B }],
    space_tags: [{ id: 100, space_id: A }, { id: 101, space_id: A }, { id: 200, space_id: B }, { id: 201, space_id: B }],
    eras: [{ id: 7, group_id: A }, { id: 8, group_id: B }],
    idols: [{ id: 50, group_id: A }, { id: 60, group_id: B }],
    albums: [{ id: 70, group_id: A }, { id: 80, group_id: B }],
    album_tracks: [{ id: 90, album_id: 80 }],
    awards: [{ id: 95, group_id: null, idol_id: 60 }],
  };
});

// ------------------------------------------------------------------ /api/verse/tree
const PAGE_ACTIONS: Array<[string, (pageId: number) => Row, string]> = [
  ['save', (p) => ({ action: 'save', page_id: p, title: 'T', blocks: { version: 1, blocks: [] } }), 'savePage'],
  ['rename', (p) => ({ action: 'rename', page_id: p, title: 'New title' }), 'renamePage'],
  ['move', (p) => ({ action: 'move', page_id: p, parent_id: null }), 'movePage'],
  ['publish', (p) => ({ action: 'publish', page_id: p }), 'publishPage'],
  ['trash', (p) => ({ action: 'trash', page_id: p }), 'trashPage'],
  ['restore', (p) => ({ action: 'restore', page_id: p }), 'restorePage'],
  ['revert', (p) => ({ action: 'revert', page_id: p, rev: 1 }), 'revertToRevision'],
];

describe('POST /api/verse/tree: every page action is checked on the space of the page row', () => {
  it.each(PAGE_ACTIONS)('%s: a curator of another space is refused, naming its own space or the page space', async (_n, body, fn) => {
    as('curA');
    // the live flaw: curA names its own space A and sends a page of B.
    const own = await treePost(post('/api/verse/tree', { group_id: A, ...body(20) }));
    expect(own.status).toBe(403);
    // naming B itself: curA does not curate B.
    const named = await treePost(post('/api/verse/tree', { group_id: B, ...body(20) }));
    expect(named.status).toBe(403);
    // a page that does not exist is the same 403.
    const missing = await treePost(post('/api/verse/tree', { group_id: A, ...body(999) }));
    expect(missing.status).toBe(403);
    expect(called(fn)).toEqual([]);
    expect(h.roleChecks.every(([, gid]) => gid !== A)).toBe(true);   // never authorised on the space it named
  });

  it.each(PAGE_ACTIONS)('%s: a curator of the page space is accepted, and the role is checked on that space', async (_n, body, fn) => {
    as('curB');
    const res = await treePost(post('/api/verse/tree', { group_id: B, ...body(20) }));
    expect(res.status).toBe(200);
    expect(called(fn)).toHaveLength(1);
    expect(called(fn)[0]!.args[1]).toBe(20);
    expect(h.roleChecks).toEqual([['curB', B]]);
  });

  it('a page action with no page id is a 400 for a curator, a 403 for anyone else', async () => {
    as('curA');
    expect((await treePost(post('/api/verse/tree', { group_id: A, action: 'save' }))).status).toBe(400);
    as('curB');
    expect((await treePost(post('/api/verse/tree', { group_id: A, action: 'save' }))).status).toBe(403);
    as(null);
    expect((await treePost(post('/api/verse/tree', { group_id: B, action: 'publish', page_id: 20 }))).status).toBe(403);
    expect(h.calls).toEqual([]);
  });

  it('move: the new parent must exist and be in the same space', async () => {
    as('curB');
    expect((await treePost(post('/api/verse/tree', { group_id: B, action: 'move', page_id: 20, parent_id: 10 }))).status).toBe(403);
    expect((await treePost(post('/api/verse/tree', { group_id: B, action: 'move', page_id: 20, parent_id: 999 }))).status).toBe(403);
    expect(called('movePage')).toEqual([]);
    const ok = await treePost(post('/api/verse/tree', { group_id: B, action: 'move', page_id: 20, parent_id: 21 }));
    expect(ok.status).toBe(200);
    expect(called('movePage').map((c) => c.args.slice(1))).toEqual([[20, 21]]);
    const root = await treePost(post('/api/verse/tree', { group_id: B, action: 'move', page_id: 20, parent_id: null }));
    expect(root.status).toBe(200);
    expect(called('movePage')[1]!.args.slice(1)).toEqual([20, null]);
  });

  it('create: a curator of another space is refused; the parent and the bound entity must be in the space', async () => {
    as('curA');
    expect((await treePost(post('/api/verse/tree', { group_id: B, action: 'create', type: 'article', title: 'X' }))).status).toBe(403);
    expect((await treePost(post('/api/verse/tree', { group_id: A, action: 'create', type: 'article', title: 'X', parent_id: 20 }))).status).toBe(403);
    expect((await treePost(post('/api/verse/tree', { group_id: A, action: 'create', type: 'article', title: 'X', parent_id: 999 }))).status).toBe(403);
    expect((await treePost(post('/api/verse/tree', { group_id: A, action: 'create', type: 'member', title: 'X', entity_kind: 'idol', entity_id: 60 }))).status).toBe(403);
    expect((await treePost(post('/api/verse/tree', { group_id: A, action: 'create', type: 'track', title: 'X', entity_kind: 'track', entity_id: 90 }))).status).toBe(403);
    expect((await treePost(post('/api/verse/tree', { group_id: A, action: 'create', type: 'award', title: 'X', entity_kind: 'award', entity_id: 95 }))).status).toBe(403);
    expect((await treePost(post('/api/verse/tree', { group_id: A, action: 'create', type: 'member', title: 'X', entity_kind: 'unknown', entity_id: 50 }))).status).toBe(403);
    expect(called('createPage')).toEqual([]);
  });

  it('create: a curator of the space is accepted with a parent and an entity of that space', async () => {
    as('curA');
    const res = await treePost(post('/api/verse/tree', { group_id: A, action: 'create', type: 'member', title: 'X', parent_id: 11, entity_kind: 'idol', entity_id: 50 }));
    expect(res.status).toBe(200);
    expect(called('createPage')).toHaveLength(1);
    expect(called('createPage')[0]!.args[1]).toMatchObject({ spaceId: A, parentId: 11, entityKind: 'idol', entityId: 50 });
    as('curB');
    const track = await treePost(post('/api/verse/tree', { group_id: B, action: 'create', type: 'track', title: 'Y', entity_kind: 'track', entity_id: 90 }));
    expect(track.status).toBe(200);
    const award = await treePost(post('/api/verse/tree', { group_id: B, action: 'create', type: 'award', title: 'Z', entity_kind: 'award', entity_id: 95 }));
    expect(award.status).toBe(200);
  });
});

describe('GET /api/verse/tree?kind=revisions: a page history is read on the space of the page row', () => {
  it('a curator of another space is refused', async () => {
    as('curA');
    expect((await treeGet(get(`/api/verse/tree?group_id=${A}&kind=revisions&page_id=20`))).status).toBe(403);
    expect((await treeGet(get(`/api/verse/tree?group_id=${B}&kind=revisions&page_id=20`))).status).toBe(403);
    expect((await treeGet(get(`/api/verse/tree?group_id=${A}&kind=revisions&page_id=999`))).status).toBe(403);
    expect(called('listRevisions')).toEqual([]);
  });

  it('a curator of the page space is accepted', async () => {
    as('curB');
    const res = await treeGet(get(`/api/verse/tree?group_id=${B}&kind=revisions&page_id=20`));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revisions: [{ rev: 1 }] });
    expect(called('listRevisions')[0]!.args[1]).toBe(20);
    expect(h.roleChecks).toEqual([['curB', B]]);
  });
});

// ------------------------------------------------------------------ /api/verse/tags
describe('POST /api/verse/tags: the page and the tag must both be in the verified space', () => {
  const PAIR: Array<[string, string]> = [['attach', 'attachTag'], ['detach', 'detachTag']];

  it.each(PAIR)('%s: a curator of another space is refused', async (action, fn) => {
    as('curA');
    for (const body of [
      { group_id: A, action, page_id: 20, tag_id: 200 },   // both rows of B, naming A
      { group_id: A, action, page_id: 10, tag_id: 200 },   // the tag of B
      { group_id: A, action, page_id: 20, tag_id: 100 },   // the page of B
      { group_id: B, action, page_id: 20, tag_id: 200 },   // naming B
      { group_id: A, action, page_id: 999, tag_id: 100 },  // a missing page
    ]) expect((await tagsPost(post('/api/verse/tags', body))).status).toBe(403);
    expect(called(fn)).toEqual([]);
  });

  it.each(PAIR)('%s: a curator of the space is accepted', async (action, fn) => {
    as('curB');
    const res = await tagsPost(post('/api/verse/tags', { group_id: B, action, page_id: 20, tag_id: 200 }));
    expect(res.status).toBe(200);
    expect(called(fn).map((c) => c.args.slice(1))).toEqual([[20, 200]]);
  });

  it('merge: a curator of another space is refused', async () => {
    as('curA');
    for (const body of [
      { group_id: A, action: 'merge', from_id: 200, into_id: 201 },
      { group_id: A, action: 'merge', from_id: 100, into_id: 200 },
      { group_id: A, action: 'merge', from_id: 200, into_id: 100 },
      { group_id: B, action: 'merge', from_id: 200, into_id: 201 },
    ]) expect((await tagsPost(post('/api/verse/tags', body))).status).toBe(403);
    expect(called('mergeTags')).toEqual([]);
  });

  it('merge: a curator of the space is accepted', async () => {
    as('curB');
    expect((await tagsPost(post('/api/verse/tags', { group_id: B, action: 'merge', from_id: 200, into_id: 201 }))).status).toBe(200);
    expect(called('mergeTags').map((c) => c.args.slice(1))).toEqual([[200, 201]]);
  });

  it('rename: a curator of another space is refused', async () => {
    as('curA');
    expect((await tagsPost(post('/api/verse/tags', { group_id: A, action: 'rename', tag_id: 200, label: 'x' }))).status).toBe(403);
    expect((await tagsPost(post('/api/verse/tags', { group_id: B, action: 'rename', tag_id: 200, label: 'x' }))).status).toBe(403);
    expect(called('renameTag')).toEqual([]);
  });

  it('rename: a curator of the space is accepted', async () => {
    as('curB');
    expect((await tagsPost(post('/api/verse/tags', { group_id: B, action: 'rename', tag_id: 200, label: 'x' }))).status).toBe(200);
    expect(called('renameTag').map((c) => c.args.slice(1, 3))).toEqual([[200, 'x']]);
  });
});

// ------------------------------------------------------------------ /api/verse/eras/color
describe('POST /api/verse/eras/color: the era is read first, its space decides', () => {
  it('a curator of another space is refused and nothing is written', async () => {
    as('curA');
    expect((await eraColor(post('/api/verse/eras/color', { group_id: A, era_id: 8, color: '#7a3cff' }))).status).toBe(403);
    expect((await eraColor(post('/api/verse/eras/color', { group_id: B, era_id: 8, color: '#7a3cff' }))).status).toBe(403);
    expect((await eraColor(post('/api/verse/eras/color', { group_id: A, era_id: 999, color: '#7a3cff' }))).status).toBe(403);
    expect(h.updates).toEqual([]);
  });

  it('a curator of the era space is accepted', async () => {
    as('curB');
    const res = await eraColor(post('/api/verse/eras/color', { group_id: B, era_id: 8, color: '#7a3cff' }));
    expect(res.status).toBe(200);
    expect(h.updates).toEqual([{ table: 'eras', patch: { color: '#7a3cff' }, filters: [['id', 8], ['group_id', B]] }]);
    expect(h.roleChecks).toEqual([['curB', B]]);
  });
});

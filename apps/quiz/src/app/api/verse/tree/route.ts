import { NextResponse } from 'next/server';

import { verseWriteGate } from '@/lib/verse/api-gate';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import {
  createPage, savePage, renamePage, movePage, publishPage, trashPage, restorePage,
  revertToRevision, listRevisions, recentChanges,
} from '@/lib/verse/tree/data';
import { wantedPages, orphanPages } from '@/lib/verse/tree/links';
import { entitySpaceId, pageInSpace, rowId } from '@/lib/verse/tree/ownership';

import type { NextRequest } from 'next/server';
import type { PageBody } from '@/lib/verse/tree/types';

// V-FOUNDATION F1 Phase B - the curator-gated CRUD API for the page tree. Curators +
// admin write (C4/FQ1); everyone else 403. Every write runs through the service role
// (lib/verse/tree/data), which appends history (C3), writes redirects on rename (C2),
// and never hard-deletes (trash only, C3). Reads here are the curator surfaces
// (recent-changes, revision history); public page reads happen server-side in Phase C.
//
// FLAW-1 (integrator fix, 2026-11-12): the group_id a caller sends only NAMES a space; it is never the
// authority for a page. Every action that carries a page_id reads the page first, takes its space from the
// row, and checks the caller's curator role on THAT space. A page that does not exist, or that lives in
// another space than the one named, is a 403 (the same answer as a caller who curates nothing, so the
// reply never tells which ids exist elsewhere). A parent (create, move) and a bound entity (create) must be
// in the same space too.
export const dynamic = 'force-dynamic';

const FORBIDDEN = (): NextResponse => NextResponse.json({ error: 'Not authorized' }, { status: 403 });
const PAGE_ACTIONS = new Set(['save', 'rename', 'move', 'publish', 'trash', 'restore', 'revert']);

type Svc = ReturnType<typeof createServiceRoleClient>;

/** The caller's uid and the space it acts on, or the 400 / 403 to send. `spaceOf` (a page action) reads
 * the row the request names and returns its space, or null when the row is missing or in another space. */
async function gate(groupId: number, spaceOf?: () => Promise<number | null>): Promise<{ uid: string; spaceId: number } | { error: NextResponse }> {
  if (!groupId) return { error: NextResponse.json({ error: 'A space is required.' }, { status: 400 }) };
  const c = await createServerClient();
  const { data: { user } } = await c.auth.getUser();
  if (!user) return { error: FORBIDDEN() };
  const spaceId = spaceOf ? await spaceOf() : groupId;
  if (spaceId === null || !(await canCurateSpace(user.id, spaceId))) return { error: FORBIDDEN() };
  return { uid: user.id, spaceId };
}

/** The space of the page `pageId` when it lives in the space the caller named; null otherwise. */
const pageSpace = (svc: Svc, pageId: number, groupId: number) => async (): Promise<number | null> =>
  (await pageInSpace(svc, pageId, groupId))?.space_id ?? null;

// GET ?group_id=N&kind=recent            -> recent-changes feed (C3)
//     ?group_id=N&kind=revisions&page_id=P -> a page's revision history
export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const groupId = Number(url.searchParams.get('group_id') ?? 0);
  const svc = createServiceRoleClient();
  const kind = url.searchParams.get('kind') ?? 'recent';
  const pageId = rowId(url.searchParams.get('page_id'));
  // a page's history is that page's: the role is checked on the space of the page row.
  const onPage = kind === 'revisions' && pageId !== null;
  const g = await gate(groupId, onPage ? pageSpace(svc, pageId, groupId) : undefined);
  if ('error' in g) return g.error;
  if (kind === 'revisions') {
    if (!onPage) return NextResponse.json({ error: 'page_id required' }, { status: 400 });
    return NextResponse.json({ revisions: await listRevisions(svc, pageId) });
  }
  if (kind === 'search') {
    // search-first typeahead for the create dialog (no silent duplicates, C6).
    const q = (url.searchParams.get('q') ?? '').trim();
    if (q.length < 1) return NextResponse.json({ results: [] });
    const { data } = await svc.from('pages').select('id, slug, title, type')
      .eq('space_id', groupId).neq('status', 'trash').neq('type', 'portal')
      .ilike('title', `%${q}%`).order('title').limit(8);
    return NextResponse.json({ results: (data as { id: number; slug: string; title: string; type: string }[] | null) ?? [] });
  }
  if (kind === 'wanted') return NextResponse.json({ wanted: await wantedPages(svc, groupId, 50) });
  if (kind === 'orphans') return NextResponse.json({ orphans: await orphanPages(svc, groupId, 100) });
  return NextResponse.json({ changes: await recentChanges(svc, groupId, 50) });
}

// POST { group_id, action, ... } - all writes. Action set:
//   create  { type, title, parent_id?, entity_kind?, entity_id?, slug? }
//   save    { page_id, title?, blocks? }
//   rename  { page_id, title }
//   move    { page_id, parent_id }        (parent_id null = move to root)
//   publish|trash|restore { page_id }
//   revert  { page_id, rev }
export async function POST(req: NextRequest): Promise<NextResponse> {
  const gated = await verseWriteGate(req);
  if (gated) return gated;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const groupId = Number(body.group_id ?? 0);
  const svc = createServiceRoleClient();
  const action = String(body.action ?? '');
  const id = rowId(body.page_id);
  const onPage = PAGE_ACTIONS.has(action) && id !== null;
  const g = await gate(groupId, onPage ? pageSpace(svc, id, groupId) : undefined);
  if ('error' in g) return g.error;
  if (PAGE_ACTIONS.has(action) && !onPage) return NextResponse.json({ error: 'page_id required' }, { status: 400 });
  const pageId = id ?? 0;

  switch (action) {
    case 'create': {
      // the parent and the bound entity are read too: both must belong to the space the page is born in.
      const parent = body.parent_id != null ? await pageInSpace(svc, body.parent_id, g.spaceId) : null;
      if (body.parent_id != null && !parent) return FORBIDDEN();
      const bound = body.entity_kind != null || body.entity_id != null;
      if (bound && (await entitySpaceId(svc, body.entity_kind, body.entity_id)) !== g.spaceId) return FORBIDDEN();
      const input: Parameters<typeof createPage>[1] = {
        spaceId: g.spaceId, type: String(body.type ?? ''), title: String(body.title ?? ''), createdBy: g.uid,
        parentId: parent ? parent.id : null,
        entityKind: bound ? String(body.entity_kind) : null,
        entityId: bound ? rowId(body.entity_id) : null,
      };
      if (body.slug != null) input.slug = String(body.slug);
      const res = await createPage(svc, input);
      if (res.duplicate) return NextResponse.json({ duplicate: res.duplicate }, { status: 409 });
      if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ page: res.page });
    }
    case 'save': {
      const patch: { title?: string; blocks?: PageBody } = {};
      if (body.title != null) patch.title = String(body.title);
      if (body.blocks != null) patch.blocks = body.blocks as PageBody;
      const res = await savePage(svc, pageId, patch, g.uid);
      return res.error ? NextResponse.json({ error: res.error }, { status: 400 }) : NextResponse.json({ page: res.page });
    }
    case 'rename': {
      const res = await renamePage(svc, pageId, String(body.title ?? ''), g.uid);
      return res.error ? NextResponse.json({ error: res.error }, { status: 400 }) : NextResponse.json({ page: res.page, redirected: res.redirected });
    }
    case 'move': {
      // the new parent (null = the root) must exist and live in the page's own space.
      const parent = body.parent_id != null ? await pageInSpace(svc, body.parent_id, g.spaceId) : null;
      if (body.parent_id != null && !parent) return FORBIDDEN();
      const res = await movePage(svc, pageId, parent ? parent.id : null);
      return res.error ? NextResponse.json({ error: res.error }, { status: 400 }) : NextResponse.json({ page: res.page });
    }
    case 'publish': { const r = await publishPage(svc, pageId); return r.error ? NextResponse.json({ error: r.error }, { status: 400 }) : NextResponse.json({ page: r.page }); }
    case 'trash':   { const r = await trashPage(svc, pageId);   return r.error ? NextResponse.json({ error: r.error }, { status: 400 }) : NextResponse.json({ page: r.page }); }
    case 'restore': { const r = await restorePage(svc, pageId); return r.error ? NextResponse.json({ error: r.error }, { status: 400 }) : NextResponse.json({ page: r.page }); }
    case 'revert': {
      const res = await revertToRevision(svc, pageId, Number(body.rev ?? 0), g.uid);
      return res.error ? NextResponse.json({ error: res.error }, { status: 400 }) : NextResponse.json({ page: res.page });
    }
    default:
      return NextResponse.json({ error: `Unknown action "${action}".` }, { status: 400 });
  }
}

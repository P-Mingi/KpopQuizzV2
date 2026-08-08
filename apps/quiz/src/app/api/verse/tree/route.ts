import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import {
  createPage, savePage, renamePage, movePage, publishPage, trashPage, restorePage,
  revertToRevision, listRevisions, recentChanges,
} from '@/lib/verse/tree/data';

import type { NextRequest } from 'next/server';
import type { PageBody } from '@/lib/verse/tree/types';

// V-FOUNDATION F1 Phase B - the curator-gated CRUD API for the page tree. Curators +
// admin write (C4/FQ1); everyone else 403. Every write runs through the service role
// (lib/verse/tree/data), which appends history (C3), writes redirects on rename (C2),
// and never hard-deletes (trash only, C3). Reads here are the curator surfaces
// (recent-changes, revision history); public page reads happen server-side in Phase C.
export const dynamic = 'force-dynamic';

async function gate(groupId: number): Promise<{ uid: string } | { error: NextResponse }> {
  if (!groupId) return { error: NextResponse.json({ error: 'A space is required.' }, { status: 400 }) };
  const c = await createServerClient();
  const { data: { user } } = await c.auth.getUser();
  if (!user || !(await canCurateSpace(user.id, groupId))) {
    return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) };
  }
  return { uid: user.id };
}

// GET ?group_id=N&kind=recent            -> recent-changes feed (C3)
//     ?group_id=N&kind=revisions&page_id=P -> a page's revision history
export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const groupId = Number(url.searchParams.get('group_id') ?? 0);
  const g = await gate(groupId);
  if ('error' in g) return g.error;
  const svc = createServiceRoleClient();
  const kind = url.searchParams.get('kind') ?? 'recent';
  if (kind === 'revisions') {
    const pageId = Number(url.searchParams.get('page_id') ?? 0);
    if (!pageId) return NextResponse.json({ error: 'page_id required' }, { status: 400 });
    return NextResponse.json({ revisions: await listRevisions(svc, pageId) });
  }
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
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const groupId = Number(body.group_id ?? 0);
  const g = await gate(groupId);
  if ('error' in g) return g.error;
  const svc = createServiceRoleClient();
  const action = String(body.action ?? '');
  const pageId = Number(body.page_id ?? 0);

  switch (action) {
    case 'create': {
      const input: Parameters<typeof createPage>[1] = {
        spaceId: groupId, type: String(body.type ?? ''), title: String(body.title ?? ''), createdBy: g.uid,
        parentId: body.parent_id != null ? Number(body.parent_id) : null,
        entityKind: body.entity_kind != null ? String(body.entity_kind) : null,
        entityId: body.entity_id != null ? Number(body.entity_id) : null,
      };
      if (body.slug != null) input.slug = String(body.slug);
      const res = await createPage(svc, input);
      if (res.duplicate) return NextResponse.json({ duplicate: res.duplicate }, { status: 409 });
      if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
      return NextResponse.json({ page: res.page });
    }
    case 'save': {
      if (!pageId) return NextResponse.json({ error: 'page_id required' }, { status: 400 });
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
      const res = await movePage(svc, pageId, body.parent_id != null ? Number(body.parent_id) : null);
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

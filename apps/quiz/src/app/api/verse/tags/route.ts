import { NextResponse } from 'next/server';

import { verseWriteGate } from '@/lib/verse/api-gate';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { ensureTag, listTags, attachTag, detachTag, mergeTags, renameTag } from '@/lib/verse/tree/tags';
import { pageInSpace, tagInSpace } from '@/lib/verse/tree/ownership';

import type { NextRequest } from 'next/server';

// V-FOUNDATION F1 Phase F - the controlled-tag API (C7). Curator+ writes. Creating a tag is
// an explicit act; merge/rename are curator tools (the pages follow automatically).
// FLAW-1 (integrator fix, 2026-11-12): the caller is checked on the space it names, and every page and
// tag id the request carries is read first and must live in THAT space. A missing row or a row of another
// space is a 403, so a curator of one space can never tag, untag, merge or rename in another.
export const dynamic = 'force-dynamic';

const FORBIDDEN = (): NextResponse => NextResponse.json({ error: 'Not authorized' }, { status: 403 });

async function gate(groupId: number): Promise<{ uid: string } | { error: NextResponse }> {
  if (!groupId) return { error: NextResponse.json({ error: 'A space is required.' }, { status: 400 }) };
  const c = await createServerClient();
  const { data: { user } } = await c.auth.getUser();
  if (!user || !(await canCurateSpace(user.id, groupId))) return { error: FORBIDDEN() };
  return { uid: user.id };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const groupId = Number(new URL(req.url).searchParams.get('group_id') ?? 0);
  const g = await gate(groupId);
  if ('error' in g) return g.error;
  return NextResponse.json({ tags: await listTags(createServiceRoleClient(), groupId) });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gated = await verseWriteGate(req);
  if (gated) return gated;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const groupId = Number(body.group_id ?? 0);
  const g = await gate(groupId);
  if ('error' in g) return g.error;
  const svc = createServiceRoleClient();
  const action = String(body.action ?? '');

  switch (action) {
    case 'create': {
      const label = String(body.label ?? '').trim();
      if (!label) return NextResponse.json({ error: 'A tag needs a label.' }, { status: 400 });
      const tag = await ensureTag(svc, groupId, label, 'manual', body.description != null ? String(body.description) : undefined);
      return tag ? NextResponse.json({ tag }) : NextResponse.json({ error: 'Could not create the tag.' }, { status: 500 });
    }
    case 'attach':
    case 'detach': {
      const page = await pageInSpace(svc, body.page_id, groupId);
      const tag = await tagInSpace(svc, body.tag_id, groupId);
      if (!page || !tag) return FORBIDDEN();
      await (action === 'attach' ? attachTag : detachTag)(svc, page.id, tag.id);
      return NextResponse.json({ ok: true });
    }
    case 'merge': {
      const from = await tagInSpace(svc, body.from_id, groupId);
      const into = await tagInSpace(svc, body.into_id, groupId);
      if (!from || !into) return FORBIDDEN();
      await mergeTags(svc, from.id, into.id);
      return NextResponse.json({ ok: true });
    }
    case 'rename': {
      const tag = await tagInSpace(svc, body.tag_id, groupId);
      if (!tag) return FORBIDDEN();
      const res = await renameTag(svc, tag.id, String(body.label ?? ''), body.description != null ? String(body.description) : undefined);
      return res.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: res.error }, { status: 400 });
    }
    default:
      return NextResponse.json({ error: `Unknown action "${action}".` }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { ensureTag, listTags, attachTag, detachTag, mergeTags, renameTag } from '@/lib/verse/tree/tags';

import type { NextRequest } from 'next/server';

// V-FOUNDATION F1 Phase F - the controlled-tag API (C7). Curator+ writes. Creating a tag is
// an explicit act; merge/rename are curator tools (the pages follow automatically).
export const dynamic = 'force-dynamic';

async function gate(groupId: number): Promise<{ uid: string } | { error: NextResponse }> {
  if (!groupId) return { error: NextResponse.json({ error: 'A space is required.' }, { status: 400 }) };
  const c = await createServerClient();
  const { data: { user } } = await c.auth.getUser();
  if (!user || !(await canCurateSpace(user.id, groupId))) return { error: NextResponse.json({ error: 'Not authorized' }, { status: 403 }) };
  return { uid: user.id };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const groupId = Number(new URL(req.url).searchParams.get('group_id') ?? 0);
  const g = await gate(groupId);
  if ('error' in g) return g.error;
  return NextResponse.json({ tags: await listTags(createServiceRoleClient(), groupId) });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
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
    case 'attach': { await attachTag(svc, Number(body.page_id), Number(body.tag_id)); return NextResponse.json({ ok: true }); }
    case 'detach': { await detachTag(svc, Number(body.page_id), Number(body.tag_id)); return NextResponse.json({ ok: true }); }
    case 'merge': { await mergeTags(svc, Number(body.from_id), Number(body.into_id)); return NextResponse.json({ ok: true }); }
    case 'rename': {
      const res = await renameTag(svc, Number(body.tag_id), String(body.label ?? ''), body.description != null ? String(body.description) : undefined);
      return res.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: res.error }, { status: 400 });
    }
    default:
      return NextResponse.json({ error: `Unknown action "${action}".` }, { status: 400 });
  }
}

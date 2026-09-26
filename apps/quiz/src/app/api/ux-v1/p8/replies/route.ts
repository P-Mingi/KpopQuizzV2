import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { tableLive } from '@/lib/ux-v1/p8/features';
import { checkReply, hasLink } from '@/lib/ux-v1/p8/validate';
import { checkText, isBlockedInSpace, isTrusted, underRateCap } from '@/lib/verse/moderation';

import type { NextRequest } from 'next/server';

// POST /api/ux-v1/p8/replies { target_type: 'debate'|'challenge', target_id, body,
// parent_id? }: a reply on a fan debate or a challenge post (threads and blogs keep
// the existing /api/verse/discussions). One level of nesting: a parent must be a
// top-level reply of the same post. NEW store community_replies (pending migration
// v11-p8-community.sql): 503 not_live before any write until it exists. Guards as
// verse comments: rate cap 5 a minute, new accounts post no links, banned terms.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const c = checkReply(body);
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400 });

  try {
    if (!(await tableLive('community_replies'))) return NextResponse.json({ error: 'not_live' }, { status: 503 });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const r = c.value;
  const svc = createServiceRoleClient();
  const table = r.type === 'debate' ? 'community_debates' : 'community_challenges';
  const { data: t } = await svc.from(table).select('id, group_id, status').eq('id', r.targetId).maybeSingle();
  const target = t as { id: number; group_id: number | null; status: string } | null;
  if (!target || target.status !== 'visible') return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (target.group_id !== null && await isBlockedInSpace(user.id, target.group_id)) return NextResponse.json({ error: 'blocked' }, { status: 403 });
  if (r.parentId !== null) {
    const { data: p } = await svc.from('community_replies').select('id, target_type, target_id, parent_id, status').eq('id', r.parentId).maybeSingle();
    const parent = p as { id: number; target_type: string; target_id: number; parent_id: number | null; status: string } | null;
    if (!parent || parent.status !== 'visible' || parent.parent_id !== null || parent.target_type !== r.type || parent.target_id !== r.targetId) {
      return NextResponse.json({ error: 'bad_parent' }, { status: 400 });
    }
  }
  if (!await underRateCap('community_replies', 'author', user.id, 60, 5)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  if (hasLink(r.body) && !isTrusted((user as { created_at?: string }).created_at ?? null)) return NextResponse.json({ error: 'new_account_no_links' }, { status: 422 });
  const hit = await checkText(r.body);
  if (hit?.action === 'block') return NextResponse.json({ error: 'blocked_term' }, { status: 422 });

  const { data, error } = await svc.from('community_replies')
    .insert({ target_type: r.type, target_id: r.targetId, parent_id: r.parentId, author: user.id, body: r.body, status: 'visible' })
    .select('id').single();
  if (error) return NextResponse.json({ error: 'post_failed' }, { status: 500 });
  return NextResponse.json({ ok: true, id: (data as { id: number }).id });
}

import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { tableLive } from '@/lib/ux-v1/p8/features';
import { checkDebate, hasLink } from '@/lib/ux-v1/p8/validate';
import { checkText, isBlockedInSpace, isTrusted, underRateCap } from '@/lib/verse/moderation';

import type { NextRequest } from 'next/server';

// POST /api/ux-v1/p8/debates { group_id, question, body?, options[2..4], days 1|3|7 }
// A fan debate (DESIGN-SPEC 13.2 DEBATE). NEW store community_debates (pending
// migration v11-p8-community.sql): 503 not_live before any write until it exists.
// Same guards as a verse thread: signed in, rate cap (5 an hour), new accounts post
// no links, banned terms block, a fan blocked in the group's space cannot post there.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const c = checkDebate(body);
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400 });

  try {
    if (!(await tableLive('community_debates'))) return NextResponse.json({ error: 'not_live' }, { status: 503 });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const d = c.value;
  const svc = createServiceRoleClient();
  if (d.groupId !== null) {
    const { data: g } = await svc.from('groups').select('id').eq('id', d.groupId).maybeSingle();
    if (!g) return NextResponse.json({ error: 'bad_group' }, { status: 400 });
    if (await isBlockedInSpace(user.id, d.groupId)) return NextResponse.json({ error: 'blocked' }, { status: 403 });
  }
  if (!await underRateCap('community_debates', 'author', user.id, 3600, 5)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const text = [d.question, d.body ?? '', ...d.options].join('\n');
  if (hasLink(text) && !isTrusted((user as { created_at?: string }).created_at ?? null)) return NextResponse.json({ error: 'new_account_no_links' }, { status: 422 });
  const hit = await checkText(text);
  if (hit?.action === 'block') return NextResponse.json({ error: 'blocked_term' }, { status: 422 });

  const closesAt = new Date(Date.now() + d.days * 24 * 3600_000).toISOString();
  const { data, error } = await svc.from('community_debates')
    .insert({ group_id: d.groupId, author: user.id, question: d.question, body: d.body, options: d.options, closes_at: closesAt, status: 'visible' })
    .select('id').single();
  if (error) return NextResponse.json({ error: 'post_failed' }, { status: 500 });
  return NextResponse.json({ ok: true, id: (data as { id: number }).id });
}

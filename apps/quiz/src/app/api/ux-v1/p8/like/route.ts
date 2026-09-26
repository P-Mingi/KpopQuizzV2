import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { tableLive } from '@/lib/ux-v1/p8/features';
import { checkLike } from '@/lib/ux-v1/p8/validate';

import type { LikeTargetType } from '@/lib/ux-v1/p8/validate';
import type { NextRequest } from 'next/server';

// POST /api/ux-v1/p8/like { target_type, target_id }: toggles the fan's heart on a
// community post or reply (DESIGN-SPEC 17.7: heart + count, pink when liked). NEW
// behaviour, so a new route on a NEW table (community_likes, pending migration
// v11-p8-community.sql): until it exists the route answers 503 not_live BEFORE any
// write. Blog hearts keep the existing /api/verse/essays/reactions. One heart per fan
// per target (primary key). Returns { count, mine }.
export const dynamic = 'force-dynamic';

type Svc = ReturnType<typeof createServiceRoleClient>;

/** The target must exist and be public (no heart on a hidden or unknown row). */
async function targetVisible(svc: Svc, type: LikeTargetType, id: string): Promise<boolean> {
  const one = async (q: PromiseLike<{ data: unknown; error: unknown }>): Promise<boolean> => { const r = await q; return !r.error && !!r.data; };
  switch (type) {
    case 'thread': return one(svc.from('verse_threads').select('id').eq('id', Number(id)).eq('status', 'visible').maybeSingle());
    case 'comment': return one(svc.from('verse_discussions').select('id').eq('id', Number(id)).eq('status', 'visible').maybeSingle());
    case 'daily_debate': return one(svc.from('daily_debates').select('date').eq('date', id).maybeSingle());
    case 'debate_vote': return one(svc.from('debate_votes').select('id').eq('id', id).not('comment', 'is', null).maybeSingle());
    case 'debate': return one(svc.from('community_debates').select('id').eq('id', Number(id)).eq('status', 'visible').maybeSingle());
    case 'challenge': return one(svc.from('community_challenges').select('id').eq('id', Number(id)).eq('status', 'visible').maybeSingle());
    case 'reply': return one(svc.from('community_replies').select('id').eq('id', Number(id)).eq('status', 'visible').maybeSingle());
    default: return false;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const c = checkLike(body);
  if (!c.ok) return NextResponse.json({ error: c.error }, { status: 400 });

  try {
    if (!(await tableLive('community_likes'))) return NextResponse.json({ error: 'not_live' }, { status: 503 });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const svc = createServiceRoleClient();
  const { type, id } = c.value;
  if (!(await targetVisible(svc, type, id))) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const { data: mine } = await svc.from('community_likes').select('user_id').eq('target_type', type).eq('target_id', id).eq('user_id', user.id).maybeSingle();
  if (mine) {
    const { error } = await svc.from('community_likes').delete().eq('target_type', type).eq('target_id', id).eq('user_id', user.id);
    if (error) return NextResponse.json({ error: 'like_failed' }, { status: 500 });
  } else {
    const { error } = await svc.from('community_likes').upsert({ target_type: type, target_id: id, user_id: user.id }, { onConflict: 'target_type,target_id,user_id', ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: 'like_failed' }, { status: 500 });
  }
  const { count } = await svc.from('community_likes').select('user_id', { count: 'exact' }).eq('target_type', type).eq('target_id', id).limit(1);
  return NextResponse.json({ ok: true, count: count ?? 0, mine: !mine });
}

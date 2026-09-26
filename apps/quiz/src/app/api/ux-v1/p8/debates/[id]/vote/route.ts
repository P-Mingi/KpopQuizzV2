import { NextResponse } from 'next/server';

import { fetchAllRows } from '@/lib/db/fetch-all';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { UX_V1 } from '@/lib/ux-v1';
import { tableLive } from '@/lib/ux-v1/p8/features';
import { checkVote } from '@/lib/ux-v1/p8/validate';

import type { NextRequest } from 'next/server';

// POST /api/ux-v1/p8/debates/<id>/vote { option_index }: one vote per fan on a fan
// debate (community_debate_votes primary key; a second vote is ignored, never
// overwritten), only while the debate is open. Pending store: 503 not_live before
// any write. Returns the fresh counts (the results show after voting, 13.2).
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  if (!UX_V1) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { id: raw } = await ctx.params;
  const id = Number(raw);
  if (!/^\d{1,12}$/.test(raw) || !Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  try {
    if (!(await tableLive('community_debate_votes'))) return NextResponse.json({ error: 'not_live' }, { status: 503 });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const svc = createServiceRoleClient();
  const { data: d } = await svc.from('community_debates').select('id, options, closes_at, status').eq('id', id).maybeSingle();
  const debate = d as { id: number; options: unknown; closes_at: string; status: string } | null;
  if (!debate || debate.status !== 'visible') return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (Date.parse(debate.closes_at) <= Date.now()) return NextResponse.json({ error: 'closed' }, { status: 409 });
  const n = Array.isArray(debate.options) ? Math.min(4, debate.options.length) : 0;
  const v = checkVote(body, n);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });

  const { error } = await svc.from('community_debate_votes')
    .upsert({ debate_id: id, user_id: user.id, option_index: v.value }, { onConflict: 'debate_id,user_id', ignoreDuplicates: true });
  if (error) return NextResponse.json({ error: 'vote_failed' }, { status: 500 });

  const votes = await fetchAllRows<{ option_index: number; user_id: string }>(() => svc.from('community_debate_votes').select('option_index, user_id').eq('debate_id', id));
  const counts = Array.from({ length: n }, (_x, i) => votes.filter((r) => r.option_index === i).length);
  const mine = votes.find((r) => r.user_id === user.id)?.option_index ?? null;
  return NextResponse.json({ ok: true, counts, mine });
}

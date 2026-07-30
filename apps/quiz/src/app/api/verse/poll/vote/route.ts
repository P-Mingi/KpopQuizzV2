import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// W-CUSTOM step 5 - cast one real vote on a space poll. Auth required; the UNIQUE
// (poll_id, user_id) constraint enforces one vote per user. Returns fresh tallies.
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const pollId = Number(body.poll_id);
  const optionIndex = Number(body.option_index);
  if (!pollId || !Number.isInteger(optionIndex) || optionIndex < 0) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const svc = createServiceRoleClient();
  // Poll must exist, be open, not expired; option_index in range.
  const { data: poll } = await svc.from('space_polls').select('id, status, expires_at, options').eq('id', pollId).maybeSingle();
  if (!poll) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const p = poll as { status: string; expires_at: string | null; options: unknown[] };
  if (p.status !== 'open' || (p.expires_at && new Date(p.expires_at).getTime() < Date.now())) return NextResponse.json({ error: 'closed' }, { status: 409 });
  if (optionIndex >= (Array.isArray(p.options) ? p.options.length : 0)) return NextResponse.json({ error: 'bad_option' }, { status: 400 });

  // One vote per user (insert; ignore on conflict so a re-vote does not overwrite).
  await svc.from('space_poll_votes').upsert({ poll_id: pollId, user_id: user.id, option_index: optionIndex }, { onConflict: 'poll_id,user_id', ignoreDuplicates: true });

  const { data: votes } = await svc.from('space_poll_votes').select('option_index').eq('poll_id', pollId);
  const rows = (votes ?? []) as { option_index: number }[];
  const counts = (Array.isArray(p.options) ? p.options : []).map((_o, i) => rows.filter((v) => v.option_index === i).length);
  return NextResponse.json({ ok: true, counts, total: rows.length });
}

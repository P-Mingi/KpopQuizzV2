import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { currentSpaceRole, roleAtLeast, canCurateSpace } from '@/lib/verse/roles';

import type { NextRequest } from 'next/server';

// V-COMM-3 step 4 - the per-space cross-space-feed opt-in control (curator+).
// GET reports the current flag + whether the viewer may manage it; PATCH flips it.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const groupId = Number(new URL(req.url).searchParams.get('group_id'));
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const { role } = await currentSpaceRole(groupId);
  const svc = createServiceRoleClient();
  const { data } = await svc.from('verse_spaces').select('feed_opt_in').eq('group_id', groupId).maybeSingle();
  return NextResponse.json({ optIn: !!(data as { feed_opt_in: boolean } | null)?.feed_opt_in, canManage: roleAtLeast(role, 'curator') });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const groupId = Number(body.group_id);
  if (!groupId || typeof body.opt_in !== 'boolean') return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  if (!await canCurateSpace(user.id, groupId)) return NextResponse.json({ error: 'not_authorized' }, { status: 403 });

  const svc = createServiceRoleClient();
  const { error } = await svc.from('verse_spaces').update({ feed_opt_in: body.opt_in, updated_at: new Date().toISOString() }).eq('group_id', groupId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, optIn: body.opt_in });
}

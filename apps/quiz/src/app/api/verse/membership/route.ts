import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// W4.2 - join / leave a space, and read the caller's membership status. Auth required to
// write. A blocked member cannot rejoin. Roles above 'member' are granted by curators
// (W4.3), never self-assigned here.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const groupId = Number(new URL(req.url).searchParams.get('group_id'));
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false, member: false, role: 'visitor' });
  const svc = createServiceRoleClient();
  const [{ data }, { count }] = await Promise.all([
    svc.from('space_members').select('role, status').eq('group_id', groupId).eq('user_id', user.id).maybeSingle(),
    svc.from('space_members').select('*', { count: 'exact', head: true }).eq('group_id', groupId).eq('status', 'active'),
  ]);
  const row = data as { role: string; status: string } | null;
  return NextResponse.json({ signedIn: true, member: !!row && row.status === 'active', role: row?.status === 'active' ? row.role : 'visitor', blocked: row?.status === 'blocked', memberCount: count ?? undefined });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const groupId = Number(body.group_id);
  const action = String(body.action ?? '');
  if (!groupId || !['join', 'leave'].includes(action)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const svc = createServiceRoleClient();
  const { data: existing } = await svc.from('space_members').select('id, role, status').eq('group_id', groupId).eq('user_id', user.id).maybeSingle();
  const cur = existing as { id: number; role: string; status: string } | null;

  if (action === 'join') {
    if (cur?.status === 'blocked') return NextResponse.json({ error: 'blocked' }, { status: 403 });
    if (cur) {
      const { count } = await svc.from('space_members').select('*', { count: 'exact', head: true }).eq('group_id', groupId).eq('status', 'active');
      return NextResponse.json({ ok: true, member: true, role: cur.role, memberCount: count ?? undefined });
    }
    const { error } = await svc.from('space_members').insert({ group_id: groupId, user_id: user.id, role: 'member', status: 'active' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    {
      const { count } = await svc.from('space_members').select('*', { count: 'exact', head: true }).eq('group_id', groupId).eq('status', 'active');
      return NextResponse.json({ ok: true, member: true, role: 'member', memberCount: count ?? undefined });
    }
  }

  // leave: members leave freely; a curator/space_admin must be demoted by another admin first.
  if (cur && (cur.role === 'curator' || cur.role === 'space_admin')) {
    return NextResponse.json({ error: 'role_holder_cannot_leave' }, { status: 409 });
  }
  if (cur) await svc.from('space_members').delete().eq('id', cur.id);
  return NextResponse.json({ ok: true, member: false, role: 'visitor' });
}

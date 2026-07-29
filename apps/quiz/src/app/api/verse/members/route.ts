import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getSpaceRole, roleAtLeast } from '@/lib/verse/roles';

import type { SpaceRole } from '@/lib/verse/roles';
import type { NextRequest } from 'next/server';

// W4.3 - curator member management for a space: list (incl. blocked), set role, block,
// unblock. Only curators+ act; only space_admins (or global admins) may appoint or remove
// curators/space_admins. Service-role writes.
export const dynamic = 'force-dynamic';

async function actor(groupId: number): Promise<{ id: string; role: SpaceRole } | null> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  const role = await getSpaceRole(user.id, groupId);
  return roleAtLeast(role, 'curator') ? { id: user.id, role } : null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const groupId = Number(new URL(req.url).searchParams.get('group_id'));
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const me = await actor(groupId);
  if (!me) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const svc = createServiceRoleClient();
  const { data: rows } = await svc.from('space_members').select('user_id, role, status, joined_at').eq('group_id', groupId);
  const list = (rows ?? []) as Array<{ user_id: string; role: string; status: string; joined_at: string }>;
  const { data: profs } = await svc.from('profiles').select('id, username, display_name, avatar_url, avatar_bg, avatar_text').in('id', list.map((r) => r.user_id));
  const byId = new Map((profs ?? []).map((p: { id: string }) => [p.id, p]));
  return NextResponse.json({ members: list.map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null })) });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const groupId = Number(body.group_id);
  const targetId = String(body.target_user_id ?? '');
  const action = String(body.action ?? '');
  if (!groupId || !targetId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const me = await actor(groupId);
  if (!me) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  if (targetId === me.id) return NextResponse.json({ error: 'cannot_act_on_self' }, { status: 400 });

  const svc = createServiceRoleClient();
  const { data: cur } = await svc.from('space_members').select('id, role, status').eq('group_id', groupId).eq('user_id', targetId).maybeSingle();
  const target = cur as { id: number; role: SpaceRole; status: string } | null;

  const isSpaceAdmin = me.role === 'space_admin';

  if (action === 'set_role') {
    const role = String(body.role ?? '') as SpaceRole;
    if (!['member', 'contributor', 'curator', 'space_admin'].includes(role)) return NextResponse.json({ error: 'bad_role' }, { status: 400 });
    // Appointing or removing a curator/space_admin requires space_admin (or global admin).
    const touchesStaff = role === 'curator' || role === 'space_admin' || (target && (target.role === 'curator' || target.role === 'space_admin'));
    if (touchesStaff && !isSpaceAdmin) return NextResponse.json({ error: 'requires_space_admin' }, { status: 403 });
    if (!target) return NextResponse.json({ error: 'not_a_member' }, { status: 404 });
    await svc.from('space_members').update({ role, updated_at: new Date().toISOString() }).eq('id', target.id);
    return NextResponse.json({ ok: true, role });
  }

  if (action === 'block') {
    if (target && (target.role === 'curator' || target.role === 'space_admin') && !isSpaceAdmin) return NextResponse.json({ error: 'requires_space_admin' }, { status: 403 });
    const patch = { status: 'blocked', blocked_by: me.id, blocked_at: new Date().toISOString(), block_reason: body.reason ? String(body.reason).slice(0, 200) : null, updated_at: new Date().toISOString() };
    if (target) await svc.from('space_members').update(patch).eq('id', target.id);
    else await svc.from('space_members').insert({ group_id: groupId, user_id: targetId, role: 'member', ...patch });
    return NextResponse.json({ ok: true, status: 'blocked' });
  }

  if (action === 'unblock') {
    if (target) await svc.from('space_members').update({ status: 'active', blocked_by: null, blocked_at: null, block_reason: null, updated_at: new Date().toISOString() }).eq('id', target.id);
    return NextResponse.json({ ok: true, status: 'active' });
  }

  return NextResponse.json({ error: 'unknown_action' }, { status: 400 });
}

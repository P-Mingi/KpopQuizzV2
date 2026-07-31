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
  const u = new URL(req.url);
  const groupId = Number(u.searchParams.get('group_id'));
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const me = await actor(groupId);
  if (!me) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const svc = createServiceRoleClient();

  // V-ROLES step 4 - ?log=1: the ROLE LOG (who changed whom, when, why), read
  // from the verse_revisions rail (entity_type 'space_role': the same
  // free-text-entity pattern 139 used for space_presentation; no new table, the
  // one-migration budget stays unspent). Curators+ only, like the list.
  if (u.searchParams.get('log') === '1') {
    const { data: revs } = await svc.from('verse_revisions')
      .select('id, author, summary, content, created_at')
      .eq('entity_type', 'space_role').eq('entity_id', String(groupId)).eq('section_key', 'roles')
      .order('created_at', { ascending: false }).limit(100);
    const rows = (revs ?? []) as Array<{ id: number; author: string; summary: string | null; content: { target?: string; from?: string; to?: string; reason?: string }; created_at: string }>;
    const ids = [...new Set(rows.flatMap((r) => [r.author, r.content?.target ?? '']))].filter(Boolean);
    const { data: profs } = ids.length ? await svc.from('profiles').select('id, username, display_name').in('id', ids) : { data: [] };
    const nameById = new Map(((profs ?? []) as { id: string; username: string; display_name: string | null }[]).map((p) => [p.id, p.display_name ?? p.username]));
    return NextResponse.json({
      log: rows.map((r) => ({
        id: r.id, at: r.created_at,
        actor: nameById.get(r.author) ?? 'a curator',
        target: nameById.get(r.content?.target ?? '') ?? 'a member',
        from: r.content?.from ?? null, to: r.content?.to ?? null,
        reason: r.content?.reason ?? r.summary ?? '',
      })),
    });
  }

  const { data: rows } = await svc.from('space_members').select('user_id, role, status, joined_at, last_contrib_date, contrib_xp').eq('group_id', groupId);
  const list = (rows ?? []) as Array<{ user_id: string; role: string; status: string; joined_at: string; last_contrib_date: string | null; contrib_xp: number }>;
  const [{ data: profs }, { data: pending }] = await Promise.all([
    svc.from('profiles').select('id, username, display_name, avatar_url, avatar_bg, avatar_text').in('id', list.map((r) => r.user_id)),
    svc.from('verse_edit_suggestions').select('author').eq('status', 'pending').limit(500),
  ]);
  const byId = new Map((profs ?? []).map((p: { id: string }) => [p.id, p]));
  const pendingBy = new Map<string, number>();
  for (const s of (pending ?? []) as { author: string }[]) pendingBy.set(s.author, (pendingBy.get(s.author) ?? 0) + 1);
  return NextResponse.json({ members: list.map((r) => ({ ...r, profile: byId.get(r.user_id) ?? null, pending_suggestions: pendingBy.get(r.user_id) ?? 0 })) });
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
    // V-ROLES step 4: a role change carries a MANDATORY reason (the log is only
    // as honest as its entries).
    const reason = String(body.reason ?? '').trim();
    if (reason.length < 3) return NextResponse.json({ error: 'reason_required', message: 'Give a short reason for the role change.' }, { status: 400 });
    // Appointing or removing a curator/space_admin requires space_admin (or global admin).
    const touchesStaff = role === 'curator' || role === 'space_admin' || (target && (target.role === 'curator' || target.role === 'space_admin'));
    if (touchesStaff && !isSpaceAdmin) return NextResponse.json({ error: 'requires_space_admin' }, { status: 403 });
    if (!target) return NextResponse.json({ error: 'not_a_member' }, { status: 404 });
    await svc.from('space_members').update({ role, updated_at: new Date().toISOString() }).eq('id', target.id);
    // The ROLE LOG row on the revisions rail (who changed whom, when, why).
    await svc.from('verse_revisions').insert({
      entity_type: 'space_role', entity_id: String(groupId), section_key: 'roles',
      author: me.id, summary: reason.slice(0, 200),
      content: { target: targetId, from: target.role, to: role, reason: reason.slice(0, 500) },
    });
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

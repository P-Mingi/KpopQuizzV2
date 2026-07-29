import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace } from '@/lib/verse/roles';
import { resolveEntityGroupId } from '@/lib/verse/curate';
import { fileFlag, underRateCap } from '@/lib/verse/moderation';

import type { NextRequest } from 'next/server';

// W4.8 - patrol flags. POST: a user reports a comment. GET: a curator's patrol queue for a
// space (open flags + target previews). PATCH: resolve / dismiss / hide (curator).
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const targetId = Number(body.target_id);
  if (String(body.target_type) !== 'comment' || !targetId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  if (!await underRateCap('verse_flags', 'reporter', user.id, 3600, 20)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const svc = createServiceRoleClient();
  const { data: c } = await svc.from('verse_discussions').select('id, entity_type, entity_id').eq('id', targetId).maybeSingle();
  const cm = c as { id: number; entity_type: string; entity_id: string } | null;
  if (!cm) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const gid = await resolveEntityGroupId(cm.entity_type, cm.entity_id);
  await fileFlag({ target_type: 'comment', target_id: cm.id, group_id: gid, reporter: user.id, reason: body.reason ? String(body.reason).slice(0, 200) : 'Reported by a member' });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const groupId = Number(new URL(req.url).searchParams.get('group_id'));
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user || !await canCurateSpace(user.id, groupId)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  const svc = createServiceRoleClient();
  const { data } = await svc.from('verse_flags').select('id, target_type, target_id, reporter, reason, created_at').eq('group_id', groupId).eq('status', 'open').order('created_at', { ascending: false }).limit(100);
  const flags = (data ?? []) as Array<{ id: number; target_type: string; target_id: number; reporter: string | null; reason: string; created_at: string }>;

  // Attach a preview of each target.
  const commentIds = flags.filter((f) => f.target_type === 'comment').map((f) => f.target_id);
  const sugIds = flags.filter((f) => f.target_type === 'suggestion').map((f) => f.target_id);
  const [{ data: comments }, { data: sugs }] = await Promise.all([
    commentIds.length ? svc.from('verse_discussions').select('id, body, status').in('id', commentIds) : Promise.resolve({ data: [] }),
    sugIds.length ? svc.from('verse_edit_suggestions').select('id, summary, status').in('id', sugIds) : Promise.resolve({ data: [] }),
  ]);
  const commentById = new Map((comments ?? []).map((c: { id: number; body: string; status: string }) => [c.id, c]));
  const sugById = new Map((sugs ?? []).map((s: { id: number; summary: string | null; status: string }) => [s.id, s]));

  return NextResponse.json({ flags: flags.map((f) => ({
    ...f,
    preview: f.target_type === 'comment' ? (commentById.get(f.target_id)?.body ?? '(deleted)') : f.target_type === 'suggestion' ? (sugById.get(f.target_id)?.summary ?? 'a suggested edit') : 'a revision',
    targetStatus: f.target_type === 'comment' ? (commentById.get(f.target_id)?.status ?? 'gone') : (sugById.get(f.target_id)?.status ?? 'gone'),
  })) });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const id = Number(body.id);
  const action = String(body.action ?? '');
  if (!id || !['resolve', 'dismiss', 'hide'].includes(action)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const svc = createServiceRoleClient();
  const { data: f } = await svc.from('verse_flags').select('id, group_id, target_type, target_id').eq('id', id).maybeSingle();
  const flag = f as { id: number; group_id: number | null; target_type: string; target_id: number } | null;
  if (!flag) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (!flag.group_id || !await canCurateSpace(user.id, flag.group_id)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  if (action === 'hide' && flag.target_type === 'comment') {
    await svc.from('verse_discussions').update({ status: 'hidden', updated_at: new Date().toISOString() }).eq('id', flag.target_id);
  }
  await svc.from('verse_flags').update({ status: action === 'dismiss' ? 'dismissed' : 'resolved', resolved_by: user.id, resolved_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ ok: true });
}

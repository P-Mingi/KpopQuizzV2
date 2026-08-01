import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { canCurateSpace, getSpaceRole, roleAtLeast } from '@/lib/verse/roles';
import { getFeaturedEssays, getUserEssays, getSubmittedEssays } from '@/lib/verse/essays';
import { slugify } from '@/lib/verse/slug';
import { checkText, underRateCap } from '@/lib/verse/moderation';
import { renderTipTapJSON, contentIsEmpty } from '@/lib/verse/render-content';

import type { NextRequest } from 'next/server';

// W4.12 - member essays. Members draft + submit; curators feature / reject. Only featured
// essays are public. NOT a free blog: publishing requires curator review.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const u = new URL(req.url);
  const groupId = Number(u.searchParams.get('group_id'));
  const scope = u.searchParams.get('scope') ?? 'featured';
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  if (scope === 'featured') return NextResponse.json({ essays: await getFeaturedEssays(groupId) });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  if (scope === 'mine') return NextResponse.json({ essays: await getUserEssays(user.id, groupId) });
  if (scope === 'queue') {
    if (!await canCurateSpace(user.id, groupId)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    return NextResponse.json({ essays: await getSubmittedEssays(groupId) });
  }
  return NextResponse.json({ error: 'bad_scope' }, { status: 400 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const groupId = Number(body.group_id);
  const title = String(body.title ?? '').trim().slice(0, 160);
  const content = body.content;
  const id = body.id == null ? null : Number(body.id);
  if (!groupId || !title || !content || typeof content !== 'object') return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const svc = createServiceRoleClient();
  if (id) {
    const { data: cur } = await svc.from('verse_essays').select('group_id, author, status').eq('id', id).maybeSingle();
    const c = cur as { group_id: number; author: string; status: string } | null;
    if (!c || c.author !== user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    // V-MODES: membership is checked against the essay's OWN group, never the
    // attacker-supplied body.group_id, so leaving/being blocked from a space
    // ends write access to its essays even by their author.
    if (!roleAtLeast(await getSpaceRole(user.id, c.group_id), 'member')) {
      return NextResponse.json({ error: 'membership_required' }, { status: 403 });
    }
    if (c.status === 'featured' || c.status === 'submitted') return NextResponse.json({ error: 'locked_status' }, { status: 409 });
    await svc.from('verse_essays').update({ title, content, status: 'draft', updated_at: new Date().toISOString() }).eq('id', id);
    return NextResponse.json({ ok: true, id });
  }
  // Create: writing needs membership (member+), not just a session; the nav
  // gate is honest only if the API enforces it too.
  if (!roleAtLeast(await getSpaceRole(user.id, groupId), 'member')) {
    return NextResponse.json({ error: 'membership_required' }, { status: 403 });
  }
  if (!await underRateCap('verse_essays', 'author', user.id, 3600, 10)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const { data, error } = await svc.from('verse_essays').insert({ group_id: groupId, author: user.id, title, content, status: 'draft' }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const id = Number(body.id);
  const action = String(body.action ?? '');
  if (!id || !['submit', 'withdraw', 'feature', 'reject'].includes(action)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const svc = createServiceRoleClient();
  const { data: e } = await svc.from('verse_essays').select('id, group_id, author, title, content, status, slug').eq('id', id).maybeSingle();
  const essay = e as { id: number; group_id: number; author: string; title: string; content: unknown; status: string; slug: string | null } | null;
  if (!essay) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const now = new Date().toISOString();

  if (action === 'submit' || action === 'withdraw') {
    if (essay.author !== user.id) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    // V-MODES: submitting for review is a write action; it needs live
    // membership in the essay's own space, same as create/edit.
    if (!roleAtLeast(await getSpaceRole(user.id, essay.group_id), 'member')) {
      return NextResponse.json({ error: 'membership_required' }, { status: 403 });
    }
    if (action === 'submit') {
      if (essay.status !== 'draft' && essay.status !== 'rejected') return NextResponse.json({ error: 'bad_state' }, { status: 409 });
      if (contentIsEmpty(essay.content)) return NextResponse.json({ error: 'empty' }, { status: 400 });
      const hit = await checkText(`${essay.title} ${renderTipTapJSON(essay.content).replace(/<[^>]*>/g, ' ')}`);
      if (hit?.action === 'block') return NextResponse.json({ error: 'blocked_term' }, { status: 422 });
      await svc.from('verse_essays').update({ status: 'submitted', updated_at: now }).eq('id', id);
      return NextResponse.json({ ok: true, status: 'submitted' });
    }
    if (essay.status !== 'submitted') return NextResponse.json({ error: 'bad_state' }, { status: 409 });
    await svc.from('verse_essays').update({ status: 'draft', updated_at: now }).eq('id', id);
    return NextResponse.json({ ok: true, status: 'draft' });
  }

  // feature / reject: curators of the essay's space (or global admins).
  if (!await canCurateSpace(user.id, essay.group_id)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
  if (essay.status !== 'submitted') return NextResponse.json({ error: 'bad_state' }, { status: 409 });
  if (action === 'feature') {
    const slug = essay.slug ?? `${slugify(essay.title).slice(0, 100)}-${id}`;
    await svc.from('verse_essays').update({ status: 'featured', slug, featured_at: now, reviewed_by: user.id, reviewed_at: now, updated_at: now }).eq('id', id);
    return NextResponse.json({ ok: true, status: 'featured' });
  }
  await svc.from('verse_essays').update({ status: 'rejected', review_note: body.note ? String(body.note).slice(0, 300) : null, reviewed_by: user.id, reviewed_at: now, updated_at: now }).eq('id', id);
  return NextResponse.json({ ok: true, status: 'rejected' });
}

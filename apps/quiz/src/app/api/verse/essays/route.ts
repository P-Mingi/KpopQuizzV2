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
  if (scope === 'published') {
    // Curator panel: public essays with hero state, for feature/unpublish.
    if (!await canCurateSpace(user.id, groupId)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    const { data } = await createServiceRoleClient().from('verse_essays').select('id, title, is_hero, featured_at').eq('group_id', groupId).eq('status', 'featured').order('featured_at', { ascending: false });
    return NextResponse.json({ essays: data ?? [] });
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
    const meta = await essayMeta(body, c.group_id, user.id, svc);
    await svc.from('verse_essays').update({ title, content, status: 'draft', updated_at: new Date().toISOString(), ...meta }).eq('id', id);
    return NextResponse.json({ ok: true, id });
  }
  // Create: writing needs membership (member+), not just a session; the nav
  // gate is honest only if the API enforces it too.
  if (!roleAtLeast(await getSpaceRole(user.id, groupId), 'member')) {
    return NextResponse.json({ error: 'membership_required' }, { status: 403 });
  }
  if (!await underRateCap('verse_essays', 'author', user.id, 3600, 10)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const meta = await essayMeta(body, groupId, user.id, svc);
  const { data, error } = await svc.from('verse_essays').insert({ group_id: groupId, author: user.id, title, content, status: 'draft', ...meta }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

// V-ESSAYS-MAX step 4 - cover + series metadata an author may set on their own
// essay. Cover is policy-legal only: an album MBID (Cover Art Archive) or a space
// asset path (existing uploads), never a raw URL / upload. Series must be one this
// group has approved, or one this author proposed (else dropped).
type Svc = ReturnType<typeof createServiceRoleClient>;
async function essayMeta(body: Record<string, unknown>, groupId: number, userId: string, svc: Svc): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  if ('cover' in body) {
    const c = body.cover;
    if (c && typeof c === 'object') {
      const src = c as { mbid?: unknown; assetPath?: unknown };
      out.cover = typeof src.mbid === 'string' ? { mbid: src.mbid.slice(0, 60) } : typeof src.assetPath === 'string' ? { assetPath: src.assetPath.slice(0, 300) } : {};
    } else out.cover = {};
  }
  if ('series_id' in body) {
    const sid = body.series_id == null ? null : Number(body.series_id);
    if (!sid) out.series_id = null;
    else {
      const { data } = await svc.from('verse_essay_series').select('id, status, created_by').eq('id', sid).eq('group_id', groupId).maybeSingle();
      const s = data as { id: number; status: string; created_by: string | null } | null;
      out.series_id = s && (s.status === 'approved' || s.created_by === userId) ? sid : null;
    }
  }
  return out;
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const id = Number(body.id);
  const action = String(body.action ?? '');
  if (!id || !['submit', 'withdraw', 'feature', 'reject', 'hero', 'unhero', 'unpublish'].includes(action)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

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

  // Everything below is curator-only (curators of the essay's space or admins).
  if (!await canCurateSpace(user.id, essay.group_id)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  // hero / unhero: the ONE magazine hero per space. Setting a new hero clears the
  // old one first (the partial unique index allows only one is_hero per group).
  if (action === 'hero' || action === 'unhero') {
    if (action === 'unhero') { await svc.from('verse_essays').update({ is_hero: false, updated_at: now }).eq('id', id); return NextResponse.json({ ok: true, isHero: false }); }
    if (essay.status !== 'featured') return NextResponse.json({ error: 'not_public' }, { status: 409 });
    // Clear the current hero first (the partial unique index allows one), then
    // set this one. Check the set error so a lost race surfaces, not a silent lie.
    await svc.from('verse_essays').update({ is_hero: false }).eq('group_id', essay.group_id).eq('is_hero', true);
    const { error: heroErr } = await svc.from('verse_essays').update({ is_hero: true, updated_at: now }).eq('id', id);
    if (heroErr) return NextResponse.json({ error: 'hero_conflict' }, { status: 409 });
    return NextResponse.json({ ok: true, isHero: true });
  }

  // unpublish: pull a featured essay back to draft with a LOGGED reason.
  if (action === 'unpublish') {
    if (essay.status !== 'featured') return NextResponse.json({ error: 'bad_state' }, { status: 409 });
    await svc.from('verse_essays').update({ status: 'draft', is_hero: false, review_note: body.note ? String(body.note).slice(0, 300) : 'Unpublished by a curator', reviewed_by: user.id, reviewed_at: now, updated_at: now }).eq('id', id);
    return NextResponse.json({ ok: true, status: 'draft' });
  }

  // feature / reject: work the review queue (submitted essays only).
  if (essay.status !== 'submitted') return NextResponse.json({ error: 'bad_state' }, { status: 409 });
  if (action === 'feature') {
    // ASCII-safe slug: slugify keeps Hangul, but the slug column is
    // ^[a-z0-9-]$, so a Korean title would fail the CHECK and silently not
    // publish. Strip to ASCII and fall back to essay-{id}. Check the error too.
    const ascii = slugify(essay.title).replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 100);
    const slug = essay.slug ?? (ascii ? `${ascii}-${id}` : `essay-${id}`);
    const { error: featErr } = await svc.from('verse_essays').update({ status: 'featured', slug, featured_at: now, reviewed_by: user.id, reviewed_at: now, updated_at: now }).eq('id', id);
    if (featErr) return NextResponse.json({ error: featErr.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: 'featured' });
  }
  await svc.from('verse_essays').update({ status: 'rejected', review_note: body.note ? String(body.note).slice(0, 300) : null, reviewed_by: user.id, reviewed_at: now, updated_at: now }).eq('id', id);
  return NextResponse.json({ ok: true, status: 'rejected' });
}

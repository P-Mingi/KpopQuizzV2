import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getSpaceRole, roleAtLeast, canCurateSpace } from '@/lib/verse/roles';

import type { NextRequest } from 'next/server';

// V-ESSAYS-MAX step 4/5 - essay series. GET returns the approved series (the
// public shelves) plus the caller's own pending proposals, so an author can join
// a series they just proposed. POST proposes a new series (status='proposed';
// a curator approves it in the curator surface). Member+ to propose.
export const dynamic = 'force-dynamic';

const slugify = (t: string): string => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'series';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const groupId = Number(url.searchParams.get('group_id'));
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const { data: { user } } = await (await createServerClient()).auth.getUser();
  const svc = createServiceRoleClient();

  // Curator management view: every series (proposed + approved), for the panel.
  if (url.searchParams.get('scope') === 'manage') {
    if (!user || !await canCurateSpace(user.id, groupId)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    const { data } = await svc.from('verse_essay_series').select('id, title, slug, status, sort_order').eq('group_id', groupId).order('status').order('sort_order');
    return NextResponse.json({ series: data ?? [] });
  }

  const { data: approved } = await svc.from('verse_essay_series').select('id, title, slug, status').eq('group_id', groupId).eq('status', 'approved').order('sort_order');
  let mine: unknown[] = [];
  if (user) {
    const { data } = await svc.from('verse_essay_series').select('id, title, slug, status').eq('group_id', groupId).eq('status', 'proposed').eq('created_by', user.id);
    mine = data ?? [];
  }
  return NextResponse.json({ series: [...(approved ?? []), ...mine] });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const id = Number(body.id);
  const action = String(body.action ?? '');
  if (!id || !['approve', 'rename', 'move', 'delete'].includes(action)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const { data: { user } } = await (await createServerClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  const svc = createServiceRoleClient();
  const { data: row } = await svc.from('verse_essay_series').select('id, group_id, sort_order').eq('id', id).maybeSingle();
  const s = row as { id: number; group_id: number; sort_order: number } | null;
  if (!s || !await canCurateSpace(user.id, s.group_id)) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

  if (action === 'approve') { await svc.from('verse_essay_series').update({ status: 'approved' }).eq('id', id); return NextResponse.json({ ok: true }); }
  if (action === 'rename') { const t = String(body.title ?? '').trim().slice(0, 120); if (!t) return NextResponse.json({ error: 'bad_params' }, { status: 400 }); await svc.from('verse_essay_series').update({ title: t }).eq('id', id); return NextResponse.json({ ok: true }); }
  if (action === 'delete') { await svc.from('verse_essay_series').delete().eq('id', id); return NextResponse.json({ ok: true }); }
  // move: swap sort_order with the neighbour in the given direction.
  const dir = String(body.dir) === 'up' ? -1 : 1;
  const { data: neigh } = await svc.from('verse_essay_series').select('id, sort_order').eq('group_id', s.group_id).eq('status', 'approved').order('sort_order');
  const list = (neigh ?? []) as Array<{ id: number; sort_order: number }>;
  const i = list.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return NextResponse.json({ ok: true });
  await svc.from('verse_essay_series').update({ sort_order: list[j]!.sort_order }).eq('id', list[i]!.id);
  await svc.from('verse_essay_series').update({ sort_order: list[i]!.sort_order }).eq('id', list[j]!.id);
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const groupId = Number(body.group_id);
  const title = String(body.title ?? '').trim().slice(0, 120);
  if (!groupId || !title) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const { data: { user } } = await (await createServerClient()).auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  if (!roleAtLeast(await getSpaceRole(user.id, groupId), 'member')) return NextResponse.json({ error: 'membership_required' }, { status: 403 });

  const svc = createServiceRoleClient();
  // curators' proposals are born approved; members' await review.
  const approved = roleAtLeast(await getSpaceRole(user.id, groupId), 'curator');
  // Distinct sort_order so reorder actually swaps (else every row sits at 0).
  const { data: maxRow } = await svc.from('verse_essay_series').select('sort_order').eq('group_id', groupId).order('sort_order', { ascending: false }).limit(1).maybeSingle();
  const sortOrder = ((maxRow as { sort_order: number } | null)?.sort_order ?? 0) + 1;
  const base = slugify(title);
  let slug = base;
  const { data: clash } = await svc.from('verse_essay_series').select('id').eq('group_id', groupId).eq('slug', slug).maybeSingle();
  if (clash) slug = `${base}-${Date.now().toString(36).slice(-4)}`;
  let ins = await svc.from('verse_essay_series').insert({ group_id: groupId, title, slug, created_by: user.id, sort_order: sortOrder, status: approved ? 'approved' : 'proposed' }).select('id, title, slug, status').single();
  // Retry once on a concurrent slug clash (the check-then-insert race).
  if (ins.error && /duplicate|unique/i.test(ins.error.message)) {
    slug = `${base}-${Date.now().toString(36).slice(-4)}`;
    ins = await svc.from('verse_essay_series').insert({ group_id: groupId, title, slug, created_by: user.id, sort_order: sortOrder, status: approved ? 'approved' : 'proposed' }).select('id, title, slug, status').single();
  }
  const { data, error } = ins;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, series: data });
}

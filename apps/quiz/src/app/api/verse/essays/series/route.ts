import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getSpaceRole, roleAtLeast } from '@/lib/verse/roles';

import type { NextRequest } from 'next/server';

// V-ESSAYS-MAX step 4/5 - essay series. GET returns the approved series (the
// public shelves) plus the caller's own pending proposals, so an author can join
// a series they just proposed. POST proposes a new series (status='proposed';
// a curator approves it in the curator surface). Member+ to propose.
export const dynamic = 'force-dynamic';

const slugify = (t: string): string => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120) || 'series';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const groupId = Number(new URL(req.url).searchParams.get('group_id'));
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const { data: { user } } = await (await createServerClient()).auth.getUser();
  const svc = createServiceRoleClient();
  const { data: approved } = await svc.from('verse_essay_series').select('id, title, slug, status').eq('group_id', groupId).eq('status', 'approved').order('sort_order');
  let mine: unknown[] = [];
  if (user) {
    const { data } = await svc.from('verse_essay_series').select('id, title, slug, status').eq('group_id', groupId).eq('status', 'proposed').eq('created_by', user.id);
    mine = data ?? [];
  }
  return NextResponse.json({ series: [...(approved ?? []), ...mine] });
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
  let slug = slugify(title);
  const { data: clash } = await svc.from('verse_essay_series').select('id').eq('group_id', groupId).eq('slug', slug).maybeSingle();
  if (clash) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  const { data, error } = await svc.from('verse_essay_series').insert({ group_id: groupId, title, slug, created_by: user.id, status: approved ? 'approved' : 'proposed' }).select('id, title, slug, status').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, series: data });
}

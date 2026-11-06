import { NextResponse } from 'next/server';

import { verseWriteGate } from '@/lib/verse/api-gate';
import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// V-CARDS-MAX - a user's PRIVATE shelf arrangement (manual layout) for one space.
// The own/want truth lives in collectible_collection; this route only carries the
// arrangement. GET returns the caller's row (or defaults); POST upserts it. Served
// via service role for the signed-in user only - an arrangement is never another
// user's to read.
export const dynamic = 'force-dynamic';

const SURFACES = ['shelf'];
const DEFAULTS = { layout: {} as Record<string, unknown> };

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const groupId = Number(url.searchParams.get('group_id'));
  const surface = String(url.searchParams.get('surface') ?? 'shelf');
  if (!groupId || !SURFACES.includes(surface)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false, ...DEFAULTS });

  const svc = createServiceRoleClient();
  const { data } = await svc.from('verse_binders').select('layout').eq('user_id', user.id).eq('group_id', groupId).eq('surface', surface).maybeSingle();
  const row = data as { layout: Record<string, unknown> } | null;
  return NextResponse.json({ signedIn: true, layout: row?.layout ?? DEFAULTS.layout });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const gated = await verseWriteGate(req);
  if (gated) return gated;
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const groupId = Number(body.group_id);
  const surface = String(body.surface ?? 'shelf');
  if (!groupId || !SURFACES.includes(surface)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const patch: Record<string, unknown> = { user_id: user.id, group_id: groupId, surface, updated_at: new Date().toISOString() };
  if (body.layout !== undefined) {
    if (typeof body.layout !== 'object' || body.layout === null) return NextResponse.json({ error: 'bad_layout' }, { status: 400 });
    // Size guard: arrangement is small ordering data, never a payload dump.
    if (JSON.stringify(body.layout).length > 40_000) return NextResponse.json({ error: 'layout_too_large' }, { status: 413 });
    patch.layout = body.layout;
  }

  const svc = createServiceRoleClient();
  const { error } = await svc.from('verse_binders').upsert(patch, { onConflict: 'user_id,group_id,surface' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

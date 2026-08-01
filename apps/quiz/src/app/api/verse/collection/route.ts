import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getUserCollection, checkCollectionBadges } from '@/lib/verse/photocards';

import type { NextRequest } from 'next/server';

// W5.2 - a user's private owned/wanted photocard checklist. GET the caller's states for a
// space; POST sets a card to owned / wanted / none, then re-checks collection badges.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const cardId = Number(url.searchParams.get('photocard_id'));
  const groupId = Number(url.searchParams.get('group_id'));
  if (!cardId && !groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();

  // Single-card state (the card detail page's own/want control).
  if (cardId) {
    if (!user) return NextResponse.json({ signedIn: false, state: null });
    const svc = createServiceRoleClient();
    const { data } = await svc.from('photocard_collection').select('state').eq('user_id', user.id).eq('photocard_id', cardId).maybeSingle();
    return NextResponse.json({ signedIn: true, state: (data as { state: string } | null)?.state ?? null });
  }

  // Whole-space state map (the binder).
  if (!user) return NextResponse.json({ signedIn: false, states: {} });
  return NextResponse.json({ signedIn: true, states: await getUserCollection(user.id, groupId) });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const cardId = Number(body.photocard_id);
  const state = String(body.state ?? ''); // 'owned' | 'wanted' | 'none'
  if (!cardId || !['owned', 'wanted', 'none'].includes(state)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const svc = createServiceRoleClient();
  // Card must exist + be published (can't collect a draft/unknown card).
  const { data: card } = await svc.from('photocards').select('id, status').eq('id', cardId).maybeSingle();
  if (!card || (card as { status: string }).status !== 'published') return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (state === 'none') {
    await svc.from('photocard_collection').delete().eq('user_id', user.id).eq('photocard_id', cardId);
  } else {
    await svc.from('photocard_collection').upsert({ user_id: user.id, photocard_id: cardId, state }, { onConflict: 'user_id,photocard_id' });
  }
  await checkCollectionBadges(user.id);
  return NextResponse.json({ ok: true, state });
}

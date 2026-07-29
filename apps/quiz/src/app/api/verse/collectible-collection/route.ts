import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getUserCollectibles } from '@/lib/verse/collectibles';

import type { NextRequest } from 'next/server';

// W5.3 - a user's private owned/wanted merch + lightstick checklist. GET the caller's states for
// a space; POST sets an item to owned / wanted / none.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const groupId = Number(new URL(req.url).searchParams.get('group_id'));
  if (!groupId) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false, states: {} });
  return NextResponse.json({ signedIn: true, states: await getUserCollectibles(user.id, groupId) });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const itemId = Number(body.collectible_id);
  const state = String(body.state ?? ''); // 'owned' | 'wanted' | 'none'
  if (!itemId || !['owned', 'wanted', 'none'].includes(state)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const svc = createServiceRoleClient();
  // Item must exist + be published (can't collect a draft/unknown item).
  const { data: item } = await svc.from('collectibles').select('id, status').eq('id', itemId).maybeSingle();
  if (!item || (item as { status: string }).status !== 'published') return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (state === 'none') {
    await svc.from('collectible_collection').delete().eq('user_id', user.id).eq('collectible_id', itemId);
  } else {
    await svc.from('collectible_collection').upsert({ user_id: user.id, collectible_id: itemId, state }, { onConflict: 'user_id,collectible_id' });
  }
  return NextResponse.json({ ok: true, state });
}

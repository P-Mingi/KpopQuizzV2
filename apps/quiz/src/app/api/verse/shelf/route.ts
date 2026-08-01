import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { getShelf, resolveShelfCards, SHELF_CAP } from '@/lib/verse/shelf';

import type { NextRequest } from 'next/server';

// V-CARDS-MAX step 4 - the profile shelf: pin/unpin the top cards, toggle the
// public opt-in. The cap (SHELF_CAP) and the opt-in default (OFF) are enforced
// here, so neither a 6th pin nor an accidental public shelf can slip past the UI.
export const dynamic = 'force-dynamic';

const TABLE = { photocard: 'photocards', collectible: 'collectibles' } as const;

export async function GET(): Promise<NextResponse> {
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false, isPublic: false, cards: [] });
  const { items, isPublic } = await getShelf(user.id);
  return NextResponse.json({ signedIn: true, isPublic, cards: await resolveShelfCards(items) });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const itemType = String(body.item_type ?? '');
  const itemId = Number(body.item_id);
  const action = String(body.action ?? '');
  if (!(itemType in TABLE) || !itemId || !['pin', 'unpin'].includes(action)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  const svc = createServiceRoleClient();

  if (action === 'unpin') {
    await svc.from('verse_profile_shelf').delete().eq('user_id', user.id).eq('item_type', itemType).eq('item_id', itemId);
    return NextResponse.json({ ok: true, pinned: false });
  }

  // Pin: the item must exist + be published (no pinning a draft/unknown card).
  const { data: item } = await svc.from(TABLE[itemType as keyof typeof TABLE]).select('id, status').eq('id', itemId).maybeSingle();
  if (!item || (item as { status: string }).status !== 'published') return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Already pinned? Idempotent success (does not consume a cap slot twice).
  const { data: existing } = await svc.from('verse_profile_shelf').select('id').eq('user_id', user.id).eq('item_type', itemType).eq('item_id', itemId).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, pinned: true });

  // Cap: the showcase holds at most SHELF_CAP; a further pin is rejected.
  const { count } = await svc.from('verse_profile_shelf').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
  if ((count ?? 0) >= SHELF_CAP) return NextResponse.json({ error: 'shelf_full', cap: SHELF_CAP }, { status: 409 });

  const { data: inserted, error } = await svc.from('verse_profile_shelf').insert({ user_id: user.id, item_type: itemType, item_id: itemId, position: count ?? 0 }).select('id').single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // Post-insert re-check closes the count-then-insert race (no DB constraint,
  // migration budget spent): if a concurrent pin pushed us over, undo this one.
  const { count: after } = await svc.from('verse_profile_shelf').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
  if ((after ?? 0) > SHELF_CAP) {
    await svc.from('verse_profile_shelf').delete().eq('id', (inserted as { id: number }).id);
    return NextResponse.json({ error: 'shelf_full', cap: SHELF_CAP }, { status: 409 });
  }
  return NextResponse.json({ ok: true, pinned: true });
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  if (typeof body.is_public !== 'boolean') return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const svc = createServiceRoleClient();
  const { error } = await svc.from('verse_profile_shelf_settings').upsert({ user_id: user.id, is_public: body.is_public, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, isPublic: body.is_public });
}

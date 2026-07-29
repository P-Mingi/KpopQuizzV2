import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isWatching } from '@/lib/verse/watchlist';

import type { NextRequest } from 'next/server';

// W4.6 - follow / unfollow a Verse page. Watching notifies (via creator_notifications)
// when the page changes. Private to the signed-in user.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const u = new URL(req.url);
  const entity_type = u.searchParams.get('entity_type') ?? '';
  const entity_id = u.searchParams.get('entity_id') ?? '';
  if (!entity_type || !entity_id) return NextResponse.json({ error: 'bad_params' }, { status: 400 });
  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false, watching: false });
  return NextResponse.json({ signedIn: true, watching: await isWatching(user.id, entity_type, entity_id) });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }
  const entity_type = String(body.entity_type ?? '');
  const entity_id = String(body.entity_id ?? '');
  const action = String(body.action ?? '');
  if (!entity_type || !entity_id || !['watch', 'unwatch'].includes(action)) return NextResponse.json({ error: 'bad_params' }, { status: 400 });

  const supa = await createServerClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });

  const svc = createServiceRoleClient();
  if (action === 'watch') {
    await svc.from('verse_watchlists').upsert({ user_id: user.id, entity_type, entity_id }, { onConflict: 'user_id,entity_type,entity_id' });
    return NextResponse.json({ ok: true, watching: true });
  }
  await svc.from('verse_watchlists').delete().eq('user_id', user.id).eq('entity_type', entity_type).eq('entity_id', entity_id);
  return NextResponse.json({ ok: true, watching: false });
}

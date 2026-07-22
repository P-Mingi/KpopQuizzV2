import { NextResponse } from 'next/server';

import { createServerClient, createServiceRoleClient } from '@/lib/supabase/server';

import type { NextRequest } from 'next/server';

// POST /api/cheer  { event_id: number }
// One cheer per user per event on a happening-now activity. Inserts into
// activity_cheers (ON CONFLICT DO NOTHING), returns the fresh count. Notifies
// the cheered fan only on the FIRST cheer for that event, so a popular event
// never spams its owner. No streak, no XP.
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const eventId = Number((body as { event_id?: unknown })?.event_id);
  if (!Number.isFinite(eventId) || eventId <= 0) {
    return NextResponse.json({ error: 'bad_event' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'not_authenticated' }, { status: 401 });

  // Insert the cheer; the (event_id, user_id) PK makes a repeat a silent no-op.
  const { error: insErr } = await supabase
    .from('activity_cheers')
    .upsert({ event_id: eventId, user_id: user.id }, { onConflict: 'event_id,user_id', ignoreDuplicates: true });
  if (insErr) {
    console.error('[cheer] insert', insErr.message);
    return NextResponse.json({ error: 'cheer_failed' }, { status: 500 });
  }

  // Fresh count.
  const { count } = await supabase
    .from('activity_cheers')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId);
  const total = count ?? 0;

  // First cheer on this event -> notify its owner (best effort; the 'cheer'
  // notification type needs mig 111, and the cheerer never notifies themselves).
  if (total === 1) {
    try {
      const admin = createServiceRoleClient();
      const { data: ev } = await admin
        .from('activity_events')
        .select('user_id, display_name, event_type')
        .eq('id', eventId)
        .maybeSingle();
      const ownerId = (ev as { user_id: string | null } | null)?.user_id ?? null;
      if (ownerId && ownerId !== user.id) {
        await admin.from('creator_notifications').insert({
          user_id: ownerId,
          type: 'cheer',
          title: 'You got a cheer!',
          body: 'A fan cheered your activity on the community feed.',
          link_url: '/notifications',
          sender_id: user.id,
        });
      }
    } catch (e) {
      console.warn('[cheer] notify skipped:', (e as Error)?.message ?? e);
    }
  }

  return NextResponse.json({ count: total });
}

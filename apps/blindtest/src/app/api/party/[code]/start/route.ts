import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  const { code } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const adminDb = createServiceRoleClient();

  // Verify room and host
  const { data: room } = await adminDb
    .from('party_rooms')
    .select('id, host_id, status')
    .eq('code', code.toUpperCase())
    .single();

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  // Verify caller is the host
  const { data: player } = await adminDb
    .from('bt_players')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!player || player.id !== room.host_id) {
    return NextResponse.json({ error: 'Only the host can start the game' }, { status: 403 });
  }

  if (room.status !== 'waiting') {
    return NextResponse.json({ error: 'Game already started' }, { status: 400 });
  }

  // Update room status to playing
  await adminDb
    .from('party_rooms')
    .update({
      status: 'playing',
      current_round: 1,
      round_started_at: new Date().toISOString(),
    })
    .eq('id', room.id);

  return NextResponse.json({ started: true });
}

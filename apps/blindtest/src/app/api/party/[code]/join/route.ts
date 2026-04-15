import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';

interface JoinBody {
  displayName: string;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
): Promise<NextResponse> {
  const { code } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let body: JoinBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();

  // Find room
  const { data: room } = await adminDb
    .from('party_rooms')
    .select('id, status')
    .eq('code', code.toUpperCase())
    .single();

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  }

  if (room.status !== 'waiting') {
    return NextResponse.json({ error: 'Game already started' }, { status: 400 });
  }

  // Check player count
  const { count } = await adminDb
    .from('party_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id);

  if ((count ?? 0) >= 8) {
    return NextResponse.json({ error: 'Room is full (max 8 players)' }, { status: 400 });
  }

  // Get player ID if authenticated
  let playerId: string | null = null;
  if (user) {
    const { data: player } = await adminDb
      .from('bt_players')
      .select('id')
      .eq('user_id', user.id)
      .single();
    playerId = player?.id ?? null;
  }

  // Add player to room
  const { data: partyPlayer, error } = await adminDb
    .from('party_players')
    .insert({
      room_id: room.id,
      player_id: playerId,
      display_name: body.displayName.slice(0, 20),
      is_host: false,
    })
    .select('id')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already in this room' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ playerId: partyPlayer.id, roomId: room.id });
}

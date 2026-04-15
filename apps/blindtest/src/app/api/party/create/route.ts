import { NextResponse } from 'next/server';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 for readability
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

interface CreateBody {
  mode: 'everyone' | 'kahoot';
  playlist: string;
  difficulty?: string;
}

export async function POST(req: Request): Promise<NextResponse> {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Must be logged in to create a party' }, { status: 401 });
  }

  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const adminDb = createServiceRoleClient();

  // Get player
  const { data: player } = await adminDb
    .from('bt_players')
    .select('id, display_name')
    .eq('user_id', user.id)
    .single();

  if (!player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  }

  // Generate questions using the game generation logic
  const genRes = await fetch(new URL('/api/game/generate', req.url).toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      playlist: body.playlist,
      mode: 'quick',
      difficulty: body.difficulty ?? 'mixed',
    }),
  });

  if (!genRes.ok) {
    return NextResponse.json({ error: 'Failed to generate questions' }, { status: 500 });
  }

  const genData = await genRes.json();
  const questions = genData.questions;
  const songIds = questions.map((q: { song_id: string }) => q.song_id);

  // Generate unique room code (retry up to 5 times)
  let code = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateRoomCode();
    const { data: existing } = await adminDb
      .from('party_rooms')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (!existing) break;
  }

  // Create room
  const { data: room, error } = await adminDb
    .from('party_rooms')
    .insert({
      code,
      host_id: player.id,
      host_name: (player.display_name as string) ?? 'Host',
      mode: body.mode,
      playlist: { type: 'artist', value: body.playlist },
      difficulty: body.difficulty ?? 'mixed',
      song_ids: songIds,
      questions,
      status: 'waiting',
    })
    .select('id, code')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add host as first player
  await adminDb.from('party_players').insert({
    room_id: room.id,
    player_id: player.id,
    display_name: (player.display_name as string) ?? 'Host',
    is_host: true,
  });

  return NextResponse.json({ code: room.code, roomId: room.id });
}

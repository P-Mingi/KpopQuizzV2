import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { PartyLobby } from '@/components/party/party-lobby';
import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Party Room | K-pop Blindtest',
};

export default async function PartyRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const adminDb = createServiceRoleClient();

  const { data: room } = await adminDb
    .from('party_rooms')
    .select('id, code, host_id, mode, status')
    .eq('code', code.toUpperCase())
    .single();

  if (!room) notFound();

  // Check if current user is the host
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isHost = false;
  let partyPlayerId = '';

  if (user) {
    const { data: player } = await adminDb
      .from('bt_players')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (player) {
      isHost = player.id === room.host_id;

      const { data: pp } = await adminDb
        .from('party_players')
        .select('id')
        .eq('room_id', room.id)
        .eq('player_id', player.id)
        .single();

      partyPlayerId = pp?.id ?? '';
    }
  }

  return (
    <PartyLobby
      roomCode={room.code as string}
      roomId={room.id as string}
      isHost={isHost}
      partyPlayerId={partyPlayerId}
      mode={room.mode as 'everyone' | 'kahoot'}
    />
  );
}

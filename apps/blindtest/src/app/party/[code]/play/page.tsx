import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { notFound } from 'next/navigation';
import { PartyGameEveryone } from '@/components/party/party-game-everyone';
import { KahootHostScreen } from '@/components/party/kahoot-host-screen';
import { KahootPlayerScreen } from '@/components/party/kahoot-player-screen';

import type { Question } from '@/components/game/use-game-state';

export default async function PartyPlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const adminDb = createServiceRoleClient();

  // Fetch room with questions
  const { data: room } = await adminDb
    .from('party_rooms')
    .select('id, code, host_id, mode, questions, settings')
    .eq('code', code.toUpperCase())
    .single();

  if (!room) notFound();

  const questions = room.questions as Question[];
  const settings = room.settings as { rounds: number; timer_seconds: number };
  const timerDuration = settings?.timer_seconds ?? 15;

  // Determine current user's role
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

  // Everyone mode: all players get the same game
  if (room.mode === 'everyone') {
    return (
      <PartyGameEveryone
        roomCode={room.code as string}
        roomId={room.id as string}
        partyPlayerId={partyPlayerId}
        questions={questions}
        timerDuration={timerDuration}
      />
    );
  }

  // Kahoot mode: host sees questions + audio, players see colored buttons
  if (isHost) {
    return (
      <KahootHostScreen
        roomCode={room.code as string}
        roomId={room.id as string}
        questions={questions}
        timerDuration={timerDuration}
      />
    );
  }

  // Kahoot player: only sees colored buttons
  const choicesPerRound = questions.map((q) => q.choices);
  const correctAnswers = questions.map((q) => q.correct_answer);

  return (
    <KahootPlayerScreen
      roomCode={room.code as string}
      roomId={room.id as string}
      partyPlayerId={partyPlayerId}
      choicesPerRound={choicesPerRound}
      correctAnswers={correctAnswers}
      totalRounds={questions.length}
    />
  );
}

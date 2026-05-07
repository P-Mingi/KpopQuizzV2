'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useBattleRoom } from '@/lib/battle/use-battle-room';
import { LobbyView } from '@/components/battle/lobby-view';
import { GameplayView } from '@/components/battle/gameplay-view';
import { GameOverView } from '@/components/battle/game-over-view';
import { BATTLE_PALETTE as C } from '@/lib/battle/battle-constants';

export default function BattleRoomPage(): React.ReactElement {
  const params = useParams<{ code: string }>();
  const state = useBattleRoom(params.code);

  if (state.loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: C.bg,
      }}>
        <p style={{ fontSize: 14, color: C.textMuted }}>Connecting to room...</p>
      </div>
    );
  }

  if (state.error || !state.room) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 12, background: C.bg,
      }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: C.textDark }}>Can&apos;t open this room</p>
        <p style={{ fontSize: 12, color: C.textMuted }}>{state.error ?? 'Try again later'}</p>
        <Link href="/battle" style={{
          marginTop: 8, padding: '8px 16px', borderRadius: 8,
          background: C.pink, color: '#fff', fontSize: 13, fontWeight: 600,
          textDecoration: 'none',
        }}>
          Back to Battle hub
        </Link>
      </div>
    );
  }

  if (state.room.status === 'lobby') {
    return <LobbyView state={state} />;
  }

  if (state.room.status === 'active') {
    return <GameplayView state={state} />;
  }

  if (state.room.status === 'ended') {
    return <GameOverView state={state} />;
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: C.bg,
    }}>
      <p style={{ fontSize: 14, color: C.textMuted }}>Room is closed</p>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useBattleRoom } from '@/lib/battle/use-battle-room';
import { LobbyView } from '@/components/battle/lobby-view';
import { GameplayView } from '@/components/battle/gameplay-view';
import { GameOverView } from '@/components/battle/game-over-view';
import { BATTLE_PALETTE as C } from '@/lib/battle/battle-constants';

/**
 * Full-viewport overlay container. The root layout renders TopNav + a 720px-wide
 * main + Footer around every page. Battle room pages need the full screen, so we
 * render a fixed overlay that sits on top of all that chrome.
 */
function FullViewport({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 40,
      background: C.bg, overflow: 'hidden',
    }}>
      {children}
    </div>
  );
}

export default function BattleRoomPage(): React.ReactElement {
  const params = useParams<{ code: string }>();
  const state = useBattleRoom(params.code);

  if (state.loading) {
    return (
      <FullViewport>
        <div style={{
          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <p style={{ fontSize: 14, color: C.textMuted }}>Connecting to room...</p>
        </div>
      </FullViewport>
    );
  }

  if (state.error || !state.room) {
    return (
      <FullViewport>
        <div style={{
          height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 12,
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
      </FullViewport>
    );
  }

  if (state.room.status === 'lobby') {
    return <FullViewport><LobbyView state={state} /></FullViewport>;
  }

  if (state.room.status === 'active') {
    return <FullViewport><GameplayView state={state} /></FullViewport>;
  }

  if (state.room.status === 'ended') {
    return <FullViewport><GameOverView state={state} /></FullViewport>;
  }

  return (
    <FullViewport>
      <div style={{
        height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ fontSize: 14, color: C.textMuted }}>Room is closed</p>
      </div>
    </FullViewport>
  );
}

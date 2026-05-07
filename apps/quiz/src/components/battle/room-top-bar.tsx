'use client';

import Link from 'next/link';
import { BATTLE_PALETTE as C } from '@/lib/battle/battle-constants';
import type { BattleRoom, BattlePlayer } from '@/lib/db/types';

interface RoomTopBarProps {
  room: BattleRoom;
  currentPlayer: BattlePlayer | null;
  connectionStatus: string;
}

export function RoomTopBar({ room, currentPlayer, connectionStatus }: RoomTopBarProps): React.ReactElement {
  const statusText = room.status === 'lobby' ? 'Waiting for players' : room.status === 'active' ? 'Game in progress' : 'Game ended';
  const hostName = currentPlayer?.is_host ? 'Your room' : 'Room';

  return (
    <header style={{
      display: 'flex', alignItems: 'center', padding: '0 20px',
      background: '#fff', height: 56,
      borderBottom: `1px solid ${C.cardBorder}`,
      flexShrink: 0,
    }}>
      {/* Left: Logo + path */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Link href="/battle" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.textDark, letterSpacing: -0.3 }}>
            kpop<span style={{ fontWeight: 800, color: C.pink }}>quiz</span>
          </span>
        </Link>
        <span style={{ fontSize: 11, color: C.textLight }}>&middot;</span>
        <span style={{ fontSize: 11, color: C.textMuted, fontFamily: 'monospace' }}>/r/{room.code}</span>
      </div>

      {/* Center: Room info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 24 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: C.pink, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800, fontFamily: 'monospace',
        }}>
          {room.code}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.textDark, margin: 0, lineHeight: 1.1 }}>
            {hostName}
          </p>
          <p style={{ fontSize: 9, color: C.textMuted, margin: 0 }}>
            <span style={{
              display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
              background: connectionStatus === 'connected' ? C.green : C.amber,
              marginRight: 4, verticalAlign: 'middle',
            }} />
            {room.status === 'lobby' ? 'Lobby' : room.status === 'active' ? 'Playing' : 'Ended'} &middot; {statusText}
          </p>
        </div>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Leave button */}
      <Link href="/battle" style={{
        padding: '5px 12px', borderRadius: 8,
        background: 'transparent', border: `1px solid ${C.cardBorder}`,
        color: C.textMuted, fontSize: 11, fontWeight: 500,
        textDecoration: 'none',
      }}>
        Leave
      </Link>
    </header>
  );
}

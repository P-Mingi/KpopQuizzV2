'use client';

import { useState } from 'react';
import { BATTLE_PALETTE as C } from '@/lib/battle/battle-constants';
import type { BattlePlayer } from '@/lib/db/types';

interface PlayerCardProps {
  player: BattlePlayer;
  isCurrentUser: boolean;
  canKick?: boolean;
}

export function PlayerCard({ player, isCurrentUser, canKick = false }: PlayerCardProps): React.ReactElement {
  const [hover, setHover] = useState(false);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderRadius: 10, display: 'flex', overflow: 'hidden',
        background: hover ? C.cardHover : '#fff',
        border: `1px solid ${isCurrentUser ? C.pinkBorder : C.cardBorder}`,
        transition: 'all 0.15s',
      }}
    >
      {/* Avatar */}
      <div style={{
        flexShrink: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '6px 4px', width: 48,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: player.avatar_color, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 800,
        }}>
          {player.avatar_initial}
        </div>
      </div>

      {/* Info */}
      <div style={{
        flex: 1, padding: '8px 10px 8px 4px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minWidth: 0, gap: 6,
      }}>
        <div style={{
          minWidth: 0, flex: 1,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{
            fontSize: 12, fontWeight: isCurrentUser ? 700 : 600,
            color: C.textDark,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {player.display_name}
          </span>

          {player.is_host && (
            <span style={{
              fontSize: 7, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
              background: 'rgba(232,160,96,0.12)', color: C.amber,
              textTransform: 'uppercase', flexShrink: 0,
            }}>
              &#128081; host
            </span>
          )}

          {isCurrentUser && (
            <span style={{
              fontSize: 7, fontWeight: 700, padding: '1px 4px', borderRadius: 3,
              background: C.pinkLight, color: C.pink,
              flexShrink: 0,
            }}>
              you
            </span>
          )}

          {player.guest_session_id && (
            <span style={{
              fontSize: 7, fontWeight: 600, padding: '1px 4px', borderRadius: 3,
              background: C.borderLight, color: C.textLight,
              flexShrink: 0,
            }}>
              guest
            </span>
          )}
        </div>

        {canKick && !player.is_host && !isCurrentUser && (
          <button style={{
            padding: '3px 8px', borderRadius: 5,
            background: 'transparent', border: `1px solid ${C.cardBorder}`,
            fontSize: 8, color: C.textLight, cursor: 'pointer', flexShrink: 0,
          }}>
            Kick
          </button>
        )}
      </div>
    </div>
  );
}

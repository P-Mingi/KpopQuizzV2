'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePartyChannel } from '@/hooks/use-party-channel';

interface Props {
  roomCode: string;
  roomId: string;
  isHost: boolean;
  partyPlayerId: string;
  mode: 'everyone' | 'kahoot';
}

export function PartyLobby({ roomCode, roomId, isHost, mode }: Props) {
  const router = useRouter();
  const { players, roomState } = usePartyChannel(roomId);
  const [starting, setStarting] = useState(false);

  const handleStart = useCallback(async () => {
    setStarting(true);
    try {
      const res = await fetch(`/api/party/${roomCode}/start`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? 'Failed to start');
        setStarting(false);
      }
    } catch {
      setStarting(false);
    }
  }, [roomCode]);

  // Redirect to game when room status changes to 'playing'
  if (roomState.status === 'playing') {
    router.push(`/party/${roomCode}/play`);
    return null;
  }

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(roomCode).catch(() => {});
  }, [roomCode]);

  const maxSlots = 8;
  const playerSlots = Array.from({ length: maxSlots }, (_, i) => players[i] ?? null);

  return (
    <div className="px-3.5 md:px-0 py-4 md:py-6 max-w-[500px] mx-auto">
      {/* Mode label */}
      <p className="text-[10px] text-[#888780] dark:text-[rgba(255,255,255,0.35)] uppercase tracking-widest mb-2 text-center">
        {mode === 'everyone' ? 'Everyone mode' : 'Kahoot mode'}
      </p>

      <h1 className="text-lg md:text-xl font-semibold text-primary mb-4 text-center">Party Room</h1>

      {/* Room code display */}
      <div className="flex justify-center mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.1)] border border-[#F4C0D1] dark:border-[rgba(212,83,126,0.2)]">
          <span className="text-[10px] text-[#888780] dark:text-[rgba(255,255,255,0.35)] font-medium">Room</span>
          <span className="text-lg font-semibold text-[#D4537E] tracking-[3px] tabular-nums">{roomCode}</span>
          <button onClick={copyCode} className="w-7 h-7 rounded-lg bg-white/50 dark:bg-white/[0.06] flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-[#888780] dark:text-white/40"><rect x="4" y="4" width="7" height="7" rx="1.5" /><path d="M4 8H2.5A1.5 1.5 0 0 1 1 6.5V2.5A1.5 1.5 0 0 1 2.5 1h4A1.5 1.5 0 0 1 8 2.5V4" /></svg>
          </button>
        </div>
      </div>

      <p className="text-xs text-[#888780] dark:text-[rgba(255,255,255,0.35)] mb-6 text-center">Share this code with your friends</p>

      {/* Player slots grid */}
      <div className="grid grid-cols-4 gap-3 md:gap-4 mb-6">
        {playerSlots.map((player, i) => (
          <div key={player?.id ?? `empty-${i}`} className="flex flex-col items-center gap-1.5">
            <div className={`w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center border-2 ${
              player ? 'border-[#D4537E] bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.12)]' : 'border-dashed border-[#E8E6E0] dark:border-[rgba(255,255,255,0.1)]'
            }`}>
              {player ? (
                <span className="text-lg font-semibold text-[#D4537E]">{player.display_name?.charAt(0)?.toUpperCase()}</span>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#D3D1C7" strokeWidth="1.2" strokeLinecap="round"><path d="M8 4v8M4 8h8" /></svg>
              )}
            </div>
            <span className="text-[10px] font-medium text-primary truncate max-w-[60px]">{player?.display_name || 'Empty'}</span>
            {player?.is_host && <span className="text-[8px] font-semibold text-[#D4537E]">Host</span>}
          </div>
        ))}
      </div>

      {/* Start button (host only) */}
      {isHost && (
        <button
          onClick={handleStart}
          disabled={starting || players.length < 2}
          className="w-full py-3.5 rounded-xl bg-[#D4537E] text-white text-sm font-semibold disabled:opacity-30 hover:bg-[#C44A72] active:scale-[0.97] transition-all"
        >
          {starting ? 'Starting...' : `Start game (${players.length} players)`}
        </button>
      )}

      {!isHost && (
        <p className="text-sm text-[#888780] dark:text-[rgba(255,255,255,0.35)] text-center">Waiting for host to start the game...</p>
      )}
    </div>
  );
}

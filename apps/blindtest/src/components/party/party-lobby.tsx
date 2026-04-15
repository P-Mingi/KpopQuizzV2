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

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-4 py-8">
      <p className="text-ghost text-[10px] uppercase tracking-widest mb-2">
        {mode === 'everyone' ? 'Everyone mode' : 'Kahoot mode'}
      </p>

      <h1 className="text-2xl font-bold text-primary mb-1">Party Room</h1>

      {/* Room code */}
      <div className="flex items-center gap-2 bg-elevated rounded-xl px-6 py-3 mb-6">
        <span className="text-3xl font-bold text-primary tracking-[0.2em] tabular-nums">
          {roomCode}
        </span>
      </div>
      <p className="text-xs text-ghost mb-6">Share this code with your friends</p>

      {/* Player list */}
      <div className="w-full max-w-sm mb-6">
        <p className="text-[10px] text-ghost uppercase tracking-wider mb-2">
          Players ({players.length}/8)
        </p>
        <div className="flex flex-col gap-1.5">
          {players.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-primary border border-subtle"
            >
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-xs font-medium text-accent">
                {p.display_name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-primary flex-1">{p.display_name}</span>
              {p.is_host && (
                <span className="text-[9px] font-medium text-accent bg-accent-bg px-2 py-0.5 rounded-full">
                  Host
                </span>
              )}
            </div>
          ))}
          {players.length === 0 && (
            <p className="text-xs text-ghost text-center py-4">Waiting for players...</p>
          )}
        </div>
      </div>

      {/* Start button (host only) */}
      {isHost && (
        <button
          onClick={handleStart}
          disabled={starting || players.length < 2}
          className="px-8 py-3 rounded-xl bg-accent text-white font-medium text-sm transition-all active:scale-[0.97] disabled:opacity-50"
        >
          {starting ? 'Starting...' : `Start game (${players.length} players)`}
        </button>
      )}

      {!isHost && (
        <p className="text-sm text-ghost">Waiting for host to start the game...</p>
      )}
    </div>
  );
}

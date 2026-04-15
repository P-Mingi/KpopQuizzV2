'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createBrowserClient } from '@kpopquiz/shared/supabase/client';

interface PartyPlayer {
  id: string;
  display_name: string;
  is_host: boolean;
  score: number;
  correct_count: number;
  current_combo: number;
  best_combo: number;
}

interface RoomState {
  status: 'waiting' | 'playing' | 'finished';
  current_round: number;
  round_started_at: string | null;
}

export function usePartyChannel(roomId: string | null) {
  const [players, setPlayers] = useState<PartyPlayer[]>([]);
  const [roomState, setRoomState] = useState<RoomState>({
    status: 'waiting',
    current_round: 0,
    round_started_at: null,
  });
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null>(null);

  // Initial fetch
  useEffect(() => {
    if (!roomId) return;
    const supabase = createBrowserClient();

    async function load() {
      const { data: roomData } = await supabase
        .from('party_rooms')
        .select('status, current_round, round_started_at')
        .eq('id', roomId!)
        .single();

      if (roomData) {
        setRoomState({
          status: roomData.status as RoomState['status'],
          current_round: roomData.current_round ?? 0,
          round_started_at: roomData.round_started_at ?? null,
        });
      }

      const { data: playerData } = await supabase
        .from('party_players')
        .select('id, display_name, is_host, score, correct_count, current_combo, best_combo')
        .eq('room_id', roomId!)
        .order('score', { ascending: false });

      if (playerData) {
        setPlayers(playerData as PartyPlayer[]);
      }
    }

    load();
  }, [roomId]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!roomId) return;
    const supabase = createBrowserClient();

    const channel = supabase
      .channel(`party:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'party_players', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const p = payload.new as PartyPlayer;
            setPlayers((prev) => [...prev.filter((x) => x.id !== p.id), p]);
          } else if (payload.eventType === 'UPDATE') {
            const p = payload.new as PartyPlayer;
            setPlayers((prev) => prev.map((x) => (x.id === p.id ? p : x)));
          } else if (payload.eventType === 'DELETE') {
            const old = payload.old as { id: string };
            setPlayers((prev) => prev.filter((x) => x.id !== old.id));
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'party_rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          const r = payload.new as { status: string; current_round: number; round_started_at: string | null };
          setRoomState({
            status: r.status as RoomState['status'],
            current_round: r.current_round,
            round_started_at: r.round_started_at,
          });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return { players: sortedPlayers, roomState };
}

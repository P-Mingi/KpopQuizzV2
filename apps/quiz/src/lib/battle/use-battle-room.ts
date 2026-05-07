'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type {
  BattleRoom, BattlePlayer, BattleRound,
  BattleRoundAnswer, BattleChatMessage,
} from '@/lib/db/types';

/** Minimal question data sent to clients (no answer/variants) */
export interface RoundQuestion {
  id: string;
  prompt: string;
  text_content: string | null;
  image_url: string | null;
  group_name: string;
  difficulty: string;
}

export interface BattleRoomState {
  room: BattleRoom | null;
  players: BattlePlayer[];
  currentRound: BattleRound | null;
  roundQuestion: RoundQuestion | null;
  roundAnswers: BattleRoundAnswer[];
  chatMessages: BattleChatMessage[];
  currentPlayer: BattlePlayer | null;
  isHost: boolean;
  loading: boolean;
  error: string | null;
  connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
  submitAnswer: (text: string) => Promise<{ is_correct: boolean; points: number; total_score: number } | null>;
  sendChat: (message: string) => Promise<void>;
  startRound: () => Promise<void>;
  updateSettings: (settings: Record<string, unknown>) => Promise<void>;
}

export function useBattleRoom(code: string): BattleRoomState {
  const supabase = createBrowserClient();
  const [room, setRoom] = useState<BattleRoom | null>(null);
  const [players, setPlayers] = useState<BattlePlayer[]>([]);
  const [currentRound, setCurrentRound] = useState<BattleRound | null>(null);
  const [roundQuestion, setRoundQuestion] = useState<RoundQuestion | null>(null);
  const [roundAnswers, setRoundAnswers] = useState<BattleRoundAnswer[]>([]);
  const [chatMessages, setChatMessages] = useState<BattleChatMessage[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<BattlePlayer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<BattleRoomState['connectionStatus']>('connecting');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const roomIdRef = useRef<string | null>(null);

  // Identify current player from players list
  const identifyPlayer = useCallback((playerList: BattlePlayer[]) => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const guestId = typeof window !== 'undefined' ? localStorage.getItem('kpq_guest_id') : null;
      const me = playerList.find(p =>
        (user && p.user_id === user.id) || (!user && guestId && p.guest_session_id === guestId)
      );
      setCurrentPlayer(me ?? null);
    })();
  }, [supabase]);

  // Refresh players from DB
  const refreshPlayers = useCallback(async (roomId: string) => {
    const { data } = await supabase
      .from('battle_players')
      .select('*')
      .eq('room_id', roomId)
      .is('left_at', null)
      .order('joined_at');
    const list = (data ?? []) as BattlePlayer[];
    setPlayers(list);
    identifyPlayer(list);
  }, [supabase, identifyPlayer]);

  // Refresh current round + question
  const refreshRound = useCallback(async (roomId: string) => {
    const { data: roundData } = await supabase
      .from('battle_rounds')
      .select('*')
      .eq('room_id', roomId)
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    const round = (roundData as BattleRound) ?? null;
    setCurrentRound(round);

    if (round) {
      // Fetch question (only safe fields, no answer/variants)
      const { data: qData } = await supabase
        .from('battle_questions')
        .select('id, prompt, text_content, image_url, group_name, difficulty')
        .eq('id', round.question_id)
        .maybeSingle();
      setRoundQuestion((qData as RoundQuestion) ?? null);

      const { data: answers } = await supabase
        .from('battle_round_answers')
        .select('*')
        .eq('round_id', round.id);
      setRoundAnswers((answers ?? []) as BattleRoundAnswer[]);
    } else {
      setRoundQuestion(null);
      setRoundAnswers([]);
    }
  }, [supabase]);

  // Initial load + subscribe
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        // Fetch room
        const { data: roomData, error: rErr } = await supabase
          .from('battle_rooms')
          .select('*')
          .eq('code', code)
          .neq('status', 'closed')
          .maybeSingle();

        if (!mounted) return;
        if (rErr || !roomData) {
          setError(rErr?.message ?? 'Room not found');
          setLoading(false);
          return;
        }
        const typedRoom = roomData as BattleRoom;
        setRoom(typedRoom);
        roomIdRef.current = typedRoom.id;

        // Fetch players
        await refreshPlayers(typedRoom.id);

        // Fetch chat messages
        const { data: chatData } = await supabase
          .from('battle_chat_messages')
          .select('*')
          .eq('room_id', typedRoom.id)
          .order('created_at', { ascending: true })
          .limit(100);
        if (mounted) setChatMessages((chatData ?? []) as BattleChatMessage[]);

        // Fetch current round if active
        if (typedRoom.status === 'active' && typedRoom.current_round_id) {
          await refreshRound(typedRoom.id);
        }

        if (!mounted) return;
        setLoading(false);

        // Subscribe to Realtime
        const channel = supabase
          .channel(`battle:${typedRoom.id}`)
          .on('postgres_changes', {
            event: '*', schema: 'public', table: 'battle_rooms',
            filter: `id=eq.${typedRoom.id}`,
          }, (payload) => {
            if (payload.new) setRoom(payload.new as BattleRoom);
          })
          .on('postgres_changes', {
            event: '*', schema: 'public', table: 'battle_players',
            filter: `room_id=eq.${typedRoom.id}`,
          }, () => {
            refreshPlayers(typedRoom.id);
          })
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'battle_chat_messages',
            filter: `room_id=eq.${typedRoom.id}`,
          }, (payload) => {
            if (payload.new) {
              setChatMessages(prev => [...prev, payload.new as BattleChatMessage]);
            }
          })
          .on('postgres_changes', {
            event: '*', schema: 'public', table: 'battle_rounds',
            filter: `room_id=eq.${typedRoom.id}`,
          }, () => {
            refreshRound(typedRoom.id);
          })
          .on('postgres_changes', {
            event: 'INSERT', schema: 'public', table: 'battle_round_answers',
          }, (payload) => {
            if (payload.new) {
              setRoundAnswers(prev => [...prev, payload.new as BattleRoundAnswer]);
              // Also refresh players for score updates
              refreshPlayers(typedRoom.id);
            }
          })
          .subscribe((status) => {
            if (!mounted) return;
            if (status === 'SUBSCRIBED') setConnectionStatus('connected');
            else if (status === 'CLOSED') setConnectionStatus('disconnected');
            else if (status === 'CHANNEL_ERROR') setConnectionStatus('reconnecting');
          });

        channelRef.current = channel;
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to connect');
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [code, supabase, refreshPlayers, refreshRound]);

  // Actions
  const submitAnswer = useCallback(async (text: string) => {
    if (!currentPlayer) return null;
    const { data, error: err } = await supabase.rpc('battle_submit_answer', {
      p_player_id: currentPlayer.id,
      p_answer: text,
    });
    if (err) {
      console.error('Submit answer error:', err.message);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : data;
    return row as { is_correct: boolean; points: number; total_score: number } | null;
  }, [supabase, currentPlayer]);

  const sendChat = useCallback(async (message: string) => {
    if (!currentPlayer) return;
    const { error: err } = await supabase.rpc('battle_send_chat', {
      p_player_id: currentPlayer.id,
      p_message: message,
    });
    if (err) console.error('Chat error:', err.message);
  }, [supabase, currentPlayer]);

  const startRound = useCallback(async () => {
    if (!roomIdRef.current) return;
    const { error: err } = await supabase.rpc('battle_start_round', {
      p_room_id: roomIdRef.current,
    });
    if (err) console.error('Start round error:', err.message);
  }, [supabase]);

  const updateSettings = useCallback(async (settings: Record<string, unknown>) => {
    if (!roomIdRef.current) return;
    const { error: err } = await supabase
      .from('battle_rooms')
      .update(settings)
      .eq('id', roomIdRef.current);
    if (err) console.error('Update settings error:', err.message);
  }, [supabase]);

  const isHost = currentPlayer?.is_host ?? false;

  return {
    room, players, currentRound, roundQuestion, roundAnswers, chatMessages,
    currentPlayer, isHost, loading, error, connectionStatus,
    submitAnswer, sendChat, startRound, updateSettings,
  };
}

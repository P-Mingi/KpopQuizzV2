'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePartyChannel } from '@/hooks/use-party-channel';

const KAHOOT_COLORS = [{ bg: '#534AB7', label: 'A' }, { bg: '#D4537E', label: 'B' }, { bg: '#0F6E56', label: 'C' }, { bg: '#BA7517', label: 'D' }];

interface Props {
  roomCode: string;
  roomId: string;
  partyPlayerId: string;
  choicesPerRound: string[][]; // pre-built choices for each round
  correctAnswers: string[]; // correct answer for each round
  totalRounds: number;
}

export function KahootPlayerScreen({ roomCode, roomId, partyPlayerId, choicesPerRound, correctAnswers, totalRounds }: Props) {
  const router = useRouter();
  const { players, roomState } = usePartyChannel(roomId);

  const [answeredRound, setAnsweredRound] = useState(-1); // last round player answered
  const [waitingForNext, setWaitingForNext] = useState(false);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const answerStartRef = useRef(Date.now());

  const currentRound = roomState.current_round - 1; // 0-indexed
  const choices = choicesPerRound[currentRound] ?? [];
  const hasAnswered = answeredRound >= currentRound;

  // Track when a new round starts
  useEffect(() => {
    if (roomState.round_started_at) {
      answerStartRef.current = new Date(roomState.round_started_at).getTime();
      setWaitingForNext(false);
    }
  }, [roomState.round_started_at]);

  const handleAnswer = useCallback(async (choiceIndex: number) => {
    if (hasAnswered || currentRound < 0) return;

    const choice = choices[choiceIndex];
    if (!choice) return;

    const timeMs = Date.now() - answerStartRef.current;
    const correct = choice === correctAnswers[currentRound];
    const newCombo = correct ? combo + 1 : 0;
    const points = correct ? Math.max(50, Math.round(1000 * (1 - (timeMs / 15000) * 0.935))) : 0;
    const comboMult = newCombo >= 5 ? 5 : newCombo >= 3 ? 3 : newCombo >= 2 ? 2 : 1;
    const totalPoints = Math.round(points * comboMult);

    setScore((s) => s + totalPoints);
    setCombo(newCombo);
    setAnsweredRound(currentRound);
    setWaitingForNext(true);

    await fetch(`/api/party/${roomCode}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partyPlayerId,
        round: currentRound,
        answer: choice,
        correct,
        timeMs,
        points: totalPoints,
      }),
    }).catch(() => {});
  }, [hasAnswered, currentRound, choices, correctAnswers, combo, roomCode, partyPlayerId]);

  // Game finished
  if (roomState.status === 'finished') {
    const me = players.find((p) => p.id === partyPlayerId);
    const myRank = players.findIndex((p) => p.id === partyPlayerId) + 1;
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center" style={{ background: '#0a0716' }}>
        <p className="text-2xl font-bold text-white mb-1">Game Over!</p>
        <p className="text-4xl font-bold text-[#D4537E] mb-2">{me?.score?.toLocaleString() ?? score.toLocaleString()}</p>
        <p className="text-sm text-white/40 mb-6">You placed #{myRank} of {players.length}</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2.5 rounded-xl bg-[#D4537E] text-white text-sm font-semibold"
        >
          Back to lobby
        </button>
      </div>
    );
  }

  // Waiting for host to start
  if (roomState.status === 'waiting') {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center" style={{ background: '#0a0716' }}>
        <p className="text-lg font-bold text-white mb-2">Room: {roomCode}</p>
        <p className="text-sm text-white/30">Waiting for host to start...</p>
        <p className="text-xs text-white/30 mt-4">{players.length} players in room</p>
      </div>
    );
  }

  // Already answered this round
  if (waitingForNext || hasAnswered) {
    return (
      <div className="w-full h-screen flex flex-col" style={{ background: '#0a0716' }}>
        <div className="flex justify-between items-center px-4 py-3">
          <span className="text-white/30 text-[10px] font-medium">Room {roomCode}</span>
          <span className="text-white/30 text-[10px] font-medium tabular-nums">Round {currentRound + 1}/{totalRounds}</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="mx-auto mb-3 opacity-30"><circle cx="20" cy="20" r="16" /><path d="M20 12v8l5 3" /></svg>
            <p className="text-white/30 text-sm font-medium">Waiting for others...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show 4 colored answer buttons (no question text, no audio)
  return (
    <div className="w-full h-screen flex flex-col" style={{ background: '#0a0716' }}>
      <div className="flex justify-between items-center px-4 py-3">
        <span className="text-white/30 text-[10px] font-medium">Room {roomCode}</span>
        <span className="text-white/30 text-[10px] font-medium tabular-nums">Round {currentRound + 1}/{totalRounds}</span>
      </div>

      <p className="text-center text-white/40 text-xs font-medium py-3">Tap your answer</p>

      <div className="flex-1 grid grid-cols-2 gap-2 px-3 pb-3">
        {KAHOOT_COLORS.map((c, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            className="rounded-2xl flex items-center justify-center active:scale-95 transition-transform"
            style={{ background: c.bg }}
          >
            <span className="text-white/60 text-2xl font-semibold">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

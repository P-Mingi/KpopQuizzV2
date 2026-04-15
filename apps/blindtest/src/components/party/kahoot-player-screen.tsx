'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { usePartyChannel } from '@/hooks/use-party-channel';

const ANSWER_COLORS = ['#378ADD', '#D4537E', '#639922', '#BA7517'];
const ANSWER_BG = ['#E6F1FB', '#FBEAF0', '#EAF3DE', '#FAEEDA'];

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
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5">
        <p className="text-2xl font-bold text-primary mb-1">Game Over!</p>
        <p className="text-4xl font-bold text-accent mb-2">{me?.score?.toLocaleString() ?? score.toLocaleString()}</p>
        <p className="text-sm text-ghost mb-6">You placed #{myRank} of {players.length}</p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-medium"
        >
          Back to lobby
        </button>
      </div>
    );
  }

  // Waiting for host to start
  if (roomState.status === 'waiting') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5">
        <p className="text-lg font-bold text-primary mb-2">Room: {roomCode}</p>
        <p className="text-sm text-ghost">Waiting for host to start...</p>
        <p className="text-xs text-ghost mt-4">{players.length} players in room</p>
      </div>
    );
  }

  // Already answered this round
  if (waitingForNext || hasAnswered) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5">
        <div className="w-12 h-12 border-2 border-accent border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-ghost">Answer submitted! Waiting for results...</p>
        <p className="text-xs text-ghost mt-2 tabular-nums">Score: {score.toLocaleString()}</p>
      </div>
    );
  }

  // Show 4 colored answer buttons (no question text, no audio)
  return (
    <div className="min-h-[100dvh] flex flex-col px-4 py-4">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs text-ghost">Room: {roomCode}</span>
        <span className="text-xs text-ghost">Round {currentRound + 1}/{totalRounds}</span>
      </div>

      <p className="text-center text-sm font-medium text-primary mb-6">Tap your answer!</p>

      <div className="flex-1 grid grid-cols-2 gap-3 content-center">
        {choices.map((_, i) => (
          <button
            key={i}
            onClick={() => handleAnswer(i)}
            className="rounded-2xl h-28 flex items-center justify-center active:scale-[0.95] transition-transform"
            style={{ backgroundColor: ANSWER_BG[i % 4] }}
          >
            <div
              className="w-10 h-10 rounded-full"
              style={{ backgroundColor: ANSWER_COLORS[i % 4] }}
            />
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-ghost mt-4 tabular-nums">Score: {score.toLocaleString()}</p>
    </div>
  );
}

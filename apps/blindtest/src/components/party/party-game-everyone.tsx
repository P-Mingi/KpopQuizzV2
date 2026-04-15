'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioPlayer } from '@/components/game/use-audio-player';
import { usePartyChannel } from '@/hooks/use-party-channel';
import { GameHUD } from '@/components/game/game-hud';
import { AudioVisualizer } from '@/components/game/audio-visualizer';
import { CircularTimer, AnswerButton, AlbumArt, SongInfoReveal } from '@/components/game/game-ui';

import type { Question } from '@/components/game/use-game-state';

interface Props {
  roomCode: string;
  roomId: string;
  partyPlayerId: string;
  questions: Question[];
  timerDuration: number;
}

type Phase = 'ready' | 'playing' | 'reveal' | 'results';

export function PartyGameEveryone({ roomCode, roomId, partyPlayerId, questions, timerDuration }: Props) {
  const router = useRouter();
  const audio = useAudioPlayer();
  const { players } = usePartyChannel(roomId);

  const [phase, setPhase] = useState<Phase>('ready');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [timerKey, setTimerKey] = useState(0);
  const revealTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerStart = useRef(0);

  const q = questions[currentIndex];
  const isLast = currentIndex >= questions.length - 1;

  // Start game
  const handleStart = useCallback(() => {
    audio.unlock();
    setPhase('playing');
    timerStart.current = Date.now();
    if (q) audio.loadAndPlay(q.preview_url);
    setTimerKey((k) => k + 1);
  }, [audio, q]);

  // Submit answer
  const handleAnswer = useCallback(async (choice: string) => {
    if (phase !== 'playing' || !q) return;
    setSelectedChoice(choice);

    const timeMs = Date.now() - timerStart.current;
    const correct = choice === q.correct_answer;
    const newCombo = correct ? combo + 1 : 0;
    const points = correct ? Math.max(50, Math.round(1000 * (1 - (timeMs / 1000 / timerDuration) * 0.935))) : 0;
    const comboMultiplier = newCombo >= 5 ? 5 : newCombo >= 3 ? 3 : newCombo >= 2 ? 2 : 1;
    const totalPoints = Math.round(points * comboMultiplier);

    setScore((s) => s + totalPoints);
    setCombo(newCombo);
    setBestCombo((b) => Math.max(b, newCombo));
    if (correct) setCorrectCount((c) => c + 1);

    // Send answer to server
    await fetch(`/api/party/${roomCode}/answer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partyPlayerId,
        round: currentIndex,
        answer: choice,
        correct,
        timeMs,
        points: totalPoints,
      }),
    }).catch(() => {});

    audio.fadeOut(400);
    setPhase('reveal');

    revealTimeout.current = setTimeout(() => {
      if (isLast) {
        setPhase('results');
      } else {
        setCurrentIndex((i) => i + 1);
        setSelectedChoice(null);
        setPhase('playing');
        timerStart.current = Date.now();
        const nextQ = questions[currentIndex + 1];
        if (nextQ) audio.loadAndPlay(nextQ.preview_url);
        setTimerKey((k) => k + 1);
      }
    }, 1500);
  }, [phase, q, combo, timerDuration, roomCode, partyPlayerId, currentIndex, isLast, questions, audio]);

  const handleTimeout = useCallback(() => {
    if (phase !== 'playing') return;
    handleAnswer('__timeout__');
  }, [phase, handleAnswer]);

  useEffect(() => {
    return () => {
      audio.cleanup();
      if (revealTimeout.current) clearTimeout(revealTimeout.current);
    };
  }, [audio]);

  // Ready screen
  if (phase === 'ready') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5">
        <p className="text-2xl font-bold text-primary mb-2">Everyone Mode</p>
        <p className="text-xs text-ghost mb-6">{questions.length} songs - {timerDuration}s timer - Listen on your device</p>
        <button
          onClick={handleStart}
          className="px-12 py-4 rounded-2xl bg-accent text-white font-bold text-lg active:scale-[0.97] transition-transform"
        >
          START
        </button>
      </div>
    );
  }

  // Results screen
  if (phase === 'results') {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-5 py-8">
        <p className="text-2xl font-bold text-primary mb-1">Game Over!</p>
        <p className="text-4xl font-bold text-accent mb-6">{score.toLocaleString()} pts</p>
        <p className="text-sm text-ghost mb-6">{correctCount}/{questions.length} correct - Best combo: x{bestCombo}</p>

        <div className="w-full max-w-sm mb-6">
          <p className="text-[10px] text-ghost uppercase tracking-wider mb-2">Leaderboard</p>
          {sortedPlayers.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-xl border border-subtle mb-1">
              <span className={`text-sm font-bold w-6 text-center ${i === 0 ? 'text-accent' : 'text-ghost'}`}>
                {i + 1}
              </span>
              <span className="text-sm font-medium text-primary flex-1">{p.display_name}</span>
              <span className="text-sm font-medium text-primary tabular-nums">{p.score.toLocaleString()}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/')}
          className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-medium"
        >
          Back to lobby
        </button>
      </div>
    );
  }

  if (!q) return null;

  const isRevealing = phase === 'reveal';

  function getButtonState(choice: string): 'default' | 'correct' | 'wrong' | 'dimmed' {
    if (!isRevealing) return 'default';
    if (choice === q!.correct_answer) return 'correct';
    if (choice === selectedChoice && choice !== q!.correct_answer) return 'wrong';
    return 'dimmed';
  }

  return (
    <div className="min-h-[100dvh] flex flex-col max-w-[440px] mx-auto w-full px-4 py-3">
      <GameHUD
        round={currentIndex + (isRevealing ? 1 : 0)}
        totalRounds={questions.length}
        score={score}
        comboStreak={combo}
        mode="party"
      />

      <div className="flex flex-col items-center gap-4 flex-1 justify-center">
        <AlbumArt src={q.album_cover_big ?? q.album_cover_medium} revealed={isRevealing} />

        {isRevealing ? (
          <SongInfoReveal title={q.reveal.title} artist={q.reveal.artist} album={q.reveal.album} revealed />
        ) : (
          <>
            <AudioVisualizer isPlaying={phase === 'playing'} />
            <CircularTimer duration={timerDuration} running={phase === 'playing'} onExpired={handleTimeout} timerKey={timerKey} />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 pb-6">
        {q.choices.map((choice) => (
          <AnswerButton
            key={choice}
            text={choice}
            state={getButtonState(choice)}
            onClick={() => handleAnswer(choice)}
            disabled={isRevealing}
          />
        ))}
      </div>

      {/* Mini live leaderboard */}
      <div className="flex gap-2 justify-center pb-4">
        {players.slice(0, 4).map((p, i) => (
          <div key={p.id} className="text-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${i === 0 ? 'bg-accent text-white' : 'bg-elevated text-ghost'}`}>
              {p.display_name.charAt(0)}
            </div>
            <p className="text-[8px] text-ghost mt-0.5 tabular-nums">{p.score}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

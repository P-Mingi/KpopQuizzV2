'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioPlayer } from './use-audio-player';
import { useGameState } from './use-game-state';
import {
  CircularTimer,
  ProgressDots,
  WaveBars,
  PointsFloat,
  AnswerButton,
  AlbumArt,
  ComboBadge,
  ResultsScreen,
} from './game-ui';

import type { Question } from './use-game-state';

interface Props {
  playlist: string;
  mode: string;
  difficulty: string;
}

export function GamePlayer({ playlist, mode, difficulty }: Props) {
  const router = useRouter();
  const audio = useAudioPlayer();
  const game = useGameState();
  const [timerKey, setTimerKey] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch game data on mount
  useEffect(() => {
    async function fetchGame() {
      try {
        const res = await fetch('/api/game/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playlist, mode, difficulty }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? 'Failed to generate game');
          return;
        }

        game.startGame(
          data.questions as Question[],
          data.timer_duration as number,
          data.playlist as string,
          data.mode as string,
          data.difficulty as string,
        );
      } catch {
        setError('Failed to load game. Try again.');
      }
    }
    fetchGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist, mode, difficulty]);

  // Play audio when entering 'playing' phase
  useEffect(() => {
    if (game.state.phase === 'playing' && game.currentQuestion) {
      setSelectedChoice(null);
      audio.load(game.currentQuestion.preview_url);
      // Small delay before play to let audio buffer
      const t = setTimeout(() => audio.play(), 200);
      setTimerKey((k) => k + 1);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.state.phase, game.state.currentIndex]);

  // Auto-advance after reveal
  useEffect(() => {
    if (game.state.phase === 'reveal') {
      audio.fadeOut(400);
      revealTimeoutRef.current = setTimeout(() => {
        game.nextSong();
      }, 1500);
      return () => {
        if (revealTimeoutRef.current) clearTimeout(revealTimeoutRef.current);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.state.phase, game.state.currentIndex]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => audio.cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswer = useCallback((choice: string) => {
    if (game.state.phase !== 'playing') return;
    setSelectedChoice(choice);
    game.submitAnswer(choice);
  }, [game]);

  const handleTimeout = useCallback(() => {
    if (game.state.phase !== 'playing') return;
    setSelectedChoice(null);
    game.submitAnswer(null);
  }, [game]);

  const handleQuit = useCallback(() => {
    audio.cleanup();
    router.push('/');
  }, [audio, router]);

  const handlePlayAgain = useCallback(() => {
    audio.cleanup();
    router.refresh();
  }, [audio, router]);

  const q = game.currentQuestion;
  const phase = game.state.phase;
  const lastResult = game.state.results[game.state.results.length - 1];

  // ---- Loading ----
  if (phase === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        {error ? (
          <>
            <p className="text-wrong text-sm text-center">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="text-sm px-4 py-2 bg-bg-secondary border border-border-default rounded-xl text-text-primary"
            >
              Go home
            </button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-secondary">Loading songs...</p>
          </>
        )}
      </div>
    );
  }

  // ---- Results ----
  if (phase === 'results') {
    return (
      <ResultsScreen
        score={game.state.totalScore}
        correctCount={game.correctCount}
        total={game.state.questions.length}
        bestCombo={game.state.bestCombo}
        avgSpeed={game.avgSpeed}
        results={game.state.results}
        onPlayAgain={handlePlayAgain}
        onHome={handleQuit}
      />
    );
  }

  if (!q) return null;

  const isRevealing = phase === 'reveal';

  // Determine button states
  function getButtonState(choice: string): 'default' | 'correct' | 'wrong' | 'dimmed' {
    if (!isRevealing) return 'default';
    if (choice === q!.correct_answer) return 'correct';
    if (choice === selectedChoice && choice !== q!.correct_answer) return 'wrong';
    return 'dimmed';
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <div className="h-12 border-b border-border-default flex items-center justify-between px-4">
        <div className="text-sm font-semibold">
          <span className="text-text-primary">kpop</span>
          <span className="text-[var(--logo-accent)]">blind</span>
          <span className="text-text-primary">test</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-ghost">{game.state.playlist} - {game.state.mode}</span>
          <button
            onClick={handleQuit}
            className="text-xs text-text-ghost px-3 py-1.5 border border-border-default rounded-md hover:text-text-secondary hover:border-border-hover transition-colors"
          >
            Quit
          </button>
        </div>
      </div>

      {/* Game content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-[440px]">
          {/* Header: progress + score */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm font-semibold text-text-primary">
              {game.state.currentIndex + 1}/{game.state.questions.length}
            </span>
            <ProgressDots
              total={game.state.questions.length}
              current={game.state.currentIndex}
              results={game.state.results}
            />
            <div className="relative">
              <span className="text-sm font-semibold text-text-primary tabular-nums">
                {game.state.totalScore.toLocaleString()}
              </span>
              <PointsFloat points={game.lastPoints} show={isRevealing && lastResult?.correct === true} />
            </div>
          </div>

          {/* Album art */}
          <AlbumArt
            src={q.album_cover_big ?? q.album_cover_medium}
            revealed={isRevealing}
          />

          {/* Timer + wave bars */}
          <div className="flex items-center justify-center gap-4 my-4">
            {isRevealing ? (
              <div className="text-center">
                <p className="text-base font-semibold text-text-primary">{q.reveal.title}</p>
                <p className="text-sm text-text-secondary">{q.reveal.artist} - {q.reveal.album ?? ''}</p>
              </div>
            ) : (
              <>
                <CircularTimer
                  duration={game.state.timerDuration}
                  running={phase === 'playing'}
                  onExpired={handleTimeout}
                  timerKey={timerKey}
                />
                <WaveBars active={phase === 'playing'} />
              </>
            )}
          </div>

          {/* Combo */}
          <div className="flex justify-center mb-3 h-5">
            <ComboBadge combo={game.state.currentCombo} multiplier={game.comboMultiplier} />
          </div>

          {/* Question text */}
          {!isRevealing && (
            <p className="text-sm text-text-secondary text-center mb-4">
              {q.question_text}
            </p>
          )}

          {/* Answer buttons */}
          <div className="grid gap-2.5 md:grid-cols-2">
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
        </div>
      </div>
    </div>
  );
}

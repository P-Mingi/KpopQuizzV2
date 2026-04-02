'use client';

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioPlayer } from './use-audio-player';
import { useGameState } from './use-game-state';
import { ChallengeInput } from './challenge-input';
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
  const [allArtists, setAllArtists] = useState<string[]>([]);
  const [allTitles, setAllTitles] = useState<string[]>([]);
  const [progressionData, setProgressionData] = useState<{
    xpEarned: number;
    totalXP: number;
    level: number;
    title: string;
    leveledUp: boolean;
    oldLevel: number;
    streak: number;
    isFirstGameToday: boolean;
    isPerfectRound: boolean;
    mastery: { play_count: number; best_score: number; mastery_stars: number } | null;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [fetchedData, setFetchedData] = useState<{
    questions: Question[];
    timer_duration: number;
    playlist: string;
    mode: string;
    difficulty: string;
  } | null>(null);
  const revealTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isChallenge = mode === 'challenge';

  // Fetch game data on mount (but don't start yet - wait for user tap)
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

        setAllArtists((data.all_artists ?? []) as string[]);
        setAllTitles((data.all_titles ?? []) as string[]);
        setFetchedData({
          questions: data.questions as Question[],
          timer_duration: data.timer_duration as number,
          playlist: data.playlist as string,
          mode: data.mode as string,
          difficulty: data.difficulty as string,
        });
        setReady(true);
      } catch {
        setError('Failed to load game. Try again.');
      }
    }
    fetchGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist, mode, difficulty]);

  // User taps "Start" - unlock audio + start game
  const handleStart = useCallback(() => {
    if (!fetchedData) return;
    audio.unlock(); // Unlock audio context on user gesture
    game.startGame(
      fetchedData.questions,
      fetchedData.timer_duration,
      fetchedData.playlist,
      fetchedData.mode,
      fetchedData.difficulty,
    );
  }, [fetchedData, game, audio]);

  // Play audio when entering 'playing' phase
  useEffect(() => {
    if (game.state.phase === 'playing' && game.currentQuestion) {
      setSelectedChoice(null);
      audio.loadAndPlay(game.currentQuestion.preview_url);
      setTimerKey((k) => k + 1);
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

  // Save result when game ends
  useEffect(() => {
    if (game.state.phase !== 'results') return;

    async function saveResult() {
      try {
        const correctResults = game.state.results.filter((r) => r.correct);
        const avgSpd = correctResults.length > 0
          ? correctResults.reduce((sum, r) => sum + r.timeElapsed, 0) / correctResults.length
          : 0;

        const res = await fetch('/api/game/save-result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: game.state.mode,
            playlist: game.state.playlist,
            difficulty: game.state.difficulty,
            score: game.state.totalScore,
            correctCount: game.correctCount,
            totalSongs: game.state.results.length,
            bestCombo: game.state.bestCombo,
            avgSpeed: Math.round(avgSpd * 10) / 10,
            songResults: game.state.results.map((r) => ({
              song_id: r.question.song_id,
              correct: r.correct,
              points: r.points,
              time: r.timeElapsed,
              answered: r.answered,
            })),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.saved) setProgressionData(data);
        }
      } catch {
        // Not logged in or network error - silent fail
      }
    }

    saveResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.state.phase]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => audio.cleanup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Quick Play: button answer
  const handleAnswer = useCallback((choice: string) => {
    if (game.state.phase !== 'playing') return;
    setSelectedChoice(choice);
    game.submitAnswer(choice);
  }, [game]);

  // Challenge: typed answer
  const handleChallengeSubmit = useCallback((answer: string | null) => {
    if (game.state.phase !== 'playing') return;
    setSelectedChoice(answer);
    game.submitAnswer(answer);
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

  // Possible answers for challenge auto-suggest
  const allPossibleAnswers = useMemo(() => {
    if (!game.currentQuestion) return [];
    return game.currentQuestion.question_type === 'artist' ? allArtists : allTitles;
  }, [game.currentQuestion, allArtists, allTitles]);

  const q = game.currentQuestion;
  const phase = game.state.phase;
  const lastResult = game.state.results[game.state.results.length - 1];

  // ---- Loading / Ready ----
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
        ) : ready ? (
          <>
            <p className="text-lg font-semibold text-text-primary">Ready to play</p>
            <p className="text-sm text-text-secondary">
              10 songs - {isChallenge ? 'type your answer' : '4 choices'} - {isChallenge ? '10s' : '15s'} timer
            </p>
            <button
              onClick={handleStart}
              className="mt-4 px-8 py-3 rounded-xl bg-pink-600 text-white font-semibold text-base hover:bg-pink-400 transition-colors active:scale-[0.97]"
            >
              Start
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
        progression={progressionData}
        playlist={game.state.playlist}
        onPlayAgain={handlePlayAgain}
        onHome={handleQuit}
      />
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
    <div className="flex flex-col min-h-screen">
      {/* Top bar */}
      <div className="h-12 border-b border-border-default flex items-center justify-between px-4">
        <div className="text-sm font-semibold">
          <span className="text-text-primary">kpop</span>
          <span className="text-[var(--logo-accent)]">blind</span>
          <span className="text-text-primary">test</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-ghost">
            {game.state.playlist} - {isChallenge ? 'challenge' : game.state.mode}
          </span>
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
              {isChallenge && (
                <span className="ml-1.5 text-pink-400 text-xs font-medium">1.5x</span>
              )}
            </p>
          )}

          {/* Answer area */}
          {isChallenge ? (
            <ChallengeInput
              questionType={q.question_type}
              correctAnswer={q.correct_answer}
              allPossibleAnswers={allPossibleAnswers}
              onSubmit={handleChallengeSubmit}
              disabled={isRevealing}
              revealState={isRevealing && lastResult ? {
                correct: lastResult.correct,
                userAnswer: lastResult.answered,
              } : null}
            />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}

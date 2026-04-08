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
  SongInfoReveal,
  ComboBadge,
  ResultsScreen,
} from './game-ui';
import { ComboParticles } from './combo-particles';
import {
  playTap,
  playCorrect,
  playWrong,
  playCombo,
  playReveal,
  toggleSound,
  getSoundEnabled,
} from '@/lib/sounds';
import { hapticMedium, hapticSuccess, hapticError } from '@/lib/haptics';

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
  const [comboParticleTrigger, setComboParticleTrigger] = useState(0);
  const [urgentFlash, setUrgentFlash] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    setSoundEnabled(getSoundEnabled());
  }, []);

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

  // Auto-advance after reveal + play reveal whoosh
  useEffect(() => {
    if (game.state.phase === 'reveal') {
      audio.fadeOut(400);
      playReveal();
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

  // Audio/haptic feedback for a submitted answer.
  const feedbackFor = useCallback((answer: string | null) => {
    if (!game.currentQuestion) return;
    const correct = answer !== null && answer === game.currentQuestion.correct_answer;
    if (correct) {
      playCorrect();
      hapticSuccess();
      // Combo is about to increment; use the CURRENT value + 1 for pitch
      const nextCombo = game.state.currentCombo + 1;
      if (nextCombo >= 3) {
        playCombo(nextCombo);
        if (nextCombo >= 5) {
          hapticMedium();
          setComboParticleTrigger((t) => t + 1);
        }
      }
    } else {
      playWrong();
      hapticError();
    }
  }, [game.currentQuestion, game.state.currentCombo]);

  // Quick Play: button answer
  const handleAnswer = useCallback((choice: string) => {
    if (game.state.phase !== 'playing') return;
    setSelectedChoice(choice);
    feedbackFor(choice);
    game.submitAnswer(choice);
  }, [game, feedbackFor]);

  // Challenge: typed answer
  const handleChallengeSubmit = useCallback((answer: string | null) => {
    if (game.state.phase !== 'playing') return;
    setSelectedChoice(answer);
    feedbackFor(answer);
    game.submitAnswer(answer);
  }, [game, feedbackFor]);

  const handleTimeout = useCallback(() => {
    if (game.state.phase !== 'playing') return;
    setSelectedChoice(null);
    playWrong();
    hapticError();
    game.submitAnswer(null);
  }, [game]);

  const handleUrgentTick = useCallback(() => {
    setUrgentFlash(true);
    setTimeout(() => setUrgentFlash(false), 150);
  }, []);

  const handleToggleSound = useCallback(() => {
    const enabled = toggleSound();
    setSoundEnabled(enabled);
    if (enabled) playTap();
  }, []);

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
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5">
        {error ? (
          <>
            <p className="text-wrong text-sm text-center">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="text-sm px-4 py-2 bg-surface border border-default rounded-xl text-primary"
            >
              Go home
            </button>
          </>
        ) : ready ? (
          <>
            <p className="text-2xl font-bold text-primary">Ready to play?</p>
            <p className="text-xs text-ghost text-center">
              10 songs - {isChallenge ? 'type your answer' : '4 choices'} - {isChallenge ? '10s' : '15s'} timer
            </p>
            <button
              onClick={handleStart}
              className="mt-4 px-12 py-4 rounded-2xl bg-accent text-primary font-bold text-lg active:scale-[0.97] transition-transform"
            >
              START
            </button>
          </>
        ) : (
          <>
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-secondary">Loading songs...</p>
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
        mode={game.state.mode}
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
    <div className="flex-1 flex flex-col relative">
      {/* Red flash overlay on urgent timer ticks */}
      {urgentFlash && (
        <div className="absolute inset-0 bg-wrong opacity-[0.06] pointer-events-none rounded-2xl transition-opacity duration-150 z-10" />
      )}

      {/* Top bar: quit | counter | sound toggle + score */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          type="button"
          onClick={handleQuit}
          className="text-[11px] text-ghost hover:text-tertiary transition-colors"
        >
          Quit
        </button>
        <span className="text-xs text-ghost tabular-nums">
          {game.state.currentIndex + 1} / {game.state.questions.length}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleSound}
            className="text-ghost hover:text-tertiary transition-colors"
            aria-label={soundEnabled ? 'Mute sounds' : 'Unmute sounds'}
          >
            {soundEnabled ? (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M7 3L3.5 6H1v4h2.5L7 13V3z" fill="currentColor" />
                <path d="M10 5.5a3 3 0 010 5M12 3.5a6 6 0 010 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M7 3L3.5 6H1v4h2.5L7 13V3z" fill="currentColor" />
                <path d="M10 6l4 4M14 6l-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            )}
          </button>
          <div className="relative">
            <span className="text-lg font-bold text-primary tabular-nums">
              {game.state.totalScore.toLocaleString()}
            </span>
            <PointsFloat
              points={game.lastPoints}
              show={isRevealing && lastResult?.correct === true}
            />
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="px-4 pb-3">
        <ProgressDots
          total={game.state.questions.length}
          current={game.state.currentIndex}
          results={game.state.results}
        />
      </div>

      {/* Immersive body */}
      <div className="flex flex-col items-center gap-4 px-5 pt-4 pb-2">
        {/* Album art */}
        <AlbumArt
          src={q.album_cover_big ?? q.album_cover_medium}
          revealed={isRevealing}
        />

        {/* Reveal: song info; Playing: waves + timer */}
        {isRevealing ? (
          <SongInfoReveal
            title={q.reveal.title}
            artist={q.reveal.artist}
            album={q.reveal.album}
            revealed
          />
        ) : (
          <>
            <WaveBars active={phase === 'playing'} />
            <CircularTimer
              duration={game.state.timerDuration}
              running={phase === 'playing'}
              onExpired={handleTimeout}
              timerKey={timerKey}
              onUrgentTick={handleUrgentTick}
            />
          </>
        )}

        {/* Combo (>= 3) with particle burst on 5+ */}
        {!isRevealing && game.state.currentCombo >= 3 && (
          <div className="relative">
            <ComboBadge combo={game.state.currentCombo} multiplier={game.comboMultiplier} />
            <ComboParticles combo={game.state.currentCombo} trigger={comboParticleTrigger} />
          </div>
        )}

        {/* Question text (challenge only) */}
        {!isRevealing && isChallenge && (
          <p className="text-[13px] text-ghost text-center">
            {q.question_text}
            <span className="ml-1.5 text-accent text-xs font-semibold">1.5x</span>
          </p>
        )}
      </div>

      {/* Answer area pinned near the bottom */}
      <div className="px-5 pb-8">
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
          <div className="flex flex-col gap-2 md:grid md:grid-cols-2">
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
  );
}

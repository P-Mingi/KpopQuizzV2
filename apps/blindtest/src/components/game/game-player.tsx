'use client';

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioPlayer } from './use-audio-player';
import { useGameState } from './use-game-state';
import { ChallengeInput } from './challenge-input';
import {
  CircularTimer,
  AnswerButton,
  AlbumArt,
  SongInfoReveal,
  ComboBadge,
  ResultsScreen,
} from './game-ui';
import { GameHUD } from './game-hud';
import { AudioVisualizer } from './audio-visualizer';
import { PowerupBar } from './powerup-bar';
import { RoundHistory } from './round-history';
import { GameSidebar } from './game-sidebar';
import { ComboParticles } from './combo-particles';
import { LightstickMascot, type MascotMood } from '@/components/mascot/lightstick-mascot';
import { KOREAN_MOMENTS } from '@/lib/korean-moments';
import { getInitialPowerups, type PowerupId } from '@/lib/powerups';
import {
  playCorrect,
  playWrong,
  playCombo,
  playReveal,
} from '@/lib/sounds';
import { hapticMedium, hapticSuccess, hapticError } from '@/lib/haptics';

import type { Question } from './use-game-state';

interface Props {
  playlist: string;
  mode: string;
  difficulty: string;
  /**
   * Optional fetch override. When set, the player does a GET to this URL
   * instead of POSTing to /api/game/generate. Used by the daily and challenge
   * flows so everyone gets the same frozen questions.
   */
  presetUrl?: string;
  /** When set, save completed results to /api/daily/record using this id. */
  dailyChallengeId?: string;
  /** Daily #N passed through to ResultsScreen for share formatting. */
  dailyNumber?: number;
  /** When set, save completed results to /api/challenge/attempt with this code. */
  challengeCode?: string;
  /** Nickname used when the player isn't logged in (challenge flow). */
  challengePlayerName?: string;
}

export function GamePlayer({
  playlist,
  mode,
  difficulty,
  presetUrl,
  dailyChallengeId,
  dailyNumber,
  challengeCode,
  challengePlayerName,
}: Props) {
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
  const [challengeComparisonData, setChallengeComparisonData] = useState<{
    creator: { name: string; score: number; correct: number; total: number; time: number | null };
    player: { name: string; score: number; correct: number; total: number; time: number | null };
    shortCode: string;
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
  const [mascotMood, setMascotMood] = useState<MascotMood>('idle');
  const [wrongFlashKey, setWrongFlashKey] = useState(0);
  const [powerups, setPowerups] = useState(getInitialPowerups());
  const [usedPowerupThisRound, setUsedPowerupThisRound] = useState<PowerupId | null>(null);
  const [removedAnswers, setRemovedAnswers] = useState<string[]>([]);


  const isChallenge = mode === 'challenge';

  // Fetch game data on mount (but don't start yet - wait for user tap)
  useEffect(() => {
    async function fetchGame() {
      try {
        const res = presetUrl
          ? await fetch(presetUrl, { method: 'GET' })
          : await fetch('/api/game/generate', {
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
          timer_duration: (data.timer_duration as number) ?? (mode === 'challenge' ? 10 : 15),
          playlist: (data.playlist as string) ?? playlist,
          mode: (data.mode as string) ?? mode,
          difficulty: (data.difficulty as string) ?? difficulty,
        });
        setReady(true);
      } catch {
        setError('Failed to load game. Try again.');
      }
    }
    fetchGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist, mode, difficulty, presetUrl]);

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
      setMascotMood('idle');
      setUsedPowerupThisRound(null);
      setRemovedAnswers([]);
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
        const totalTime = game.state.results.reduce((sum, r) => sum + r.timeElapsed, 0);

        const songResults = game.state.results.map((r) => ({
          song_id: r.question.song_id,
          correct: r.correct,
          points: r.points,
          time: r.timeElapsed,
          answered: r.answered,
        }));

        // Challenge flow posts to /api/challenge/attempt (writes challenge_attempts +
        // also updates bt_players when signed in).
        if (challengeCode) {
          const res = await fetch('/api/challenge/attempt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              challengeCode,
              playerName: challengePlayerName,
              score: game.state.totalScore,
              correctCount: game.correctCount,
              totalSongs: game.state.results.length,
              bestCombo: game.state.bestCombo,
              timeTaken: Math.round(totalTime * 10) / 10,
              songResults,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.saved || data.success) setProgressionData(data);
            if (data.creator && data.player && data.challenge?.short_code) {
              setChallengeComparisonData({
                creator: data.creator,
                player: data.player,
                shortCode: data.challenge.short_code,
              });
            }
          }
          return;
        }

        // Daily flow posts to /api/daily/record (writes daily_challenge_plays +
        // also updates bt_players for XP/progression).
        if (dailyChallengeId) {
          const res = await fetch('/api/daily/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              challenge_id: dailyChallengeId,
              score: game.state.totalScore,
              correct: game.correctCount,
              total: game.state.results.length,
              total_time: Math.round(totalTime * 10) / 10,
              best_combo: game.state.bestCombo,
              songs: songResults,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.saved || data.success) setProgressionData(data);
            // Flag "played today" in localStorage for client-side gating.
            try {
              const key = `kbt-daily-played-${new Date().toISOString().slice(0, 10)}`;
              localStorage.setItem(key, 'true');
            } catch { /* ignore storage errors */ }
          }
          return;
        }

        // Ranked mode posts to /api/play/ranked for separate leaderboard tracking.
        if (game.state.mode === 'ranked') {
          const rankedRes = await fetch('/api/play/ranked', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playlist: game.state.playlist,
              score: game.state.totalScore,
              correctCount: game.correctCount,
              totalSongs: game.state.results.length,
              bestCombo: game.state.bestCombo,
              avgSpeed: Math.round(avgSpd * 10) / 10,
              songResults,
              songIds: game.state.questions.map((q) => q.song_id),
            }),
          });
          if (rankedRes.ok) {
            const data = await rankedRes.json();
            if (data.saved) setProgressionData(data);
          }
          return;
        }

        // Default flow (Quick / Solo) posts to /api/game/save-result.
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
            songResults,
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

  // Audio/haptic/mascot feedback for a submitted answer.
  const feedbackFor = useCallback((answer: string | null) => {
    if (!game.currentQuestion) return;
    const correct = answer !== null && answer === game.currentQuestion.correct_answer;
    if (correct) {
      playCorrect();
      hapticSuccess();
      // Combo is about to increment; use the CURRENT value + 1 for pitch
      const nextCombo = game.state.currentCombo + 1;
      if (nextCombo >= 5) {
        playCombo(nextCombo);
        hapticMedium();
        setComboParticleTrigger((t) => t + 1);
        setMascotMood('combo');
      } else if (nextCombo >= 3) {
        playCombo(nextCombo);
        setMascotMood('correct');
      } else {
        setMascotMood('correct');
      }
    } else {
      playWrong();
      hapticError();
      setMascotMood('wrong');
      setWrongFlashKey((k) => k + 1);
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
    setMascotMood('wrong');
    setWrongFlashKey((k) => k + 1);
    game.submitAnswer(null);
  }, [game]);

  const handleUrgentTick = useCallback(() => {
    setUrgentFlash(true);
    setTimeout(() => setUrgentFlash(false), 150);
  }, []);


  const handleUsePowerup = useCallback((id: PowerupId) => {
    if (game.state.phase !== 'playing' || usedPowerupThisRound) return;
    if (powerups[id] <= 0) return;

    setPowerups((prev) => ({ ...prev, [id]: prev[id] - 1 }));
    setUsedPowerupThisRound(id);

    if (id === 'skip') {
      // Skip this song, 0 points
      game.submitAnswer(null);
    } else if (id === 'fifty_fifty' && game.currentQuestion) {
      // Remove 2 wrong answers
      const wrong = game.currentQuestion.choices.filter(
        (c) => c !== game.currentQuestion!.correct_answer,
      );
      const toRemove = wrong.sort(() => Math.random() - 0.5).slice(0, 2);
      setRemovedAnswers(toRemove);
    }
    // extra_time: handled by adding time to timer (timer component would need extension)
    // For now, extra_time just marks the round as power-up-used (50% point penalty)
  }, [game, powerups, usedPowerupThisRound]);

  const handleQuit = useCallback(() => {
    audio.cleanup();
    router.push('/');
  }, [audio, router]);

  const handlePlayAgain = useCallback(() => {
    audio.cleanup();
    // Daily is one attempt per day; send them back to the daily page instead.
    if (dailyChallengeId) {
      router.push('/daily');
      return;
    }
    // Challenge: back to the challenge landing so they can accept again / share.
    if (challengeCode) {
      router.push(`/challenge/${challengeCode}`);
      return;
    }
    router.refresh();
  }, [audio, router, dailyChallengeId, challengeCode]);

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
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-5 max-w-[440px] mx-auto w-full">
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
        questions={game.state.questions}
        {...(dailyNumber !== undefined ? { dailyNumber } : {})}
        {...(challengeComparisonData ? { challengeComparison: challengeComparisonData } : {})}
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

  const avgSpeedMs = game.state.results.length > 0
    ? (game.state.results.reduce((sum, r) => sum + r.timeElapsed, 0) / game.state.results.length) * 1000
    : 0;

  return (
    <div className="flex-1 flex gap-4 justify-center relative">
      {/* Main game column */}
      <div className="flex-1 flex flex-col relative max-w-[440px] w-full">
        {/* Reactive mascot */}
        <LightstickMascot mood={mascotMood} />

        {/* Red flash overlay on urgent timer ticks */}
        {urgentFlash && (
          <div className="absolute inset-0 bg-wrong opacity-[0.06] pointer-events-none rounded-2xl transition-opacity duration-150 z-10" />
        )}

        {/* Wrong-answer Korean flash */}
        {isRevealing && lastResult && !lastResult.correct && (
          <p
            key={wrongFlashKey}
            className="absolute top-[120px] left-1/2 -translate-x-1/2 text-base font-semibold text-wrong-text animate-fade-out pointer-events-none z-20"
          >
            {KOREAN_MOMENTS.wrong!.text}
          </p>
        )}

        {/* HUD: quit, combo, score, health bar */}
        <div className="px-4 py-3">
          <GameHUD
            round={game.state.currentIndex + (isRevealing ? 1 : 0)}
            totalRounds={game.state.questions.length}
            score={game.state.totalScore}
            comboStreak={game.state.currentCombo}
            mode={game.state.mode}
          />
        </div>

        {/* Immersive body */}
        <div className="flex flex-col items-center gap-4 px-5 pt-2 pb-2">
          {/* Album art */}
          <AlbumArt
            src={q.album_cover_big ?? q.album_cover_medium}
            revealed={isRevealing}
          />

          {/* Reveal: song info; Playing: visualizer + timer */}
          {isRevealing ? (
            <SongInfoReveal
              title={q.reveal.title}
              artist={q.reveal.artist}
              album={q.reveal.album}
              revealed
            />
          ) : (
            <>
              <AudioVisualizer isPlaying={phase === 'playing'} />
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

        {/* Answer area */}
        <div className="px-5 pb-4">
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
            <div className="grid grid-cols-2 gap-2">
              {q.choices.map((choice) => (
                <AnswerButton
                  key={choice}
                  text={choice}
                  state={getButtonState(choice)}
                  onClick={() => handleAnswer(choice)}
                  disabled={isRevealing || removedAnswers.includes(choice)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Mobile: power-ups + round history */}
        <div className="md:hidden px-5 pb-6 flex flex-col gap-3">
          {!isChallenge && (
            <PowerupBar
              powerups={powerups}
              onUse={handleUsePowerup}
              disabled={isRevealing || usedPowerupThisRound !== null}
            />
          )}
          <RoundHistory results={game.state.results} totalRounds={game.state.questions.length} />
        </div>
      </div>

      {/* Desktop sidebar */}
      {!isChallenge && (
        <GameSidebar
          score={game.state.totalScore}
          lastRoundPoints={game.lastPoints}
          comboStreak={game.state.currentCombo}
          bestCombo={game.state.bestCombo}
          correctCount={game.correctCount}
          totalPlayed={game.state.results.length}
          avgSpeedMs={avgSpeedMs}
          powerups={powerups}
          results={game.state.results}
          totalRounds={game.state.questions.length}
          onUsePowerup={handleUsePowerup}
          powerupsDisabled={isRevealing || usedPowerupThisRound !== null}
        />
      )}
    </div>
  );
}

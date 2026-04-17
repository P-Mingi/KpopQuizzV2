'use client';

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioPlayer } from './use-audio-player';
import { useGameState } from './use-game-state';
import { ChallengeInput } from './challenge-input';
import {
  CircularTimer,
  type TimerHandle,
  ProgressDots,
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
import { TipBanner } from '@/components/shared/tip-banner';
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
  const timerRef = useRef<TimerHandle>(null);
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
      game.submitAnswer(null);
    } else if (id === 'fifty_fifty' && game.currentQuestion) {
      const wrong = game.currentQuestion.choices.filter(
        (c) => c !== game.currentQuestion!.correct_answer,
      );
      const toRemove = wrong.sort(() => Math.random() - 0.5).slice(0, 2);
      setRemovedAnswers(toRemove);
    } else if (id === 'extra_time') {
      timerRef.current?.addTime(5);
    }
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
      <div
        className="w-full h-screen overflow-hidden relative flex items-center justify-center"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, #2a1f4e 0%, #140e2e 60%, #0a0716 100%)' }}
      >
        <div className="flex flex-col items-center gap-4 px-5 max-w-[440px] mx-auto w-full">
          {error ? (
            <>
              <p className="text-red-400 text-sm text-center">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="text-sm px-4 py-2 bg-white/[0.05] border border-white/[0.06] rounded-xl text-white/70"
              >
                Go home
              </button>
            </>
          ) : ready ? (
            <>
              <p className="text-2xl font-bold text-white">Ready to play?</p>
              <p className="text-xs text-white/30 text-center">
                10 songs - {isChallenge ? 'type your answer' : '4 choices'} - {isChallenge ? '10s' : '15s'} timer
              </p>
              <button
                onClick={handleStart}
                className="w-full py-3 md:py-3.5 rounded-[10px] md:rounded-xl bg-[#D4537E] text-white text-sm font-semibold transition-all active:scale-[0.97] hover:bg-[#C44A72]"
              >
                START
              </button>
            </>
          ) : (
            <>
              <div className="w-8 h-8 border-2 border-[#D4537E] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-white/40">Loading songs...</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- Results ----
  if (phase === 'results') {
    return (
      <div className="w-full h-screen overflow-auto bg-primary">
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

  const avgSpeedMs = game.state.results.length > 0
    ? (game.state.results.reduce((sum, r) => sum + r.timeElapsed, 0) / game.state.results.length) * 1000
    : 0;

  return (
    <div
      className="w-full h-screen overflow-hidden relative"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #2a1f4e 0%, #140e2e 60%, #0a0716 100%)' }}
    >
      {/* Timer bar at the very top */}
      {phase === 'playing' && (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-white/[0.06] z-30" />
      )}

      {/* Reactive mascot */}
      <LightstickMascot mood={mascotMood} />

      {/* Red flash overlay on urgent timer ticks */}
      {urgentFlash && (
        <div className="absolute inset-0 bg-red-500 opacity-[0.06] pointer-events-none transition-opacity duration-150 z-10" />
      )}

      {/* Wrong-answer Korean flash */}
      {isRevealing && lastResult && !lastResult.correct && (
        <p
          key={wrongFlashKey}
          className="absolute top-[120px] left-1/2 -translate-x-1/2 text-base font-semibold text-red-400 animate-fade-out pointer-events-none z-20"
        >
          {KOREAN_MOMENTS.wrong!.text}
        </p>
      )}

      <div className="flex h-full">
        {/* Main game column */}
        <div className="flex-1 flex flex-col max-w-[600px] mx-auto px-4 md:px-6 relative">
          {/* HUD: quit, score, progress */}
          <GameHUD
            round={game.state.currentIndex + (isRevealing ? 1 : 0)}
            totalRounds={game.state.questions.length}
            score={game.state.totalScore}
            comboStreak={game.state.currentCombo}
            mode={game.state.mode}
          />

          {/* Progress dots */}
          <div className="flex justify-center mt-2">
            <ProgressDots
              total={game.state.questions.length}
              current={game.state.currentIndex}
              results={game.state.results}
            />
          </div>

          {/* Combo pill */}
          {!isRevealing && game.state.currentCombo >= 2 && (
            <div className="mt-2 flex justify-center relative">
              <ComboBadge combo={game.state.currentCombo} multiplier={game.comboMultiplier} />
              <ComboParticles combo={game.state.currentCombo} trigger={comboParticleTrigger} />
            </div>
          )}

          {/* Health/progress bar */}
          <div className="mt-3 md:mt-4">
            <div className="h-[4px] md:h-[5px] rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#D4537E] transition-all duration-500"
                style={{ width: `${((game.state.currentIndex + (isRevealing ? 1 : 0)) / game.state.questions.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] md:text-[11px] text-white/25">
              <span>{game.state.currentIndex + (isRevealing ? 1 : 0)} / {game.state.questions.length}</span>
              {game.state.mode === 'ranked' && <span className="capitalize">Ranked</span>}
            </div>
          </div>

          {/* Central gameplay area */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Reveal: album art + song info */}
            {isRevealing ? (
              <div className="flex flex-col items-center gap-4">
                <AlbumArt
                  src={q.album_cover_big ?? q.album_cover_medium}
                  revealed={isRevealing}
                />
                <SongInfoReveal
                  title={q.reveal.title}
                  artist={q.reveal.artist}
                  album={q.reveal.album}
                  revealed
                />
              </div>
            ) : (
              <>
                {/* Visualizer area */}
                <div className="mt-4 h-[70px] flex items-center justify-center">
                  <AudioVisualizer isPlaying={phase === 'playing'} />
                </div>

                {/* Timer */}
                <div className="mt-4">
                  <CircularTimer
                    ref={timerRef}
                    duration={game.state.timerDuration}
                    running={phase === 'playing'}
                    onExpired={handleTimeout}
                    timerKey={timerKey}
                    onUrgentTick={handleUrgentTick}
                  />
                </div>

                {/* Question text */}
                {isChallenge ? (
                  <p className="mt-4 text-sm md:text-base text-white/80 text-center font-medium">
                    {q.question_text}
                    <span className="ml-1.5 text-[#ED93B1] text-xs font-semibold">1.5x</span>
                  </p>
                ) : (
                  <p className="mt-4 text-sm md:text-base text-white/80 text-center font-medium">
                    {q.question_text}
                  </p>
                )}

                {/* Answer area */}
                <div className="mt-4 w-full">
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
                    <div className="grid grid-cols-2 gap-2.5 md:gap-3">
                      {q.choices.map((choice) => {
                        const isRemoved = removedAnswers.includes(choice);
                        const btnState = isRemoved ? 'dimmed' : getButtonState(choice);
                        const isCorrect = btnState === 'correct';
                        const isWrong = btnState === 'wrong';
                        const isDimmed = btnState === 'dimmed';
                        return (
                          <button
                            key={choice}
                            onClick={() => handleAnswer(choice)}
                            disabled={isRevealing || isRemoved}
                            className={`px-4 py-5 md:py-6 rounded-xl md:rounded-2xl text-center text-[13px] md:text-[15px] font-semibold transition-all active:scale-[0.96] ${
                              isCorrect && isRevealing
                                ? 'bg-white/10 border-[1.5px] border-[#4CAF50] text-[#4CAF50]'
                                : isWrong && isRevealing
                                ? 'bg-white/[0.03] border border-white/[0.04] text-white/20 animate-shake'
                                : isDimmed
                                ? 'bg-white/[0.03] border border-white/[0.04] text-white/20 opacity-60'
                                : 'bg-white/[0.05] border border-white/[0.08] text-white/80 hover:bg-white/[0.08]'
                            }`}
                          >
                            {isCorrect && isRevealing && (
                              <svg width="12" height="12" viewBox="0 0 10 10" fill="none" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round" className="inline mr-1.5"><path d="M2 5.5L4.2 7.5L8 3" /></svg>
                            )}
                            {choice}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Mobile only: Power-ups + Round History */}
          <div className="md:hidden pb-4">
            {!isChallenge && (
              <div className="mt-3.5">
                <PowerupBar
                  powerups={powerups}
                  onUse={handleUsePowerup}
                  disabled={isRevealing || usedPowerupThisRound !== null}
                />
              </div>
            )}
            <div className="mt-3.5">
              <RoundHistory results={game.state.results} totalRounds={game.state.questions.length} />
            </div>
          </div>
        </div>

        {/* Desktop sidebar */}
        {!isChallenge && (
          <div className="hidden md:block px-4 pt-16 pb-4 overflow-y-auto">
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
          </div>
        )}
      </div>

      {/* TipBanner at the bottom */}
      <TipBanner
        variant="gameplay"
        tips={['Faster answers score more points', 'Build combos for bonus multipliers', 'Use power-ups strategically']}
      />
    </div>
  );
}

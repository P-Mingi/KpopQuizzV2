'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useCallback } from 'react';
import { calculateFinalPoints, getSpeedLabel, getScoreLabel, calculateXP } from '@/lib/scoring';
import { playSound } from '@/lib/sounds';
import { incrementAnonPlayCount, shouldPromptSignup } from '@/lib/anonymous-play';
import { calculateGroupMasteryUpdates, getMasteryProgress } from '@/lib/progression';
import { getAchievementById } from '@/lib/achievements';
import { SignupPromptModal } from '@/components/shared/signup-prompt-modal';

import type { GroupMasteryUpdate } from '@/lib/progression';
import type { BlindTestMode } from '@/lib/blind-test-modes';

// ── Types ──

interface RoundSong {
  song_id: string;
  youtube_id: string;
  clip_start: number;
  group_id: number | null;
  question_type: 'title' | 'artist';
  choices: string[];
  _answer: { correct_index: number; title: string; artist: string };
}

interface RoundData {
  mode_id: string;
  mode_title: string;
  clip_duration: number;
  songs: RoundSong[];
}

interface SongAnswer {
  song_id: string;
  question_type: 'title' | 'artist';
  picked: number;
  correct: boolean;
  time: number;
  points: number;
  combo: number;
  skipped?: boolean;
}

type GameState = 'intro' | 'loading' | 'playing' | 'reveal' | 'results';

declare global {
  interface Window {
    YT: {
      Player: new (id: string, config: Record<string, unknown>) => YTPlayer;
      PlayerState: { PLAYING: number; ENDED: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface YTPlayer {
  loadVideoById(opts: { videoId: string; startSeconds: number; endSeconds: number }): void;
  pauseVideo(): void;
  setSize(w: number, h: number): void;
  destroy(): void;
}

// ── Component ──

interface GameProps {
  mode: BlindTestMode;
  /** New two-step params (if provided, used for generate API instead of mode.id) */
  gameMode?: string;
  gameFilter?: string;
  gameGroup?: string | null;
}

export function BlindTestGame({ mode, gameMode, gameFilter, gameGroup }: GameProps) {
  const isDaily = mode.id === 'daily';
  const [gameState, setGameState] = useState<GameState>('intro');
  const [round, setRound] = useState<RoundData | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [answers, setAnswers] = useState<SongAnswer[]>([]);
  const [xpEarned, setXpEarned] = useState(0);
  const [masteryUpdates, setMasteryUpdates] = useState<(GroupMasteryUpdate & { group_name?: string })[]>([]);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [dailyRank, setDailyRank] = useState<{ rank: number; total: number } | null>(null);

  // Per-song state
  const [timeLeft, setTimeLeft] = useState(mode.clip_duration);
  const [answered, setAnswered] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<SongAnswer | null>(null);

  // YouTube
  const playerRef = useRef<YTPlayer | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  // Ref to the visible video container (for resize)
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Timer
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const answeredRef = useRef(false);

  // Equalizer
  const [eqBars, setEqBars] = useState([16, 28, 40, 32, 20]);

  // Signup prompt
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);

  // ── Stable handler refs ──
  // YouTube registers callbacks once at player creation. Without refs, those
  // callbacks capture the initial render's closures (round=null, index=0).
  // Wrapping via refs means the registered function always calls the LATEST version.
  const handleTimeoutRef = useRef<() => void>(() => {});
  const handleStateChangeRef = useRef<(e: { data: number }) => void>(() => {});
  const handleVideoErrorRef = useRef<(e: { data: number }) => void>(() => {});

  // Keep answeredRef in sync
  useEffect(() => { answeredRef.current = answered; }, [answered]);

  // ── YouTube Setup ──
  // The yt-player div must be in the DOM when YT.Player is constructed.
  // It must NEVER be unmounted while the player is alive.
  // This is guaranteed by always rendering the playing section (see render below).

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initPlayer = () => {
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player('yt-player', {
        height: '1',
        width: '1',
        playerVars: {
          autoplay: 0, controls: 0, disablekb: 1, fs: 0,
          modestbranding: 1, rel: 0, iv_load_policy: 3, playsinline: 1,
        },
        events: {
          onReady: () => setPlayerReady(true),
          // Delegate to refs so callbacks always use the latest closure
          onError: (e: { data: number }) => handleVideoErrorRef.current(e),
          onStateChange: (e: { data: number }) => handleStateChangeRef.current(e),
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
      return;
    }

    if (!document.getElementById('yt-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }
    window.onYouTubeIframeAPIReady = initPlayer;

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Equalizer Animation ──

  useEffect(() => {
    if (gameState !== 'playing' || answered) return;
    const interval = setInterval(() => {
      setEqBars([...Array(5)].map(() => 12 + Math.random() * 36));
    }, 120);
    return () => clearInterval(interval);
  }, [gameState, answered]);


  // ── Resize YT player on reveal ──

  useEffect(() => {
    if (!playerRef.current) return;
    if (showVideo) {
      const container = playerContainerRef.current;
      if (container) {
        const w = container.clientWidth;
        const h = Math.round(w * 9 / 16);
        playerRef.current.setSize(w, h);
      }
    } else {
      playerRef.current.setSize(1, 1);
    }
  }, [showVideo]);

  // ── Tick sound in last 3s ──

  const tickRef = useRef(0);
  useEffect(() => {
    if (timeLeft <= 3 && timeLeft > 0 && !answered && gameState === 'playing') {
      const tick = Math.ceil(timeLeft);
      if (tick !== tickRef.current) {
        tickRef.current = tick;
        playSound('tick');
      }
    }
  }, [timeLeft, answered, gameState]);

  // ── Prevent scroll during gameplay ──

  useEffect(() => {
    if (gameState === 'playing' || gameState === 'reveal') {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [gameState]);

  // ── Core Functions ──

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = mode.clip_duration - elapsed;
      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        setTimeLeft(0);
        // Use ref so we always call the latest handleTimeout (not the stale closure)
        if (!answeredRef.current) handleTimeoutRef.current();
      } else {
        setTimeLeft(remaining);
      }
    }, 50);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode.clip_duration]);

  function handleStateChange(event: { data: number }) {
    if (event.data === window.YT.PlayerState.PLAYING) {
      if (!startTimeRef.current && !answeredRef.current) {
        startTimeRef.current = Date.now();
        startTimer();
      }
    }
    if (event.data === window.YT.PlayerState.ENDED) {
      if (!answeredRef.current) handleTimeoutRef.current();
    }
  }

  function handleVideoError(event: { data: number }) {
    if (event.data === 101 || event.data === 150) {
      skipSong();
    }
  }

  function handleTimeout() {
    if (answeredRef.current || !round) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setAnswered(true);
    answeredRef.current = true;
    setShowVideo(true);
    setTimeLeft(0);

    const song = round.songs[currentIndex]!;
    const answer: SongAnswer = {
      song_id: song.song_id,
      question_type: song.question_type,
      picked: -1,
      correct: false,
      time: mode.clip_duration,
      points: 0,
      combo: 0,
    };
    setCurrentAnswer(answer);
    setAnswers(prev => [...prev, answer]);
    setCombo(0);
    playSound('wrong');
    setShowNextButton(true);
    setGameState('reveal');
  }

  // Update stable refs on every render so callbacks always use latest closures
  handleTimeoutRef.current = handleTimeout;
  handleStateChangeRef.current = handleStateChange;
  handleVideoErrorRef.current = handleVideoError;

  function playSongAtIndex(idx: number, roundData: RoundData) {
    const song = roundData.songs[idx];
    if (!song || !playerRef.current) return;

    if (timerRef.current) clearInterval(timerRef.current);
    setAnswered(false);
    answeredRef.current = false;
    setShowVideo(false);
    setShowNextButton(false);
    setCurrentAnswer(null);
    setTimeLeft(mode.clip_duration);
    startTimeRef.current = 0;
    tickRef.current = 0;

    playerRef.current.setSize(1, 1);
    playerRef.current.loadVideoById({
      videoId: song.youtube_id,
      startSeconds: song.clip_start,
      endSeconds: song.clip_start + mode.clip_duration,
    });

    setGameState('playing');
  }

  function pickAnswer(choiceIndex: number) {
    if (answeredRef.current || gameState !== 'playing' || !round) return;

    const answerTime = (Date.now() - startTimeRef.current) / 1000;
    const song = round.songs[currentIndex]!;
    const isCorrect = choiceIndex === song._answer.correct_index;

    if (timerRef.current) clearInterval(timerRef.current);

    const newCombo = isCorrect ? combo + 1 : 0;
    const points = calculateFinalPoints(answerTime, mode.clip_duration, isCorrect, isCorrect ? newCombo : 0);

    setAnswered(true);
    answeredRef.current = true;
    setShowVideo(true);
    setCombo(newCombo);
    if (newCombo > bestCombo) setBestCombo(newCombo);
    setScore(prev => prev + points);

    const answer: SongAnswer = {
      song_id: song.song_id,
      question_type: song.question_type,
      picked: choiceIndex,
      correct: isCorrect,
      time: Math.round(answerTime * 100) / 100,
      points,
      combo: newCombo,
    };
    setCurrentAnswer(answer);
    setAnswers(prev => [...prev, answer]);

    if (isCorrect) {
      playSound('correct');
      if (newCombo >= 3) playSound('combo');
    } else {
      playSound('wrong');
    }
    setShowNextButton(true);
    setGameState('reveal');
  }

  function skipSong() {
    if (!round) return;
    setAnswers(prev => [...prev, {
      song_id: round.songs[currentIndex]!.song_id,
      question_type: round.songs[currentIndex]!.question_type,
      picked: -1, correct: false, time: 0, points: 0, combo: 0, skipped: true,
    }]);
    goToNextSong();
  }

  function goToNextSong() {
    playerRef.current?.pauseVideo();
    const nextIdx = currentIndex + 1;
    if (!round || nextIdx >= round.songs.length) {
      finishGame();
    } else {
      setCurrentIndex(nextIdx);
      setShowVideo(false);
      setShowNextButton(false);
      playSongAtIndex(nextIdx, round);
    }
  }

  async function startGame() {
    setGameState('loading');
    try {
      const generateUrl = isDaily ? '/api/daily/generate' : '/api/play/generate';
      const generateBody = gameMode
        ? { mode: gameMode, filter: gameFilter ?? 'all', group: gameGroup ?? undefined }
        : { mode_id: mode.id };
      const res = await fetch(generateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateBody),
      });
      if (!res.ok) {
        setGameState('intro');
        return;
      }
      const data = await res.json() as RoundData & { challenge_id?: string };
      if (data.challenge_id) setChallengeId(data.challenge_id);
      setRound(data);
      setCurrentIndex(0);
      setScore(0);
      setCombo(0);
      setBestCombo(0);
      setAnswers([]);
      setNewAchievements([]);
      setDailyRank(null);
      playSongAtIndex(0, data);
    } catch {
      setGameState('intro');
    }
  }

  async function finishGame() {
    setGameState('results');
    playerRef.current?.pauseVideo();

    const correctCount = answers.filter(a => a.correct).length;
    const totalTime = answers.reduce((sum, a) => sum + a.time, 0);
    const earnedXp = calculateXP(answers);
    setXpEarned(earnedXp);

    const songData = round?.songs.map(s => ({ song_id: s.song_id, group_id: s.group_id })) ?? [];
    const gmUpdates = calculateGroupMasteryUpdates(answers, songData);
    setMasteryUpdates(gmUpdates);

    try {
      const recordUrl = isDaily ? '/api/daily/record' : '/api/play/record';
      const recordBody: Record<string, unknown> = {
        mode_id: mode.id,
        score,
        correct: correctCount,
        total: round?.songs.length ?? 0,
        total_time: Math.round(totalTime * 100) / 100,
        best_combo: bestCombo,
        songs: answers,
        xp_earned: earnedXp,
        group_mastery_updates: gmUpdates,
      };
      if (isDaily && challengeId) {
        recordBody.challenge_id = challengeId;
      }

      const res = await fetch(recordUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordBody),
      });
      if (res.ok) {
        const data = await res.json() as { new_achievements?: string[]; rank?: number; total_players?: number };
        if (data.new_achievements && data.new_achievements.length > 0) {
          setNewAchievements(data.new_achievements);
        }
        if (isDaily && data.rank) {
          setDailyRank({ rank: data.rank, total: data.total_players ?? 0 });
        }
      }
    } catch {
      // Don't block results
    }

    const count = incrementAnonPlayCount();
    if (shouldPromptSignup() && count % 3 === 0) {
      setShowSignupPrompt(true);
    }
  }

  // ── Derived values ──

  const currentSong = round?.songs[currentIndex];
  const progress = round ? (currentIndex + (answered ? 1 : 0)) / round.songs.length : 0;
  const isUrgent = timeLeft <= 3 && timeLeft > 0 && !answered && gameState === 'playing';
  const isPlayingOrReveal = gameState === 'playing' || gameState === 'reveal';

  // Timer ring SVG values
  const ringRadius = 58;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (timeLeft / mode.clip_duration) * ringCircumference;

  // ── RENDER ──
  // IMPORTANT: the playing section is ALWAYS rendered (never conditionally removed)
  // so that the yt-player div stays in the DOM after the YouTube Player is initialized.
  // Removing yt-player from the DOM destroys the iframe and breaks the player permanently.

  return (
    <div>

      {/* ── INTRO ── */}
      {gameState === 'intro' && (
        <div className="flex flex-col items-center justify-center min-h-screen px-5">
          <DifficultyBadge difficulty={mode.difficulty} />
          <h1 className="text-2xl font-semibold mt-3 mb-1">{mode.title}</h1>
          <p className="text-sm text-text-secondary text-center mb-1">{mode.description}</p>
          <p className="text-xs text-text-tertiary mb-8">{mode.clip_duration}s per clip - {mode.song_count} songs</p>
          <button
            onClick={startGame}
            disabled={!playerReady}
            className="px-10 py-4 rounded-[14px] bg-pink-400 text-bg-primary text-base font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {playerReady ? 'Play' : 'Loading...'}
          </button>
          <Link href="/" className="mt-4 text-sm text-text-tertiary">Back to home</Link>
        </div>
      )}

      {/* ── LOADING ── */}
      {gameState === 'loading' && (
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="w-12 h-12 rounded-full border-2 border-border-default border-t-pink-400 animate-spin mb-4" />
          <p className="text-sm text-text-secondary">Loading your round...</p>
        </div>
      )}

      {/* ── RESULTS ── */}
      {gameState === 'results' && round && (
        <div className="min-h-screen px-5 py-8">
          <div className="text-center mb-6">
            <p className="text-4xl font-semibold">{answers.filter(a => a.correct && !a.skipped).length}/{answers.filter(a => !a.skipped).length}</p>
            <p className="text-sm text-text-secondary mt-1">{getScoreLabel(answers.filter(a => a.correct && !a.skipped).length, answers.filter(a => !a.skipped).length)}</p>
            {dailyRank && (
              <p className="text-xs text-pink-400 mt-1">
                Rank #{dailyRank.rank} of {dailyRank.total} players
              </p>
            )}
          </div>

          {/* Stats row */}
          <div className="flex gap-px mb-6 bg-border-default rounded-[14px] overflow-hidden">
            <div className="flex-1 py-3 text-center bg-bg-secondary">
              <p className="text-lg font-semibold text-pink-400">{score.toLocaleString()}</p>
              <p className="text-[10px] text-text-tertiary">points</p>
            </div>
            <div className="flex-1 py-3 text-center bg-bg-secondary">
              <p className="text-lg font-semibold">
                {(() => {
                  const valid = answers.filter(a => !a.skipped);
                  return valid.length > 0 ? (valid.reduce((s, a) => s + a.time, 0) / valid.length).toFixed(1) : '0.0';
                })()}s
              </p>
              <p className="text-[10px] text-text-tertiary">avg speed</p>
            </div>
            <div className="flex-1 py-3 text-center bg-bg-secondary">
              <p className="text-lg font-semibold">{bestCombo}x</p>
              <p className="text-[10px] text-text-tertiary">best combo</p>
            </div>
          </div>

          {/* Missed songs */}
          {answers.some(a => !a.correct && !a.skipped) && (
            <div className="mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-2">Missed songs</p>
              <div className="space-y-1.5">
                {answers.filter(a => !a.correct && !a.skipped).map(a => {
                  const song = round.songs.find(s => s.song_id === a.song_id);
                  return song ? (
                    <div key={a.song_id} className="flex items-center gap-3 p-2.5 bg-bg-secondary rounded-xl border border-border-default">
                      <img
                        src={`https://img.youtube.com/vi/${song.youtube_id}/default.jpg`}
                        alt="" className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div>
                        <p className="text-xs font-medium">{song._answer.title}</p>
                        <p className="text-[11px] text-text-tertiary">{song._answer.artist}</p>
                      </div>
                    </div>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* New achievements */}
          {newAchievements.length > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-pink-50 border border-pink-100">
              <p className="text-xs font-semibold text-pink-400 mb-2">
                New badge{newAchievements.length > 1 ? 's' : ''} earned!
              </p>
              {newAchievements.map(id => {
                const achievement = getAchievementById(id);
                const name = achievement?.name ?? id.replace('fandom_', '').replace(/_/g, ' ');
                const colorStyles: Record<string, string> = {
                  gold: 'bg-streak-bg text-streak',
                  pink: 'bg-pink-50 text-pink-400',
                  green: 'bg-correct-bg text-correct',
                  default: 'bg-bg-tertiary text-text-primary',
                };
                return (
                  <div key={id} className="flex items-center gap-2 py-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${colorStyles[achievement?.color ?? 'default']}`}>
                      {name}
                    </span>
                    {achievement && <span className="text-[11px] text-text-secondary">{achievement.description}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* XP earned */}
          {xpEarned > 0 && (
            <div className="mb-4 p-3 rounded-xl bg-pink-50 border border-pink-100">
              <span className="text-xs font-medium text-pink-400">+{xpEarned} XP earned</span>
            </div>
          )}

          {/* Group mastery */}
          {masteryUpdates.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mb-2">Group mastery earned</p>
              {masteryUpdates.map(update => (
                <div key={update.group_id} className="flex items-center gap-2.5 py-1.5">
                  <span className="text-xs min-w-[80px]">Group #{update.group_id}</span>
                  <div className="flex-1 h-1 bg-border-default rounded-full">
                    <div className="h-1 rounded-full bg-pink-400" style={{ width: `${getMasteryProgress(update.mastery_xp) * 100}%` }} />
                  </div>
                  <span className="text-[11px] text-pink-400">+{update.mastery_xp}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action buttons */}
          {isDaily ? (
            <>
              <Link href="/daily" className="block w-full text-center py-3.5 rounded-[14px] bg-pink-400 text-bg-primary text-sm font-semibold mb-2.5">
                See daily leaderboard
              </Link>
              <Link href="/" className="block w-full text-center py-3.5 rounded-[14px] border border-border-default text-sm font-semibold hover:border-border-hover transition-colors">
                Try another mode
              </Link>
            </>
          ) : (
            <>
              <button
                onClick={() => startGame()}
                className="w-full py-3.5 rounded-[14px] border border-border-default text-sm font-semibold mb-2.5 hover:border-border-hover transition-colors"
              >
                Play again
              </button>
              <Link href="/" className="block w-full text-center py-3.5 rounded-[14px] bg-pink-400 text-bg-primary text-sm font-semibold">
                Try another mode
              </Link>
            </>
          )}

          {showSignupPrompt && (
            <SignupPromptModal onClose={() => setShowSignupPrompt(false)} />
          )}
        </div>
      )}

      {/* ── PLAYING + REVEAL ──
          This section is ALWAYS rendered, never conditionally removed.
          Using visibility:hidden + position:absolute when inactive keeps the
          yt-player div in the DOM so the YouTube iframe is never destroyed. */}
      <div
        className={
          isPlayingOrReveal
            ? 'min-h-screen flex flex-col px-5 pt-4'
            : 'invisible absolute inset-0 pointer-events-none overflow-hidden'
        }
        aria-hidden={!isPlayingOrReveal}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-text-tertiary">{currentIndex + 1} of {round?.songs.length ?? 0}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-medium text-pink-400">{score} pts</span>
            {combo >= 2 && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--combo-bg)', color: 'var(--combo-text)' }}>
                {combo}x
              </span>
            )}
            {currentAnswer && !currentAnswer.correct && combo === 0 && answers.length > 1 && (answers[answers.length - 2]?.combo ?? 0) >= 2 && (
              <span className="text-[10px] font-medium text-wrong">combo lost</span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-border-default rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-pink-400 rounded-full transition-all duration-300" style={{ width: `${progress * 100}%` }} />
        </div>

        {/* YouTube player container */}
        <div
          ref={playerContainerRef}
          className={`mx-auto overflow-hidden transition-all duration-300 ease-out ${
            showVideo
              ? 'w-full max-w-[335px] rounded-[14px] mb-2 opacity-100'
              : 'w-px h-px opacity-0 pointer-events-none'
          }`}
          style={showVideo ? { aspectRatio: '16/9' } : undefined}
        >
          <div id="yt-player" style={{ width: '100%', height: '100%' }} />
        </div>

        {/* Equalizer + Timer */}
        {!showVideo && (
          <div className={`flex flex-col items-center mb-6 ${isUrgent ? 'animate-shake' : ''}`}>
            <div className="relative w-[128px] h-[128px] flex items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" width="128" height="128" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r={ringRadius} fill="none" stroke="var(--border-default)" strokeWidth="3" />
                <circle
                  cx="64" cy="64" r={ringRadius} fill="none"
                  stroke={isUrgent ? 'var(--wrong)' : 'var(--pink-400)'}
                  strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="transition-[stroke] duration-200"
                />
              </svg>
              <div className="flex items-end gap-[3px] h-12">
                {eqBars.map((h, i) => (
                  <div
                    key={i}
                    className="w-[5px] rounded-sm transition-[height] duration-100"
                    style={{ height: h, background: 'var(--pink-400)' }}
                  />
                ))}
              </div>
            </div>
            <p className={`text-xl font-semibold mt-2 ${isUrgent ? 'text-wrong' : ''}`}>
              {Math.ceil(timeLeft)}s
            </p>
          </div>
        )}

        {/* Song info (reveal) */}
        {showVideo && currentSong && (
          <div className="text-center mb-2">
            <p className="text-[15px] font-semibold">{currentSong._answer.title}</p>
            <p className="text-[13px] text-text-secondary">{currentSong._answer.artist}</p>
            {currentAnswer?.correct && (
              <p className="text-[15px] font-semibold text-correct mt-1.5 animate-pointsFloat">
                +{currentAnswer.points}
              </p>
            )}
            {currentAnswer && !currentAnswer.correct && (
              <p className="text-[15px] font-semibold text-wrong mt-1.5">+0</p>
            )}
            {currentAnswer?.correct && (
              <p className="text-xs mt-0.5" style={{ color: getSpeedLabel(currentAnswer.time).cssVar }}>
                {getSpeedLabel(currentAnswer.time).label}
              </p>
            )}
          </div>
        )}

        {/* Question type indicator */}
        {!answered && currentSong && (
          <p className="text-xs text-text-tertiary text-center mb-2">
            {currentSong.question_type === 'artist' ? 'Who sings this?' : 'Name the song'}
          </p>
        )}

        {/* Answer choices */}
        <div className="space-y-2.5 mb-4">
          {currentSong?.choices.map((choice, i) => {
            let btnStyle = 'bg-bg-secondary border-border-default hover:border-border-hover';

            if (answered) {
              const isCorrect = i === currentSong._answer.correct_index;
              const isPicked = i === currentAnswer?.picked;

              if (isCorrect) {
                btnStyle = 'bg-correct-bg border-correct-border text-correct';
              } else if (isPicked && !currentAnswer?.correct) {
                btnStyle = 'bg-wrong-bg border-wrong-border text-wrong';
              } else {
                btnStyle = 'bg-bg-secondary border-border-default opacity-40';
              }
            }

            return (
              <button
                key={i}
                onClick={() => pickAnswer(i)}
                disabled={answered}
                className={`w-full min-h-[56px] px-4 py-3 rounded-xl border text-[15px] font-medium text-left transition-all active:scale-[0.98] ${btnStyle}`}
              >
                <span className="flex justify-between items-center">
                  {choice}
                  {answered && i === currentSong._answer.correct_index && (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8L6.5 11.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        {/* Next song button */}
        {showNextButton && (
          <button
            onClick={goToNextSong}
            className="w-full py-3.5 rounded-[14px] bg-pink-400 text-bg-primary text-sm font-semibold mb-4 animate-fadeSlideUp active:scale-[0.98] transition-transform"
          >
            {currentIndex + 1 >= (round?.songs.length ?? 0) ? 'See results' : 'Next song'}
          </button>
        )}
      </div>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const styles: Record<string, string> = {
    easy: 'bg-correct-bg text-correct',
    medium: 'bg-streak-bg text-streak',
    hard: 'bg-wrong-bg text-wrong',
    expert: 'bg-wrong-bg text-wrong',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${styles[difficulty] ?? styles.easy}`}>
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </span>
  );
}

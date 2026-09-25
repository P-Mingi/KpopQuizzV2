'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAudioPlayer } from '@/components/blind-test/use-audio-player';
import { analytics } from '@/lib/analytics';
import { completeDaily, markDailyPlayed } from '@/lib/daily-played';
import { recordGuestDaily } from '@/lib/guest-streak';
import { summarizeRun } from '@/lib/ux-v1/p6/points';
import { generateBody } from '@/lib/ux-v1/p6/playlists';

import type { BtAnswer, BtMode, BtPhase, BtQuestion } from './types';
import type { RunSummary } from '@/lib/ux-v1/p6/points';
import type { BtPick } from '@/lib/ux-v1/p6/playlists';

// The run engine of the v11 blindtest (DESIGN-SPEC 14.7, 16.7). It is the live
// game's logic (components/blind-test/blindtest-game.tsx) moved behind a hook so
// the day-mode views can render it: the same endpoints and bodies
// (POST /api/blind-test/generate { playlist, count, mode: 'challenge' },
// GET /api/daily/blindtest), the same audio player (use-audio-player.ts: unlock
// inside the tap, preload the next clip, fade out on answer), the same 10 s
// timer and time_ms per answer, the same score (right answers), and in daily
// mode the same saves in the same order (markDailyPlayed, POST
// /api/daily/blindtest/submit { score, time_ms }, recordGuestDaily,
// completeDaily('blindtest')). Free play saves nothing, exactly like today.
// Points, combo and speed are display only (lib/ux-v1/p6/points.ts).

export const TIMER_S = 10;
/** DESIGN-SPEC 16.7: auto-next after 3 s ("Next song in 3 seconds"). */
export const AUTO_NEXT_MS = 3000;
const BLOCKED_CHECK_MS = 1200;

export interface DailyOutcome {
  /** Rank and players from the submit response (signed in only). */
  rank: number | null;
  total: number | null;
  /** XP awarded by /api/daily/complete (signed in), null for guests or when unknown. */
  xp: number | null;
  signedIn: boolean | null;
}

export interface RunApi {
  phase: BtPhase;
  mode: BtMode;
  pick: BtPick;
  /** Songs asked for (5 / 10 / 15; the daily is 10). Play again reuses it. */
  count: number;
  questions: BtQuestion[];
  index: number;
  answers: BtAnswer[];
  selected: number | null;
  timeLeft: number;
  isPlaying: boolean;
  /** Autoplay was refused: show "Tap to play the clip". */
  blocked: boolean;
  muted: boolean;
  error: string | null;
  summary: RunSummary;
  daily: DailyOutcome;
  /** Start a free run (call inside the tap: unlocks audio). */
  startFree: (pick: BtPick, count: number) => Promise<void>;
  /** Start today's Blindtest of the day (call inside the tap). */
  startDaily: () => Promise<void>;
  /** Deep link without a gesture: show the game in the "Tap to play" state. */
  prepareDaily: () => void;
  pickAnswer: (i: number) => void;
  next: () => void;
  quit: () => void;
  replay: () => void;
  toggleMute: () => void;
  resume: () => void;
  /** Play one clip of a finished run (results "Your songs"). */
  playClip: (url: string) => void;
  stopClip: () => void;
  clearError: () => void;
}

const DAILY_PICK: BtPick = { playlist: 'daily', label: 'Blindtest of the day' };

export function useBlindtestRun(opts: {
  announce?: (message: string) => void;
  /** Daily results saved (board and "played today" reload). */
  onDailySaved?: () => void;
} = {}): RunApi {
  const { announce, onDailySaved } = opts;
  const { unlock, loadAndPlay, preload, stop, fadeOut, cleanup, isPlaying, audioRef, play } = useAudioPlayer();

  const [phase, setPhase] = useState<BtPhase>('idle');
  const [mode, setMode] = useState<BtMode>('free');
  const [pick, setPick] = useState<BtPick>({ playlist: 'all', label: 'All K-pop' });
  const [count, setCount] = useState(10);
  const [questions, setQuestions] = useState<BtQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<BtAnswer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_S);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [daily, setDaily] = useState<DailyOutcome>({ rank: null, total: null, xp: null, signedIn: null });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blockedRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(0);
  const answeredRef = useRef(false);
  const mutedRef = useRef(false);
  const submittedRef = useRef(false);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (blockedRef.current) clearTimeout(blockedRef.current);
    cleanup();
  }, [cleanup]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (blockedRef.current) { clearTimeout(blockedRef.current); blockedRef.current = null; }
  }, []);

  const reveal = useCallback((picked: number | null, correct: boolean) => {
    answeredRef.current = true;
    stopTimer();
    fadeOut(350);
    const timeMs = Math.min(TIMER_S * 1000, Math.max(0, Date.now() - startRef.current));
    setSelected(picked);
    setBlocked(false);
    setAnswers((prev) => [...prev, { picked, correct, time_ms: timeMs }]);
    setPhase('reveal');
  }, [fadeOut, stopTimer]);

  const playQuestion = useCallback((q: BtQuestion, nextUrl?: string) => {
    answeredRef.current = false;
    setSelected(null);
    setBlocked(false);
    setTimeLeft(TIMER_S);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
    loadAndPlay(q.preview_url);
    if (audioRef.current) audioRef.current.muted = mutedRef.current;
    if (nextUrl) preload(nextUrl);
    startRef.current = Date.now();
    stopTimer();
    timerRef.current = setInterval(() => {
      const remaining = TIMER_S - (Date.now() - startRef.current) / 1000;
      if (remaining <= 0) {
        stopTimer();
        setTimeLeft(0);
        if (!answeredRef.current) reveal(null, false);
      } else {
        setTimeLeft(remaining);
      }
    }, 50);
    // Autoplay refused (no gesture, or the browser blocked it): the element stays paused.
    blockedRef.current = setTimeout(() => {
      const a = audioRef.current;
      if (!answeredRef.current && a && a.paused && !a.ended) setBlocked(true);
    }, BLOCKED_CHECK_MS);
  }, [audioRef, loadAndPlay, preload, reveal, stopTimer]);

  const begin = useCallback((qs: BtQuestion[], m: BtMode) => {
    setQuestions(qs);
    setIndex(0);
    setAnswers([]);
    submittedRef.current = false;
    setDaily({ rank: null, total: null, xp: null, signedIn: null });
    analytics.gameStart('blindtest', m === 'daily');
    setPhase('playing');
    playQuestion(qs[0]!, qs[1]?.preview_url);
  }, [playQuestion]);

  const startFree = useCallback(async (p: BtPick, n: number) => {
    unlock(); // inside the tap (iOS Safari)
    setError(null);
    setMode('free');
    setPick(p);
    setCount(n);
    setPhase('loading');
    try {
      const res = await fetch('/api/blind-test/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateBody(p, n)),
      });
      if (!res.ok) { setError('Not enough songs for this pick. Try another.'); setPhase('idle'); return; }
      const data = (await res.json()) as { questions?: BtQuestion[] };
      if (!data.questions?.length) { setError('No songs found. Try another pick.'); setPhase('idle'); return; }
      begin(data.questions, 'free');
    } catch {
      setError('Could not start the game. Check your connection.');
      setPhase('idle');
    }
  }, [begin, unlock]);

  const startDaily = useCallback(async () => {
    unlock();
    setError(null);
    setMode('daily');
    setPick(DAILY_PICK);
    setCount(10);
    setPhase('loading');
    try {
      const res = await fetch('/api/daily/blindtest');
      if (!res.ok) { setError('Could not load today’s blindtest. Try a free run.'); setPhase('idle'); return; }
      const data = (await res.json()) as { questions?: BtQuestion[] };
      if (!data.questions?.length) { setError('Could not load today’s blindtest. Try a free run.'); setPhase('idle'); return; }
      begin(data.questions, 'daily');
    } catch {
      setError('Could not load today’s blindtest. Try a free run.');
      setPhase('idle');
    }
  }, [begin, unlock]);

  const prepareDaily = useCallback(() => {
    setMode('daily');
    setPick(DAILY_PICK);
    setError(null);
    setPhase('tap');
  }, []);

  const finish = useCallback(() => {
    stopTimer();
    stop();
    setPhase('results');
  }, [stop, stopTimer]);

  const next = useCallback(() => {
    if (phase !== 'reveal') return;
    const n = index + 1;
    if (n >= questions.length) { finish(); return; }
    setIndex(n);
    setPhase('playing');
    playQuestion(questions[n]!, questions[n + 1]?.preview_url);
  }, [finish, index, phase, playQuestion, questions]);

  // Auto-next from the reveal (the live game auto-advances too).
  useEffect(() => {
    if (phase !== 'reveal') return;
    const t = setTimeout(() => next(), AUTO_NEXT_MS);
    return () => clearTimeout(t);
  }, [phase, next]);

  const pickAnswer = useCallback((i: number) => {
    if (answeredRef.current || phase !== 'playing') return;
    const q = questions[index];
    if (!q) return;
    reveal(i, q.choices[i] === q.correct_answer);
  }, [index, phase, questions, reveal]);

  const score = answers.filter((a) => a.correct).length;
  const summary = useMemo(() => summarizeRun(answers.map((a) => ({ correct: a.correct, timeMs: a.time_ms }))), [answers]);

  // Announce each result in the live region (16.7, 16.9).
  const lastAnnounced = useRef(-1);
  useEffect(() => {
    if (phase !== 'reveal' || !announce) return;
    const i = answers.length - 1;
    if (i < 0 || lastAnnounced.current === i) return;
    lastAnnounced.current = i;
    const a = answers[i]!;
    const q = questions[i];
    const gain = summary.rounds[i]?.points ?? 0;
    const head = a.correct ? `Correct, plus ${gain} points.` : a.picked === null ? 'Time is up.' : 'Missed.';
    announce(q ? `${head} ${q.reveal.title} by ${q.reveal.artist}.` : head);
  }, [announce, answers, phase, questions, summary.rounds]);

  // Results: the live game's end-of-run effect, unchanged in daily mode.
  useEffect(() => {
    if (phase !== 'results') return;
    lastAnnounced.current = -1;
    analytics.gameComplete('blindtest', score, questions.length, mode === 'daily');
    announce?.(`Blindtest finished. ${score} out of ${questions.length}, ${summary.points} points.`);
    if (mode !== 'daily' || submittedRef.current) return;
    submittedRef.current = true;
    markDailyPlayed('blindtest');
    const totalTimeMs = answers.reduce((s, a) => s + a.time_ms, 0);
    void (async () => {
      let rank: number | null = null;
      let total: number | null = null;
      try {
        const res = await fetch('/api/daily/blindtest/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ score, time_ms: totalTimeMs }),
        });
        if (res.ok) {
          const d = (await res.json()) as { rank?: number; total?: number };
          if (typeof d.rank === 'number') rank = d.rank;
          if (typeof d.total === 'number') total = d.total;
        }
      } catch {
        // anon or network: the score still shows, just unranked
      }
      recordGuestDaily();
      const done = await completeDaily('blindtest');
      setDaily({ rank, total, xp: done?.signed_in ? done.awarded : null, signedIn: done ? done.signed_in : null });
      onDailySaved?.();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const quit = useCallback(() => {
    stopTimer();
    stop();
    setBlocked(false);
    setPhase('idle');
  }, [stop, stopTimer]);

  const replay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    try { a.currentTime = 0; } catch { /* not seekable yet */ }
    a.muted = mutedRef.current;
    play();
  }, [audioRef, play]);

  const toggleMute = useCallback(() => {
    const m = !mutedRef.current;
    mutedRef.current = m;
    setMuted(m);
    if (audioRef.current) audioRef.current.muted = m;
  }, [audioRef]);

  const resume = useCallback(() => {
    unlock();
    setBlocked(false);
    replay();
  }, [replay, unlock]);

  const playClip = useCallback((url: string) => {
    unlock();
    loadAndPlay(url);
    if (audioRef.current) audioRef.current.muted = false;
  }, [audioRef, loadAndPlay, unlock]);

  const stopClip = useCallback(() => { stop(); }, [stop]);
  const clearError = useCallback(() => setError(null), []);

  return {
    phase, mode, pick, count, questions, index, answers, selected, timeLeft, isPlaying, blocked, muted, error, summary, daily,
    startFree, startDaily, prepareDaily, pickAnswer, next, quit, replay, toggleMute, resume, playClip, stopClip, clearError,
  };
}

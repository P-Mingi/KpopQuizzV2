'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAudioPlayer } from '@/components/blind-test/use-audio-player';
import { analytics } from '@/lib/analytics';
import { btLocale, btPlaylistId, btSourceHere, newBtRunId, trackBtRun } from '@/lib/tracking/bt';

import { RankedApiError, rankedApi, withRetry } from './api';

import type { BtAnswer, BtPhase, BtQuestion } from '@/components/blindtest/ux-v1/types';
import type { RunApi } from '@/components/blindtest/ux-v1/use-run';
import type { PublicRound, RoundReveal } from '@/lib/ranked/run';
import type { IssuedRun, SubmittedRun } from '@/lib/ranked/service';
import type { BtRunContext, BtRunSong } from '@/lib/tracking/bt';
import type { BtPick } from '@/lib/ux-v1/p6/playlists';
import type { RoundPoints, RunSummary } from '@/lib/ux-v1/p6/points';

// A ranked run behind P6's RunApi, so P6's day-mode game view (BtGame) and results
// (BtResults) render it unchanged (P6 report section 8). The difference is where the
// truth lives: the SERVER draws the ten songs and keeps the answers. Each round is
// released by POST /api/ranked/run/start (the server stamps the clip start), the
// pick is locked by POST /api/ranked/run/answer (the server checks the time and
// returns the right option, the song and the points), and the run is closed by
// POST /api/ranked/run/submit (the server recomputes every point and returns the
// season impact). Points shown here are the server's, never recomputed locally.
// Quitting closes the run too: it is recorded with the songs answered (15.4).
//
// V12 tracking (lib/tracking/bt.ts, its own switch NEXT_PUBLIC_BT_TRACKING), same
// rules as components/blindtest/ux-v1/use-run.ts: a ranked run is recorded through
// trackBtRun() with mode 'ranked' and playlist 'theme:ranked'. start = the first
// clip really plays; finish = the results screen (completed) or a quit, a lost
// connection, a new start, leaving the page (completed = false, sendBeacon). The
// score is the sum of the server's points. The server never sends a song id to the
// browser, so the song entries carry the round placeholder and the tracking route
// drops them (the counts are kept). With the switch off nothing is sent and nothing
// below changes what the player sees or what the ranked API receives.

export const RANKED_TIMER_S = 10;
export const RANKED_AUTO_NEXT_MS = 3000;
const BLOCKED_CHECK_MS = 1200;

export const RANKED_PICK: BtPick = { playlist: 'ranked', label: 'Ranked' };

export type SubmitState =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'done'; result: SubmittedRun }
  | { kind: 'failed' };

export interface RankedRunApi extends RunApi {
  /** The issued run (season, runs left today), null before the first issue. */
  issued: IssuedRun | null;
  submit: SubmitState;
  /** Start a ranked run (call inside the tap: unlocks audio). */
  startRanked: () => Promise<void>;
}

/**
 * A round the server has not released yet. BtGame counts songs with
 * `questions.length` (the segments, "Song 3 of 10"), so the run holds one entry per
 * round from the start; only released rounds are ever rendered as a question.
 */
function unreleased(round: number): BtQuestion {
  return {
    song_id: `round-${round}`,
    question_type: 'title',
    question_text: '',
    preview_url: '',
    album_cover_medium: null,
    album_cover_big: null,
    correct_answer: '',
    choices: [],
    reveal: { title: '', artist: '', album: null, cover: null },
  };
}

function toQuestion(r: PublicRound): BtQuestion {
  return {
    song_id: `round-${r.round}`,
    question_type: r.kind === 'artist' ? 'artist' : 'title',
    question_text: r.prompt,
    preview_url: r.previewUrl,
    album_cover_medium: null,
    album_cover_big: null,
    // The right option is unknown until the server reveals it (BtGame shows it only in 'reveal').
    correct_answer: '',
    choices: r.choices,
    reveal: { title: '', artist: '', album: null, cover: null },
  };
}

function revealed(q: BtQuestion, r: RoundReveal): BtQuestion {
  return {
    ...q,
    correct_answer: q.choices[r.correctIndex] ?? '',
    album_cover_medium: r.song.cover,
    album_cover_big: r.song.cover,
    reveal: { title: r.song.title, artist: r.song.artist, album: r.song.album, cover: r.song.cover },
  };
}

/** P6's RunSummary built from the server's per-round points (no local scoring). */
export function summaryFrom(answers: readonly BtAnswer[], rounds: readonly RoundPoints[]): RunSummary {
  let correct = 0;
  let rightMs = 0;
  let fastestMs: number | null = null;
  for (const a of answers) {
    if (!a.correct) continue;
    correct += 1;
    rightMs += a.time_ms;
    fastestMs = fastestMs === null ? a.time_ms : Math.min(fastestMs, a.time_ms);
  }
  return {
    points: rounds.reduce((s, r) => s + r.points, 0),
    correct,
    bestStreak: rounds.reduce((m, r) => Math.max(m, r.streak), 0),
    avgMs: correct ? Math.round(rightMs / correct) : null,
    fastestMs,
    rounds: [...rounds],
  };
}

export function useRankedRun(opts: {
  announce?: (message: string) => void;
  /** The run was closed early (quit or a lost connection): the page shows a toast. */
  onClosedEarly?: (message: string) => void;
  /** A finished run was recorded (the page refreshes the season card). */
  onRecorded?: () => void;
  /** The server refused to start a run (daily limit, sign in, not live). */
  onRefused?: (error: RankedApiError) => void;
} = {}): RankedRunApi {
  const { announce, onClosedEarly, onRecorded, onRefused } = opts;
  const { unlock, loadAndPlay, stop, fadeOut, cleanup, isPlaying, audioRef, play } = useAudioPlayer();

  const [phase, setPhase] = useState<BtPhase>('idle');
  const [issued, setIssued] = useState<IssuedRun | null>(null);
  const [questions, setQuestions] = useState<BtQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<BtAnswer[]>([]);
  const [rounds, setRounds] = useState<RoundPoints[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(RANKED_TIMER_S);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submit, setSubmit] = useState<SubmitState>({ kind: 'idle' });

  const tokenRef = useRef<string | null>(null);
  const runRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blockedRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(0);
  const answeredRef = useRef(false);
  const busyRef = useRef(false);
  const mutedRef = useRef(false);
  const closedRef = useRef(false);

  // V12 tracking. The open run (null when tracking is off or no run is open) with
  // what the server revealed so far, so a quit or pagehide can report it.
  const trackRef = useRef<{
    ctx: BtRunContext; startedAt: number; started: boolean; songs: BtRunSong[]; score: number; bestCombo: number;
  } | null>(null);

  /** Close the open tracked run, once. Completed on the results screen, else abandoned (beacon). */
  const sendFinish = useCallback((completed: boolean) => {
    const t = trackRef.current;
    if (!t) return;
    trackRef.current = null;
    if (!t.started) return; // no clip ever played: not a run
    trackBtRun({
      event: 'finish',
      ...t.ctx,
      answered: t.songs.length,
      correct: t.songs.filter((x) => x.correct).length,
      score: t.score,
      best_combo: t.bestCombo,
      duration_ms: Math.max(0, Date.now() - t.startedAt),
      completed,
      songs: t.songs,
    });
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (blockedRef.current) clearTimeout(blockedRef.current);
    cleanup();
  }, [cleanup]);

  // Leaving the page (tab closed, back button) quits an open run: it is recorded now
  // with the songs answered, not only at the next start or the nightly job.
  useEffect(() => {
    const leave = (): void => {
      sendFinish(false); // tracking: the abandoned run still lands
      const token = tokenRef.current;
      if (!token || closedRef.current) return;
      closedRef.current = true;
      try {
        void fetch('/api/ranked/run/submit', {
          method: 'POST',
          keepalive: true,
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        }).catch(() => {});
      } catch {
        // the next start or the nightly job closes it
      }
    };
    window.addEventListener('pagehide', leave);
    return () => {
      window.removeEventListener('pagehide', leave);
      leave();
    };
  }, [sendFinish]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (blockedRef.current) { clearTimeout(blockedRef.current); blockedRef.current = null; }
  }, []);

  /** Close the run on the server (quit or finished). Resolves with the result, or null. */
  const close = useCallback(async (token: string): Promise<SubmittedRun | null> => {
    try {
      return await withRetry(() => rankedApi.submit(token));
    } catch {
      return null; // an unclosed run is closed by the next start or the nightly job
    }
  }, []);

  const endEarly = useCallback((message: string) => {
    sendFinish(false);
    const token = tokenRef.current;
    runRef.current++;
    stopTimer();
    stop();
    setBlocked(false);
    setPhase('idle');
    tokenRef.current = null;
    if (!token) return; // nothing issued yet (a late issue is closed when it lands)
    if (!closedRef.current) {
      closedRef.current = true;
      void close(token).then(() => onRecorded?.());
    }
    onClosedEarly?.(message);
  }, [close, onClosedEarly, onRecorded, sendFinish, stop, stopTimer]);

  /** Lock the answer of `round` on the server, then show its reveal. */
  const lock = useCallback(async (round: number, kind: BtRunSong['kind'], choice: number | null, clientMs: number | null) => {
    const token = tokenRef.current;
    if (!token) return;
    const run = runRef.current;
    let r: RoundReveal;
    try {
      r = await withRetry(() => rankedApi.answer(token, round, choice, clientMs));
    } catch {
      if (runRef.current === run) endEarly('Connection lost. Your run is recorded with the songs you answered.');
      return;
    }
    if (runRef.current !== run) return;
    const open = trackRef.current;
    if (open && open.songs.length < open.ctx.rounds) {
      open.songs.push({ song_id: `round-${round}`, kind, correct: r.correct, ms: r.effectiveMs ?? RANKED_TIMER_S * 1000 });
      open.score += r.points;
      if (r.correct && r.streak > open.bestCombo) open.bestCombo = r.streak;
    }
    setQuestions((qs) => qs.map((q, i) => (i === round ? revealed(q, r) : q)));
    setAnswers((prev) => [...prev, { picked: r.choice, correct: r.correct, time_ms: r.effectiveMs ?? RANKED_TIMER_S * 1000 }]);
    setRounds((prev) => [...prev, { points: r.points, speed: r.speedBonus, tenths: r.comboTenths, streak: r.streak }]);
    setBlocked(false);
    setPhase('reveal');
    const head = r.correct ? `Correct, plus ${r.points} points.` : r.timedOut ? 'Time is up.' : 'Missed.';
    announce?.(`${head} ${r.song.title} by ${r.song.artist}.`);
  }, [announce, endEarly]);

  const playRound = useCallback((q: BtQuestion, round: number) => {
    answeredRef.current = false;
    setSelected(null);
    setBlocked(false);
    setTimeLeft(RANKED_TIMER_S);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
    loadAndPlay(q.preview_url);
    if (audioRef.current) audioRef.current.muted = mutedRef.current;
    // Tracking: the run starts when a clip really plays (never for a browser that plays nothing).
    const open = trackRef.current;
    if (open && !open.started && audioRef.current) {
      audioRef.current.addEventListener('playing', () => {
        if (trackRef.current !== open || open.started) return;
        open.started = true;
        open.startedAt = Date.now();
        trackBtRun({ event: 'start', ...open.ctx });
      }, { once: true });
    }
    startRef.current = Date.now();
    stopTimer();
    const run = runRef.current;
    const handle = setInterval(() => {
      if (runRef.current !== run) { clearInterval(handle); return; }
      const remaining = RANKED_TIMER_S - (Date.now() - startRef.current) / 1000;
      if (remaining <= 0) {
        stopTimer();
        setTimeLeft(0);
        if (!answeredRef.current) {
          answeredRef.current = true;
          fadeOut(350);
          void lock(round, q.question_type, null, null);
        }
      } else {
        setTimeLeft(remaining);
      }
    }, 50);
    timerRef.current = handle;
    blockedRef.current = setTimeout(() => {
      const a = audioRef.current;
      if (!answeredRef.current && a && a.paused && !a.ended) setBlocked(true);
    }, BLOCKED_CHECK_MS);
  }, [audioRef, fadeOut, loadAndPlay, lock, stopTimer]);

  /** Release round `n` on the server and play it. */
  const openRound = useCallback(async (n: number): Promise<void> => {
    const token = tokenRef.current;
    if (!token) return;
    const run = runRef.current;
    let pub: PublicRound;
    try {
      pub = await withRetry(() => rankedApi.start(token, n));
    } catch {
      if (runRef.current === run) endEarly('Connection lost. Your run is recorded with the songs you answered.');
      return;
    }
    if (runRef.current !== run) return;
    const q = toQuestion(pub);
    setQuestions((qs) => qs.map((x, i) => (i === n ? q : x)));
    setIndex(n);
    setPhase('playing');
    playRound(q, n);
  }, [endEarly, playRound]);

  const startRanked = useCallback(async () => {
    unlock(); // inside the tap (iOS Safari)
    sendFinish(false); // a tracked run still open is closed as abandoned
    const run = ++runRef.current;
    busyRef.current = false;
    closedRef.current = false;
    tokenRef.current = null;
    setError(null);
    setSubmit({ kind: 'idle' });
    setQuestions([]);
    setAnswers([]);
    setRounds([]);
    setIndex(0);
    setPhase('loading');
    let got: IssuedRun;
    try {
      got = await rankedApi.issue();
    } catch (e) {
      if (runRef.current !== run) return;
      setPhase('idle');
      if (e instanceof RankedApiError) onRefused?.(e);
      else setError('Could not start a ranked run. Check your connection.');
      return;
    }
    if (runRef.current !== run) {
      // The player left while the run was being drawn: close it (recorded, 0 answered).
      void close(got.token);
      return;
    }
    tokenRef.current = got.token;
    const runId = newBtRunId();
    trackRef.current = runId ? {
      ctx: {
        run_id: runId,
        playlist: btPlaylistId({ kind: 'free', playlist: RANKED_PICK.playlist }),
        mode: 'ranked',
        source: btSourceHere('free'),
        locale: btLocale(),
        rounds: got.rounds,
      },
      startedAt: Date.now(),
      started: false,
      songs: [],
      score: 0,
      bestCombo: 0,
    } : null;
    setIssued(got);
    setQuestions(Array.from({ length: got.rounds }, (_, i) => unreleased(i)));
    analytics.gameStart('blindtest', false);
    await openRound(0);
  }, [close, onRefused, openRound, sendFinish, unlock]);

  const pickAnswer = useCallback((i: number) => {
    if (answeredRef.current || phase !== 'playing') return;
    const q = questions[index];
    if (!q || i < 0 || i >= q.choices.length) return;
    answeredRef.current = true;
    stopTimer();
    fadeOut(350);
    setSelected(i);
    const clientMs = Math.min(RANKED_TIMER_S * 1000, Math.max(0, Date.now() - startRef.current));
    void lock(index, q.question_type, i, clientMs);
  }, [fadeOut, index, lock, phase, questions, stopTimer]);

  const finish = useCallback(async () => {
    const token = tokenRef.current;
    stopTimer();
    stop();
    setPhase('results');
    sendFinish(true);
    if (!token || closedRef.current) return;
    closedRef.current = true;
    setSubmit({ kind: 'saving' });
    const result = await close(token);
    setSubmit(result ? { kind: 'done', result } : { kind: 'failed' });
    if (result) onRecorded?.();
  }, [close, onRecorded, sendFinish, stop, stopTimer]);

  const next = useCallback(() => {
    if (phase !== 'reveal' || busyRef.current) return;
    const n = index + 1;
    if (n >= (issued?.rounds ?? 10)) { void finish(); return; }
    busyRef.current = true;
    void openRound(n).finally(() => { busyRef.current = false; });
  }, [finish, index, issued, openRound, phase]);

  // Auto-next from the reveal (16.7: "Next song in 3 seconds").
  useEffect(() => {
    if (phase !== 'reveal') return;
    const run = runRef.current;
    const t = setTimeout(() => { if (runRef.current === run) next(); }, RANKED_AUTO_NEXT_MS);
    return () => clearTimeout(t);
  }, [phase, next]);

  const summary = useMemo(() => summaryFrom(answers, rounds), [answers, rounds]);

  // Results: analytics + the live region, once per run.
  const announcedEnd = useRef(-1);
  useEffect(() => {
    if (phase !== 'results' || announcedEnd.current === runRef.current) return;
    announcedEnd.current = runRef.current;
    analytics.gameComplete('blindtest', summary.correct, questions.length, false);
    announce?.(`Ranked run finished. ${summary.correct} out of ${questions.length}, ${summary.points} points.`);
  }, [announce, phase, questions.length, summary.correct, summary.points]);

  const quit = useCallback(() => {
    if (phase === 'results' || phase === 'idle') { setPhase('idle'); return; }
    endEarly('Run recorded with the songs you answered');
  }, [endEarly, phase]);

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

  // P6's other entry points (free, daily, challenge) all mean "start a ranked run" here.
  const start = useCallback(async () => { await startRanked(); }, [startRanked]);
  const prepare = useCallback(() => { setPhase('tap'); }, []);

  return {
    phase,
    mode: 'free',
    pick: RANKED_PICK,
    count: issued?.rounds ?? 10,
    questions,
    index,
    answers,
    selected,
    timeLeft,
    isPlaying,
    blocked,
    muted,
    error,
    summary,
    daily: { rank: null, total: null, xp: null, signedIn: null },
    startFree: start,
    startDaily: start,
    prepareDaily: prepare,
    prepareChallenge: prepare,
    startChallenge: () => { void startRanked(); },
    pickAnswer,
    next,
    quit,
    replay,
    toggleMute,
    resume,
    playClip,
    stopClip,
    clearError,
    issued,
    submit,
    startRanked,
  };
}

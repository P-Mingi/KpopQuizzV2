'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';

import { Mascot } from '@/components/ui/mascot';
import { ResultLoop } from '@/components/result/result-loop';
import { useSignedIn } from '@/lib/use-signed-in';
import { analytics, isDailyLaunch } from '@/lib/analytics';
import { hasPlayedDaily, markDailyPlayed, completeDaily } from '@/lib/daily-played';
import { useAudioPlayer } from './use-audio-player';

// ============================================
// Solo V1 blindtest: 10 songs, 10s each, Deezer preview audio, 4 choices.
// One mode only. Playlist = All / a generation / a group. No hint, no XP/DB.
// ============================================

const TIMER = 10;
const RING_R = 54;
const RING_CIRC = 2 * Math.PI * RING_R;
const REVEAL_MS = 2600;
const LABELS = ['A', 'B', 'C', 'D'] as const;

interface Question {
  song_id: string;
  question_type: 'artist' | 'title';
  question_text: string;
  preview_url: string;
  album_cover_medium: string | null;
  album_cover_big: string | null;
  correct_answer: string;
  choices: string[];
  reveal: { title: string; artist: string; album: string | null; cover: string | null };
}

interface Answer {
  picked: number | null;
  correct: boolean;
  // N4: ms from the clip appearing to the answer (or timeout). Summed across all
  // 10 songs into the daily leaderboard tiebreak.
  time_ms: number;
}

// N5: one row of today's Blindtest of the Day leaderboard.
interface LbEntry {
  rank: number;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  score: number;
  time_ms: number;
}

type Phase = 'setup' | 'loading' | 'playing' | 'reveal' | 'results';
type PickKind = 'all' | 'gen' | 'group' | 'type';

// U-2a: girl/boy group picks. The generate API already supports the 'gg'/'bg'
// playlists (GENERAL_PLAYLISTS); this just surfaces them in the setup picker.
const GENDER_PICKS: Array<{ id: string; label: string }> = [
  { id: 'gg', label: 'Girl groups' },
  { id: 'bg', label: 'Boy groups' },
];

const GENERATIONS: Array<{ id: string; label: string }> = [
  { id: '1st-gen', label: '1st gen' },
  { id: '2nd-gen', label: '2nd gen' },
  { id: '3rd-gen', label: '3rd gen' },
  { id: '4th-gen', label: '4th gen' },
  { id: '5th-gen', label: '5th gen' },
];

// The offerable group list comes from the server (real catalog counts by
// group_id, only groups with >= 15 songs) so it can never drift from what the
// generate route can actually serve. See lib/db/queries/blindtest.ts.
interface PickerGroup { slug: string; name: string; count?: number }

function scoreLabel(score: number): string {
  if (score >= 10) return 'Perfect ear';
  if (score >= 8) return 'Sharp listener';
  if (score >= 6) return 'Solid fan';
  if (score >= 4) return 'Getting there';
  return 'Keep listening';
}

// N5: total answer time, e.g. 42100 -> "42.1s".
function formatSecs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function lbName(e: LbEntry): string {
  return e.display_name || e.username || 'Anonymous';
}

export function BlindtestGame({ groups = [], hero }: { groups?: PickerGroup[]; hero?: React.ReactNode }): React.ReactElement {
  const signedIn = useSignedIn();
  const [phase, setPhase] = useState<Phase>('setup');
  const [pickKind, setPickKind] = useState<PickKind>('all');
  const [playlist, setPlaylist] = useState('all');
  const [playlistLabel, setPlaylistLabel] = useState('All K-pop');
  // Only a by-group pick carries a real group; 'all' and the generation buckets
  // do not, and those fall back to /quizzes in the cross-promo.
  const playlistGroup = groups.find((g) => g.slug === playlist) ?? null;
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [eq, setEq] = useState<number[]>([14, 22, 30, 20, 12]);
  const [error, setError] = useState<string | null>(null);

  // N4/N5 - Blindtest of the Day mode (?daily=true). Free play ignores all of this.
  const [daily, setDaily] = useState(false);
  const [dailyError, setDailyError] = useState(false);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [dailyRank, setDailyRank] = useState<{ rank: number; total: number } | null>(null);
  const [board, setBoard] = useState<{ entries: LbEntry[]; userEntry: LbEntry | null } | null>(null);
  const [resetIn, setResetIn] = useState('');
  const dailySubmittedRef = useRef(false);

  // Destructure the hook's stable useCallback fns: the hook returns a NEW object
  // each render, so depending on `audio` directly would re-run effects every
  // render (clearing the timer + tearing down audio). The fns themselves are stable.
  const { unlock, loadAndPlay, preload, stop, fadeOut, cleanup, isPlaying } = useAudioPlayer();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);
  const answeredRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      setReduceMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }
  }, []);

  // Cleanup audio + timer on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cleanup();
    };
  }, [cleanup]);

  // Equalizer animation while a clip is playing (paused under reduced motion).
  useEffect(() => {
    if (phase !== 'playing' || reduceMotion) return;
    const iv = setInterval(() => setEq(Array.from({ length: 5 }, () => 10 + Math.random() * 28)), 130);
    return () => clearInterval(iv);
  }, [phase, reduceMotion]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const reveal = useCallback((picked: number | null, correct: boolean) => {
    answeredRef.current = true;
    stopTimer();
    fadeOut(350);
    // Time from clip start to answer (or the full timer on a timeout), clamped.
    const timeMs = Math.min(TIMER * 1000, Math.max(0, Date.now() - startRef.current));
    setSelected(picked);
    setAnswers((prev) => [...prev, { picked, correct, time_ms: timeMs }]);
    setPhase('reveal');
  }, [fadeOut, stopTimer]);

  const playQuestion = useCallback((q: Question, nextUrl?: string) => {
    answeredRef.current = false;
    setSelected(null);
    setTimeLeft(TIMER);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
    loadAndPlay(q.preview_url);
    // U-2d: warm the next clip while this one plays so it starts instantly.
    if (nextUrl) preload(nextUrl);
    startRef.current = Date.now();
    stopTimer();
    timerRef.current = setInterval(() => {
      const remaining = TIMER - (Date.now() - startRef.current) / 1000;
      if (remaining <= 0) {
        stopTimer();
        setTimeLeft(0);
        if (!answeredRef.current) reveal(null, false);
      } else {
        setTimeLeft(remaining);
      }
    }, 50);
  }, [loadAndPlay, preload, reveal, stopTimer]);

  const finish = useCallback(() => {
    stopTimer();
    stop();
    setPhase('results');
    // Daily submit + streak run from the results effect below, where the final
    // setAnswers has flushed (reading score/time here would undercount the last).
  }, [stop, stopTimer]);

  const loadBoard = useCallback(async () => {
    try {
      const res = await fetch('/api/daily/blindtest/leaderboard');
      if (!res.ok) return;
      const d = (await res.json()) as { entries?: LbEntry[]; user_entry?: LbEntry | null };
      setBoard({ entries: d.entries ?? [], userEntry: d.user_entry ?? null });
    } catch {
      // leaderboard is a nice-to-have; the result card stands without it
    }
  }, []);

  // Fire once the results phase is actually on screen: at finish() time the last
  // setAnswers has not flushed, so reading the score there would undercount. In
  // daily mode this is also where we mark played, submit the score + rank, credit
  // the streak (N6: completeDaily is idempotent, so QOTD + BToTD award XP once),
  // and pull the leaderboard.
  useEffect(() => {
    if (phase !== 'results') return;
    if (alreadyPlayed) { void loadBoard(); return; }
    analytics.gameComplete('blindtest', score, 10, isDailyLaunch());
    if (daily && !dailySubmittedRef.current) {
      dailySubmittedRef.current = true;
      markDailyPlayed('blindtest');
      const totalTimeMs = answers.reduce((s, a) => s + a.time_ms, 0);
      void (async () => {
        try {
          const res = await fetch('/api/daily/blindtest/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score, time_ms: totalTimeMs }),
          });
          if (res.ok) {
            const d = (await res.json()) as { rank?: number; total?: number };
            if (typeof d.rank === 'number' && typeof d.total === 'number') setDailyRank({ rank: d.rank, total: d.total });
          }
        } catch {
          // anon or network: the score still shows, just unranked
        }
        void completeDaily('blindtest');
        await loadBoard();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const goNext = useCallback(() => {
    const next = index + 1;
    if (next >= questions.length) { finish(); return; }
    setIndex(next);
    setPhase('playing');
    playQuestion(questions[next]!, questions[next + 1]?.preview_url);
  }, [index, questions, finish, playQuestion]);

  // Auto-advance from reveal.
  useEffect(() => {
    if (phase !== 'reveal') return;
    const t = setTimeout(() => goNext(), REVEAL_MS);
    return () => clearTimeout(t);
  }, [phase, goNext]);

  const start = useCallback(async () => {
    // Audio unlock MUST run inside this tap/gesture (iOS Safari).
    unlock();
    setError(null);
    setPhase('loading');
    try {
      const res = await fetch('/api/blind-test/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlist, mode: 'challenge' }),
      });
      if (!res.ok) { setError('Not enough songs for this pick. Try another.'); setPhase('setup'); return; }
      const data = (await res.json()) as { questions: Question[] };
      if (!data.questions?.length) { setError('No songs found. Try another pick.'); setPhase('setup'); return; }
      setQuestions(data.questions);
      setIndex(0);
      setAnswers([]);
      analytics.gameStart('blindtest', isDailyLaunch());
      setPhase('playing');
      playQuestion(data.questions[0]!, data.questions[1]?.preview_url);
    } catch {
      setError('Could not start the game. Check your connection.');
      setPhase('setup');
    }
  }, [unlock, playlist, playQuestion]);

  // N4 - start the Blindtest of the Day. Runs from a Start tap (not on mount) so
  // the audio unlock happens inside a user gesture (iOS Safari). Fetches the
  // shared 10 questions instead of generating a fresh set.
  const startDaily = useCallback(async () => {
    unlock();
    setDailyError(false);
    setPhase('loading');
    try {
      const res = await fetch('/api/daily/blindtest');
      if (!res.ok) { setDailyError(true); setPhase('setup'); return; }
      const data = (await res.json()) as { questions?: Question[] };
      if (!data.questions?.length) { setDailyError(true); setPhase('setup'); return; }
      setQuestions(data.questions);
      setIndex(0);
      setAnswers([]);
      dailySubmittedRef.current = false;
      analytics.gameStart('blindtest', true);
      setPhase('playing');
      playQuestion(data.questions[0]!, data.questions[1]?.preview_url);
    } catch {
      setDailyError(true);
      setPhase('setup');
    }
  }, [unlock, playQuestion]);

  // N4 - leave daily mode for free play (the "Play free mode" action). Resets
  // state and drops ?daily from the URL so a refresh does not re-enter daily.
  const playFree = useCallback(() => {
    setDaily(false);
    setAlreadyPlayed(false);
    setDailyError(false);
    setDailyRank(null);
    setBoard(null);
    dailySubmittedRef.current = false;
    setAnswers([]);
    setIndex(0);
    setQuestions([]);
    setError(null);
    setPhase('setup');
    if (typeof window !== 'undefined') window.history.replaceState(null, '', '/blindtest');
  }, []);

  // N4 - detect daily mode on mount (client-only so /blindtest stays static and
  // keeps its SEO setup content). If already played today, jump straight to the
  // results/leaderboard state; otherwise wait on the daily intro for a Start tap.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (new URLSearchParams(window.location.search).get('daily') !== 'true') return;
    setDaily(true);
    if (hasPlayedDaily('blindtest')) {
      setAlreadyPlayed(true);
      setPhase('results');
    }
  }, []);

  // N4/N5 - "Resets in Xh Ym" for the daily come-back-tomorrow line.
  useEffect(() => {
    if (!daily) return;
    function calc(): void {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setUTCHours(24, 0, 0, 0);
      const diff = tomorrow.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setResetIn(`${h}h ${m}m`);
    }
    calc();
    const iv = setInterval(calc, 60000);
    return () => clearInterval(iv);
  }, [daily]);

  const pick = useCallback((i: number) => {
    if (answeredRef.current || phase !== 'playing') return;
    const q = questions[index]!;
    reveal(i, q.choices[i] === q.correct_answer);
  }, [phase, questions, index, reveal]);

  const choosePlaylist = (kind: PickKind, id: string, label: string) => {
    setPickKind(kind);
    setPlaylist(id);
    setPlaylistLabel(label);
  };

  const score = answers.filter((a) => a.correct).length;

  // ============================================ LOADING (generate wait)
  // F4: the deliberate "we're preparing your game" wait while
  // /api/blind-test/generate picks 10 songs + re-fetches Deezer previews.
  if (phase === 'loading') {
    return (
      <div className="bt-screen">
        <div className="bt-loading" role="status" aria-live="polite">
          <Mascot variant="think" animate="tilt" size={104} alt="" />
          <p className="bt-loading-msg">Picking your songs...</p>
        </div>
      </div>
    );
  }

  // ============================================ DAILY INTRO
  // N4: daily mode skips the playlist picker. One Start tap unlocks audio (iOS
  // Safari needs the gesture) and loads today's shared 10 songs.
  if (phase === 'setup' && daily) {
    return (
      <div className="bt-screen">
        <div className="bt-setup">
          <span className="bt-kicker">Blindtest of the day</span>
          <h1 className="bt-title">Name that<br /><span className="bt-title-accent">K-pop song</span></h1>
          <p className="bt-sub">10 songs, same for everyone. Guess fast, then see where you rank against every other fan today.</p>

          {dailyError && <p className="bt-error" role="alert">Could not load today&apos;s blindtest. Try free mode below.</p>}

          <button type="button" className="bt-start" onClick={startDaily}>
            Play today&apos;s blindtest
          </button>
          <button type="button" className="bt-back" onClick={playFree} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            Play free mode
          </button>
        </div>
      </div>
    );
  }

  // ============================================ SETUP
  if (phase === 'setup') {
    return (
      <div className="bt-screen">
        <div className="bt-setup">
          <span className="bt-kicker">Blind test</span>
          {hero ?? <h1 className="bt-title">Name that<br /><span className="bt-title-accent">K-pop song</span></h1>}
          <p className="bt-sub">10 songs. 10 seconds each. Guess the song or the artist from a clip.</p>

          <div className="bt-pick-group">
            <button
              type="button"
              className={`bt-pick-all${pickKind === 'all' ? ' on' : ''}`}
              onClick={() => choosePlaylist('all', 'all', 'All K-pop')}
              aria-pressed={pickKind === 'all'}
            >
              <span className="bt-pick-all-title">All K-pop</span>
              <span className="bt-pick-all-sub">Every group, every generation</span>
            </button>

            <p className="bt-pick-heading">By type</p>
            <div className="bt-chip-row">
              {GENDER_PICKS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`bt-chip${playlist === g.id ? ' on' : ''}`}
                  onClick={() => choosePlaylist('type', g.id, g.label)}
                  aria-pressed={playlist === g.id}
                >
                  {g.label}
                </button>
              ))}
            </div>

            <p className="bt-pick-heading">By generation</p>
            <div className="bt-chip-row">
              {GENERATIONS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`bt-chip${playlist === g.id ? ' on' : ''}`}
                  onClick={() => choosePlaylist('gen', g.id, g.label)}
                  aria-pressed={playlist === g.id}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {groups.length > 0 && <p className="bt-pick-heading">By group</p>}
            <div className="bt-group-grid">
              {groups.map((g) => (
                <button
                  key={g.slug}
                  type="button"
                  className={`bt-chip${playlist === g.slug ? ' on' : ''}`}
                  onClick={() => choosePlaylist('group', g.slug, g.name)}
                  aria-pressed={playlist === g.slug}
                >
                  {g.name}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="bt-error" role="alert">{error}</p>}

          <button type="button" className="bt-start" onClick={start}>
            Start <span className="bt-start-pl">{playlistLabel}</span>
          </button>
          <Link href="/games" className="bt-back">Back to games</Link>
        </div>
      </div>
    );
  }

  // ============================================ PLAYING / REVEAL
  if (phase === 'playing' || phase === 'reveal') {
    const q = questions[index];
    if (!q) return <div />;
    const answered = phase === 'reveal';
    const correctIdx = q.choices.findIndex((c) => c === q.correct_answer);
    const frac = Math.max(0, timeLeft) / TIMER;
    const danger = !answered && timeLeft <= 3;
    const isCorrect = answered && selected !== null && selected === correctIdx;

    const choiceClass = (i: number): string => {
      let c = 'ans-btn';
      if (answered) {
        c += ' disabled';
        if (i === correctIdx) c += ' correct';
        else if (i === selected) c += ' wrong';
        else c += ' dimmed';
      }
      return c;
    };

    return (
      <div className="bt-screen">
        <div className="bt-play">
          {/* Top bar */}
          <div className="bt-top">
            <button type="button" className="bt-quit" onClick={() => { stopTimer(); stop(); setPhase('setup'); }} aria-label="Quit game">Quit</button>
            <div className="bt-progress"><div className="bt-progress-fill" style={{ width: `${((index + (answered ? 1 : 0)) / questions.length) * 100}%` }} /></div>
            <span className="bt-count">{index + 1}/{questions.length}</span>
          </div>

          {/* Audio orb / reveal cover */}
          <div className="bt-stage">
            {!answered ? (
              <div className={`bt-orb${danger ? ' danger' : ''}`}>
                <svg width="148" height="148" viewBox="0 0 148 148" aria-hidden="true">
                  <circle className="bt-orb-bg" cx="74" cy="74" r={RING_R} />
                  <circle
                    className="bt-orb-fg"
                    cx="74" cy="74" r={RING_R}
                    strokeDasharray={RING_CIRC}
                    strokeDashoffset={RING_CIRC * (1 - frac)}
                  />
                </svg>
                <div className="bt-orb-inner">
                  <div className="bt-eq" aria-hidden="true">
                    {eq.map((h, i) => (
                      <span key={i} className="bt-eq-bar" style={{ height: reduceMotion ? 20 : h }} />
                    ))}
                  </div>
                  <span className="bt-time" aria-live="polite" aria-label={`${Math.ceil(timeLeft)} seconds left`}>{Math.ceil(timeLeft)}</span>
                </div>
              </div>
            ) : (
              <div className={`bt-reveal-head ${isCorrect ? 'ok' : 'no'}`} role="status">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {q.reveal.cover && <img src={q.reveal.cover} alt={`${q.reveal.title} by ${q.reveal.artist} cover art`} className="bt-cover" width={124} height={124} decoding="async" />}
                <p className="bt-verdict">{isCorrect ? 'Correct' : selected === null ? 'Time up' : 'Not quite'}</p>
                <p className="bt-reveal-title">{q.reveal.title}</p>
                <p className="bt-reveal-artist">{q.reveal.artist}</p>
                {q.reveal.album && <p className="bt-reveal-album">{q.reveal.album}</p>}
              </div>
            )}
          </div>

          {/* Audio state for accessibility */}
          {!answered && (
            <p className="bt-audio-state" aria-live="polite">
              <span className={`bt-audio-dot${isPlaying ? ' on' : ''}`} aria-hidden="true" />
              {isPlaying ? 'Playing clip' : 'Loading clip'}
            </p>
          )}

          {/* Question type badge + the ask */}
          <div className={`bt-q-kind ${q.question_type}`}>
            {q.question_type === 'artist' ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" /></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
            )}
            {q.question_type === 'artist' ? 'Artist round' : 'Song round'}
          </div>
          <p className="bt-q">{q.question_text}</p>

          {/* Choices (keyed by question so a new round mounts fresh buttons -
              no answered-state color carrying over via the 150ms transition) */}
          <div className="answers" key={index}>
            {q.choices.map((choice, i) => (
              <button
                key={i}
                type="button"
                className={choiceClass(i)}
                disabled={answered}
                aria-pressed={selected === i}
                onClick={() => pick(i)}
              >
                <span className="ans-letter">{LABELS[i] ?? ''}</span>
                {choice}
                {answered && i === correctIdx && (
                  <span className="bt-choice-mark ok" aria-hidden="true">
                    <svg width="17" height="17" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.2 3.2L13 4.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                )}
                {answered && i === selected && i !== correctIdx && (
                  <span className="bt-choice-mark no" aria-hidden="true">
                    <svg width="17" height="17" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================ RESULTS (daily)
  // Addendum 2: keep ResultLoop, but the replay slot becomes "Play free mode"
  // and the screen leads with the leaderboard + a come-back-tomorrow line.
  if (daily) {
    const totalTimeMs = answers.reduce((s, a) => s + a.time_ms, 0);
    const myRank = dailyRank?.rank ?? null;
    const shareText = alreadyPlayed
      ? 'Play the K-pop Blindtest of the Day: 10 songs, same for everyone.'
      : `I scored ${score}/10 on today's K-pop Blindtest of the Day in ${formatSecs(totalTimeMs)}.`;

    const renderRow = (e: LbEntry, me: boolean): React.ReactElement => (
      <div key={me ? `me-${e.user_id}` : e.user_id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${me ? 'border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_12%,transparent)]' : 'border-[var(--border)] bg-surface'}`}>
        <span className="w-6 text-center text-[13px] font-bold text-secondary tabular-nums">{e.rank}</span>
        {e.avatar_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={e.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
          : <span className="w-7 h-7 rounded-full bg-[var(--surface-alt)] flex-shrink-0" aria-hidden="true" />}
        <span className="flex-1 text-[13px] font-medium text-primary truncate">{lbName(e)}</span>
        <span className="text-[13px] font-bold text-primary tabular-nums">{e.score}/10</span>
        <span className="w-14 text-right text-[12px] text-[var(--txt3)] tabular-nums">{formatSecs(e.time_ms)}</span>
      </div>
    );

    return (
      <div className="bt-screen">
        <div className="bt-results">
          <div className="flex justify-center" style={{ marginBottom: 8 }}>
            {alreadyPlayed
              ? <Mascot variant="sleep" size={104} />
              : score >= 6 ? <Mascot variant="celebrate" animate="bob" size={104} /> : <Mascot variant="sad" size={104} />}
          </div>

          <div className="bt-result-card">
            <p className="bt-result-kicker">Blindtest of the day</p>
            {alreadyPlayed ? (
              <p className="bt-result-label" style={{ marginTop: 10 }}>You already played today</p>
            ) : (
              <>
                <p className="bt-result-score" aria-label={`You scored ${score} out of 10`}>
                  {score}<span className="bt-result-of">/10</span>
                </p>
                <p className="bt-result-label">{scoreLabel(score)} · {formatSecs(totalTimeMs)}</p>
                {myRank && <p className="bt-result-url">Rank #{myRank} of {dailyRank!.total} today</p>}
              </>
            )}
          </div>

          {board && board.entries.length > 0 && (
            <div className="max-w-[440px] mx-auto mt-5 w-full">
              <p className="text-xs font-bold uppercase tracking-wide text-secondary mb-2">Today&apos;s leaderboard</p>
              <div className="flex flex-col gap-1.5">
                {board.entries.map((e) => renderRow(e, myRank !== null && e.rank === myRank))}
                {board.userEntry && (
                  <>
                    <p className="text-center text-[var(--txt3)] text-sm leading-none py-0.5" aria-hidden="true">···</p>
                    {renderRow(board.userEntry, true)}
                  </>
                )}
              </div>
            </div>
          )}

          <div className="text-center mt-3">
            <Link href="/blindtest/leaderboard" className="text-[13px] font-medium text-[var(--brand)] no-underline">
              See the full leaderboard {'→'}
            </Link>
          </div>

          <p className="text-center text-[13px] text-secondary mt-4">
            Come back tomorrow{resetIn ? ` · resets in ${resetIn}` : ''}
          </p>

          <ResultLoop
            game="blindtest"
            score={alreadyPlayed ? undefined : score}
            max={alreadyPlayed ? undefined : 10}
            scoreLabel={alreadyPlayed ? undefined : scoreLabel(score)}
            shareText={shareText}
            shareUrl="/blindtest"
            onPlayAgain={playFree}
            playAgainLabel="Play free mode"
            isSignedIn={signedIn !== false}
            groupSlug={null}
            groupName={null}
          />
        </div>
      </div>
    );
  }

  // ============================================ RESULTS (free play)
  return (
    <div className="bt-screen">
      <div className="bt-results">
        {/* F3 + F5 - mascot above the result card: celebrate on a good score
            (>= 6/10), sad below that. sad is static (never animates). */}
        <div className="flex justify-center" style={{ marginBottom: 8 }}>
          {score >= 6
            ? <Mascot variant="celebrate" animate="bob" size={104} />
            : <Mascot variant="sad" size={104} />}
        </div>
        <div className="bt-result-card">
          <p className="bt-result-kicker">{playlistLabel} blind test</p>
          <p className="bt-result-score" aria-label={`You scored ${score} out of 10`}>
            {score}<span className="bt-result-of">/10</span>
          </p>
          <p className="bt-result-label">{scoreLabel(score)}</p>
          <p className="bt-result-url">kpopquiz.org</p>
        </div>

        <div className="bt-breakdown">
          {questions.map((q, i) => {
            const a = answers[i];
            const ok = a?.correct ?? false;
            return (
              <div key={q.song_id} className="bt-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {q.reveal.cover
                  ? <img src={q.reveal.cover} alt={`${q.reveal.title} cover`} className="bt-row-cover" width={40} height={40} loading="lazy" decoding="async" />
                  : <span className="bt-row-cover bt-row-cover-empty" aria-hidden="true" />}
                <div className="bt-row-info">
                  <p className="bt-row-title">{q.reveal.title}</p>
                  <p className="bt-row-artist">{q.reveal.artist}</p>
                </div>
                <span className={`bt-row-mark ${ok ? 'ok' : 'no'}`} aria-label={ok ? 'Correct' : 'Wrong'}>
                  {ok ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.2 3.2L13 4.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Workstream LOOP - the ad-hoc actions, the standalone Discord line and
            the "Change playlist" dead end are all folded into ResultLoop now, so
            this result ends the same way every other game does. The anon nudge
            moved there too (ResultLoop shows it on signed-out state rather than
            on an every-third-play counter). */}
        <ResultLoop
          game="blindtest"
          score={score}
          max={10}
          scoreLabel={scoreLabel(score)}
          shareText={`I scored ${score}/10 on the kpopquiz.org K-pop Blind Test. Can you beat me?`}
          shareUrl="/blindtest"
          onPlayAgain={start}
          isSignedIn={signedIn !== false}
          groupSlug={playlistGroup?.slug ?? null}
          groupName={playlistGroup?.name ?? null}
        />
      </div>
    </div>
  );
}

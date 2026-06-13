'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';

import { Mascot } from '@/components/ui/mascot';
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
}

type Phase = 'setup' | 'loading' | 'playing' | 'reveal' | 'results';
type PickKind = 'all' | 'gen' | 'group';

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

export function BlindtestGame({ groups = [] }: { groups?: PickerGroup[] }): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('setup');
  const [pickKind, setPickKind] = useState<PickKind>('all');
  const [playlist, setPlaylist] = useState('all');
  const [playlistLabel, setPlaylistLabel] = useState('All K-pop');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [eq, setEq] = useState<number[]>([14, 22, 30, 20, 12]);
  const [nudge, setNudge] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Destructure the hook's stable useCallback fns: the hook returns a NEW object
  // each render, so depending on `audio` directly would re-run effects every
  // render (clearing the timer + tearing down audio). The fns themselves are stable.
  const { unlock, loadAndPlay, stop, fadeOut, cleanup, isPlaying } = useAudioPlayer();
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
    setSelected(picked);
    setAnswers((prev) => [...prev, { picked, correct }]);
    setPhase('reveal');
  }, [fadeOut, stopTimer]);

  const playQuestion = useCallback((q: Question) => {
    answeredRef.current = false;
    setSelected(null);
    setTimeLeft(TIMER);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
    loadAndPlay(q.preview_url);
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
  }, [loadAndPlay, reveal, stopTimer]);

  const finish = useCallback(() => {
    stopTimer();
    stop();
    setPhase('results');
    try {
      const n = parseInt(localStorage.getItem('bt_anon_plays') ?? '0', 10) + 1;
      localStorage.setItem('bt_anon_plays', String(n));
      if (n >= 3 && n % 3 === 0) setNudge(true);
    } catch {
      // storage blocked - skip the nudge
    }
  }, [stop, stopTimer]);

  const goNext = useCallback(() => {
    const next = index + 1;
    if (next >= questions.length) { finish(); return; }
    setIndex(next);
    setPhase('playing');
    playQuestion(questions[next]!);
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
      setNudge(false);
      setPhase('playing');
      playQuestion(data.questions[0]!);
    } catch {
      setError('Could not start the game. Check your connection.');
      setPhase('setup');
    }
  }, [unlock, playlist, playQuestion]);

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

  // ============================================ SETUP
  if (phase === 'setup') {
    return (
      <div className="bt-screen">
        <div className="bt-setup">
          <span className="bt-kicker">Blind test</span>
          <h1 className="bt-title">Name that<br /><span className="bt-title-accent">K-pop song</span></h1>
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
                {q.reveal.cover && <img src={q.reveal.cover} alt="" className="bt-cover" />}
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

  // ============================================ RESULTS
  const share = async () => {
    const text = `I scored ${score}/10 on the kpopquiz.org K-pop Blind Test. Can you beat me?`;
    const url = typeof window !== 'undefined' ? `${window.location.origin}/blindtest` : 'https://kpopquiz.org/blindtest';
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: 'K-pop Blind Test', text, url });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(`${text} ${url}`);
      }
    } catch {
      // user cancelled / clipboard blocked
    }
  };

  return (
    <div className="bt-screen">
      <div className="bt-results">
        {/* F3 - celebrate mascot above the result card on a good score (>= 6/10).
            Weaker scores stay mascot-less for now (sad variant is F5). */}
        {score >= 6 && (
          <div className="flex justify-center" style={{ marginBottom: 8 }}>
            <Mascot variant="celebrate" animate="bob" size={104} />
          </div>
        )}
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
                  ? <img src={q.reveal.cover} alt="" className="bt-row-cover" />
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

        {nudge && (
          <div className="bt-nudge">
            <p>Enjoying the blind test? <Link href="/login">Sign in</Link> to save your scores.</p>
          </div>
        )}

        <div className="bt-result-actions">
          <button type="button" className="btn-primary" onClick={start}>Play again</button>
          <button type="button" className="btn-outline" onClick={share}>Share result</button>
        </div>
        <button type="button" className="bt-back bt-back-btn" onClick={() => { setPhase('setup'); setError(null); }}>Change playlist</button>
      </div>
    </div>
  );
}

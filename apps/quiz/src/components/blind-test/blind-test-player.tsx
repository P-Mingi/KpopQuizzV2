'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

import { BlindTestEqualizer } from '@/components/game/blind-test-equalizer';
import { legacyGenerateBody, legacyModeRun, roundFromGenerate } from '@/lib/blind-test/legacy-round';

import type { BlindTestMode } from '@/lib/blind-test-modes';
import type { Round, RoundSong } from '@/lib/blind-test/legacy-round';

// The flag-off player of /blindtest/<mode>. It plays what
// POST /api/blind-test/generate serves today: Deezer previews, one question per
// song (lib/blind-test/legacy-round.ts). It used to ask for `{ mode_id }` and
// read YouTube clips from `songs[]`, a shape the route no longer answers, so Play
// failed on every mode page. A run saves nothing, like a free run on the hub.

interface PlayerAnswer {
  picked: number;
  correct: boolean;
  time: number;
}

type Phase = 'intro' | 'loading' | 'playing' | 'results';

export function BlindTestPlayer({ mode }: { mode: BlindTestMode }): React.ReactElement {
  const run = legacyModeRun(mode.id);

  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState<Round | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, PlayerAnswer>>({});
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const roundRef = useRef<Round | null>(null);
  const indexRef = useRef(0);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [answered, setAnswered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answeredRef = useRef(false);
  const timerActiveRef = useRef(false);
  const answerStartRef = useRef(0);

  answeredRef.current = answered;
  roundRef.current = round;
  indexRef.current = currentIndex;

  const currentSong = round?.songs[currentIndex] ?? null;
  const clipSeconds = round?.timer ?? 10;

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    const audio = audioRef.current;
    if (audio) { audio.pause(); audio.removeAttribute('src'); }
  }, []);

  // ── Core logic ──────────────────────────────────────

  function startCountdown() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleReveal(-1);
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
  }

  /** One audio element for the whole run, created on the Play tap so autoplay is allowed. */
  function ensureAudio(): HTMLAudioElement {
    if (audioRef.current) return audioRef.current;
    const audio = new Audio();
    audio.preload = 'auto';
    audio.addEventListener('playing', () => {
      if (!timerActiveRef.current && !answeredRef.current) {
        timerActiveRef.current = true;
        setIsPlaying(true);
        answerStartRef.current = Date.now();
        startCountdown();
      }
    });
    audio.addEventListener('ended', () => {
      if (!answeredRef.current) handleReveal(-1);
    });
    // A preview that will not load (an expired link): skip the song, as the old
    // player skipped an unembeddable video.
    audio.addEventListener('error', () => {
      if (!answeredRef.current) advanceToNext();
    });
    audioRef.current = audio;
    return audio;
  }

  function playSong(song: RoundSong) {
    const audio = ensureAudio();
    audio.src = song.preview_url;
    audio.currentTime = 0;
    void audio.play().catch(() => { /* the 'error' listener skips an unplayable preview */ });
  }

  function handleReveal(pickedIndex: number) {
    const activeRound = roundRef.current;
    if (answeredRef.current || !activeRound) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setAnswered(true);
    answeredRef.current = true;
    setIsPlaying(false);

    const song = activeRound.songs[indexRef.current];
    if (!song) return;

    const isCorrect = pickedIndex === song.correct_index;
    const answerTime = (Date.now() - answerStartRef.current) / 1000;

    if (isCorrect) setScore(prev => prev + 1);

    setAnswers(prev => ({
      ...prev,
      [song.song_id]: {
        picked: pickedIndex,
        correct: isCorrect,
        time: pickedIndex === -1 ? activeRound.timer : Math.round(answerTime * 10) / 10,
      },
    }));
  }

  function advanceToNext() {
    const activeRound = roundRef.current;
    if (!activeRound) return;
    if (timerRef.current) clearInterval(timerRef.current);
    try { audioRef.current?.pause(); } catch { /* */ }

    const nextIdx = indexRef.current + 1;
    if (nextIdx >= activeRound.songs.length) {
      finishGame();
      return;
    }

    setCurrentIndex(nextIdx);
    indexRef.current = nextIdx;
    setAnswered(false);
    answeredRef.current = false;
    timerActiveRef.current = false;
    setIsPlaying(false);
    setTimeLeft(activeRound.timer);

    playSong(activeRound.songs[nextIdx]!);
  }

  async function startGame() {
    const body = legacyGenerateBody(mode.id);
    if (!body) {
      setError('This mode is not available.');
      return;
    }
    // Created inside the tap, before any await, so the browser lets it play.
    ensureAudio();
    setPhase('loading');
    setError(null);

    try {
      const res = await fetch('/api/blind-test/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data: unknown = await res.json().catch(() => null);
      const next = res.ok ? roundFromGenerate(data) : null;
      if (!next) {
        const message = data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string'
          ? (data as { error: string }).error
          : 'Failed to generate round';
        setError(message);
        setPhase('intro');
        return;
      }

      setRound(next);
      roundRef.current = next;
      setCurrentIndex(0);
      indexRef.current = 0;
      setAnswers({});
      setScore(0);
      setAnswered(false);
      answeredRef.current = false;
      timerActiveRef.current = false;
      setIsPlaying(false);
      setTimeLeft(next.timer);
      setPhase('playing');

      playSong(next.songs[0]!);
    } catch {
      setError('Network error');
      setPhase('intro');
    }
  }

  function finishGame() {
    try { audioRef.current?.pause(); } catch { /* */ }
    setPhase('results');
  }

  const currentAnswer = currentSong ? answers[currentSong.song_id] : undefined;

  // ── RENDER ──────────────────────────────────────────
  return (
    <div>
      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <div className="text-center animate-fade-in">
          <div className="flex justify-center gap-1.5 mb-4">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FAECE7] text-[#712B13]">
              Blind Test
            </span>
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${
              mode.difficulty === 'easy' ? 'bg-[#EAF3DE] text-[#27500A]' :
              mode.difficulty === 'medium' ? 'bg-[#FAEEDA] text-[#633806]' :
              'bg-[#FCEBEB] text-[#791F1F]'
            }`}>{mode.difficulty}</span>
          </div>

          <h1 className="text-xl font-medium mb-2">{mode.title}</h1>
          <p className="text-sm text-[var(--text-secondary)] mb-1">{mode.description}</p>
          <p className="text-xs text-[var(--text-tertiary)] mb-6">
            {mode.song_count} songs · {mode.clip_duration}s clips
          </p>

          {error && (
            <p className="text-sm text-[#791F1F] bg-[#FCEBEB] px-4 py-2 rounded-lg mb-4">{error}</p>
          )}

          <button
            onClick={startGame}
            disabled={!run}
            className="px-10 py-3 rounded-full bg-[var(--text-primary)] text-white text-sm font-medium disabled:opacity-50"
          >
            Play
          </button>

          {/* What the run really is (the line above is the page's fixed copy). */}
          {run && (
            <p className="text-xs text-[var(--text-tertiary)] mt-3">
              {run.count} songs from {run.pick.label} · 10 seconds each
            </p>
          )}

          <div className="mt-4">
            <Link href="/blindtest" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
              Back to modes
            </Link>
          </div>
        </div>
      )}

      {/* ── LOADING ── */}
      {phase === 'loading' && (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--text-secondary)]">Generating round...</p>
        </div>
      )}

      {/* ── PLAYING ── */}
      {phase === 'playing' && currentSong && (
        <div key={currentIndex} className="animate-question-in">
          {/* Progress */}
          <p className="text-xs text-[var(--text-tertiary)] mb-1">
            {currentIndex + 1} of {round!.songs.length}
          </p>
          <div className="h-[3px] bg-[var(--border)] rounded-full mb-8">
            <div
              className="h-[3px] bg-[#ED93B1] rounded-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / round!.songs.length) * 100}%` }}
            />
          </div>

          {/* Equalizer (before answer) */}
          {!answered && (
            <>
              <BlindTestEqualizer playing={isPlaying} timeLeft={timeLeft} clipDuration={clipSeconds} />
              <p className={`text-xs font-medium text-center mb-3 transition-colors ${
                timeLeft <= 3 && isPlaying ? 'text-[#A32D2D]' : 'text-[var(--text-tertiary)]'
              }`}>
                {Math.ceil(timeLeft)}s
              </p>
              <p className="text-sm font-medium text-center mb-4">{currentSong.question_text}</p>
            </>
          )}

          {/* Song info + verdict (after answer; the music keeps playing) */}
          {answered && (
            <div className="text-center mb-4 animate-result-in">
              {currentSong.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={currentSong.cover} alt="" width={96} height={96} className="w-24 h-24 rounded-xl object-cover mx-auto mb-3" />
              )}
              <p className="text-base font-medium mt-1">{currentSong.title}</p>
              <p className="text-xs text-[var(--text-secondary)] mb-2">{currentSong.artist}</p>
              {currentAnswer?.correct && (
                <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-[#EAF3DE] text-[#27500A]">Correct!</span>
              )}
              {currentAnswer && !currentAnswer.correct && currentAnswer.picked >= 0 && (
                <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-[#FCEBEB] text-[#791F1F]">Wrong</span>
              )}
              {currentAnswer && currentAnswer.picked === -1 && (
                <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-[#FCEBEB] text-[#791F1F]">Time&apos;s up</span>
              )}
            </div>
          )}

          {/* Answer buttons */}
          <div className="space-y-2">
            {currentSong.choices.map((choice, i) => (
              <button
                key={i}
                onClick={() => handleReveal(i)}
                disabled={answered}
                className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  !answered
                    ? 'border-[var(--border)] hover:border-[var(--border)] hover:bg-[var(--bg-surface)] active:scale-[0.98]'
                    : i === currentSong.correct_index
                      ? 'bg-[#EAF3DE] border-[#97C459] text-[#27500A]'
                      : currentAnswer && i === currentAnswer.picked && !currentAnswer.correct
                        ? 'bg-[#FCEBEB] border-[#F09595] text-[#791F1F]'
                        : 'opacity-35 border-[var(--border)]'
                }`}
              >
                {choice}
              </button>
            ))}
          </div>

          {/* Next button */}
          {answered && (
            <div className="text-center mt-5">
              <button
                onClick={advanceToNext}
                className="px-8 py-3 rounded-full bg-[var(--text-primary)] text-white text-sm font-medium"
              >
                {currentIndex + 1 >= round!.songs.length ? 'See results' : 'Next song'}
              </button>
            </div>
          )}

          {!answered && (
            <p className="text-xs text-[var(--text-tertiary)] text-center mt-4">tap to pick</p>
          )}
        </div>
      )}

      {/* ── RESULTS ── */}
      {phase === 'results' && round && (() => {
        const total = round.songs.length;
        const scorePct = total > 0 ? Math.round((score / total) * 100) : 0;
        const label =
          scorePct === 100 ? 'Perfect score' :
          scorePct >= 80 ? 'Impressive' :
          scorePct >= 60 ? 'Not bad' :
          scorePct >= 40 ? 'Room to improve' : 'Better luck next time';

        const missed = round.songs.filter(s => !answers[s.song_id]?.correct);

        return (
          <div className="text-center animate-result-in">
            <p className="text-xs text-[var(--text-tertiary)] mb-2">{mode.title}</p>
            <p className="text-5xl font-medium mb-1">{score}/{total}</p>
            <p className="text-sm text-[var(--text-secondary)] mb-4">{label}</p>

            <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden mb-8">
              <div className="h-full rounded-full bg-[#ED93B1]"
                style={{ width: `${scorePct}%`, transition: 'width 0.8s ease' }} />
            </div>

            {missed.length > 0 && (
              <div className="text-left mb-6">
                <p className="text-sm font-medium mb-3">Songs you missed</p>
                <div className="space-y-2">
                  {missed.map(song => (
                    <MissedRow key={song.song_id} song={song} />
                  ))}
                </div>
              </div>
            )}

            {missed.length === 0 && (
              <p className="text-sm text-[var(--text-tertiary)] mb-6">No missed songs - perfect game!</p>
            )}

            <div className="flex gap-2">
              <button onClick={startGame}
                className="flex-1 py-3 rounded-full border border-[var(--border)] text-sm font-medium">
                Play again
              </button>
              <button
                onClick={() => {
                  const text = `I scored ${score}/${total} on ${mode.title} blind test - ${label}! kpopquiz.org/blindtest/${mode.id}`;
                  if (navigator.share) navigator.share({ text, url: `https://kpopquiz.org/blindtest/${mode.id}` });
                  else navigator.clipboard.writeText(text);
                }}
                className="flex-1 py-3 rounded-full bg-[var(--text-primary)] text-white text-sm font-medium">
                Share result
              </button>
            </div>

            <Link href="/blindtest" className="block text-sm text-[var(--text-secondary)] mt-4 hover:text-[var(--text-primary)]">
              Try another mode
            </Link>
          </div>
        );
      })()}
    </div>
  );
}

function MissedRow({ song }: { song: RoundSong }): React.ReactElement {
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="flex gap-3 items-center p-3 bg-[var(--bg-surface)] rounded-lg cursor-pointer" onClick={() => setRevealed(true)}>
      {song.cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={song.cover}
          alt=""
          width={40}
          height={40}
          className={`w-10 h-10 rounded object-cover transition-all duration-300 ${revealed ? '' : 'blur-md'}`}
        />
      ) : (
        <span className="w-10 h-10 rounded bg-[var(--border)]" aria-hidden="true" />
      )}
      <div className="flex-1 min-w-0">
        {revealed ? (
          <>
            <p className="text-sm font-medium truncate">{song.title}</p>
            <p className="text-[11px] text-[var(--text-secondary)]">{song.artist}</p>
          </>
        ) : (
          <p className="text-xs text-[var(--text-tertiary)]">Tap to reveal</p>
        )}
      </div>
    </div>
  );
}

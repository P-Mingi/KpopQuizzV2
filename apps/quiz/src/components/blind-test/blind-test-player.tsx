'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

import { BlindTestEqualizer } from '@/components/game/blind-test-equalizer';

import type { BlindTestMode } from '@/lib/blind-test-modes';

declare global {
  interface Window {
    YT: {
      Player: new (id: string, config: Record<string, unknown>) => YTPlayer;
      PlayerState: { PLAYING: number; ENDED: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  loadVideoById: (c: { videoId: string; startSeconds: number; endSeconds: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  setSize: (w: number, h: number) => void;
  destroy: () => void;
}

interface RoundSong {
  song_id: string;
  youtube_id: string;
  clip_start: number;
  clip_duration: number;
  choices: string[];
  _answer: { correct_index: number; title: string; artist: string };
}

interface Round {
  mode_id: string;
  mode_title: string;
  mode_difficulty: string;
  clip_duration: number;
  songs: RoundSong[];
}

interface PlayerAnswer {
  picked: number;
  correct: boolean;
  time: number;
}

type Phase = 'intro' | 'loading' | 'playing' | 'results';

export function BlindTestPlayer({ mode }: { mode: BlindTestMode }): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('intro');
  const [round, setRound] = useState<Round | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, PlayerAnswer>>({});
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // YouTube
  const [playerReady, setPlayerReady] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const playerRef = useRef<YTPlayer | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Timer
  const [timeLeft, setTimeLeft] = useState(mode.clip_duration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [answered, setAnswered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answeredRef = useRef(false);
  const timerActiveRef = useRef(false);
  const answerStartRef = useRef(0);

  answeredRef.current = answered;

  const currentSong = round?.songs[currentIndex] ?? null;

  // ── YouTube IFrame API ──────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    const init = () => {
      playerRef.current = new window.YT.Player('bt-yt-player', {
        height: '1',
        width: '1',
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, fs: 0, modestbranding: 1, rel: 0, iv_load_policy: 3 },
        events: {
          onReady: () => setPlayerReady(true),
          onError: (e: { data: number }) => {
            if (e.data === 101 || e.data === 150) advanceToNext();
          },
          onStateChange: (e: { data: number }) => {
            if (!window.YT) return;
            if (e.data === window.YT.PlayerState.PLAYING) {
              if (!timerActiveRef.current && !answeredRef.current) {
                timerActiveRef.current = true;
                setIsPlaying(true);
                answerStartRef.current = Date.now();
                startCountdown();
              }
            }
            if (e.data === window.YT.PlayerState.ENDED) {
              if (!answeredRef.current) handleReveal(-1);
            }
          },
        },
      } as Record<string, unknown>);
    };

    if (window.YT?.Player) init();
    else window.onYouTubeIframeAPIReady = init;

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      playerRef.current?.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize player when showVideo changes
  useEffect(() => {
    if (!playerRef.current) return;
    if (showVideo) {
      const container = videoContainerRef.current;
      if (container) {
        const w = Math.min(container.clientWidth, 320);
        playerRef.current.setSize(w, Math.round(w * 9 / 16));
      }
    } else {
      playerRef.current.setSize(1, 1);
    }
  }, [showVideo]);

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

  function handleReveal(pickedIndex: number) {
    if (answeredRef.current || !round) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setAnswered(true);
    answeredRef.current = true;
    setIsPlaying(false);

    // Show the MV - music keeps playing
    setShowVideo(true);

    const song = round.songs[currentIndex];
    if (!song) return;

    const isCorrect = pickedIndex === song._answer.correct_index;
    const answerTime = (Date.now() - answerStartRef.current) / 1000;

    if (isCorrect) setScore(prev => prev + 1);

    setAnswers(prev => ({
      ...prev,
      [song.song_id]: {
        picked: pickedIndex,
        correct: isCorrect,
        time: pickedIndex === -1 ? mode.clip_duration : Math.round(answerTime * 10) / 10,
      },
    }));
  }

  function advanceToNext() {
    if (!round) return;
    setShowVideo(false);
    try { playerRef.current?.pauseVideo(); } catch { /* */ }

    const nextIdx = currentIndex + 1;
    if (nextIdx >= round.songs.length) {
      finishGame();
      return;
    }

    setCurrentIndex(nextIdx);
    setAnswered(false);
    answeredRef.current = false;
    timerActiveRef.current = false;
    setTimeLeft(mode.clip_duration);

    const next = round.songs[nextIdx]!;
    playerRef.current?.loadVideoById({
      videoId: next.youtube_id,
      startSeconds: next.clip_start,
      endSeconds: next.clip_start + next.clip_duration,
    });
  }

  async function startGame() {
    setPhase('loading');
    setError(null);

    try {
      const res = await fetch('/api/blind-test/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode_id: mode.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to generate round');
        setPhase('intro');
        return;
      }

      const data: Round = await res.json();
      setRound(data);
      setCurrentIndex(0);
      setAnswers({});
      setScore(0);
      setAnswered(false);
      answeredRef.current = false;
      timerActiveRef.current = false;
      setTimeLeft(mode.clip_duration);
      setShowVideo(false);
      setPhase('playing');

      // Play first song
      const first = data.songs[0]!;
      playerRef.current?.setSize(1, 1);
      playerRef.current?.loadVideoById({
        videoId: first.youtube_id,
        startSeconds: first.clip_start,
        endSeconds: first.clip_start + first.clip_duration,
      });
    } catch {
      setError('Network error');
      setPhase('intro');
    }
  }

  async function finishGame() {
    try { playerRef.current?.pauseVideo(); } catch { /* */ }
    setPhase('results');

    if (!round) return;
    try {
      await fetch('/api/blind-test/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode_id: mode.id,
          score,
          total: round.songs.length,
          song_ids: round.songs.map(s => s.song_id),
          choices: answers,
        }),
      });
    } catch { /* non-critical */ }
  }

  const currentAnswer = currentSong ? answers[currentSong.song_id] : undefined;

  // ── RENDER ──────────────────────────────────────────
  return (
    <div>
      {/* YouTube player - CSS toggle between hidden and visible */}
      <div
        ref={videoContainerRef}
        className={`mx-auto overflow-hidden transition-all duration-300 ${
          showVideo
            ? 'w-full max-w-[320px] mb-4 rounded-xl opacity-100'
            : 'w-px h-px fixed opacity-0 pointer-events-none'
        }`}
        style={showVideo ? { aspectRatio: '16/9' } : { top: -100, left: -100 }}
      >
        <div id="bt-yt-player" style={{ width: '100%', height: '100%' }} />
      </div>

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
            disabled={!playerReady}
            className="px-10 py-3 rounded-full bg-[var(--text-primary)] text-white text-sm font-medium disabled:opacity-50"
          >
            {playerReady ? 'Play' : 'Loading...'}
          </button>

          <div className="mt-4">
            <Link href="/blind-test" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
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
              <BlindTestEqualizer playing={isPlaying} timeLeft={timeLeft} clipDuration={mode.clip_duration} />
              <p className={`text-xs font-medium text-center mb-5 transition-colors ${
                timeLeft <= 3 && isPlaying ? 'text-[#A32D2D]' : 'text-[var(--text-tertiary)]'
              }`}>
                {Math.ceil(timeLeft)}s
              </p>
            </>
          )}

          {/* Song info + verdict (after answer, below live video) */}
          {answered && (
            <div className="text-center mb-4 animate-result-in">
              <p className="text-base font-medium mt-1">{currentSong._answer.title}</p>
              <p className="text-xs text-[var(--text-secondary)] mb-2">{currentSong._answer.artist}</p>
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
                    : i === currentSong._answer.correct_index
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
                  const text = `I scored ${score}/${total} on ${mode.title} blind test - ${label}! kpopquiz.org/blind-test/${mode.id}`;
                  if (navigator.share) navigator.share({ text, url: `https://kpopquiz.org/blind-test/${mode.id}` });
                  else navigator.clipboard.writeText(text);
                }}
                className="flex-1 py-3 rounded-full bg-[var(--text-primary)] text-white text-sm font-medium">
                Share result
              </button>
            </div>

            <Link href="/blind-test" className="block text-sm text-[var(--text-secondary)] mt-4 hover:text-[var(--text-primary)]">
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
      <img
        src={`https://img.youtube.com/vi/${song.youtube_id}/hqdefault.jpg`}
        alt=""
        className={`w-12 h-7 rounded object-cover transition-all duration-300 ${revealed ? '' : 'blur-md'}`}
      />
      <div className="flex-1 min-w-0">
        {revealed ? (
          <>
            <p className="text-sm font-medium truncate">{song._answer.title}</p>
            <p className="text-[11px] text-[var(--text-secondary)]">{song._answer.artist}</p>
          </>
        ) : (
          <p className="text-xs text-[var(--text-tertiary)]">Tap to reveal</p>
        )}
      </div>
    </div>
  );
}

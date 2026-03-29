'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

import { BlindTestEqualizer } from './blind-test-equalizer';
import { formatCount } from '@/lib/utils';
import { shuffleChoices, scoreLabel, calculateAvgScore } from '@/lib/blind-test-utils';

import type { GameWithGroup, BlindTestContent, BlindTestSong } from '@/lib/db/types';

/* YouTube types are declared globally in src/components/blind-test/blind-test-player.tsx */

type Phase = 'intro' | 'playing' | 'result';

interface SongChoice {
  picked: number;
  time: number;
  correct: boolean;
}

export function BlindTestPlayer({ game }: { game: GameWithGroup }): React.ReactElement {
  const content = game.content as BlindTestContent;
  const { songs } = content;
  const clipDuration = content.settings.clip_duration;

  const [phase, setPhase] = useState<Phase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [choices, setChoices] = useState<Record<string, SongChoice>>({});
  const [answered, setAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(clipDuration);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [, setTimerStarted] = useState(false);
  const [shuffledData, setShuffledData] = useState<{ shuffled: string[]; correctIndex: number } | null>(null);
  const [skippedSongs, setSkippedSongs] = useState<string[]>([]);
  const [score, setScore] = useState(0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerStartRef = useRef<number>(0);
  const answeredRef = useRef(false);
  const currentIndexRef = useRef(0);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  answeredRef.current = answered;
  currentIndexRef.current = currentIndex;

  const currentSong = songs[currentIndex];

  // ─── YouTube IFrame API ─────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }

    const initPlayer = () => {
      playerRef.current = new window.YT.Player('yt-player', {
        height: '1',
        width: '1',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: () => setPlayerReady(true),
          onError: (event: { data: number }) => {
            const code = event.data;
            if (code === 101 || code === 150) {
              const songId = songs[currentIndexRef.current]?.id ?? '';
              setSkippedSongs(prev => [...prev, songId]);
              advanceToNext();
            }
          },
          onStateChange: (event: { data: number }) => {
            if (!window.YT) return;

            if (event.data === window.YT.PlayerState.PLAYING) {
              const currentTime = playerRef.current?.getCurrentTime() ?? 0;
              const expectedStart = songs[currentIndexRef.current]?.clip_start ?? 0;

              if (Math.abs(currentTime - expectedStart) < 3) {
                setTimerStarted(prev => {
                  if (!prev) {
                    setIsPlaying(true);
                    answerStartRef.current = Date.now();
                    startCountdown();
                  }
                  return true;
                });
              }
            }

            if (event.data === window.YT.PlayerState.ENDED) {
              if (!answeredRef.current) {
                handleReveal(-1);
              }
              // If already answered, clip just finished naturally - that's fine
            }
          },
        },
      } as Record<string, unknown>);
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      playerRef.current?.destroy();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize player when showVideo toggles
  useEffect(() => {
    if (!playerRef.current) return;
    if (showVideo) {
      const container = videoContainerRef.current;
      if (container) {
        const width = container.clientWidth;
        const height = Math.round(width * 9 / 16);
        playerRef.current.setSize(width, height);
      }
    } else {
      playerRef.current.setSize(1, 1);
    }
  }, [showVideo]);

  // ─── Core functions ─────────────────────────────────

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

  // Called on answer pick OR timeout. pickedShuffledIndex = -1 means timeout.
  function handleReveal(pickedShuffledIndex: number) {
    if (answeredRef.current) return;

    // Stop timer
    if (timerRef.current) clearInterval(timerRef.current);

    // Mark answered
    setAnswered(true);
    answeredRef.current = true;
    setIsPlaying(false);

    // Show the MV - music keeps playing
    setShowVideo(true);

    const song = songs[currentIndexRef.current];
    if (!song) return;

    if (pickedShuffledIndex === -1) {
      // Timeout
      setChoices(prev => ({
        ...prev,
        [song.id]: { picked: -1, time: clipDuration, correct: false },
      }));
    } else if (shuffledData) {
      const originalIndex = song.choices.indexOf(shuffledData.shuffled[pickedShuffledIndex]!);
      const isCorrect = pickedShuffledIndex === shuffledData.correctIndex;
      const answerTime = (Date.now() - answerStartRef.current) / 1000;

      if (isCorrect) setScore(prev => prev + 1);

      setChoices(prev => ({
        ...prev,
        [song.id]: { picked: originalIndex, time: Math.round(answerTime * 10) / 10, correct: isCorrect },
      }));
    }
  }

  function pickAnswer(shuffledIndex: number) {
    if (answeredRef.current || !shuffledData || !currentSong) return;
    handleReveal(shuffledIndex);
  }

  function advanceToNext() {
    // Hide video, stop music
    setShowVideo(false);
    try { playerRef.current?.pauseVideo(); } catch { /* */ }

    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx >= songs.length) {
      submitPlay();
      return;
    }

    currentIndexRef.current = nextIdx;
    setCurrentIndex(nextIdx);
    setAnswered(false);
    answeredRef.current = false;
    setTimerStarted(false);
    setTimeLeft(clipDuration);

    const next = songs[nextIdx]!;
    setShuffledData(shuffleChoices([...next.choices], next.correct_index));

    if (playerRef.current) {
      playerRef.current.loadVideoById({
        videoId: next.youtube_id,
        startSeconds: next.clip_start,
        endSeconds: next.clip_start + clipDuration,
      });
    }
  }

  function startGame() {
    setPhase('playing');
    setShowVideo(false);
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    setChoices({});
    setScore(0);
    setSkippedSongs([]);
    setAnswered(false);
    answeredRef.current = false;
    setTimerStarted(false);
    setTimeLeft(clipDuration);

    const first = songs[0]!;
    setShuffledData(shuffleChoices([...first.choices], first.correct_index));

    if (playerRef.current && playerReady) {
      playerRef.current.setSize(1, 1);
      playerRef.current.loadVideoById({
        videoId: first.youtube_id,
        startSeconds: first.clip_start,
        endSeconds: first.clip_start + clipDuration,
      });
    }
  }

  async function submitPlay() {
    try {
      playerRef.current?.pauseVideo();
    } catch { /* */ }
    try {
      const res = await fetch(`/api/game/${game.id}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choices }),
      });
      if (res.ok) await res.json();
    } catch (err) {
      console.error('Failed to submit play:', err);
    } finally {
      setShowVideo(false);
      setPhase('result');
    }
  }

  const totalPlayed = songs.length - skippedSongs.length;
  const currentChoice = currentSong ? choices[currentSong.id] : undefined;
  const avgPct = calculateAvgScore(content.songs);

  // ─── RENDER ─────────────────────────────────────────
  return (
    <div>
      {/* YouTube player - CSS toggles between hidden (1x1) and visible (16:9) */}
      <div
        ref={videoContainerRef}
        className={`mx-auto overflow-hidden transition-all duration-300 ${
          showVideo
            ? 'w-full max-w-[320px] mb-4 rounded-xl'
            : 'w-px h-px fixed opacity-0 pointer-events-none'
        }`}
        style={showVideo ? { aspectRatio: '16/9' } : { top: -100, left: -100 }}
      >
        <div id="yt-player" style={{ width: '100%', height: '100%' }} />
      </div>

      {/* ─── INTRO ─── */}
      {phase === 'intro' && (
        <div className="text-center animate-fade-in">
          <div className="flex justify-center gap-1.5 mb-4">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#FAECE7] text-[#712B13]">
              Blind Test
            </span>
            {game.group_name && (
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: game.display_color ?? '#F8F7F4', color: game.text_color ?? '#6B6B6B' }}
              >
                {game.group_name}
              </span>
            )}
          </div>

          <h1 className="text-xl font-medium mb-2">{game.title}</h1>
          <p className="text-xs text-[var(--text-secondary)] mb-1">
            by {game.creator_username} · {formatCount(game.play_count)} plays
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mb-6">
            {content.settings.song_count} songs · {clipDuration}s clips · {content.settings.difficulty}
          </p>

          {game.play_count >= 5 && (
            <div className="flex justify-center gap-4 mb-6">
              <div className="px-5 py-3 bg-[var(--bg-secondary)] rounded-xl text-center">
                <p className="text-lg font-medium">{avgPct}%</p>
                <p className="text-[10px] text-[var(--text-tertiary)]">avg score</p>
              </div>
            </div>
          )}

          <button
            onClick={startGame}
            disabled={!playerReady}
            className="px-10 py-3 rounded-full bg-[var(--text-primary)] text-white text-sm font-medium disabled:opacity-50"
          >
            {playerReady ? 'Play' : 'Loading...'}
          </button>
        </div>
      )}

      {/* ─── PLAYING ─── */}
      {phase === 'playing' && currentSong && shuffledData && (
        <div key={currentIndex} className="animate-question-in">
          {/* Progress */}
          <p className="text-xs text-[var(--text-tertiary)] mb-1">
            {currentIndex + 1} of {songs.length}
          </p>
          <div className="h-[3px] bg-[var(--border-light)] rounded-full mb-8">
            <div
              className="h-[3px] bg-[#ED93B1] rounded-full transition-all duration-400"
              style={{ width: `${((currentIndex + 1) / songs.length) * 100}%` }}
            />
          </div>

          {/* Equalizer (only while not answered) */}
          {!answered && (
            <>
              <BlindTestEqualizer playing={isPlaying} timeLeft={timeLeft} clipDuration={clipDuration} />
              <p className={`text-xs font-medium text-center mb-5 transition-colors ${
                timeLeft <= 3 && isPlaying ? 'text-[#A32D2D]' : 'text-[var(--text-tertiary)]'
              }`}>
                {Math.ceil(timeLeft)}s
              </p>
            </>
          )}

          {/* Song info + verdict (after answer, below the live video) */}
          {answered && (
            <div className="text-center mb-4 animate-result-in">
              <p className="text-base font-medium mt-1">{currentSong.title}</p>
              <p className="text-xs text-[var(--text-secondary)] mb-2">{currentSong.artist}</p>
              {currentChoice?.correct && (
                <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-[#EAF3DE] text-[#27500A]">Correct!</span>
              )}
              {currentChoice && !currentChoice.correct && currentChoice.picked >= 0 && (
                <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-[#FCEBEB] text-[#791F1F]">Wrong</span>
              )}
              {currentChoice && currentChoice.picked === -1 && (
                <span className="inline-block text-xs font-medium px-3 py-1 rounded-full bg-[#FCEBEB] text-[#791F1F]">Time&apos;s up</span>
              )}
            </div>
          )}

          {/* Answer buttons */}
          <div className="space-y-2">
            {shuffledData.shuffled.map((choice, i) => (
              <button
                key={i}
                onClick={() => pickAnswer(i)}
                disabled={answered}
                className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                  !answered
                    ? 'border-[var(--border-light)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-secondary)] active:scale-[0.98]'
                    : i === shuffledData.correctIndex
                      ? 'bg-[#EAF3DE] border-[#97C459] text-[#27500A]'
                      : currentChoice && currentSong.choices.indexOf(shuffledData.shuffled[i]!) === currentChoice.picked && !currentChoice.correct
                        ? 'bg-[#FCEBEB] border-[#F09595] text-[#791F1F]'
                        : 'opacity-35 border-[var(--border-light)]'
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
                {currentIndex + 1 >= songs.length ? 'See results' : 'Next song'}
              </button>
            </div>
          )}

          {!answered && (
            <p className="text-xs text-[var(--text-tertiary)] text-center mt-4">tap to pick</p>
          )}
        </div>
      )}

      {/* ─── RESULTS ─── */}
      {phase === 'result' && (() => {
        const scorePct = totalPlayed > 0 ? Math.round((score / totalPlayed) * 100) : 0;
        const label = scoreLabel(scorePct);
        const missedSongs = songs.filter(s => {
          const c = choices[s.id];
          return c && !c.correct && !skippedSongs.includes(s.id);
        });

        return (
          <div className="text-center animate-result-in">
            <p className="text-xs text-[var(--text-tertiary)] mb-2">{game.title}</p>

            <p className="text-5xl font-medium mb-1">{score}/{totalPlayed}</p>
            <p className="text-sm text-[var(--text-secondary)] mb-4">{label}</p>

            <div className="h-1.5 rounded-full bg-[var(--border-light)] overflow-hidden mb-8">
              <div
                className="h-full rounded-full bg-[#ED93B1]"
                style={{ width: `${scorePct}%`, transition: 'width 0.8s ease' }}
              />
            </div>

            {missedSongs.length > 0 && (
              <div className="text-left mb-6">
                <p className="text-sm font-medium mb-3">Songs you missed</p>
                <div className="space-y-2">
                  {missedSongs.map(song => (
                    <MissedSongRow key={song.id} song={song} />
                  ))}
                </div>
              </div>
            )}

            {missedSongs.length === 0 && (
              <p className="text-sm text-[var(--text-tertiary)] mb-6">No missed songs - perfect game!</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={startGame}
                className="flex-1 py-3 rounded-full border border-[var(--border-light)] text-sm font-medium"
              >
                Play again
              </button>
              <button
                onClick={() => {
                  const text = `I scored ${score}/${totalPlayed} on "${game.title}" - ${label}! Try it: kpopquiz.org/g/${game.slug}`;
                  if (navigator.share) {
                    navigator.share({ text, url: `https://kpopquiz.org/g/${game.slug}` });
                  } else {
                    navigator.clipboard.writeText(text);
                  }
                }}
                className="flex-1 py-3 rounded-full bg-[var(--text-primary)] text-white text-sm font-medium"
              >
                Share result
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-[var(--border-light)]">
              <Link href="/games" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                More blind tests
              </Link>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function MissedSongRow({ song }: { song: BlindTestSong }): React.ReactElement {
  const [revealed, setRevealed] = useState(false);

  return (
    <div
      className="flex gap-3 items-center p-3 bg-[var(--bg-secondary)] rounded-lg cursor-pointer"
      onClick={() => setRevealed(true)}
    >
      <img
        src={`https://img.youtube.com/vi/${song.youtube_id}/hqdefault.jpg`}
        alt=""
        className={`w-12 h-7 rounded object-cover transition-all duration-300 ${revealed ? '' : 'blur-md'}`}
        onError={(e) => { (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${song.youtube_id}/default.jpg`; }}
      />
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

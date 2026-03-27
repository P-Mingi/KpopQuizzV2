'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

import { BlindTestEqualizer } from './blind-test-equalizer';
import { formatCount } from '@/lib/utils';
import { shuffleChoices, scoreLabel, calculateAvgScore } from '@/lib/blind-test-utils';
import { thumbnailUrl } from '@/lib/youtube';

import type { GameWithGroup, BlindTestContent, BlindTestSong } from '@/lib/db/types';

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
  loadVideoById: (config: { videoId: string; startSeconds: number; endSeconds: number }) => void;
  cueVideoById: (config: { videoId: string; startSeconds: number; endSeconds: number }) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getCurrentTime: () => number;
  destroy: () => void;
}

type Phase = 'intro' | 'playing' | 'result';

interface BlindTestPlayerProps {
  game: GameWithGroup;
}

interface SongChoice {
  picked: number;
  time: number;
  correct: boolean;
}

export function BlindTestPlayer({ game }: BlindTestPlayerProps): React.ReactElement {
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
  const [timerStarted, setTimerStarted] = useState(false);
  const [shuffledData, setShuffledData] = useState<{ shuffled: string[]; correctIndex: number } | null>(null);
  const [skippedSongs, setSkippedSongs] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [, setSubmitting] = useState(false);
  const [, setFinalContent] = useState<BlindTestContent | null>(null);

  const playerRef = useRef<YTPlayer | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerStartRef = useRef<number>(0);

  const currentSong = songs[currentIndex];

  // Load YouTube IFrame API
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
          onError: handleVideoError,
          onStateChange: handleStateChange,
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

  const handleVideoError = useCallback((event: { data: number }) => {
    const code = event.data;
    if (code === 101 || code === 150) {
      // Region-locked or embedding restricted
      setSkippedSongs(prev => [...prev, currentSong?.id ?? '']);
      nextSong();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  const handleStateChange = useCallback((event: { data: number }) => {
    if (!window.YT) return;
    const state = event.data;

    if (state === window.YT.PlayerState.PLAYING) {
      const currentTime = playerRef.current?.getCurrentTime() ?? 0;
      const expectedStart = currentSong?.clip_start ?? 0;

      if (Math.abs(currentTime - expectedStart) < 3) {
        if (!timerStarted) {
          setTimerStarted(true);
          setIsPlaying(true);
          answerStartRef.current = Date.now();
          startTimer();
        }
      }
    }

    if (state === window.YT.PlayerState.ENDED) {
      if (!answered) handleTimeout();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, timerStarted, answered]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0.1) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 0.1;
      });
    }, 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTimeout = useCallback(() => {
    if (answered) return;
    if (timerRef.current) clearInterval(timerRef.current);
    playerRef.current?.pauseVideo();
    setIsPlaying(false);
    setAnswered(true);

    if (currentSong) {
      setChoices(prev => ({
        ...prev,
        [currentSong.id]: { picked: -1, time: clipDuration, correct: false },
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answered, currentSong, clipDuration]);

  function pickAnswer(shuffledIndex: number) {
    if (answered || !shuffledData || !currentSong) return;

    if (timerRef.current) clearInterval(timerRef.current);
    playerRef.current?.pauseVideo();
    setIsPlaying(false);
    setAnswered(true);

    const originalIndex = currentSong.choices.indexOf(shuffledData.shuffled[shuffledIndex]!);
    const isCorrect = shuffledIndex === shuffledData.correctIndex;
    const answerTime = (Date.now() - answerStartRef.current) / 1000;

    if (isCorrect) setScore(prev => prev + 1);

    setChoices(prev => ({
      ...prev,
      [currentSong.id]: { picked: originalIndex, time: Math.round(answerTime * 10) / 10, correct: isCorrect },
    }));
  }

  function nextSong() {
    const nextIdx = currentIndex + 1;
    if (nextIdx >= songs.length) {
      submitPlay();
      return;
    }

    setCurrentIndex(nextIdx);
    setAnswered(false);
    setTimerStarted(false);
    setTimeLeft(clipDuration);

    const next = songs[nextIdx]!;
    const shuffled = shuffleChoices([...next.choices], next.correct_index);
    setShuffledData(shuffled);

    // Play the cued video or load new
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
    setCurrentIndex(0);
    setChoices({});
    setScore(0);
    setSkippedSongs([]);
    setFinalContent(null);

    const first = songs[0]!;
    const shuffled = shuffleChoices([...first.choices], first.correct_index);
    setShuffledData(shuffled);

    if (playerRef.current && playerReady) {
      setTimeLeft(clipDuration);
      setTimerStarted(false);
      setAnswered(false);

      playerRef.current.loadVideoById({
        videoId: first.youtube_id,
        startSeconds: first.clip_start,
        endSeconds: first.clip_start + clipDuration,
      });
    }
  }

  async function submitPlay() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/game/${game.id}/play`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choices }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.content) setFinalContent(data.content as BlindTestContent);
      }
    } catch (err) {
      console.error('Failed to submit play:', err);
    } finally {
      setSubmitting(false);
      setPhase('result');
    }
  }

  // Preload next song when answered
  useEffect(() => {
    if (answered && currentIndex + 1 < songs.length && playerRef.current) {
      const next = songs[currentIndex + 1]!;
      playerRef.current.cueVideoById({
        videoId: next.youtube_id,
        startSeconds: next.clip_start,
        endSeconds: next.clip_start + clipDuration,
      });
    }
  }, [answered, currentIndex, songs, clipDuration]);

  const totalPlayed = songs.length - skippedSongs.length;
  const currentChoice = currentSong ? choices[currentSong.id] : undefined;
  const avgPct = calculateAvgScore(content.songs);

  // ─── INTRO ─────────────────────────────────────────
  if (phase === 'intro') {
    return (
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

        {/* Hidden YouTube player */}
        <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
          <div id="yt-player" />
        </div>
      </div>
    );
  }

  // ─── PLAYING ───────────────────────────────────────
  if (phase === 'playing' && currentSong && shuffledData) {
    return (
      <div className="animate-question-in">
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

        {/* Equalizer or Reveal */}
        {!answered ? (
          <>
            <BlindTestEqualizer playing={isPlaying} timeLeft={timeLeft} clipDuration={clipDuration} />
            <p className={`text-xs font-medium text-center mb-5 transition-colors ${
              timeLeft <= 3 && isPlaying ? 'text-[#A32D2D]' : 'text-[var(--text-tertiary)]'
            }`}>
              {Math.ceil(timeLeft)}s
            </p>
          </>
        ) : (
          <div className="text-center mb-5 animate-result-in">
            <img
              src={thumbnailUrl(currentSong.youtube_id)}
              alt=""
              className="w-48 h-28 rounded-xl object-cover mx-auto mb-3"
              onError={(e) => { (e.target as HTMLImageElement).src = thumbnailUrl(currentSong.youtube_id, 'default'); }}
            />
            <p className="text-base font-medium">{currentSong.title}</p>
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
              onClick={nextSong}
              className="px-8 py-3 rounded-full bg-[var(--text-primary)] text-white text-sm font-medium"
            >
              {currentIndex + 1 >= songs.length ? 'See results' : 'Next song'}
            </button>
          </div>
        )}

        <p className="text-xs text-[var(--text-tertiary)] text-center mt-4">
          {!answered ? 'tap to pick' : ''}
        </p>

        {/* Hidden YouTube player */}
        <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
          <div id="yt-player" />
        </div>
      </div>
    );
  }

  // ─── RESULTS ───────────────────────────────────────
  if (phase === 'result') {
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

        {/* Missed songs */}
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
          <Link href="/" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Browse more games
          </Link>
        </div>

        {/* Hidden YouTube player */}
        <div style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
          <div id="yt-player" />
        </div>
      </div>
    );
  }

  return <></>;
}

// ─── Missed song row ──────────────────────────────────
function MissedSongRow({ song }: { song: BlindTestSong }): React.ReactElement {
  const [revealed, setRevealed] = useState(false);

  return (
    <div
      className="flex gap-3 items-center p-3 bg-[var(--bg-secondary)] rounded-lg cursor-pointer"
      onClick={() => setRevealed(true)}
    >
      <img
        src={thumbnailUrl(song.youtube_id)}
        alt=""
        className={`w-12 h-7 rounded object-cover transition-all duration-300 ${revealed ? '' : 'blur-md'}`}
        onError={(e) => { (e.target as HTMLImageElement).src = thumbnailUrl(song.youtube_id, 'default'); }}
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

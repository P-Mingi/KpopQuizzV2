'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAudioPlayer } from '@/components/game/use-audio-player';
import { usePartyChannel } from '@/hooks/use-party-channel';
import { AudioVisualizer } from '@/components/game/audio-visualizer';
import { createBrowserClient } from '@kpopquiz/shared/supabase/client';

import type { Question } from '@/components/game/use-game-state';

const ANSWER_COLORS = ['#378ADD', '#D4537E', '#639922', '#BA7517'];
const ANSWER_BG = ['#E6F1FB', '#FBEAF0', '#EAF3DE', '#FAEEDA'];

interface Props {
  roomCode: string;
  roomId: string;
  questions: Question[];
  timerDuration: number;
}

type Phase = 'waiting' | 'playing' | 'reveal' | 'leaderboard' | 'podium';

export function KahootHostScreen({ roomCode, roomId, questions, timerDuration }: Props) {
  const audio = useAudioPlayer();
  const { players } = usePartyChannel(roomId);

  const [phase, setPhase] = useState<Phase>('waiting');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [_timerKey, setTimerKey] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const revealTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timeLeft, setTimeLeft] = useState(timerDuration);

  const q = questions[currentIndex];
  const isLast = currentIndex >= questions.length - 1;
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  // Start the game
  const handleStartRound = useCallback(() => {
    audio.unlock();
    setPhase('playing');
    setAnsweredCount(0);
    setTimeLeft(timerDuration);
    setTimerKey((k) => k + 1);
    if (q) audio.loadAndPlay(q.preview_url);

    // Update room in DB to advance round
    const supabase = createBrowserClient();
    supabase.from('party_rooms').update({
      current_round: currentIndex + 1,
      round_started_at: new Date().toISOString(),
    }).eq('id', roomId).then(() => {});

    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Auto-reveal on timeout
          setPhase('reveal');
          audio.fadeOut(400);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [audio, q, currentIndex, roomId, timerDuration]);

  // Track answered players
  useEffect(() => {
    const total = players.reduce((sum, p) => {
      const answers = (p as unknown as { answers: unknown[] }).answers;
      return sum + (Array.isArray(answers) ? answers.length : 0);
    }, 0);
    const expectedPerRound = players.length * (currentIndex + 1);
    setAnsweredCount(Math.min(total - players.length * currentIndex, players.length));
  }, [players, currentIndex]);

  // All answered -> auto reveal
  useEffect(() => {
    if (phase === 'playing' && answeredCount >= players.length && players.length > 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      audio.fadeOut(400);
      setPhase('reveal');
    }
  }, [answeredCount, players.length, phase, audio]);

  // Advance to next round or podium
  const handleNext = useCallback(() => {
    if (isLast) {
      setPhase('podium');
      // Mark room as finished
      const supabase = createBrowserClient();
      supabase.from('party_rooms').update({ status: 'finished' }).eq('id', roomId).then(() => {});
    } else {
      setCurrentIndex((i) => i + 1);
      setPhase('playing');
      setAnsweredCount(0);
      setTimeLeft(timerDuration);
      const nextQ = questions[currentIndex + 1];
      if (nextQ) audio.loadAndPlay(nextQ.preview_url);
      setTimerKey((k) => k + 1);

      const supabase = createBrowserClient();
      supabase.from('party_rooms').update({
        current_round: currentIndex + 2,
        round_started_at: new Date().toISOString(),
      }).eq('id', roomId).then(() => {});

      timerRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setPhase('reveal');
            audio.fadeOut(400);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
  }, [isLast, currentIndex, questions, timerDuration, audio, roomId]);

  useEffect(() => {
    return () => {
      audio.cleanup();
      if (timerRef.current) clearInterval(timerRef.current);
      if (revealTimeout.current) clearTimeout(revealTimeout.current);
    };
  }, [audio]);

  // Waiting screen
  if (phase === 'waiting') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-primary">
        <p className="text-ghost text-xs uppercase tracking-widest mb-4">Kahoot Mode - Host Screen</p>
        <p className="text-5xl font-bold text-primary tracking-[0.3em] mb-2">{roomCode}</p>
        <p className="text-sm text-ghost mb-8">{players.length} players joined</p>
        <button
          onClick={handleStartRound}
          disabled={players.length < 2}
          className="px-10 py-4 rounded-2xl bg-accent text-white font-bold text-lg active:scale-[0.97] disabled:opacity-50"
        >
          Start Round 1
        </button>
      </div>
    );
  }

  // Podium
  if (phase === 'podium') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-primary px-8">
        <p className="text-3xl font-bold text-primary mb-8">Final Standings</p>
        <div className="flex items-end gap-4 mb-8">
          {sortedPlayers.slice(0, 3).map((p, i) => {
            const heights = ['h-32', 'h-24', 'h-20'];
            const medals = ['text-[#EF9F27]', 'text-[#B4B2A9]', 'text-[#CD7F32]'];
            return (
              <div key={p.id} className="flex flex-col items-center" style={{ order: i === 0 ? 1 : i === 1 ? 0 : 2 }}>
                <p className={`text-2xl font-bold mb-1 ${medals[i]}`}>#{i + 1}</p>
                <p className="text-sm font-medium text-primary mb-1">{p.display_name}</p>
                <p className="text-xs text-ghost mb-2 tabular-nums">{p.score.toLocaleString()} pts</p>
                <div className={`w-24 ${heights[i]} rounded-t-xl bg-accent/10 border-t-4 border-accent`} />
              </div>
            );
          })}
        </div>
        {sortedPlayers.slice(3).map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 w-full max-w-md px-4 py-2">
            <span className="text-sm text-ghost w-6">#{i + 4}</span>
            <span className="text-sm text-primary flex-1">{p.display_name}</span>
            <span className="text-sm text-ghost tabular-nums">{p.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }

  if (!q) return null;

  const isRevealing = phase === 'reveal';
  const correctIdx = q.choices.indexOf(q.correct_answer);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-primary px-6 py-4">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-ghost text-xs">Room: {roomCode}</span>
        <span className="text-ghost text-xs">Round {currentIndex + 1}/{questions.length}</span>
      </div>

      {/* Audio area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {isRevealing ? (
          <div className="text-center">
            <p className="text-2xl font-bold text-primary mb-1">{q.reveal.title}</p>
            <p className="text-lg text-ghost">{q.reveal.artist}</p>
          </div>
        ) : (
          <>
            <AudioVisualizer isPlaying={phase === 'playing'} />
            <div className="text-5xl font-bold text-primary tabular-nums mt-4 mb-2">{timeLeft}s</div>
            <p className="text-sm text-ghost">Which group sings this song?</p>
          </>
        )}
      </div>

      {/* Answer labels (host screen shows labels, not buttons) */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {q.choices.map((choice, i) => (
          <div
            key={choice}
            className={`px-4 py-5 rounded-xl text-center text-sm font-medium transition-all ${
              isRevealing && i === correctIdx
                ? 'ring-4 ring-[#639922] scale-[1.03]'
                : isRevealing
                ? 'opacity-40'
                : ''
            }`}
            style={{
              backgroundColor: ANSWER_BG[i % 4],
              color: ANSWER_COLORS[i % 4],
            }}
          >
            {choice}
          </div>
        ))}
      </div>

      {/* Bottom: answer count + leaderboard peek */}
      <div className="flex justify-between items-center">
        <span className="text-sm text-ghost">Answers: {answeredCount}/{players.length}</span>
        {isRevealing && (
          <button
            onClick={handleNext}
            className="px-5 py-2 rounded-xl bg-accent text-white text-sm font-medium active:scale-[0.97]"
          >
            {isLast ? 'See Podium' : 'Next Round'}
          </button>
        )}
      </div>
    </div>
  );
}

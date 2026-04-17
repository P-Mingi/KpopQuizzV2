'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAudioPlayer } from '@/components/game/use-audio-player';
import { usePartyChannel } from '@/hooks/use-party-channel';
import { AudioVisualizer } from '@/components/game/audio-visualizer';
import { createBrowserClient } from '@kpopquiz/shared/supabase/client';

import type { Question } from '@/components/game/use-game-state';

const KAHOOT_COLORS = [{ bg: '#534AB7', label: 'A' }, { bg: '#D4537E', label: 'B' }, { bg: '#0F6E56', label: 'C' }, { bg: '#BA7517', label: 'D' }];

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
      <div className="min-h-[100dvh] flex flex-col items-center justify-center" style={{ background: '#0a0716' }}>
        <p className="text-white/40 text-xs uppercase tracking-widest mb-4">Kahoot Mode - Host Screen</p>
        <p className="text-5xl font-bold text-white tracking-[0.3em] mb-2">{roomCode}</p>
        <p className="text-sm text-white/40 mb-8">{players.length} players joined</p>
        <button
          onClick={handleStartRound}
          disabled={players.length < 2}
          className="px-10 py-4 rounded-2xl bg-[#D4537E] text-white font-bold text-lg active:scale-[0.97] disabled:opacity-30"
        >
          Start Round 1
        </button>
      </div>
    );
  }

  // Podium
  if (phase === 'podium') {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center px-8" style={{ background: '#0a0716' }}>
        <p className="text-3xl font-bold text-white mb-8">Final Standings</p>
        <div className="flex items-end gap-4 mb-8">
          {sortedPlayers.slice(0, 3).map((p, i) => {
            const heights = ['h-32', 'h-24', 'h-20'];
            const medals = ['text-[#EF9F27]', 'text-[#B4B2A9]', 'text-[#CD7F32]'];
            return (
              <div key={p.id} className="flex flex-col items-center" style={{ order: i === 0 ? 1 : i === 1 ? 0 : 2 }}>
                <p className={`text-2xl font-bold mb-1 ${medals[i]}`}>#{i + 1}</p>
                <p className="text-sm font-medium text-white mb-1">{p.display_name}</p>
                <p className="text-xs text-white/40 mb-2 tabular-nums">{p.score.toLocaleString()} pts</p>
                <div className={`w-24 ${heights[i]} rounded-t-xl bg-white/5 border-t-4 border-[#D4537E]`} />
              </div>
            );
          })}
        </div>
        {sortedPlayers.slice(3).map((p, i) => (
          <div key={p.id} className="flex items-center gap-3 w-full max-w-md px-4 py-2">
            <span className="text-sm text-white/40 w-6">#{i + 4}</span>
            <span className="text-sm text-white flex-1">{p.display_name}</span>
            <span className="text-sm text-white/40 tabular-nums">{p.score.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  }

  if (!q) return null;

  const isRevealing = phase === 'reveal';
  const correctIdx = q.choices.indexOf(q.correct_answer);

  return (
    <div className="min-h-[100dvh] flex flex-col px-6 py-4" style={{ background: '#0a0716' }}>
      {/* Top bar */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-white/40 text-xs">Room: {roomCode}</span>
        <span className="text-white/40 text-xs">{players.length} players</span>
        <span className="text-white/40 text-xs">Round {currentIndex + 1}/{questions.length}</span>
      </div>

      {/* Audio area */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {isRevealing ? (
          <div className="text-center">
            <p className="text-2xl font-bold text-white mb-1">{q.reveal.title}</p>
            <p className="text-lg text-white/40">{q.reveal.artist}</p>
          </div>
        ) : (
          <>
            <AudioVisualizer isPlaying={phase === 'playing'} />
            <div className="text-5xl font-bold text-white tabular-nums mt-4 mb-2">{timeLeft}s</div>
            <p className="text-sm text-white/40">Which group sings this song?</p>
          </>
        )}
      </div>

      {/* Answer grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
        {q.choices.map((choice, i) => (
          <div
            key={choice}
            className={`rounded-2xl px-6 py-8 md:py-10 text-center transition-all ${
              isRevealing && i === correctIdx ? 'ring-4 ring-[#4CAF50] scale-[1.02]' :
              isRevealing && i !== correctIdx ? 'opacity-25' : ''
            }`}
            style={{ background: KAHOOT_COLORS[i]?.bg }}
          >
            <span className="text-white/40 text-sm font-semibold block mb-1">{KAHOOT_COLORS[i]?.label}</span>
            <span className="text-white text-xl md:text-2xl font-semibold">{choice}</span>
            {isRevealing && i === correctIdx && (
              <div className="mt-2"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" className="mx-auto"><path d="M4 10.5L8.5 15L16 6" /></svg></div>
            )}
          </div>
        ))}
      </div>

      {/* Live counter */}
      <div className="flex justify-between items-center mt-4 px-4">
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-sm font-medium">Answers:</span>
          <span className="text-white text-lg font-semibold tabular-nums">{answeredCount}/{players.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/40 text-sm font-medium">Timer:</span>
          <span className="text-white text-lg font-semibold tabular-nums">{timeLeft}s</span>
        </div>
      </div>

      {/* Next button on reveal */}
      {isRevealing && (
        <div className="flex justify-center mt-4">
          <button
            onClick={handleNext}
            className="px-8 py-3 rounded-xl bg-[#D4537E] text-white text-sm font-semibold active:scale-[0.97] transition-all"
          >
            {isLast ? 'See Podium' : 'Next Round'}
          </button>
        </div>
      )}
    </div>
  );
}

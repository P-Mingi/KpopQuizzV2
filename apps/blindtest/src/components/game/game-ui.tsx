'use client';

import { useEffect, useRef, useState } from 'react';

// ---- CircularTimer ----

interface TimerProps {
  duration: number;
  running: boolean;
  onExpired: () => void;
  timerKey: number;
}

export function CircularTimer({ duration, running, onExpired, timerKey }: TimerProps) {
  const [remaining, setRemaining] = useState(duration);
  const startRef = useRef(0);
  const expiredRef = useRef(false);

  useEffect(() => {
    setRemaining(duration);
    expiredRef.current = false;
    if (!running) return;

    startRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const left = Math.max(0, duration - elapsed);
      setRemaining(left);
      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(interval);
        onExpired();
      }
    }, 50);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerKey, running, duration]);

  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const progress = remaining / duration;
  const dashOffset = circumference * (1 - progress);
  const isLow = remaining <= 5;

  return (
    <div className="relative w-[60px] h-[60px] flex items-center justify-center">
      <svg width="60" height="60" className="-rotate-90">
        <circle cx="30" cy="30" r={radius} fill="none" stroke="var(--border-default)" strokeWidth="4" />
        <circle
          cx="30" cy="30" r={radius} fill="none"
          stroke={isLow ? 'var(--wrong)' : 'var(--pink-400)'}
          strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke] duration-300"
        />
      </svg>
      <span className={`absolute text-xs font-semibold tabular-nums ${isLow ? 'text-wrong' : 'text-text-primary'}`}>
        {remaining.toFixed(1)}s
      </span>
    </div>
  );
}

// ---- ProgressDots ----

interface DotsProps {
  total: number;
  current: number;
  results: Array<{ correct: boolean }>;
}

export function ProgressDots({ total, current, results }: DotsProps) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const result = results[i];
        let className = 'w-2 h-2 rounded-full transition-all duration-200 ';
        if (result) {
          className += result.correct ? 'bg-correct' : 'bg-wrong';
        } else if (i === current) {
          className += 'bg-pink-400 scale-125 shadow-[0_0_6px_var(--pink-400)]';
        } else {
          className += 'bg-[var(--bg-tertiary)]';
        }
        return <div key={i} className={className} />;
      })}
    </div>
  );
}

// ---- WaveBars ----

export function WaveBars({ active }: { active: boolean }) {
  if (!active) return null;
  const heights = [8, 16, 22, 16, 8];
  const delays = [0, 0.1, 0.2, 0.3, 0.4];

  return (
    <div className="flex items-end gap-[3px] h-[22px]">
      {heights.map((h, i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-pink-400"
          style={{
            height: h,
            animation: `wave 0.8s ease-in-out infinite`,
            animationDelay: `${delays[i]}s`,
          }}
        />
      ))}
    </div>
  );
}

// ---- PointsFloat ----

export function PointsFloat({ points, show }: { points: number; show: boolean }) {
  if (!show || points <= 0) return null;
  return (
    <span className="absolute -top-6 right-0 text-pink-400 text-lg font-bold animate-float-up pointer-events-none">
      +{points}
    </span>
  );
}

// ---- AnswerButton ----

type ButtonState = 'default' | 'correct' | 'wrong' | 'dimmed';

interface AnswerButtonProps {
  text: string;
  state: ButtonState;
  onClick: () => void;
  disabled: boolean;
}

export function AnswerButton({ text, state, onClick, disabled }: AnswerButtonProps) {
  let className = 'w-full py-3.5 px-5 rounded-xl border-[1.5px] text-[15px] font-medium text-left transition-all duration-200 active:scale-[0.98] ';

  switch (state) {
    case 'correct':
      className += 'bg-[var(--correct-bg)] border-[var(--correct)] text-[var(--correct)]';
      break;
    case 'wrong':
      className += 'bg-[var(--wrong-bg)] border-[var(--wrong)] text-[var(--wrong)] animate-shake';
      break;
    case 'dimmed':
      className += 'bg-bg-secondary border-border-default text-text-primary opacity-30';
      break;
    default:
      className += 'bg-bg-secondary border-border-default text-text-primary hover:border-pink-400';
  }

  return (
    <button onClick={onClick} disabled={disabled} className={className}>
      {state === 'correct' && <span className="mr-1.5">&#10003;</span>}
      {text}
    </button>
  );
}

// ---- AlbumArt ----

export function AlbumArt({ src, revealed }: { src: string | null; revealed: boolean }) {
  return (
    <div className="w-[200px] h-[200px] rounded-2xl overflow-hidden bg-bg-tertiary mx-auto">
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover transition-[filter] duration-500"
          style={{ filter: revealed ? 'blur(0px)' : 'blur(20px)' }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-text-ghost text-sm">
          No art
        </div>
      )}
    </div>
  );
}

// ---- ComboBadge ----

export function ComboBadge({ combo, multiplier }: { combo: number; multiplier: number }) {
  if (combo < 3) return null;

  const fire = combo >= 5;

  return (
    <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--streak)]">
      {fire && <span>&#128293;</span>}
      <span>{combo}x combo</span>
      {multiplier > 1 && (
        <span className="text-xs text-text-secondary ml-1">({multiplier}x pts)</span>
      )}
    </div>
  );
}

// ---- ResultsScreen ----

interface ResultsScreenProps {
  score: number;
  correctCount: number;
  total: number;
  bestCombo: number;
  avgSpeed: number;
  results: Array<{ question: { reveal: { title: string; artist: string } }; correct: boolean }>;
  onPlayAgain: () => void;
  onHome: () => void;
}

export function ResultsScreen({ score, correctCount, total, bestCombo, avgSpeed, results, onPlayAgain, onHome }: ResultsScreenProps) {
  const { label, stars } = getScoreLabelLocal(correctCount, total);
  const missed = results.filter((r) => !r.correct);

  return (
    <div className="flex flex-col items-center py-8 px-4 animate-fadeSlideUp">
      {/* Stars */}
      <div className="text-[28px] tracking-widest mb-2" style={{ color: 'var(--streak)' }}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} style={{ opacity: i < stars ? 1 : 0.2 }}>&#9733;</span>
        ))}
      </div>

      {/* Score */}
      <p className="text-4xl font-bold text-text-primary">
        {correctCount} / {total}
      </p>
      <p className="text-sm text-text-secondary mt-1">{label}</p>

      {/* Stats row */}
      <div className="grid grid-cols-3 mt-6 w-full border border-border-default rounded-xl overflow-hidden">
        <div className="text-center py-3 border-r border-border-default">
          <p className="text-xl font-semibold text-text-primary">{score.toLocaleString()}</p>
          <p className="text-[10px] text-text-tertiary uppercase tracking-wide">points</p>
        </div>
        <div className="text-center py-3 border-r border-border-default">
          <p className="text-xl font-semibold text-text-primary">{avgSpeed.toFixed(1)}s</p>
          <p className="text-[10px] text-text-tertiary uppercase tracking-wide">avg speed</p>
        </div>
        <div className="text-center py-3">
          <p className="text-xl font-semibold text-text-primary">{bestCombo}x</p>
          <p className="text-[10px] text-text-tertiary uppercase tracking-wide">best combo</p>
        </div>
      </div>

      {/* Missed songs */}
      {missed.length > 0 && (
        <div className="w-full mt-6">
          <p className="text-xs text-text-tertiary uppercase tracking-wide mb-2">Songs you missed</p>
          <div className="space-y-1.5">
            {missed.map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="text-wrong text-xs">&#10007;</span>
                <span className="text-text-secondary">
                  {r.question.reveal.title} - {r.question.reveal.artist}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3 mt-8 w-full">
        <button
          onClick={onPlayAgain}
          className="flex-1 py-3 rounded-xl bg-pink-600 text-white font-medium text-sm hover:bg-pink-400 transition-colors"
        >
          Play again
        </button>
        <button
          onClick={onHome}
          className="flex-1 py-3 rounded-xl bg-bg-secondary border border-border-default text-text-primary font-medium text-sm hover:border-border-hover transition-colors"
        >
          Home
        </button>
      </div>
    </div>
  );
}

function getScoreLabelLocal(correct: number, total: number): { label: string; stars: number } {
  if (correct === total) return { label: 'PERFECT!', stars: 5 };
  if (correct >= 9) return { label: 'Amazing!', stars: 4 };
  if (correct >= 7) return { label: 'Great round!', stars: 3 };
  if (correct >= 5) return { label: 'Not bad!', stars: 2 };
  return { label: 'Keep trying!', stars: 1 };
}

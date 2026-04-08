'use client';

import { useEffect, useRef, useState } from 'react';
import { xpForLevel } from '@/lib/progression';

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
  const seconds = Math.ceil(remaining);

  return (
    <div className="relative w-[60px] h-[60px] flex items-center justify-center">
      <svg width="60" height="60" className="-rotate-90">
        <circle cx="30" cy="30" r={radius} fill="none" stroke="var(--bg-elevated)" strokeWidth="3" />
        <circle
          cx="30" cy="30" r={radius} fill="none"
          stroke={isLow ? 'var(--wrong)' : 'var(--accent)'}
          strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke] duration-300"
        />
      </svg>
      <span className={`absolute text-sm font-semibold tabular-nums ${isLow ? 'text-wrong' : 'text-primary'}`}>
        {seconds}
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
    <div className="flex items-center justify-center gap-1">
      {Array.from({ length: total }, (_, i) => {
        const result = results[i];
        let className = 'w-2 h-2 rounded-full transition-all duration-200 ';
        if (result) {
          className += result.correct ? 'bg-correct' : 'bg-wrong';
        } else if (i === current) {
          className += 'bg-accent shadow-[0_0_8px_var(--accent)]';
        } else {
          className += 'bg-elevated';
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
          className="w-[3px] rounded-full bg-accent"
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
    <span className="absolute -top-5 right-0 text-accent text-base font-bold animate-float-up pointer-events-none tabular-nums">
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
  let className = 'w-full py-3.5 px-4 rounded-xl border-[1.5px] text-[15px] font-medium text-center transition-colors duration-200 active:scale-[0.98] ';
  let prefix: string | null = null;

  switch (state) {
    case 'correct':
      className += 'bg-correct-bg border-correct text-correct-text';
      prefix = '\u2713';
      break;
    case 'wrong':
      className += 'bg-wrong-bg border-wrong text-wrong-text animate-shake';
      prefix = '\u2717';
      break;
    case 'dimmed':
      className += 'bg-surface border-default text-primary opacity-30';
      break;
    default:
      className += 'bg-surface border-default text-primary hover:border-accent';
  }

  return (
    <button onClick={onClick} disabled={disabled} className={className}>
      {prefix && <span className="mr-2">{prefix}</span>}
      {text}
    </button>
  );
}

// ---- AlbumArt ----

export function AlbumArt({ src, revealed }: { src: string | null; revealed: boolean }) {
  return (
    <div className="w-[200px] h-[200px] md:w-[220px] md:h-[220px] rounded-2xl overflow-hidden bg-elevated mx-auto shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
      {src ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
          style={{
            filter: revealed ? 'blur(0px)' : 'blur(20px)',
            transition: 'filter 500ms cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-ghost">
            <path
              d="M9 17V5l12-2v12M9 17a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
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
    <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-combo">
      {fire && <span>{'\uD83D\uDD25'}</span>}
      <span>{combo}x combo</span>
      {multiplier > 1 && (
        <span className="text-ghost ml-0.5">({multiplier}x)</span>
      )}
    </div>
  );
}

// ---- ResultsScreen ----

interface ProgressionData {
  xpEarned: number;
  totalXP: number;
  level: number;
  title: string;
  leveledUp: boolean;
  oldLevel: number;
  streak: number;
  isFirstGameToday: boolean;
  isPerfectRound: boolean;
  mastery: { play_count: number; best_score: number; mastery_stars: number } | null;
}

interface ResultsScreenProps {
  score: number;
  correctCount: number;
  total: number;
  bestCombo: number;
  avgSpeed: number;
  results: Array<{ question: { reveal: { title: string; artist: string; cover?: string | null } }; correct: boolean }>;
  progression: ProgressionData | null;
  playlist: string;
  onPlayAgain: () => void;
  onHome: () => void;
}

function getScoreLabel(correct: number, total: number): { label: string; stars: number } {
  if (correct === total) return { label: 'PERFECT!', stars: 5 };
  if (correct >= 9) return { label: 'Amazing!', stars: 4 };
  if (correct >= 7) return { label: 'Great round!', stars: 3 };
  if (correct >= 5) return { label: 'Not bad!', stars: 2 };
  return { label: 'Keep trying!', stars: 1 };
}

function computeXpBarPercent(p: ProgressionData): number {
  if (p.level >= 50) return 100;
  const currentLevelXP = xpForLevel(p.level);
  const nextLevelXP = xpForLevel(p.level + 1);
  const range = Math.max(1, nextLevelXP - currentLevelXP);
  const within = Math.max(0, p.totalXP - currentLevelXP);
  return Math.min(100, Math.round((within / range) * 100));
}

export function ResultsScreen({
  score,
  correctCount,
  total,
  bestCombo,
  avgSpeed,
  results,
  progression,
  playlist,
  onPlayAgain,
  onHome,
}: ResultsScreenProps) {
  const { label, stars } = getScoreLabel(correctCount, total);
  const missed = results.filter((r) => !r.correct);

  // Animate XP bar from 0 to target percent on mount.
  const [xpBarWidth, setXpBarWidth] = useState(0);
  useEffect(() => {
    if (!progression) return;
    const target = computeXpBarPercent(progression);
    // Two-frame delay so the CSS transition runs.
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setXpBarWidth(target));
    });
    return () => cancelAnimationFrame(id);
  }, [progression]);

  return (
    <div className="flex flex-col gap-4 max-w-[440px] mx-auto px-5 py-10 animate-fadeSlideUp">
      {/* Stars */}
      <div className="text-2xl text-combo text-center" style={{ letterSpacing: '4px' }}>
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} style={{ opacity: i < stars ? 1 : 0.2 }}>{'\u2605'}</span>
        ))}
      </div>

      {/* Score + label */}
      <div className="text-center">
        <p className="text-5xl font-bold text-primary tabular-nums leading-none">
          {correctCount} / {total}
        </p>
        <p className="text-sm font-semibold text-accent mt-2">{label}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 rounded-xl bg-surface border border-default overflow-hidden">
        <StatCell value={score.toLocaleString()} label="points" />
        <StatCell value={`${avgSpeed.toFixed(1)}s`} label="avg speed" border />
        <StatCell value={`${bestCombo}x`} label="best combo" />
      </div>

      {/* XP card */}
      {progression && (
        <>
          {progression.leveledUp && (
            <div
              className="p-4 rounded-2xl text-center"
              style={{
                background: 'linear-gradient(135deg, var(--daily-gradient-from), var(--daily-gradient-to))',
                border: '1px solid var(--daily-border)',
              }}
            >
              <p className="text-base font-bold text-accent">Level up!</p>
              <p className="text-xs text-daily mt-0.5">
                Level {progression.oldLevel} {'\u2192'} Level {progression.level} - {progression.title}
              </p>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-surface border border-default">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-semibold text-accent">
                +{progression.xpEarned.toLocaleString()} XP
                {progression.isFirstGameToday && <span className="ml-1 text-[10px] text-ghost font-normal">first game bonus</span>}
              </p>
              <p className="text-[10px] text-ghost">
                Lv.{progression.level} - {progression.title}
              </p>
            </div>
            <div className="h-1 rounded-full bg-elevated overflow-hidden">
              <div
                className="h-full bg-accent"
                style={{ width: `${xpBarWidth}%`, transition: 'width 1.5s ease-out' }}
              />
            </div>
          </div>

          {/* Streak */}
          <div className="p-3 px-4 rounded-2xl bg-surface border border-default flex items-center justify-between">
            <div>
              <p className="text-xs text-secondary">Daily streak</p>
              <p className="text-[10px] text-ghost mt-0.5">
                {progression.streak >= 7
                  ? '+100 XP bonus active'
                  : progression.streak >= 3
                  ? '+50 XP bonus active'
                  : 'Play 3 days in a row for bonus XP'}
              </p>
            </div>
            <p className="text-lg font-bold text-combo tabular-nums">
              {progression.streak > 0 && '\uD83D\uDD25 '}{progression.streak}
            </p>
          </div>

          {/* Mastery */}
          {progression.mastery && (
            <div className="p-3 px-4 rounded-2xl bg-surface border border-default flex items-center justify-between">
              <div>
                <p className="text-xs text-secondary">{playlist} mastery</p>
                <p className="text-[10px] text-ghost mt-0.5">{progression.mastery.play_count} plays</p>
              </div>
              <span className="text-sm text-combo">
                {'\u2605'.repeat(progression.mastery.mastery_stars)}
                {'\u2606'.repeat(5 - progression.mastery.mastery_stars)}
              </span>
            </div>
          )}
        </>
      )}

      {/* Sign in nudge */}
      {!progression && (
        <div className="p-4 rounded-2xl bg-surface border border-default text-center">
          <p className="text-sm font-semibold text-primary mb-1">Save your progress</p>
          <p className="text-xs text-ghost mb-3">Sign in to keep scores, level up, and compete</p>
          <a href="/login" className="inline-block px-5 py-2 rounded-xl bg-accent text-primary text-xs font-bold">
            Sign up free
          </a>
        </div>
      )}

      {/* Missed songs */}
      {missed.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ghost mb-2">Songs you missed</p>
          <div>
            {missed.map((r, i) => (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-subtle last:border-0">
                <span className="text-xs font-semibold text-wrong-text">{'\u2717'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-primary truncate">{r.question.reveal.title}</p>
                  <p className="text-[10px] text-ghost truncate">{r.question.reveal.artist}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-2">
        <button
          type="button"
          onClick={onPlayAgain}
          className="flex-1 py-3.5 rounded-xl bg-accent text-primary font-bold text-sm active:scale-[0.98] transition-transform"
        >
          Play again
        </button>
        <button
          type="button"
          onClick={onHome}
          className="flex-1 py-3.5 rounded-xl bg-surface border border-default text-secondary font-medium text-sm hover:border-accent transition-colors"
        >
          Home
        </button>
      </div>
    </div>
  );
}

function StatCell({ value, label, border }: { value: string; label: string; border?: boolean }) {
  return (
    <div className={`text-center py-3 ${border ? 'border-x border-default' : ''}`}>
      <p className="text-lg font-semibold text-primary tabular-nums">{value}</p>
      <p className="text-[9px] text-ghost uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

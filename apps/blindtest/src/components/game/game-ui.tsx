'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { xpForLevel, getLevelFromXP } from '@/lib/progression';
import { playTick, playReveal, playPerfect, playStreak } from '@/lib/sounds';
import { hapticLight } from '@/lib/haptics';
import { generateShareText } from '@/lib/share';
import { generateShareCard } from '@/lib/share-card';
import { KOREAN_MOMENTS, getComboKorean } from '@/lib/korean-moments';
import { RollingNumber } from './rolling-number';
import { LevelUpOverlay } from './level-up-overlay';
import { MasteryProgress, getNextStarThreshold } from './mastery-progress';
import { ChallengeComparison } from '@/components/challenge/challenge-comparison';

// ---- CircularTimer ----

export interface TimerHandle {
  addTime: (seconds: number) => void;
}

interface TimerProps {
  duration: number;
  running: boolean;
  onExpired: () => void;
  timerKey: number;
  onUrgentTick?: () => void;
}

export const CircularTimer = forwardRef<TimerHandle, TimerProps>(
  function CircularTimer({ duration, running, onExpired, timerKey, onUrgentTick }, ref) {
  const [remaining, setRemaining] = useState(duration);
  const startRef = useRef(0);
  const bonusRef = useRef(0);
  const expiredRef = useRef(false);
  const lastTickSecondRef = useRef<number>(-1);

  useImperativeHandle(ref, () => ({
    addTime(seconds: number) {
      bonusRef.current += seconds;
    },
  }));

  useEffect(() => {
    setRemaining(duration);
    expiredRef.current = false;
    lastTickSecondRef.current = -1;
    bonusRef.current = 0;
    if (!running) return;

    startRef.current = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const effectiveDuration = duration + bonusRef.current;
      const left = Math.max(0, effectiveDuration - elapsed);
      setRemaining(left);

      // Fire an urgent tick on each whole second in the last 3.
      if (left > 0 && left <= 3) {
        const sec = Math.ceil(left);
        if (sec !== lastTickSecondRef.current) {
          lastTickSecondRef.current = sec;
          playTick();
          hapticLight();
          onUrgentTick?.();
        }
      }

      if (left <= 0 && !expiredRef.current) {
        expiredRef.current = true;
        clearInterval(interval);
        onExpired();
      }
    }, 50);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerKey, running, duration]);

  const effectiveDuration = duration + bonusRef.current;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const progress = remaining / Math.max(effectiveDuration, duration);
  const dashOffset = circumference * (1 - progress);
  const isUrgent = remaining <= 3;
  const seconds = Math.ceil(remaining);

  return (
    <div className="relative w-[60px] h-[60px] flex items-center justify-center">
      <svg width="60" height="60" className="-rotate-90">
        <circle cx="30" cy="30" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle
          cx="30" cy="30" r={radius} fill="none"
          stroke={isUrgent ? '#E24B4A' : '#D4537E'}
          strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-[stroke] duration-300"
        />
      </svg>
      <span
        className={`absolute text-sm font-semibold tabular-nums ${
          isUrgent ? 'text-[#E24B4A] animate-pulse-urgent' : 'text-white/80'
        }`}
      >
        {seconds}
      </span>
    </div>
  );
});

// ---- ProgressDots ----

interface DotsProps {
  total: number;
  current: number;
  results: Array<{ correct: boolean }>;
}

export function ProgressDots({ total, current, results }: DotsProps) {
  return (
    <div className="flex items-center gap-[3px]">
      {Array.from({ length: total }, (_, i) => {
        const result = results[i];
        let className = 'rounded-full transition-all duration-200 ';
        if (i === current) {
          className += 'w-[9px] h-[9px] bg-[#D4537E] outline-2 outline outline-white/25';
        } else if (result) {
          className += result.correct ? 'w-[7px] h-[7px] bg-white/60' : 'w-[7px] h-[7px] bg-white/20';
        } else {
          className += 'w-[7px] h-[7px] bg-white/10';
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
  let className = 'w-full px-3 py-4 md:py-[18px] rounded-[11px] md:rounded-xl text-[12px] md:text-[13px] font-semibold text-center transition-all duration-300 ';

  switch (state) {
    case 'correct':
      className += 'bg-white/10 border-[1.5px] border-[#4CAF50] text-[#4CAF50] scale-[1.02]';
      break;
    case 'wrong':
      className += 'bg-white/[0.03] border border-white/[0.04] text-white/20 animate-shake';
      break;
    case 'dimmed':
      className += 'bg-white/[0.03] border border-white/[0.04] text-white/20 scale-[0.97] opacity-60';
      break;
    default:
      className += 'bg-white/[0.05] border border-white/[0.06] text-white/70 hover:bg-white/[0.08]';
  }

  return (
    <button onClick={onClick} disabled={disabled} className={className}>
      {state === 'correct' && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#4CAF50" strokeWidth="1.5" strokeLinecap="round" className="inline mr-1">
          <path d="M2 5.5L4.2 7.5L8 3" />
        </svg>
      )}
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
            filter: revealed ? 'blur(0px) brightness(1)' : 'blur(20px) brightness(0.7)',
            transition: 'filter 800ms cubic-bezier(0.22, 1, 0.36, 1)',
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

// ---- SongInfoReveal (staggered title + artist on reveal) ----

export function SongInfoReveal({
  title,
  artist,
  album,
  revealed,
}: {
  title: string;
  artist: string;
  album: string | null;
  revealed: boolean;
}) {
  return (
    <div className="text-center h-[44px]">
      <p
        className="text-[15px] md:text-[17px] font-semibold text-white/90 transition-all duration-500"
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? 'translateY(0)' : 'translateY(8px)',
          transitionDelay: revealed ? '300ms' : '0ms',
        }}
      >
        {title}
      </p>
      <p
        className="text-[12px] md:text-[13px] text-white/50 transition-all duration-500 mt-0.5"
        style={{
          opacity: revealed ? 1 : 0,
          transitionDelay: revealed ? '500ms' : '0ms',
        }}
      >
        {artist}{album ? ` - ${album}` : ''}
      </p>
    </div>
  );
}

// ---- ComboBadge ----

export function ComboBadge({ combo, multiplier }: { combo: number; multiplier: number }) {
  const [bumping, setBumping] = useState(false);
  const prevCombo = useRef(combo);

  useEffect(() => {
    if (combo > prevCombo.current && combo > 0) {
      setBumping(true);
      const t = setTimeout(() => setBumping(false), 150);
      prevCombo.current = combo;
      return () => clearTimeout(t);
    }
    prevCombo.current = combo;
  }, [combo]);

  if (combo < 3) return null;
  const fire = combo >= 5;
  const koreanSuffix = getComboKorean(combo);

  return (
    <div
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.06] border border-white/[0.08] transition-colors duration-300"
    >
      {fire && <span><svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="inline"><path d="M8 1C8 1 3 6 3 10a5 5 0 0010 0c0-2-1.5-3.5-2.5-4.5C10 5 9 4 8 1z" fill="#EF9F27" /><path d="M8 7c0 0-2 2-2 4a2 2 0 004 0c0-1-.5-2-1-2.5C8.5 8 8 7.5 8 7z" fill="#F4C97E" /></svg></span>}
      <span
        className={`text-[11px] font-bold text-[#EF9F27] tabular-nums transition-transform duration-150 inline-block ${
          bumping ? 'scale-[1.4]' : 'scale-100'
        }`}
      >
        {combo}x
      </span>
      {koreanSuffix && (
        <span className="text-[10px] font-semibold text-[#EF9F27]">{koreanSuffix}</span>
      )}
      {multiplier > 1 && (
        <span className="text-[10px] text-white/30">({multiplier}x)</span>
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

interface ResultsSongRow {
  question: { reveal: { title: string; artist: string; cover?: string | null } };
  correct: boolean;
  /** Player's submitted answer (null = timed out). Used for the share emoji grid. */
  answered: string | null;
  /** Seconds spent on this question. Used for total round time on share. */
  timeElapsed: number;
}

interface ChallengeSide {
  name: string;
  score: number;
  correct: number;
  total: number;
  time: number | null;
}

interface ResultsScreenProps {
  score: number;
  correctCount: number;
  total: number;
  bestCombo: number;
  avgSpeed: number;
  results: ResultsSongRow[];
  progression: ProgressionData | null;
  playlist: string;
  mode: string;
  /** When set, the share sheet renders the daily format (Daily #N). */
  dailyNumber?: number;
  /** When set, the screen shows a comparison card at the top of the results. */
  challengeComparison?: {
    creator: ChallengeSide;
    player: ChallengeSide;
    shortCode: string;
  };
  /** Full questions payload used to spin up a new challenge from the current round. */
  questions?: unknown[];
  onPlayAgain: () => void;
  onHome: () => void;
}

interface ResultMessage {
  kr: string;
  en: string;
  subMessage: string | null;
  colorVar: string;
}

function getResultMessage(correct: number, total: number): ResultMessage {
  if (correct === total) {
    return {
      kr: KOREAN_MOMENTS.perfect!.text,
      en: 'PERFECT!',
      subMessage: null,
      colorVar: 'var(--combo)',
    };
  }
  if (correct === total - 1) {
    return {
      kr: KOREAN_MOMENTS.nearPerfect!.text,
      en: 'SO CLOSE!',
      subMessage: '1 more for perfect, try again?',
      colorVar: 'var(--combo)',
    };
  }
  if (correct === total - 2) {
    return {
      kr: KOREAN_MOMENTS.great!.text,
      en: 'Almost there!',
      subMessage: '2 away from perfect',
      colorVar: 'var(--accent)',
    };
  }
  if (correct >= total * 0.7) {
    return {
      kr: KOREAN_MOMENTS.great!.text,
      en: 'Great round!',
      subMessage: null,
      colorVar: 'var(--accent)',
    };
  }
  if (correct >= total * 0.5) {
    return {
      kr: KOREAN_MOMENTS.good!.text,
      en: 'Not bad!',
      subMessage: `${total - correct} songs to learn, you got this`,
      colorVar: 'var(--text-secondary)',
    };
  }
  return {
    kr: KOREAN_MOMENTS.tryAgain!.text,
    en: 'Keep trying!',
    subMessage: 'Every round makes you better',
    colorVar: 'var(--text-secondary)',
  };
}

function computeXpBarPercent(totalXp: number, level: number): number {
  if (level >= 50) return 100;
  const currentLevelXP = xpForLevel(level);
  const nextLevelXP = xpForLevel(level + 1);
  const range = Math.max(1, nextLevelXP - currentLevelXP);
  const within = Math.max(0, totalXp - currentLevelXP);
  return Math.min(100, Math.round((within / range) * 100));
}

function formatPlaylistName(p: string): string {
  if (p === 'all') return 'All K-pop';
  if (p === 'gg') return 'Girl groups';
  if (p === 'bg') return 'Boy groups';
  if (p === 'solo') return 'Solo';
  if (p.endsWith('-gen')) return p.replace('-gen', ' gen');
  return p;
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
  mode,
  dailyNumber,
  challengeComparison,
  questions,
  onPlayAgain,
  onHome,
}: ResultsScreenProps) {
  const { kr: messageKr, en: messageEn, subMessage, colorVar } = getResultMessage(correctCount, total);
  const isPerfect = correctCount === total;
  const missed = results.filter((r) => !r.correct);

  // Share state.
  const [shareLabel, setShareLabel] = useState<'Share' | 'Copied!' | 'Sharing...'>('Share');
  const [challengeLabel, setChallengeLabel] = useState<'Challenge a friend' | 'Creating...' | 'Link copied!' | 'Shared!'>(
    'Challenge a friend',
  );

  async function handleShare() {
    const totalTime = results.reduce((sum, r) => sum + (r.timeElapsed ?? 0), 0);
    const shareText = generateShareText({
      results: results.map((r) => ({ correct: r.correct, answered: r.answered })),
      totalScore: score,
      totalTime,
      streak: progression?.streak ?? 0,
      mode,
      playlist,
      ...(dailyNumber !== undefined ? { dailyNumber } : {}),
    });

    // Try the Web Share API first (mobile native sheet, supports files).
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setShareLabel('Sharing...');
      try {
        let file: File | null = null;
        try {
          const levelTitle = progression
            ? `Lv.${progression.level} \u00B7 ${progression.title}`
            : undefined;
          const blob = await generateShareCard({
            results: results.map((r) => ({ correct: r.correct, answered: r.answered })),
            totalScore: score,
            avgSpeed,
            bestCombo,
            streak: progression?.streak ?? 0,
            playlist,
            mode,
            ...(levelTitle ? { levelTitle } : {}),
            ...(dailyNumber !== undefined ? { dailyNumber } : {}),
          });
          file = new File([blob], 'kpopblindtest-result.png', { type: 'image/png' });
        } catch {
          // Canvas failed; text-only share is still fine.
        }

        const sharePayload: ShareData & { files?: File[] } = { text: shareText };
        if (file && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
          sharePayload.files = [file];
        }

        await navigator.share(sharePayload);
        setShareLabel('Share');
        return;
      } catch {
        // User cancelled or share failed. Fall through to clipboard.
      }
    }

    // Fallback: clipboard.
    try {
      await navigator.clipboard.writeText(shareText);
      setShareLabel('Copied!');
      setTimeout(() => setShareLabel('Share'), 2000);
    } catch {
      setShareLabel('Share');
    }
  }

  async function handleCreateChallenge() {
    // Re-challenge path: if we're already in a challenge completion, reuse the
    // existing short_code instead of minting a new one.
    if (challengeComparison?.shortCode) {
      const fullUrl = `${window.location.origin}/challenge/${challengeComparison.shortCode}`;
      const text = `I scored ${correctCount}/${total} on this K-pop blindtest. Can you beat me?`;
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: 'K-pop Blindtest Challenge', text, url: fullUrl });
          setChallengeLabel('Shared!');
          setTimeout(() => setChallengeLabel('Challenge a friend'), 2000);
          return;
        } catch {
          // fall through
        }
      }
      try {
        await navigator.clipboard.writeText(fullUrl);
        setChallengeLabel('Link copied!');
        setTimeout(() => setChallengeLabel('Challenge a friend'), 2000);
      } catch {
        setChallengeLabel('Challenge a friend');
      }
      return;
    }

    if (!questions || questions.length === 0) {
      // Can't create a challenge without the frozen question payload.
      return;
    }

    setChallengeLabel('Creating...');
    try {
      const res = await fetch('/api/challenge/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlist,
          mode,
          difficulty: 'all',
          questions,
          creatorScore: score,
          creatorCorrect: correctCount,
          creatorTotal: total,
          creatorTime: results.reduce((sum, r) => sum + (r.timeElapsed ?? 0), 0),
          creatorBestCombo: bestCombo,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.shortCode) {
        setChallengeLabel('Challenge a friend');
        return;
      }
      const fullUrl = `${window.location.origin}/challenge/${data.shortCode}`;
      const text = `I scored ${correctCount}/${total} on this K-pop blindtest. Can you beat me?`;
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        try {
          await navigator.share({ title: 'K-pop Blindtest Challenge', text, url: fullUrl });
          setChallengeLabel('Shared!');
          setTimeout(() => setChallengeLabel('Challenge a friend'), 2000);
          return;
        } catch {
          // fall through
        }
      }
      try {
        await navigator.clipboard.writeText(fullUrl);
        setChallengeLabel('Link copied!');
        setTimeout(() => setChallengeLabel('Challenge a friend'), 3000);
      } catch {
        setChallengeLabel('Challenge a friend');
      }
    } catch {
      setChallengeLabel('Challenge a friend');
    }
  }

  // Stars stagger in.
  const [showStars, setShowStars] = useState(false);
  // Show the missed songs list after the XP animation.
  const [showMissed, setShowMissed] = useState(false);
  // XP bar animation: starts at the OLD percentage, transitions to the NEW one.
  const oldXp = progression ? progression.totalXP - progression.xpEarned : 0;
  const oldPct = progression
    ? computeXpBarPercent(oldXp, progression.leveledUp ? progression.oldLevel : progression.level)
    : 0;
  const newPct = progression ? computeXpBarPercent(progression.totalXP, progression.level) : 0;
  const [barWidth, setBarWidth] = useState(oldPct);
  // Show the XP card breakdown.
  const [showXp, setShowXp] = useState(false);
  // Level up overlay
  const [showLevelUp, setShowLevelUp] = useState(false);
  // Score scale pulse for perfect rounds
  const [scorePulse, setScorePulse] = useState(false);

  useEffect(() => {
    // Timeline of the reveal.
    const ts: Array<ReturnType<typeof setTimeout>> = [];
    ts.push(setTimeout(() => setShowStars(true), 100));
    ts.push(setTimeout(() => setShowXp(true), 400));
    ts.push(setTimeout(() => setBarWidth(newPct), 500));
    ts.push(setTimeout(() => setShowMissed(true), 1500));

    // Perfect celebration.
    if (isPerfect) {
      ts.push(setTimeout(() => playPerfect(), 400));
      ts.push(setTimeout(() => setScorePulse(true), 300));
      ts.push(setTimeout(() => setScorePulse(false), 700));
    }

    // Streak fanfare.
    if (progression && progression.streak >= 3 && progression.isFirstGameToday) {
      ts.push(setTimeout(() => playStreak(), 900));
    }

    // Level up overlay fires AFTER the XP bar fills (~2s in).
    if (progression?.leveledUp) {
      ts.push(setTimeout(() => setShowLevelUp(true), 2000));
    }

    return () => ts.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const masteryCard = progression?.mastery ? (
    <MasteryProgress
      playlistName={formatPlaylistName(playlist)}
      currentStars={progression.mastery.mastery_stars}
      playCount={progression.mastery.play_count}
      nextStarAt={getNextStarThreshold(progression.mastery.mastery_stars)}
    />
  ) : null;

  // Staggered XP breakdown rows.
  const xpBreakdown = useMemo(() => {
    if (!progression) return [];
    const items: Array<{ label: string; value: number; delay: number }> = [];
    const base = Math.round(score / 10);
    items.push({ label: 'Base XP', value: base, delay: 500 });
    if (mode === 'challenge') {
      const challengeBonus = Math.round(base * 0.5);
      if (challengeBonus > 0) items.push({ label: 'Challenge bonus', value: challengeBonus, delay: 700 });
    }
    if (mode === 'daily') {
      items.push({ label: 'Daily bonus', value: 200, delay: 700 });
    }
    if (progression.isFirstGameToday) {
      items.push({ label: 'First game today', value: 100, delay: 900 });
    }
    if (progression.streak >= 30) {
      items.push({ label: 'Streak bonus', value: 200, delay: 1100 });
    } else if (progression.streak >= 7) {
      items.push({ label: 'Streak bonus', value: 100, delay: 1100 });
    } else if (progression.streak >= 3) {
      items.push({ label: 'Streak bonus', value: 50, delay: 1100 });
    }
    if (progression.isPerfectRound) {
      items.push({ label: 'Perfect bonus', value: 500, delay: 1300 });
    }
    return items;
  }, [progression, score, mode]);

  // Score grade ring shared between mobile and desktop.
  const scoreGrade = correctCount === total ? 'S' : correctCount >= 8 ? 'A' : correctCount >= 6 ? 'B' : correctCount >= 4 ? 'C' : 'D';
  const scoreColor = correctCount === total ? '#EF9F27' : correctCount >= 7 ? '#4CAF50' : correctCount >= 4 ? '#D4537E' : '#E24B4A';
  const scorePctRing = (correctCount / total) * 100;

  const starsBlock = (
    <div className="flex items-center justify-center">
      <div className="relative w-[80px] h-[80px] md:w-[100px] md:h-[100px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-elevated)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="42" fill="none"
            stroke={scoreColor} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${scorePctRing * 2.64} 264`}
            className="transition-all duration-1000"
            style={{ opacity: showStars ? 1 : 0 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-2xl md:text-3xl font-bold transition-all duration-500"
            style={{ color: scoreColor, opacity: showStars ? 1 : 0, transform: showStars ? 'scale(1)' : 'scale(0.5)' }}
          >
            {scoreGrade}
          </span>
        </div>
      </div>
    </div>
  );

  // Score + bilingual message hero (Korean leads, English follows).
  const scoreBlock = (
    <div className="text-center">
      <p
        className="text-5xl md:text-7xl font-bold text-primary tabular-nums leading-none transition-transform duration-300"
        style={{ transform: scorePulse ? 'scale(1.1)' : 'scale(1)' }}
      >
        <RollingNumber value={correctCount} duration={800} /> / {total}
      </p>
      <p className="text-sm md:text-base font-semibold mt-3" style={{ color: colorVar }}>
        <span className="mr-1.5">{messageKr}</span>
        {messageEn}
      </p>
      {subMessage && (
        <p className="text-xs md:text-sm text-ghost mt-1">{subMessage}</p>
      )}
    </div>
  );

  // Stats row.
  const statsBlock = (
    <div className="grid grid-cols-3 gap-1 md:gap-1.5">
      <div className="px-2 py-2 rounded-lg bg-white dark:bg-[rgba(255,255,255,0.04)] border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] text-center">
        <p className="text-sm font-semibold text-primary"><RollingNumber value={score} duration={1200} /></p>
        <p className="text-[7px] text-[#888780] dark:text-white/35">score</p>
      </div>
      <div className="px-2 py-2 rounded-lg bg-white dark:bg-[rgba(255,255,255,0.04)] border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] text-center">
        <p className="text-sm font-semibold text-primary">{avgSpeed.toFixed(1)}s</p>
        <p className="text-[7px] text-[#888780] dark:text-white/35">speed</p>
      </div>
      <div className="px-2 py-2 rounded-lg bg-white dark:bg-[rgba(255,255,255,0.04)] border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] text-center">
        <p className="text-sm font-semibold text-primary">{bestCombo}x</p>
        <p className="text-[7px] text-[#888780] dark:text-white/35">combo</p>
      </div>
    </div>
  );

  // XP card.
  const xpBlock = progression ? (
    <div className="rounded-[10px] md:rounded-xl border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] bg-white dark:bg-[rgba(255,255,255,0.04)] px-3 md:px-3.5 py-2.5 md:py-3 flex flex-col gap-[5px] md:gap-1.5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[13px] md:text-sm font-semibold text-[#D4537E]">
          <RollingNumber value={progression.xpEarned} prefix="+" suffix=" XP" duration={1000} />
        </p>
        <p className="text-[10px] md:text-xs text-[#888780] dark:text-white/40">
          Lv.{progression.level} - {progression.title}
        </p>
      </div>

      <div className="h-1 rounded-full bg-[#F0EDE8] dark:bg-white/[0.06] overflow-hidden mb-1">
        <div
          className="h-full bg-[#D4537E]"
          style={{
            width: `${barWidth}%`,
            transition: 'width 1.5s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      </div>

      {xpBreakdown.length > 0 && (
        <div className="flex flex-col gap-[5px] md:gap-1.5">
          {xpBreakdown.map((item, i) => (
            <div
              key={i}
              className="flex justify-between items-center transition-all duration-400"
              style={{
                opacity: showXp ? 1 : 0,
                transform: showXp ? 'translateY(0)' : 'translateY(6px)',
                transitionDelay: `${item.delay}ms`,
              }}
            >
              <span className="text-[11px] md:text-xs font-medium text-[#888780] dark:text-white/40">{item.label}</span>
              <span className="font-semibold tabular-nums text-[11px] md:text-xs text-[#D4537E]">+{item.value}</span>
            </div>
          ))}
          <div className="h-px bg-[#F0EDE8] dark:bg-white/[0.06]" />
          <div className="flex justify-between items-center">
            <span className="text-xs md:text-[13px] font-medium text-[#888780] dark:text-white/40">Total XP earned</span>
            <span className="font-semibold tabular-nums text-sm md:text-[15px] text-[#D4537E]">+{progression.xpEarned}</span>
          </div>
        </div>
      )}
    </div>
  ) : null;

  // Streak card.
  const streakBlock = progression ? (
    <div className="p-3 px-4 rounded-[10px] md:rounded-xl bg-white dark:bg-[rgba(255,255,255,0.04)] border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] flex items-center justify-between">
      <div>
        <p className="text-xs md:text-sm text-[#888780] dark:text-white/40">Daily streak</p>
        <p className="text-[10px] md:text-xs text-[#888780] dark:text-white/35 mt-0.5">
          {progression.streak >= 7
            ? '+100 XP bonus active'
            : progression.streak >= 3
            ? '+50 XP bonus active'
            : 'Play 3 days in a row for bonus XP'}
        </p>
      </div>
      <p className="text-lg md:text-xl font-bold text-[#EF9F27] tabular-nums">
        {progression.streak > 0 && <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="inline mr-1"><path d="M8 1C8 1 3 6 3 10a5 5 0 0010 0c0-2-1.5-3.5-2.5-4.5C10 5 9 4 8 1z" fill="#EF9F27" /><path d="M8 7c0 0-2 2-2 4a2 2 0 004 0c0-1-.5-2-1-2.5C8.5 8 8 7.5 8 7z" fill="#F4C97E" /></svg>}{progression.streak}
      </p>
    </div>
  ) : null;

  // Sign in nudge (anonymous).
  const signInBlock = (!progression && xpBreakdown.length === 0) ? (
    <div className="p-4 rounded-[10px] md:rounded-xl bg-white dark:bg-[rgba(255,255,255,0.04)] border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] text-center">
      <p className="text-sm font-semibold text-primary mb-1">Save your progress</p>
      <p className="text-xs text-[#888780] dark:text-white/40 mb-3">Sign in to keep scores, level up, and compete</p>
      <a href="/login" className="inline-block px-5 py-2 rounded-xl bg-[#D4537E] text-white text-xs font-bold">
        Sign up free
      </a>
    </div>
  ) : null;

  // Missed songs list.
  const missedBlock = missed.length > 0 ? (
    <div>
      <p className="text-[10px] md:text-xs font-semibold uppercase tracking-wider text-[#888780] dark:text-white/35 mb-3">
        Songs to discover
      </p>
      <div className="flex flex-col gap-2">
        {missed.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[rgba(255,255,255,0.04)] border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] transition-all duration-400"
            style={{
              opacity: showMissed ? 1 : 0,
              transform: showMissed ? 'translateY(0)' : 'translateY(8px)',
              transitionDelay: `${i * 100}ms`,
            }}
          >
            <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[#F5F3EE] dark:bg-white/[0.06]">
              {r.question.reveal.cover ? (
                <img src={r.question.reveal.cover} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#B4B2A9" strokeWidth="1.2" strokeLinecap="round"><path d="M6 12V4l7 4-7 4z" /></svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] md:text-sm font-medium text-primary truncate">{r.question.reveal.title}</p>
              <p className="text-[10px] md:text-xs text-[#888780] dark:text-white/35 truncate">{r.question.reveal.artist}</p>
            </div>
            <div className="w-6 h-6 rounded-full bg-[#FCEBEB] dark:bg-[rgba(226,75,74,0.12)] flex items-center justify-center flex-shrink-0">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#E24B4A" strokeWidth="1.5" strokeLinecap="round"><path d="M3 3l4 4M7 3L3 7" /></svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  // Challenge comparison block (shown when the player finished a friend's challenge).
  const challengeBlock = challengeComparison ? (
    <div className="p-5 rounded-[10px] md:rounded-xl bg-white dark:bg-[rgba(255,255,255,0.04)] border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)]">
      <ChallengeComparison
        creator={challengeComparison.creator}
        player={challengeComparison.player}
      />
    </div>
  ) : null;

  // "Challenge a friend" button (primary growth CTA). Only shown for normal
  // rounds (not daily). When the player is inside a challenge already, the
  // button re-shares the same short_code so the chain continues.
  const canCreateChallenge = dailyNumber === undefined && (questions?.length ?? 0) > 0;
  const challengeButtonBlock = canCreateChallenge || challengeComparison ? (
    <button
      type="button"
      onClick={handleCreateChallenge}
      className="w-full py-3.5 rounded-[10px] md:rounded-xl bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.1)] border border-[#F4C0D1] dark:border-[rgba(212,83,126,0.2)] text-[#D4537E] text-sm font-bold active:scale-[0.98] transition-transform hover:bg-[#F5E5EC] dark:hover:bg-[rgba(212,83,126,0.15)]"
      aria-live="polite"
    >
      {challengeComparison ? 'Challenge someone else' : challengeLabel}
    </button>
  ) : null;

  // Action buttons (Play again + Share + Home).
  const buttonsBlock = (
    <div className="flex gap-1.5 md:gap-2">
      <button
        type="button"
        onClick={handleShare}
        className="w-11 h-11 md:w-12 md:h-12 rounded-[10px] md:rounded-xl bg-[#FAF2F5] dark:bg-[rgba(212,83,126,0.1)] border border-[#F4C0D1] dark:border-[rgba(212,83,126,0.2)] flex items-center justify-center"
        aria-label={shareLabel}
        aria-live="polite"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#D4537E" strokeWidth="1.3" strokeLinecap="round">
          <path d="M3 8v3a1 1 0 001 1h6a1 1 0 001-1V8M7 2v7M4.5 4.5L7 2l2.5 2.5" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onPlayAgain}
        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 md:py-3 rounded-[10px] md:rounded-xl bg-[#D4537E] text-white text-[13px] md:text-sm font-semibold hover:bg-[#C44A72] active:scale-[0.97] transition-all"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#fff" strokeWidth="1.3" strokeLinecap="round">
          <path d="M2 7a5 5 0 1 1 1.5 3.5" /><path d="M2 11V7h3.5" />
        </svg>
        Play again
      </button>
      <button
        type="button"
        onClick={onHome}
        className="w-11 h-11 md:w-12 md:h-12 rounded-[10px] md:rounded-xl bg-white dark:bg-[rgba(255,255,255,0.04)] border border-[#E8E6E0] dark:border-[rgba(255,255,255,0.06)] flex items-center justify-center text-[#888780] dark:text-white/40 text-xs font-medium"
      >
        Home
      </button>
    </div>
  );

  return (
    <div className="max-w-[440px] md:max-w-[840px] mx-auto px-3.5 md:px-7 py-10 md:py-14 animate-fadeSlideUp">
      {/* Challenge comparison (only when coming in from a shared link) */}
      {challengeBlock && <div className="mb-6 md:mb-8">{challengeBlock}</div>}

      {/* HERO: centered celebration. Full width on both mobile and desktop. */}
      <div className="flex flex-col items-center gap-4 md:gap-6 mb-6 md:mb-10">
        {starsBlock}
        {scoreBlock}
      </div>

      {/* Stats row */}
      <div className="mb-6 md:mb-10 md:max-w-[560px] md:mx-auto">
        {statsBlock}
      </div>

      {/* Desktop: 2-column (XP left, missed songs right) */}
      <div className="md:flex md:gap-5">
        <div className="md:w-1/2 flex flex-col gap-4">
          {xpBlock}
          {streakBlock}
          {masteryCard}
          {signInBlock}
        </div>
        <div className="md:w-1/2 flex flex-col gap-4 mt-4 md:mt-0">
          {missedBlock}
        </div>
      </div>

      {/* Challenge a friend (primary growth CTA) */}
      {challengeButtonBlock && (
        <div className="mt-6 md:max-w-[440px] md:mx-auto">
          {challengeButtonBlock}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-2.5 md:mt-4 md:max-w-[440px] md:mx-auto">
        {buttonsBlock}
      </div>

      {/* Level up overlay (rendered last so it sits above everything) */}
      {showLevelUp && progression?.leveledUp && (
        <LevelUpOverlay
          newLevel={progression.level}
          title={progression.title}
          titleKr={getLevelFromXP(progression.totalXP).titleKr}
          onDismiss={() => setShowLevelUp(false)}
        />
      )}
    </div>
  );
}

// Re-export playReveal so game-player.tsx can call it from a single module.
export { playReveal };

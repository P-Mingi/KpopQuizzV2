'use client';

import { useEffect, useState } from 'react';

interface TimeStat {
  score: number;
  total_questions: number;
  attempt_count: number;
  avg_time_seconds: number;
  fastest_time_seconds: number | null;
}

interface Props {
  quizId: string;
  userTime: number;
  score: number;
  totalQuestions: number;
}

function formatTime(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  }
  return `${seconds.toFixed(1)}s`;
}

export function TimeComparison({ quizId, userTime, score, totalQuestions }: Props): React.ReactElement {
  const [stat, setStat] = useState<TimeStat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/quiz/${quizId}/time-stats`)
      .then((r) => r.json())
      .then((data) => {
        const match = (data.stats as TimeStat[])?.find(
          (s) => s.score === score && s.total_questions === totalQuestions,
        );
        setStat(match ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [quizId, score, totalQuestions]);

  if (loading) return <div />;

  // No comparison data yet
  if (!stat || stat.attempt_count <= 1) {
    return (
      <div className="mt-4 p-4 bg-surface-secondary rounded-lg border border-border-light">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-txt-secondary">Your time</span>
          <span className="text-lg font-semibold tabular-nums text-txt-primary">{formatTime(userTime)}</span>
        </div>
        <p className="text-xs text-txt-tertiary text-center">
          You set the benchmark for {score}/{totalQuestions}!
        </p>
      </div>
    );
  }

  const avg = stat.avg_time_seconds;
  const fastest = stat.fastest_time_seconds;
  const count = stat.attempt_count;
  const isFaster = userTime < avg;
  const isNewRecord = fastest === null || userTime < fastest;
  const diff = Math.abs(userTime - avg);
  const diffPercent = Math.round((diff / avg) * 100);

  let message: string;
  let messageClass: string;

  if (isNewRecord && count > 2) {
    message = `NEW RECORD! Fastest ${score}/${totalQuestions} ever!`;
    messageClass = 'text-[#633806]';
  } else if (isFaster) {
    message = `Faster than average! ${diffPercent}% quicker.`;
    messageClass = 'text-correct-text';
  } else if (diffPercent <= 20) {
    message = `Right on pace with other ${score}/${totalQuestions} players.`;
    messageClass = 'text-txt-secondary';
  } else {
    message = `Can you beat ${formatTime(avg)}? Try again!`;
    messageClass = 'text-txt-secondary';
  }

  return (
    <div className="mt-4 p-4 bg-surface-secondary rounded-lg border border-border-light">
      {/* Your time */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-txt-secondary">Your time</span>
        <span className="text-xl font-bold tabular-nums text-txt-primary">{formatTime(userTime)}</span>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-px bg-border-light" />
        <span className="text-[10px] text-txt-tertiary uppercase tracking-wider">
          vs other {score}/{totalQuestions}
        </span>
        <div className="flex-1 h-px bg-border-light" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <p className="text-base font-semibold tabular-nums text-txt-primary">{formatTime(avg)}</p>
          <p className="text-[10px] text-txt-tertiary">average</p>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold tabular-nums text-txt-primary">{fastest !== null ? formatTime(fastest) : '-'}</p>
          <p className="text-[10px] text-txt-tertiary">fastest</p>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold tabular-nums text-txt-primary">{count}</p>
          <p className="text-[10px] text-txt-tertiary">players</p>
        </div>
      </div>

      {/* Message */}
      <p className={`text-sm font-medium text-center ${messageClass}`}>{message}</p>
    </div>
  );
}

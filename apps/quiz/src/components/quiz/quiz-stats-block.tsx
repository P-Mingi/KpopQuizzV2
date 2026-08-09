import type { QuizExtraStats } from '@/lib/db/queries/plays';

/**
 * SEO-3 U1: real per-quiz stats block. Server-rendered, crawlable, cookie-free.
 * Follows the threshold-30 law for leaderboard-ish metrics (avg score, pass rate,
 * fastest time) - shows honest smallness under 30 completions.
 */

interface QuizStatsBlockProps {
  playCount: number;
  totalCompletions: number;
  questionCount: number;
  avgScorePercent: number | null; // null when totalCompletions === 0
  passRatePercent: number | null; // null when we haven't computed (0 plays)
  likeCount: number;
  extra: QuizExtraStats;
}

const RANKING_UNLOCK = 30;

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

export function QuizStatsBlock({
  playCount,
  totalCompletions,
  questionCount: _questionCount,
  avgScorePercent,
  passRatePercent,
  likeCount,
  extra,
}: QuizStatsBlockProps): React.ReactElement | null {
  // Nothing to show at all yet: skip the whole block (honest emptiness).
  if (playCount === 0 && likeCount === 0) return null;

  const completionsSufficient = totalCompletions >= RANKING_UNLOCK;
  const cells: Array<{ label: string; value: string; hint?: string }> = [];

  // Play count is always shown - it's a count, not a ranking.
  cells.push({
    label: 'Plays',
    value: playCount.toLocaleString('en-US'),
  });

  if (totalCompletions > 0) {
    cells.push({
      label: 'Completions',
      value: totalCompletions.toLocaleString('en-US'),
    });
  }

  if (avgScorePercent !== null) {
    cells.push({
      label: 'Average score',
      value: `${avgScorePercent}%`,
      hint: completionsSufficient ? undefined : 'early results',
    });
  }

  if (passRatePercent !== null && extra.totalPlaysWithScore > 0) {
    cells.push({
      label: 'Pass rate',
      value: `${passRatePercent}%`,
      hint: completionsSufficient ? undefined : 'early results',
    });
  }

  if (extra.perfectScoreCount > 0) {
    cells.push({
      label: 'Perfect scores',
      value: extra.perfectScoreCount.toLocaleString('en-US'),
    });
  }

  if (extra.fastestTimeSeconds !== null) {
    cells.push({
      label: 'Fastest perfect',
      value: formatDuration(extra.fastestTimeSeconds),
      hint: completionsSufficient ? undefined : 'early results',
    });
  }

  if (likeCount > 0) {
    cells.push({
      label: likeCount === 1 ? 'Like' : 'Likes',
      value: likeCount.toLocaleString('en-US'),
    });
  }

  if (cells.length === 0) return null;

  return (
    <section className="quiz-stats-block mt-6 max-w-2xl" aria-label="Quiz stats">
      <ul className="quiz-stats-list">
        {cells.map((cell) => (
          <li key={cell.label} className="quiz-stats-cell">
            <span className="quiz-stats-value">{cell.value}</span>
            <span className="quiz-stats-label">
              {cell.label}
              {cell.hint && <span className="quiz-stats-hint"> · {cell.hint}</span>}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

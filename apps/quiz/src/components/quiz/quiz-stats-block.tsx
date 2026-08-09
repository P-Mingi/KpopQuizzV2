import { RANKING_UNLOCK_VOTES } from '@/lib/db/queries/duels';

import type { QuizExtraStats } from '@/lib/db/queries/plays';

/**
 * SEO-3 U1: real per-quiz stats block. Server-rendered, crawlable, cookie-free.
 *
 * Threshold-30 law (per RANKING_UNLOCK_VOTES): ranking-ish metrics
 * (average score, pass rate, fastest perfect time) are HIDDEN below the
 * threshold - not captioned. Plain counts (plays, perfect scores, likes)
 * are always safe to render since they are counts, not rankings. Under
 * the threshold, a single honest gate line names the remaining count.
 *
 * C2 note: the gate uses the SAME base as the display (plays-table count
 * when available, counter row as fallback), so a quiz sitting on the
 * boundary cannot unlock on one number and render another.
 */

interface QuizStatsBlockProps {
  playCount: number;
  avgScorePercent: number | null; // null when the caller could not compute it
  passRatePercent: number | null; // null when the caller could not compute it
  likeCount: number;
  extra: QuizExtraStats;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

export function QuizStatsBlock({
  playCount,
  avgScorePercent,
  passRatePercent,
  likeCount,
  extra,
}: QuizStatsBlockProps): React.ReactElement | null {
  // Nothing to show at all yet: skip the whole block (honest emptiness).
  if (playCount === 0 && likeCount === 0) return null;

  // Plain counts - always safe (counts, not rankings). Use plays-table
  // count when available (R3: single source of truth) and fall back to
  // the counter row otherwise.
  //
  // C1 note: no "Completions" cell. Cowork measured prod and found
  // play_count === total_completions on all 399 published quizzes, and
  // every plays row has a non-null score - so in this schema a play IS
  // a completion. A second cell would either duplicate Plays (noise) or
  // print a stale counter (a lie). If a schema ever records abandoned
  // attempts, the cell comes back with real data behind it.
  const playsDisplay =
    extra.totalPlaysWithScore > 0 ? extra.totalPlaysWithScore : playCount;

  // C2: gate on the same base as the display. Both are the plays-table
  // count when available (or the counter fallback), so the unlock
  // decision and the rendered value can never disagree.
  const scoresUnlocked = playsDisplay >= RANKING_UNLOCK_VOTES;

  const cells: Array<{ label: string; value: string }> = [];

  cells.push({
    label: 'Plays',
    value: playsDisplay.toLocaleString('en-US'),
  });

  if (extra.perfectScoreCount > 0) {
    cells.push({
      label: 'Perfect scores',
      value: extra.perfectScoreCount.toLocaleString('en-US'),
    });
  }

  if (likeCount > 0) {
    cells.push({
      label: likeCount === 1 ? 'Like' : 'Likes',
      value: likeCount.toLocaleString('en-US'),
    });
  }

  // Ranking-ish metrics - only rendered once the threshold is cleared.
  // No caption, no hint: the value stands on its own.
  if (scoresUnlocked) {
    if (avgScorePercent !== null) {
      cells.push({ label: 'Average score', value: `${avgScorePercent}%` });
    }
    if (passRatePercent !== null && extra.totalPlaysWithScore > 0) {
      cells.push({ label: 'Pass rate', value: `${passRatePercent}%` });
    }
    if (extra.fastestTimeSeconds !== null) {
      cells.push({
        label: 'Fastest perfect',
        value: formatDuration(extra.fastestTimeSeconds),
      });
    }
  }

  if (cells.length === 0) return null;

  // Below the threshold, one honest line names the gate so the page still
  // says something true and unique-per-quiz (the plays count differs).
  // Uses the same playsDisplay as the cell above.
  const gateLine = !scoresUnlocked
    ? `Scores unlock at ${RANKING_UNLOCK_VOTES} plays (${playsDisplay.toLocaleString('en-US')} so far).`
    : null;

  return (
    <section className="quiz-stats-block mt-6 max-w-2xl" aria-label="Quiz stats">
      <ul className="quiz-stats-list">
        {cells.map((cell) => (
          <li key={cell.label} className="quiz-stats-cell">
            <span className="quiz-stats-value">{cell.value}</span>
            <span className="quiz-stats-label">{cell.label}</span>
          </li>
        ))}
      </ul>
      {gateLine && <p className="quiz-stats-gate">{gateLine}</p>}
    </section>
  );
}

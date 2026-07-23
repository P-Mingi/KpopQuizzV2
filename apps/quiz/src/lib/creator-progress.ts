// Q-B4: the post-publish creator-progress nudge. CONTEXT-PICKED and always
// backed by real badge thresholds (owner decision):
//   - Under 10 quizzes  -> quiz-count countdown to the Prolific Creator badge.
//   - 10+ quizzes       -> plays-received progress to the next Creator tier.
// Never a fabricated claim. Thresholds mirror the DB exactly:
//   quiz_maker (1) / prolific_creator (10)  -> migration 009_likes_xp_badges.sql
//   creator_bronze 100 / silver 1,000 / gold 10,000 (plays_received) -> 104_badge_awards.sql

export const PROLIFIC_CREATOR_QUIZZES = 10;

const CREATOR_TIERS: { name: string; plays: number }[] = [
  { name: 'Bronze', plays: 100 },
  { name: 'Silver', plays: 1000 },
  { name: 'Gold', plays: 10000 },
];

export interface CreatorStats {
  quizzes_created: number;
  plays_received: number;
}

export interface CreatorNudge {
  /** Headline line, e.g. "3 more quizzes to Prolific Creator". */
  text: string;
  /** Progress values for the bar (current out of target). */
  current: number;
  target: number;
  /** True once the top milestone in this regime is reached (no bar). */
  maxed: boolean;
}

/**
 * Build the nudge from real stats. Returns null when there is nothing truthful
 * to show (e.g. missing stats), so the caller renders nothing rather than a
 * fabricated claim.
 */
export function creatorNudge(stats: CreatorStats | null | undefined): CreatorNudge | null {
  if (!stats) return null;
  const { quizzes_created, plays_received } = stats;

  // Regime 1: fewer than 10 quizzes -> count down to Prolific Creator.
  if (quizzes_created < PROLIFIC_CREATOR_QUIZZES) {
    const remaining = PROLIFIC_CREATOR_QUIZZES - quizzes_created;
    return {
      text: `${remaining} more quiz${remaining === 1 ? '' : 'zes'} to the Prolific Creator badge`,
      current: quizzes_created,
      target: PROLIFIC_CREATOR_QUIZZES,
      maxed: false,
    };
  }

  // Regime 2: 10+ quizzes -> plays-received progress to the next Creator tier.
  const nextTier = CREATOR_TIERS.find((t) => plays_received < t.plays);
  if (!nextTier) {
    return {
      text: 'You have reached Creator: Gold, the top creator tier',
      current: plays_received,
      target: plays_received,
      maxed: true,
    };
  }
  return {
    text: `${plays_received.toLocaleString()}/${nextTier.plays.toLocaleString()} plays to Creator: ${nextTier.name}`,
    current: plays_received,
    target: nextTier.plays,
    maxed: false,
  };
}

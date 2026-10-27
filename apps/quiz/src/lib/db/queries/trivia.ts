import { getAllGroups } from '@/lib/db/queries/groups';
import { getOverriddenFacts } from '@/lib/trivia/facts';
import { sourcedTriviaCount } from '@/lib/trivia/sourced/store';

import type { Group } from '@/lib/db/types';

// SEO (owner, 2026-10-13): 9 usable facts. The floor was 12 when every fun_fact over 20
// characters counted; the quality filter (lib/trivia/fact-quality.ts) now drops the junk
// first (emoji walls, notes to the player, answer restatements, other languages), which on
// real data was a quarter to a half of a small group's facts. 9 clean facts is the old bar
// without the junk, and it keeps /cortis-trivia and /illit-trivia (the two priority hubs,
// cortis-trivia the 10th page by clicks) instead of turning them into 404s.
export const TRIVIA_MIN_FACTS = 9;

/**
 * Whether a group has enough trivia facts to render a trivia page (>= TRIVIA_MIN_FACTS
 * unique usable facts AFTER overrides). Uses the exact same fact-build + override path as the
 * page, so a suppression that drops a group below the gate also hides the link
 * and makes the page 404. Used to conditionally show the trivia link on quiz pages.
 */
export async function hasTriviaPage(groupId: number, groupSlug: string): Promise<boolean> {
  // SEO Mission 2, part E: a group with a sourced fact file has its page whatever the fan facts say.
  if (sourcedTriviaCount(groupSlug) > 0) return true;
  const facts = await getOverriddenFacts(groupId, groupSlug);
  return facts.length >= TRIVIA_MIN_FACTS;
}

export interface TriviaEligibleGroup {
  group: Group;
  /** Items the page shows: verified sourced questions, or fun facts from fan-made quizzes. */
  factCount: number;
  /** True when the page is built from the sourced fact store (questions with sources). */
  sourced: boolean;
}

/**
 * Every group that currently has a trivia page, i.e. >= TRIVIA_MIN_FACTS facts AFTER overrides.
 * Single source of truth for the /trivia hub: it runs the same getOverriddenFacts
 * gate per group (not a separate raw-corpus mirror), so the hub never links to a
 * group whose page would 404. Sorted by fact count desc. Only groups with at
 * least one quiz are probed to keep the fan-out small.
 */
export async function getTriviaEligibleGroups(): Promise<TriviaEligibleGroup[]> {
  const groups = await getAllGroups();
  const candidates = groups.filter((g) => g.quiz_count > 0);

  const probed = await Promise.all(
    candidates.map(async (group) => {
      const sourced = sourcedTriviaCount(group.slug);
      if (sourced > 0) return { group, factCount: sourced, sourced: true };
      return { group, factCount: (await getOverriddenFacts(group.id, group.slug)).length, sourced: false };
    }),
  );

  return probed
    .filter((p) => p.factCount >= TRIVIA_MIN_FACTS)
    .sort((a, b) => b.factCount - a.factCount);
}

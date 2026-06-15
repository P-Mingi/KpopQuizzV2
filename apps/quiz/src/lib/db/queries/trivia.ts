import { getAllGroups } from '@/lib/db/queries/groups';
import { getOverriddenFacts } from '@/lib/trivia/facts';

import type { Group } from '@/lib/db/types';

export const TRIVIA_MIN_FACTS = 12;

/**
 * Whether a group has enough trivia facts to render a trivia page (>=12 unique
 * facts AFTER overrides). Uses the exact same fact-build + override path as the
 * page, so a suppression that drops a group below the gate also hides the link
 * and makes the page 404. Used to conditionally show the trivia link on quiz pages.
 */
export async function hasTriviaPage(groupId: number, groupSlug: string): Promise<boolean> {
  const facts = await getOverriddenFacts(groupId, groupSlug);
  return facts.length >= TRIVIA_MIN_FACTS;
}

export interface TriviaEligibleGroup {
  group: Group;
  factCount: number;
}

/**
 * Every group that currently has a trivia page, i.e. >=12 facts AFTER overrides.
 * Single source of truth for the /trivia hub: it runs the same getOverriddenFacts
 * gate per group (not a separate raw-corpus mirror), so the hub never links to a
 * group whose page would 404. Sorted by fact count desc. Only groups with at
 * least one quiz are probed to keep the fan-out small.
 */
export async function getTriviaEligibleGroups(): Promise<TriviaEligibleGroup[]> {
  const groups = await getAllGroups();
  const candidates = groups.filter((g) => g.quiz_count > 0);

  const probed = await Promise.all(
    candidates.map(async (group) => ({
      group,
      factCount: (await getOverriddenFacts(group.id, group.slug)).length,
    })),
  );

  return probed
    .filter((p) => p.factCount >= TRIVIA_MIN_FACTS)
    .sort((a, b) => b.factCount - a.factCount);
}

import { getOverriddenFacts } from '@/lib/trivia/facts';

const TRIVIA_MIN_FACTS = 12;

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

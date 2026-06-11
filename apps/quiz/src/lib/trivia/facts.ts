import { createServerClient } from '@/lib/supabase/server';

import { categorizeFact } from './categorize';
import { normalizeFactKey } from './fact-key';
import { applyOverrides } from './overrides';

import type { TriviaFact } from './types';
import type { Question } from '@/lib/db/types';

/** Dedupe trivia facts by their canonical key, keeping the first occurrence. */
function dedupeFacts(facts: TriviaFact[]): TriviaFact[] {
  const seen = new Set<string>();
  return facts.filter((f) => {
    const key = normalizeFactKey(f.fact);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Build the deduped, override-applied trivia facts for a group. Shared by the
 * trivia page (rendering) and hasTriviaPage (the >=12 gate) so both agree on the
 * exact set of facts AFTER suppressions/replacements.
 */
export async function getOverriddenFacts(
  groupId: number,
  groupSlug: string,
): Promise<TriviaFact[]> {
  const supabase = await createServerClient();

  const { data: quizzes, error } = await supabase
    .from('quizzes')
    .select('title, slug, questions')
    .eq('group_id', groupId)
    .eq('status', 'published')
    .order('play_count', { ascending: false })
    .limit(200);

  if (error) {
    console.error('[getOverriddenFacts] query failed:', error);
    return [];
  }
  if (!quizzes) return [];

  const allFacts: TriviaFact[] = [];
  for (const quiz of quizzes) {
    const questions = (quiz.questions ?? []) as Question[];
    for (const q of questions) {
      if (q.fun_fact && q.fun_fact.trim().length > 20) {
        allFacts.push({
          fact: q.fun_fact.trim(),
          category: categorizeFact(q.fun_fact, q.question || ''),
          sourceQuizTitle: quiz.title,
          sourceQuizSlug: quiz.slug,
        });
      }
    }
  }

  return applyOverrides(groupSlug, dedupeFacts(allFacts));
}

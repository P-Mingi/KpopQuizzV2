import { cache } from 'react';
import { unstable_cache } from 'next/cache';

import { createPublicReadClient } from '@/lib/supabase/server';
import { CACHE_TTL } from '@/lib/db/cache-policy';

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

/** Minimal quiz shape needed to extract facts. `title` is attribution-only. */
export interface FactSourceQuiz {
  title?: string | null;
  slug: string;
  questions: unknown;
}

/**
 * Pure (no DB) fact build: pull every quiz's fun_facts, dedupe by canonical
 * key, then apply the group's overrides. Single source of truth shared by
 * getOverriddenFacts (page rendering + the >=12 gate) and the sitemap, so all
 * three agree on the exact eligible set AFTER suppressions/replacements.
 */
export function buildOverriddenFacts(
  groupSlug: string,
  quizzes: FactSourceQuiz[],
): TriviaFact[] {
  const allFacts: TriviaFact[] = [];
  for (const quiz of quizzes) {
    const questions = (Array.isArray(quiz.questions) ? quiz.questions : []) as Question[];
    for (const q of questions) {
      if (q.fun_fact && q.fun_fact.trim().length > 20) {
        allFacts.push({
          fact: q.fun_fact.trim(),
          category: categorizeFact(q.fun_fact, q.question || ''),
          sourceQuizTitle: quiz.title ?? '',
          sourceQuizSlug: quiz.slug,
        });
      }
    }
  }
  return applyOverrides(groupSlug, dedupeFacts(allFacts));
}

/**
 * DB-backed wrapper over buildOverriddenFacts. Two cache layers:
 * - React cache() (inner-most caller sees it): the route's generateMetadata gate,
 *   hasTriviaPage and the page render dedupe to a single call within one request.
 * - unstable_cache: the underlying quizzes(200) read is shared across renders and
 *   across the crawl wave for the catalog TTL (6h). The corpus derives from
 *   published quiz titles/questions, which change rarely, so it holds the long TTL.
 *   FREE-VIABILITY: this read runs on every group hub (hasTriviaPage) and every /q
 *   page (dyk facts), so it fed the /rest/v1/quizzes count; now it hits DB per TTL.
 */
export const getOverriddenFacts = cache(
  unstable_cache(
    async (groupId: number, groupSlug: string): Promise<TriviaFact[]> => {
      // Public trivia source - cookie-free so /trivia + /[group]-trivia stay ISR-cacheable.
      const supabase = createPublicReadClient();

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

      return buildOverriddenFacts(groupSlug, quizzes as FactSourceQuiz[]);
    },
    ['trivia:getOverriddenFacts:v1'],
    { revalidate: CACHE_TTL.catalog, tags: ['quizzes'] },
  ),
);

// SEO-5 B - the entity-level STORED trivia reader (migration 149). These facts are
// sourced + covenant-checked at write time (a DB CHECK), so they are safe to surface.
// Mapped to the SAME TriviaFact shape the derived group pool uses, so the did-you-know
// card treats both sources identically.
import { cache } from 'react';

import { createPublicReadClient } from '@/lib/supabase/server';

import type { TriviaCategory, TriviaFact } from './types';

const VALID_CATEGORIES: ReadonlySet<string> = new Set<TriviaCategory>([
  'members', 'music', 'achievements', 'history', 'fun',
]);

/**
 * Published entity-level trivia for a group. Published-only (the RLS policy already
 * enforces this; we filter anyway). Cookie-free + React cache()'d so it dedupes with
 * any other caller in the same request. Returns [] on error (fail-closed).
 */
export const getStoredGroupTrivia = cache(async (groupId: number): Promise<TriviaFact[]> => {
  const supabase = createPublicReadClient();
  const { data, error } = await supabase
    .from('trivia')
    .select('fact, category')
    .eq('group_id', groupId)
    .eq('status', 'published');

  if (error || !data) return [];

  return (data as { fact: string | null; category: string | null }[])
    .filter((r): r is { fact: string; category: string | null } => typeof r.fact === 'string' && r.fact.trim().length > 0)
    .map((r) => ({
      fact: r.fact.trim(),
      category: (r.category && VALID_CATEGORIES.has(r.category) ? r.category : 'fun') as TriviaCategory,
      sourceQuizTitle: '',
      sourceQuizSlug: '',
    }));
});

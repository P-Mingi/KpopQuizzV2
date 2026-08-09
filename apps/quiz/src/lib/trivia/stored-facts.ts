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

/** Map raw { fact, category } rows to the shared TriviaFact shape (fail-closed). */
function mapRows(rows: { fact: string | null; category: string | null }[] | null): TriviaFact[] {
  return (rows ?? [])
    .filter((r): r is { fact: string; category: string | null } => typeof r.fact === 'string' && r.fact.trim().length > 0)
    .map((r) => ({
      fact: r.fact.trim(),
      category: (r.category && VALID_CATEGORIES.has(r.category) ? r.category : 'fun') as TriviaCategory,
      sourceQuizTitle: '',
      sourceQuizSlug: '',
    }));
}

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
  return mapRows(data as { fact: string | null; category: string | null }[]);
});

/**
 * Published trivia for ONE bound entity (e.g. entity_kind='idol', entity_id=<idol id>).
 * The trivia.entity_id column is text, so the id is coerced to string. Same TriviaFact
 * shape + fail-closed as getStoredGroupTrivia. Used entity-first on member pages.
 */
export const getStoredEntityTrivia = cache(async (
  groupId: number,
  entityKind: string,
  entityId: number,
): Promise<TriviaFact[]> => {
  const supabase = createPublicReadClient();
  const { data, error } = await supabase
    .from('trivia')
    .select('fact, category')
    .eq('group_id', groupId)
    .eq('entity_kind', entityKind)
    .eq('entity_id', String(entityId))
    .eq('status', 'published');
  if (error || !data) return [];
  return mapRows(data as { fact: string | null; category: string | null }[]);
});

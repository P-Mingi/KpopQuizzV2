// Daily games (step 1): the suggestions under the guess box. Pure, no I/O, no search library (the pool is a few hundred
// names). Order: exact, then prefix, then the start of a word, then anywhere; at most 8; entities already guessed are left out.
import { normalizeName, wordKeys } from './normalize';
import type { DlePoolEntity } from './types';

export const MAX_SUGGESTIONS = 8;

/** 0 exact, 1 prefix, 2 start of a word, 3 anywhere, null no match: the best rank over the entity's names. */
export function matchRank(names: readonly string[], query: string): number | null {
  const q = normalizeName(query);
  if (!q) return null;
  let best: number | null = null;
  for (const name of names) {
    const key = normalizeName(name);
    let rank: number | null = null;
    if (key === q) rank = 0;
    else if (key.startsWith(q)) rank = 1;
    else if (wordKeys(name).some((w) => w.startsWith(q))) rank = 2;
    else if (key.includes(q)) rank = 3;
    if (rank !== null && (best === null || rank < best)) best = rank;
  }
  return best;
}

export function suggest(
  pool: readonly DlePoolEntity[],
  query: string,
  guessed: ReadonlySet<string> = new Set(),
  limit: number = MAX_SUGGESTIONS,
): DlePoolEntity[] {
  const hits: { e: DlePoolEntity; rank: number }[] = [];
  for (const e of pool) {
    if (guessed.has(e.id)) continue;
    const rank = matchRank([e.name, ...e.search], query);
    if (rank !== null) hits.push({ e, rank });
  }
  hits.sort((a, b) => a.rank - b.rank || a.e.name.localeCompare(b.e.name, 'en') || a.e.id.localeCompare(b.e.id));
  return hits.slice(0, limit).map((h) => h.e);
}

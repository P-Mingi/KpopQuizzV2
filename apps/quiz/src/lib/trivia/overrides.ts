import { normalizeFactKey } from './fact-key';

import type { TriviaCategory, TriviaFact } from './types';

/**
 * A version-controlled correction applied to an auto-derived trivia fact.
 *
 * `match` is the `normalizeFactKey` of the fact to target.
 *  - suppress      drop the fact entirely (e.g. it is wrong or low quality)
 *  - replace       swap the fact text for `replacement` (re-keyed + re-deduped)
 *  - recategorize  keep the text but move it to `category`
 */
export interface TriviaOverride {
  match: string;
  action: 'suppress' | 'replace' | 'recategorize';
  replacement?: string;
  category?: TriviaCategory;
  reason: string;
  verifiedAt?: string;
}

/**
 * Override table keyed by group SLUG. Intentionally EMPTY for now: J1b populates
 * it after verifying facts against the corpus in docs/trivia-corpus.json.
 */
export const TRIVIA_OVERRIDES: Record<string, TriviaOverride[]> = {};

/**
 * Apply a group's overrides to its already-deduped fact list. Suppressions drop
 * facts; replacements swap text (then we re-dedupe, since a replacement can
 * collide with an existing fact); recategorizations move a fact's category.
 */
export function applyOverrides(groupSlug: string, facts: TriviaFact[]): TriviaFact[] {
  const overrides = TRIVIA_OVERRIDES[groupSlug];
  if (!overrides || overrides.length === 0) return facts;

  const byMatch = new Map<string, TriviaOverride>();
  for (const o of overrides) byMatch.set(o.match, o);

  const out: TriviaFact[] = [];
  for (const f of facts) {
    const override = byMatch.get(normalizeFactKey(f.fact));
    if (!override) {
      out.push(f);
      continue;
    }
    if (override.action === 'suppress') {
      continue;
    }
    if (override.action === 'replace') {
      out.push({ ...f, fact: (override.replacement ?? f.fact).trim() });
    } else {
      out.push({ ...f, category: override.category ?? f.category });
    }
  }

  // A 'replace' may now duplicate an existing fact, so re-dedupe by key.
  const seen = new Set<string>();
  return out.filter((f) => {
    const key = normalizeFactKey(f.fact);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

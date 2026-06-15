/**
 * Canonical key for a trivia fact, used everywhere a fact must be identified or
 * deduped: lowercase, strip non-alphanumeric (keep spaces), trim, first 60 chars.
 *
 * Single source of truth shared by the trivia page, hasTriviaPage, the override
 * layer, and the corpus extraction script, so the same fact always maps to the
 * same key. Dependency-free on purpose (the tsx script imports it directly).
 */
export function normalizeFactKey(fact: string): string {
  return fact
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .slice(0, 60);
}

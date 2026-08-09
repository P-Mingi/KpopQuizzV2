// SEO-4 (O3) - deterministic per-quiz fact selection for the "Did you know?" card.
// Pure + stable (no Math.random, no Date): the ISR-cached page must render the SAME
// fact on every build, and two different quizzes of the same group must land on
// DIFFERENT facts so no two quiz pages read the same taste.

/** FNV-1a hash of a string -> a stable unsigned 32-bit int. Deterministic. */
export function stableHash(key: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** A stable index into a list of length `n`, derived from `key` (e.g. a quiz id).
 * Returns 0 when the list is empty (callers should guard on length first). */
export function stableIndex(key: string, n: number): number {
  return n > 0 ? stableHash(key) % n : 0;
}

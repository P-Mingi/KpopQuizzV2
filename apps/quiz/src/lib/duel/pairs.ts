// Pair picking and the vote split for the This or that bonus (V12 G7). Pure.

export const MAX_PAIRS = 5;
/**
 * A split is shown only when the pair has at least this many votes (yours
 * included). Under it "You agree with 100% of ARMY" would be one or two people.
 */
export const MIN_SPLIT_VOTES = 5;

/** Order-free key of a pair. Same order as the SQL side (uuid least / greatest). */
export function pairKey(a: string, b: string): string {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x < y ? `${x}|${y}` : `${y}|${x}`;
}

function shuffled<T>(items: readonly T[], rnd: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}

/**
 * Up to `count` pairs of different songs. No pair twice, none of the `exclude`
 * keys (pairs this voter already answered today), and a song appears in one pair
 * only while there are enough songs for that.
 */
export function pickPairs(entityIds: readonly string[], count: number, exclude: ReadonlySet<string>, rnd: () => number = Math.random): Array<[string, string]> {
  const ids = shuffled([...new Set(entityIds)], rnd);
  const out: Array<[string, string]> = [];
  const taken = new Set<string>();
  const used = new Set<string>();

  const tryAdd = (a: string, b: string): boolean => {
    const key = pairKey(a, b);
    if (a === b || exclude.has(key) || taken.has(key)) return false;
    taken.add(key);
    used.add(a);
    used.add(b);
    out.push([a, b]);
    return true;
  };

  // First pass: every song at most once.
  for (const a of ids) {
    if (out.length >= count) break;
    if (used.has(a)) continue;
    for (const b of ids) {
      if (b === a || used.has(b)) continue;
      if (tryAdd(a, b)) break;
    }
  }
  // Second pass: songs may repeat, pairs may not.
  if (out.length < count) {
    const rest: Array<[string, string]> = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) rest.push([ids[i] as string, ids[j] as string]);
    for (const [a, b] of shuffled(rest, rnd)) {
      if (out.length >= count) break;
      tryAdd(a, b);
    }
  }
  return out;
}

export interface Split {
  /** share of the first song, whole percent */
  a: number;
  /** share of the second song, whole percent (a + b = 100) */
  b: number;
  total: number;
}

/** The real split of a pair, or null when it has too few votes to show. */
export function splitOf(votesA: number | null | undefined, votesB: number | null | undefined): Split | null {
  if (typeof votesA !== 'number' || typeof votesB !== 'number' || votesA < 0 || votesB < 0) return null;
  const total = votesA + votesB;
  if (total < MIN_SPLIT_VOTES) return null;
  const a = Math.round((votesA / total) * 100);
  return { a, b: 100 - a, total };
}

// Bradley-Terry ranking from pairwise votes (V12 G7, SYSTEM.md 5.3).
//
// Model: song i beats song j with probability p_i / (p_i + p_j). The strengths are
// fitted with the classic MM iteration (Hunter 2004):
//   p_i <- W_i / sum_j ( n_ij / (p_i + p_j) )
// where W_i is the number of wins of i and n_ij the number of votes on the pair.
//
// One regulariser, and it is part of the model, never shown: every song also plays
// PRIOR virtual comparisons against one fixed opponent of strength 1 and wins half
// of them. It keeps the fit finite for a song that never lost (or never won), pins
// the scale (no normalisation step) and makes disconnected groups of songs
// comparable. With real vote counts its weight is negligible.
//
// Pure and deterministic: same votes in any order = same ranking.

export interface DuelVote {
  a: string;
  b: string;
  winner: string;
}

export interface BtRow {
  id: string;
  /** Fitted strength (1 = the virtual average opponent). */
  strength: number;
  wins: number;
  losses: number;
  /** Votes this song took part in. */
  comparisons: number;
  /** 1 = first. Equal strengths share a rank (1, 1, 3). Null = not ranked (too few comparisons). */
  rank: number | null;
}

export interface BtOptions {
  /** Virtual comparisons against the average opponent (default 1). */
  prior?: number;
  /** A song with fewer comparisons than this is fitted but gets no rank (default 1). */
  minComparisons?: number;
  maxIterations?: number;
}

const TIE_EPSILON = 1e-6;

/** True when two fitted strengths are the same for ranking purposes. */
export function sameStrength(x: number, y: number): boolean {
  return Math.abs(x - y) <= TIE_EPSILON * Math.max(Math.abs(x), Math.abs(y), 1);
}

/** Keeps only votes between two different known songs whose winner is one of the two. */
export function validVotes<T extends DuelVote>(entityIds: readonly string[], votes: readonly T[]): T[] {
  const known = new Set(entityIds);
  return votes.filter((v) => v.a !== v.b && known.has(v.a) && known.has(v.b) && (v.winner === v.a || v.winner === v.b));
}

export function rankBradleyTerry(entityIds: readonly string[], votes: readonly DuelVote[], opts: BtOptions = {}): BtRow[] {
  const prior = opts.prior ?? 1;
  const minComparisons = Math.max(1, opts.minComparisons ?? 1);
  const maxIterations = opts.maxIterations ?? 1000;

  const ids = [...new Set(entityIds)].sort();
  const index = new Map(ids.map((id, i) => [id, i]));
  const n = ids.length;
  const wins = new Array<number>(n).fill(0);
  const losses = new Array<number>(n).fill(0);
  /** pair counts, keyed i * n + j with i < j */
  const pairCount = new Map<number, number>();

  for (const v of validVotes(ids, votes)) {
    const a = index.get(v.a) as number;
    const b = index.get(v.b) as number;
    const w = v.winner === v.a ? a : b;
    const l = w === a ? b : a;
    wins[w] = (wins[w] ?? 0) + 1;
    losses[l] = (losses[l] ?? 0) + 1;
    const key = Math.min(a, b) * n + Math.max(a, b);
    pairCount.set(key, (pairCount.get(key) ?? 0) + 1);
  }

  // Sorted so the floating point sums are taken in one fixed order.
  const pairs = [...pairCount.entries()].sort((x, y) => x[0] - y[0]).map(([key, count]) => ({ i: Math.floor(key / n), j: key % n, count }));

  let p = new Array<number>(n).fill(1);
  for (let it = 0; it < maxIterations; it++) {
    const denom = new Array<number>(n).fill(0);
    for (const { i, j, count } of pairs) {
      const d = count / ((p[i] as number) + (p[j] as number));
      denom[i] = (denom[i] as number) + d;
      denom[j] = (denom[j] as number) + d;
    }
    let change = 0;
    const next = new Array<number>(n).fill(1);
    for (let i = 0; i < n; i++) {
      const pi = p[i] as number;
      const d = (denom[i] as number) + prior / (pi + 1);
      const value = d > 0 ? ((wins[i] as number) + prior / 2) / d : 1;
      next[i] = value;
      change = Math.max(change, Math.abs(value - pi) / Math.max(pi, 1e-12));
    }
    p = next;
    if (change < 1e-10) break;
  }

  const rows: BtRow[] = ids.map((id, i) => ({
    id,
    strength: p[i] as number,
    wins: wins[i] as number,
    losses: losses[i] as number,
    comparisons: (wins[i] as number) + (losses[i] as number),
    rank: null,
  }));

  // Strict order first (strength, then id), then equal strengths share a rank and
  // are listed by id inside their group.
  const sorted = rows.filter((r) => r.comparisons >= minComparisons).sort((x, y) => y.strength - x.strength || x.id.localeCompare(y.id));
  const ranked: BtRow[] = [];
  let group: BtRow[] = [];
  const flush = (): void => {
    const rank = ranked.length + 1;
    for (const row of group.sort((x, y) => x.id.localeCompare(y.id))) { row.rank = rank; }
    ranked.push(...group);
    group = [];
  };
  for (const row of sorted) {
    const head = group[0];
    if (head && !sameStrength(head.strength, row.strength)) flush();
    group.push(row);
  }
  if (group.length > 0) flush();
  const unranked = rows.filter((r) => r.comparisons < minComparisons).sort((x, y) => x.id.localeCompare(y.id));
  return [...ranked, ...unranked];
}

// The answer of GET /api/ux-v1/p4/standing, one shape for every branch (C2-008).
// The route builds it with `satisfies P4Standing`; the quiz page and the results read
// it through parseStanding(), which never trusts a key to be there: a missing or
// non-numeric rank is null, and the rank line only shows when rankLine() says so.

export interface P4Standing {
  signedIn: boolean;
  /** signed in: the fan has a stored play on this quiz */
  played: boolean;
  bestScore: number | null;
  /** question count of the play behind bestScore */
  total: number | null;
  /** 1-based place on the quiz's board, null when there is none */
  rank: number | null;
  totalPlayers: number | null;
  /** ISO time of the best play */
  bestAt: string | null;
}

function count(v: unknown, min: number): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v >= min ? v : null;
}

/** Normalises the JSON of GET /api/ux-v1/p4/standing; null when it is not an object. */
export function parseStanding(raw: unknown): P4Standing | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const bestScore = count(r.bestScore, 0);
  return {
    signedIn: r.signedIn === true,
    played: r.played === true && bestScore !== null,
    bestScore,
    total: count(r.total, 1),
    rank: count(r.rank, 1),
    totalPlayers: count(r.totalPlayers, 1),
    bestAt: typeof r.bestAt === 'string' && r.bestAt ? r.bestAt : null,
  };
}

/** "#rank of total players": only when both numbers are real (fail closed: no line). */
export function rankLine(s: P4Standing | null): { rank: number; total: number } | null {
  if (!s || s.rank === null || s.totalPlayers === null) return null;
  return { rank: s.rank, total: s.totalPlayers };
}

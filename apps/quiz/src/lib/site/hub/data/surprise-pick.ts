// Run O1, lot H2b: the draw of Surprise me. Pure and free of server imports, so the button of the page (a client component) can import
// it: it draws from the pool the server sends (the 200 best quizzes of both sites, surprise.ts), never a quiz already played, and never
// the same site twice in a row.

import type { HubSite, HubSurpriseCard } from './types';

export interface SurpriseDrawOptions {
  /** Quiz ids to leave out (the quizzes a signed-in fan already played). */
  readonly playedIds?: ReadonlySet<string> | readonly string[];
  /** The site of the previous draw. */
  readonly lastSite?: HubSite | null;
  /** A number in [0, 1), Math.random by default. */
  readonly random?: () => number;
}

/**
 * One quiz of the pool. Played quizzes are removed first (when that would empty the pool, they are kept: a fan who played everything
 * still gets a quiz). The other site than the last one is then preferred; when the pool holds only the last site, it is used.
 */
export function pickSurprise(pool: readonly HubSurpriseCard[], opts: SurpriseDrawOptions = {}): HubSurpriseCard | null {
  if (pool.length === 0) return null;
  const played = new Set(opts.playedIds ?? []);
  const fresh = pool.filter((c) => !played.has(c.id));
  const base = fresh.length > 0 ? fresh : pool;
  const other = opts.lastSite ? base.filter((c) => c.site !== opts.lastSite) : base;
  const from = other.length > 0 ? other : base;
  const r = (opts.random ?? Math.random)();
  const i = Math.min(from.length - 1, Math.max(0, Math.floor(r * from.length)));
  return from[i] ?? null;
}

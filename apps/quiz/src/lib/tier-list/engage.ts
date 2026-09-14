import { isUuid } from '@/lib/anon-claim';

// Pure engage-path helpers (no DB, no next imports) so they are unit-testable and
// shared by the save / asset / like route handlers.

/**
 * Resolve the anon identity for a write. The httpOnly cookie IS the identity: a
 * request-body value may ONLY mint a first id when no cookie exists, and must
 * NEVER override an existing cookie (that would let a caller assert someone else's
 * anon id on an ownership check). `mintCookie` is true only when we adopt a body
 * id because there was no cookie, so the caller sets the cookie once.
 */
export function resolveAnonId(cookieId: string | null, bodyId: unknown): { anonId: string | null; mintCookie: boolean } {
  if (isUuid(cookieId)) return { anonId: cookieId, mintCookie: false };
  if (isUuid(bodyId)) return { anonId: bodyId as string, mintCookie: true };
  return { anonId: null, mintCookie: false };
}

export type LikeAction = 'like' | 'unlike';

/**
 * Decide the DB op for a like toggle given whether the user already likes the
 * list. A second like is a no-op (idempotent), an unlike removes. When no action
 * is given the endpoint toggles. The real guarantee is the (list_id,user_id)
 * primary key in 147; this keeps the route's response honest and is unit-tested.
 */
export function resolveLike(existing: boolean, action?: LikeAction): { op: 'insert' | 'delete' | 'none'; liked: boolean } {
  const act: LikeAction = action ?? (existing ? 'unlike' : 'like');
  if (act === 'like') return existing ? { op: 'none', liked: true } : { op: 'insert', liked: true };
  return existing ? { op: 'delete', liked: false } : { op: 'none', liked: false };
}

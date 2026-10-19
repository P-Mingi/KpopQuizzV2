// Run O1, lot (c) part 2, lane B3: every XP award of the app goes through here (contract rpcs.md 3,
// PassportServerFns['awardXpForSite']). On 'kpop' it calls the rpc award_xp with the very arguments of today; on
// any other site it calls award_world_xp, which adds to world_memberships.xp of (user, site) and runs that site's
// badge rules. Service role only (both rpcs are revoked from authenticated). Resolves to the new xp, or null when
// the rpc returned no number.

import { createServiceRoleClient } from '@/lib/supabase/server';

import type { SiteId } from '@/lib/site/types';
import type { PassportServerFns } from './types';

/** The one method of a Supabase client this module needs (so a caller's own service-role client can be passed). */
export interface RpcClient {
  rpc(fn: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown }>;
}

/** Arguments of the rpc for `site`: the name and the argument object, in the order the database defines them. */
export function xpRpcFor(
  site: SiteId,
  user: string,
  amount: number,
  reason: string,
): { fn: 'award_xp' | 'award_world_xp'; args: Record<string, unknown> } {
  if (site === 'kpop') return { fn: 'award_xp', args: { p_user_id: user, p_amount: amount, p_reason: reason } };
  return { fn: 'award_world_xp', args: { p_user: user, p_site: site, p_amount: amount, p_reason: reason } };
}

/**
 * `client` defaults to a fresh service-role client; a route that already holds one (the play routes) passes it, so
 * the kpop path makes the same call on the same client as before. `satisfies` pins the contract signature.
 */
export const awardXpForSite = (async (
  site: SiteId,
  user: string,
  amount: number,
  reason: string,
  client?: RpcClient,
): Promise<number | null> => {
  const { fn, args } = xpRpcFor(site, user, amount, reason);
  const db: RpcClient = client ?? createServiceRoleClient();
  const { data } = await db.rpc(fn, args);
  return typeof data === 'number' ? data : null;
}) satisfies PassportServerFns['awardXpForSite'];

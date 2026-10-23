import { getTeamIds } from '@/lib/editorial/accounts';
import { forSite, siteScoped } from '@/lib/site/scope';
import { createPublicReadClient } from '@/lib/supabase/server';
import { isUxV12 } from '@/lib/ux-v12';

// The fandom war RPC for every reader (F5 brief rule 2: editorial accounts are left
// out of the fandom war). One place decides which function runs:
//   flag off                      get_fandom_war_map, today's call exactly, no extra read
//   flag on, nobody editorial     get_fandom_war_map (the team read is the cached G9 one)
//   flag on, team accounts        get_fandom_war_map_v12 (docs/pending-migrations/v12-f5-fandom-war.sql)
//   v12 function not applied yet  falls back to get_fandom_war_map
// Callers keep their own error handling: the result is a plain PostgREST response.

export const WAR_RPC = 'get_fandom_war_map';
export const WAR_RPC_NO_TEAM = 'get_fandom_war_map_v12';

export interface RpcResult<T = unknown> {
  data: T | null;
  error: { code?: string | null; message: string } | null;
  status?: number;
}

/** The slice of a Supabase client this needs (any client: public read or service role). */
export interface WarRpcClient {
  rpc(fn: string, args: { p_limit: number }): PromiseLike<RpcResult>;
}

// PGRST202: function not in the schema cache; 42883: undefined function.
const MISSING_FN = new Set(['PGRST202', '42883']);

export function isMissingFunction(err: RpcResult['error'], status?: number): boolean {
  if (!err) return false;
  if (err.code && MISSING_FN.has(err.code)) return true;
  if (status === 404) return true;
  return /could not find the function/i.test(err.message ?? '');
}

/** True when the war map must leave the team out: flag on and at least one active editorial account. */
export async function warExcludesTeam(): Promise<boolean> {
  if (!isUxV12()) return false;
  return (await getTeamIds()).size > 0;
}

/**
 * The war map RPC counts the plays of every group of the database. With the site scope on (a world site, or kpop with
 * SITE_SCOPE on) the rows are kept to the groups of this site, so a kpop board never lists an anime series. The scope off
 * (kpop today): the rows are returned untouched, no extra read. A failed groups read fails closed (an error, no rows).
 */
async function ownSiteRows(res: RpcResult): Promise<RpcResult> {
  if (!siteScoped() || res.error || !Array.isArray(res.data) || res.data.length === 0) return res;
  const rows = res.data as Array<{ slug: string }>;
  const own = await forSite(createPublicReadClient().from('groups').select('slug')).in('slug', rows.map((r) => r.slug));
  if (own.error || !own.data) return { data: null, error: { message: `war map site scope: ${own.error?.message ?? 'no rows'}` } };
  const slugs = new Set((own.data as Array<{ slug: string }>).map((g) => g.slug));
  return { ...res, data: rows.filter((r) => slugs.has(r.slug)) };
}

/** Calls the war map RPC with `p_limit`, the team left out when warExcludesTeam(), the groups of this site only (ownSiteRows). */
export async function rpcFandomWar(db: WarRpcClient, pLimit: number): Promise<RpcResult> {
  if (!(await warExcludesTeam())) return ownSiteRows(await db.rpc(WAR_RPC, { p_limit: pLimit }));
  const res = await db.rpc(WAR_RPC_NO_TEAM, { p_limit: pLimit });
  if (res.error && isMissingFunction(res.error, res.status)) return ownSiteRows(await db.rpc(WAR_RPC, { p_limit: pLimit }));
  return ownSiteRows(res);
}

/** Cache key parts for a war map cache: unchanged with the flag off, a separate entry with it on
 *  (so a v11 entry and a team-excluded entry never share a key). Read at module load: the flag is
 *  inlined at build. */
export function warCacheKey(base: readonly string[]): string[] {
  return isUxV12() ? [...base, 'v12-no-team'] : [...base];
}

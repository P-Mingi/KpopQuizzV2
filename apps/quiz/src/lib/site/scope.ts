// Run O1, lane B2: the site scope of reads and inserts on the shared tables (rpcs.md 3, flags-env.md 3).
//
// Every read of a scoped table (the 24 site_id tables of 002a, schema.sql) goes through forSite, and every insert
// into one through withSite. On the kpop build both are no-ops while SITE_SCOPE is off, so kpopquiz.org sends the
// same queries as today (the column default 'kpop' fills site_id on insert once 002a is applied). On the anime and
// hub builds they always act, whatever the flag (F0 decision: fail closed, an anime page never reads kpop rows).
// A call that names another site than kpop also always acts, on every build: an unscoped read would hand that
// caller kpop rows under the other site's name, and before 002a it fails on the missing column instead.
//
// Server code only reads SITE_SCOPE (a server flag): in a client bundle it is undefined, so a client import of a
// module that calls forSite stays on today's queries on kpop. The flag is read at call time (no restart needed
// between test cases; Vercel sets it per project).

import { SITE_ID, flagOn } from './registry';

import type { SiteFilterable, SiteId, SiteServerFns } from './types';

/**
 * True when a read or insert for `site` carries site_id on a `build` build: always off the kpop build, always for a
 * non-kpop site, and for kpop on the kpop build only when SITE_SCOPE is on. Defaults: the build's site and the
 * current SITE_SCOPE value.
 */
export function siteScoped(
  site: SiteId = SITE_ID,
  build: SiteId = SITE_ID,
  flag: string | undefined = process.env.SITE_SCOPE,
): boolean {
  return build !== 'kpop' || site !== 'kpop' || flagOn(flag);
}

/**
 * `query.eq('site_id', site)` when the scope is on (see siteScoped), else the query itself. `site` defaults to the
 * build's site. Put it right after `.select(...)` (or `.update`/`.delete`) and before ordering and paging.
 *
 * Typing: `satisfies SiteServerFns['forSite']` pins the contract signature (a drift fails tsc), while the exported
 * bound is `{ readonly eq: unknown }`. With the contract bound `Q extends SiteFilterable<Q>`, every call on a
 * supabase-js builder of this app (untyped clients, postgrest-js 2.100) fails tsc with TS2589 (type instantiation
 * excessively deep): comparing postgrest's generic `eq` with any fixed signature explodes. Request B2-2 asks F0 to
 * widen SiteFilterable the same way.
 */
export const forSite = (<Q extends { readonly eq: unknown }>(query: Q, site: SiteId = SITE_ID): Q =>
  siteScoped(site) ? (query as unknown as SiteFilterable<Q>).eq('site_id', site) : query
) satisfies SiteServerFns['forSite'];

/**
 * A copy of `row` with `site_id` set, for an insert or upsert into a scoped table. An explicit `row.site_id` wins.
 * When the scope is off (kpop build, kpop site, SITE_SCOPE off) the row is returned unchanged: the column default
 * gives 'kpop', and today's insert payloads stay byte-identical (before 002a the column does not exist).
 */
export const withSite: SiteServerFns['withSite'] = <T extends object>(
  row: T,
  site: SiteId = SITE_ID,
): T & { readonly site_id: SiteId } => {
  const explicit = (row as { readonly site_id?: unknown }).site_id;
  if (explicit !== undefined && explicit !== null) return row as T & { readonly site_id: SiteId };
  if (!siteScoped(site)) return row as T & { readonly site_id: SiteId };
  return { ...row, site_id: site };
};

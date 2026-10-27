// Run O1, lot (d), lane H1: the hub pages that send a fan to their own site. /passport, /settings and /u/{username} of
// fanquiz.org keep no copy of the kpop pages: they answer with a temporary redirect to the same page on the home site of
// the member, through the registry origin (netOrigin: the registry url on production). Pure choices first, then the two
// readers; every reader takes its Supabase client, so the pages stay a few lines long and the tests need no network.
//
//  - Own pages (/passport, /settings): the viewer's own memberships through RLS. Home site = the membership used last
//    (last_seen_at) when any row tells it, else the first one joined; kpop when there is none. Signed out: the hub root.
//  - Another member (/u/{username}): the service role, the public and filter columns only (MEMBER_PUBLIC_COLUMNS,
//    MEMBER_FILTER_COLUMNS), never a private one. Home site = the first visible membership (activated, not banned, shown
//    off its own site). No visible membership, an unknown or banned member, or any read error: null, and the page is a 404.

import { isSiteId, netOrigin, REGISTRY } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { NetOriginEnv } from '@/lib/site/registry';
import type { SiteId } from '@/lib/site/types';

/** The site a member lands on when no membership tells otherwise. */
export const DEFAULT_HOME_SITE: SiteId = 'kpop';

/** Columns read for the viewer's own memberships (RLS: own rows only). */
export const OWN_MEMBERSHIP_COLUMNS = 'site_id, joined_at, last_seen_at, activated_at, banned_at';
/** Columns read for another member: public and filter columns only (types.ts MEMBER_PUBLIC_COLUMNS, MEMBER_FILTER_COLUMNS). */
export const MEMBER_MEMBERSHIP_COLUMNS = 'site_id, joined_at, activated_at, show_elsewhere, banned_at';

export interface MembershipChoiceRow {
  readonly site_id: string;
  readonly joined_at: string | null;
  readonly activated_at: string | null;
  readonly banned_at: string | null;
  /** Own rows only. */
  readonly last_seen_at?: string | null;
  /** Another member's rows only: false hides the stamp off its own site (the hub is never that site). */
  readonly show_elsewhere?: boolean | null;
}

function time(v: string | null | undefined): number {
  const t = v ? Date.parse(v) : NaN;
  return Number.isNaN(t) ? NaN : t;
}

/** The world sites a fan can be sent to, one row each: activated, not banned (and, for another member, shown elsewhere). */
function eligible(rows: readonly MembershipChoiceRow[], forOther: boolean): MembershipChoiceRow[] {
  return rows.filter((r) =>
    isSiteId(r.site_id) && REGISTRY[r.site_id].kind === 'world' && r.activated_at !== null && r.banned_at === null
    && (!forOther || r.show_elsewhere === true));
}

function order(a: MembershipChoiceRow, b: MembershipChoiceRow, key: 'joined_at' | 'last_seen_at', desc: boolean): number {
  const ta = time(a[key]);
  const tb = time(b[key]);
  const d = (Number.isNaN(ta) ? Infinity : ta) - (Number.isNaN(tb) ? Infinity : tb);
  if (d !== 0) return desc ? -d : d;
  return SITE_IDS.indexOf(a.site_id as SiteId) - SITE_IDS.indexOf(b.site_id as SiteId);
}

/** The home site of the viewer: the one used last when a row tells it, else the first joined; kpop when there is none. */
export function pickOwnHomeSite(rows: readonly MembershipChoiceRow[]): SiteId {
  const ok = eligible(rows, false);
  const seen = ok.filter((r) => !Number.isNaN(time(r.last_seen_at)));
  const pool = seen.length > 0 ? [...seen].sort((a, b) => order(a, b, 'last_seen_at', true)) : [...ok].sort((a, b) => order(a, b, 'joined_at', false));
  return (pool[0]?.site_id as SiteId | undefined) ?? DEFAULT_HOME_SITE;
}

/** The home site of another member: the first visible membership, or null when none is visible. */
export function pickMemberHomeSite(rows: readonly MembershipChoiceRow[]): SiteId | null {
  const first = [...eligible(rows, true)].sort((a, b) => order(a, b, 'joined_at', false))[0];
  return first ? (first.site_id as SiteId) : null;
}

/** `path` on `site`, through the registry origin of this deployment. */
export function siteUrl(site: SiteId, path: string, env: NetOriginEnv): string {
  return `${netOrigin(site, env)}${path}`;
}

/** Where /passport and /settings go: the full URL of `path` on the home site, or '/' (the hub root, where sign-in lives) when signed out. */
export async function ownPageTarget(supabase: SupabaseClient, path: string, env: NetOriginEnv): Promise<string> {
  let userId: string | null = null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    userId = error || !user ? null : user.id;
  } catch {
    userId = null;
  }
  if (!userId) return '/';
  let rows: MembershipChoiceRow[] = [];
  try {
    const { data, error } = await supabase.from('world_memberships').select(OWN_MEMBERSHIP_COLUMNS).eq('user_id', userId);
    if (!error) rows = (data ?? []) as unknown as MembershipChoiceRow[];
  } catch {
    rows = [];
  }
  return siteUrl(pickOwnHomeSite(rows), path, env);
}

/** Where /u/{username} goes: the member's page on their home site, or null (404) for an unknown, banned or hidden member. */
export async function memberPageTarget(service: SupabaseClient, username: string, env: NetOriginEnv): Promise<string | null> {
  try {
    const { data: prof, error: profError } = await service.from('profiles').select('id, username, banned_at').eq('username', username).maybeSingle();
    if (profError || !prof) return null;
    const row = prof as unknown as { id: string; username: string; banned_at: string | null };
    if (row.banned_at) return null;
    const { data, error } = await service.from('world_memberships').select(MEMBER_MEMBERSHIP_COLUMNS).eq('user_id', row.id);
    if (error) return null;
    const site = pickMemberHomeSite((data ?? []) as unknown as MembershipChoiceRow[]);
    return site ? siteUrl(site, `/u/${encodeURIComponent(row.username)}`, env) : null;
  } catch {
    return null;
  }
}

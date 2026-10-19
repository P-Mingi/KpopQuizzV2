// Run O1, lot (d), lane H1: the "Your passport" summary of the network page. Read with the server Supabase client as the
// signed-in fan (RLS: their own profile and memberships only). On any error, or when nobody is signed in, the result is
// null and the page shows the signed out view.

import { getLevelInfo } from '@/lib/constants';
import { createServerClient } from '@/lib/supabase/server';
import { isSiteId, REGISTRY } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

import type { SiteId } from '@/lib/site/types';

export interface HubPassportSummary {
  readonly username: string;
  /** The level of the passport: the xp of every site added up, on the shared level curve. */
  readonly level: number;
  /** The world sites the fan joined (activated, not banned), in the network's display order. */
  readonly sites: readonly { readonly id: SiteId; readonly name: string }[];
}

export interface SummaryProfile {
  readonly username: string | null;
  readonly xp: number | null;
}

export interface SummaryMembership {
  readonly site_id: string;
  readonly xp: number | null;
  readonly activated_at: string | null;
  readonly banned_at: string | null;
}

/** Pure part: the profile and the membership rows to the summary. Null when there is no username yet. */
export function buildPassportSummary(profile: SummaryProfile | null, rows: readonly SummaryMembership[]): HubPassportSummary | null {
  const username = profile?.username?.trim();
  if (!profile || !username) return null;
  const joined = rows.filter((r) => isSiteId(r.site_id) && REGISTRY[r.site_id].kind === 'world' && r.activated_at !== null && r.banned_at === null);
  // kpop keeps its xp on profiles (its membership columns are NULL); every other world keeps it on its membership.
  const xp = Math.max(0, profile.xp ?? 0) + joined.reduce((sum, r) => sum + (r.site_id === 'kpop' ? 0 : Math.max(0, r.xp ?? 0)), 0);
  const ids = joined.map((r) => r.site_id as SiteId);
  return {
    username,
    level: getLevelInfo(xp, 'hub').level,
    sites: SITE_IDS.filter((id) => ids.includes(id)).map((id) => ({ id, name: REGISTRY[id].brand.name })),
  };
}

/** The signed-in fan's summary, or null (signed out, no profile, or any error). */
export async function readHubPassport(): Promise<HubPassportSummary | null> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return null;
    const [profile, memberships] = await Promise.all([
      supabase.from('profiles').select('username, xp').eq('id', user.id).maybeSingle(),
      supabase.from('world_memberships').select('site_id, xp, activated_at, banned_at').eq('user_id', user.id),
    ]);
    if (profile.error || memberships.error) return null;
    return buildPassportSummary(profile.data as SummaryProfile | null, (memberships.data ?? []) as SummaryMembership[]);
  } catch {
    return null;
  }
}

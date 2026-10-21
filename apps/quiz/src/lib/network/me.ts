// Run O1, lot (c), lane B6: GET /api/n/me (apis.md 4.1), the same handler on every site (rule 18: the three builds share this
// code). 200 NetMe for the signed-in viewer, built from my_passport() and the viewer's own passport_prefs row (defaults
// when there is none); 401 unauthenticated for a guest. `Cache-Control: private, no-store` on every answer. Called only by
// client islands after hydration. Nothing of another member is read.
import { NextResponse } from 'next/server';

import { getLevelInfo } from '@/lib/constants';
import { isSiteId } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';
import { createServerClient } from '@/lib/supabase/server';

import { NET_LINK_IDS } from './types';

import type { SiteId } from '@/lib/site/types';
import type { MyPassportRow } from '@/lib/passport/types';
import type { NetBridgeId, NetMe, NetSiteChoice, NetSitesMenuMode } from './types';

const HEADERS = { 'Cache-Control': 'private, no-store' } as const;

/** The two reads of the handler, so a test can answer them. */
export interface MeSource {
  userId(): Promise<string | null>;
  passport(): Promise<readonly MyPassportRow[] | null>;
  prefs(): Promise<Record<string, unknown> | null>;
}

async function defaultSource(): Promise<MeSource> {
  const supabase = await createServerClient();
  return {
    async userId() {
      const { data } = await supabase.auth.getUser();
      return data.user?.id ?? null;
    },
    async passport() {
      const { data, error } = await supabase.rpc('my_passport');
      return error ? null : ((data ?? []) as unknown as readonly MyPassportRow[]);
    },
    async prefs() {
      const { data } = await supabase.from('passport_prefs')
        .select('worlds, crossover_suggestions, dismissed, welcomed_sites, your_sites_menu')
        .maybeSingle();
      return (data ?? null) as Record<string, unknown> | null;
    },
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const MODES: readonly NetSitesMenuMode[] = ['auto', 'show', 'hide'];

/** NetMe from the rows. Unknown keys and values are dropped, never passed on. */
export function buildNetMe(rows: readonly MyPassportRow[], prefs: Record<string, unknown> | null): NetMe {
  const sites = SITE_IDS.flatMap((id) => {
    const r = rows.find((x) => x.site_id === id);
    if (!r) return [];
    return [{
      id,
      level: getLevelInfo(Math.max(0, Math.trunc(Number(r.xp) || 0)), id).level,
      plays: Math.max(0, Math.trunc(Number(r.plays) || 0)),
      joinedAt: String(r.joined_at),
      activated: r.activated_at !== null && r.activated_at !== undefined,
    }];
  });
  const worlds: Partial<Record<SiteId, NetSiteChoice>> = {};
  if (prefs && isObject(prefs.worlds)) {
    for (const [k, v] of Object.entries(prefs.worlds)) if (isSiteId(k) && (v === 'yes' || v === 'no')) worlds[k] = v;
  }
  const dismissed: Partial<Record<NetBridgeId, string>> = {};
  if (prefs && isObject(prefs.dismissed)) {
    for (const [k, v] of Object.entries(prefs.dismissed)) {
      if ((NET_LINK_IDS as readonly string[]).includes(k) && typeof v === 'string') dismissed[k as NetBridgeId] = v;
    }
  }
  const welcomed = prefs && Array.isArray(prefs.welcomed_sites) ? prefs.welcomed_sites.filter(isSiteId) : [];
  const mode = prefs?.your_sites_menu;
  return {
    sites,
    worlds,
    suggestions: prefs?.crossover_suggestions === false ? false : true,
    dismissed,
    welcomed,
    yourSitesMenu: MODES.includes(mode as NetSitesMenuMode) ? (mode as NetSitesMenuMode) : 'auto',
  };
}

export async function handleMe(source?: MeSource): Promise<NextResponse> {
  try {
    const s = source ?? await defaultSource();
    const user = await s.userId();
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401, headers: HEADERS });
    const rows = await s.passport();
    if (rows === null) return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: HEADERS });
    return NextResponse.json(buildNetMe(rows, await s.prefs()), { headers: HEADERS });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers: HEADERS });
  }
}

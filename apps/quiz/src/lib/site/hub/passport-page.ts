// The common Bunnyverse passport (bunnyverse.org/passport): what the signed-in fan has on every site, from my_passport() (their own
// rows through RLS): the XP and the level of each site on that site's own curve, and the total on the shared curve. Pure part here;
// the reader takes its Supabase client so the page stays short and the tests need no network.
import { getLevelInfo } from '@/lib/constants';
import { bridgeHref } from '@/lib/network/links';
import { fillHub } from '@/lib/site/hub/copy';
import { isSiteId, REGISTRY } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { MyPassportRow } from '@/lib/passport/types';
import type { SiteId } from '@/lib/site/types';

export interface PassportSiteRow {
  readonly id: SiteId;
  readonly name: string;
  readonly xp: number;
  readonly level: number;
  readonly levelName: string;
  readonly plays: number;
  readonly streak: number;
  /** The signed-in jump to the fan's own passport page on that site. */
  readonly href: string;
}

export interface CommonPassport {
  readonly username: string | null;
  readonly totalXp: number;
  readonly level: number;
  readonly levelName: string;
  readonly sites: readonly PassportSiteRow[];
}

const num = (v: unknown): number => Math.max(0, Math.trunc(Number(v) || 0));

/** One row per world site the fan joined (activated), in the network's display order; the total is every site's XP added up. */
export function buildCommonPassport(rows: readonly MyPassportRow[], username: string | null): CommonPassport {
  const sites = SITE_IDS.flatMap((id): PassportSiteRow[] => {
    const r = rows.find((x) => x.site_id === id);
    if (!r || !isSiteId(id) || REGISTRY[id].kind !== 'world' || r.activated_at === null || r.activated_at === undefined) return [];
    const xp = num(r.xp);
    const lv = getLevelInfo(xp, id);
    return [{ id, name: REGISTRY[id].brand.name, xp, level: lv.level, levelName: lv.name, plays: num(r.plays), streak: num(r.daily_streak), href: bridgeHref(id, '/me', 'pp') }];
  });
  const totalXp = sites.reduce((sum, s) => sum + s.xp, 0);
  const total = getLevelInfo(totalXp, 'hub');
  return { username, totalXp, level: total.level, levelName: total.name, sites };
}

/** The signed-in fan's passport, or null (signed out, no stamp, or any error). */
export async function readCommonPassport(supabase: SupabaseClient): Promise<CommonPassport | null> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return null;
    const [rows, profile] = await Promise.all([
      supabase.rpc('my_passport'),
      supabase.from('profiles').select('username').eq('id', user.id).maybeSingle(),
    ]);
    if (rows.error) return null;
    const passport = buildCommonPassport((rows.data ?? []) as unknown as readonly MyPassportRow[], (profile.data as { username?: string | null } | null)?.username ?? null);
    return passport.sites.length > 0 ? passport : null;
  } catch {
    return null;
  }
}

/** The words of the page (the hub's own strings for it; no site name or number is written here: they are filled in). */
const WORDS = {
  title: 'Your passport',
  lede: 'One passport for every site of {network}: the XP and the level you earned on each, and the total.',
  total: 'Level {level} · {name} · {xp} XP in all',
  site: 'Lv {level} · {name}',
  stats: '{xp} XP · {plays} plays · {streak} day streak',
  open: 'Open on {name}',
} as const;

export function passportWords(key: keyof typeof WORDS, vars: Readonly<Record<string, string | number>> = {}): string {
  return fillHub(WORDS[key], vars);
}

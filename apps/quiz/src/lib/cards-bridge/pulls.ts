// Bunnyverse Cards, lane BRIDGES: the live feed of Holo and above pulls on the community page of kpopquiz.org (the rail of /community, beside
// "Happening now"). Source: the function cards_pulls_recent (docs/pending-migrations/cards/122-pulls-feed.sql), which already keeps only the fans
// with a public stamp (world_memberships.show_elsewhere, the rule of "Top fans this week"), not banned, with a nickname, and never an
// editorial account. This file checks each row again (visiblePulls) and drops the Team accounts with the shared source of truth (getTeamIds):
// a row that fails any check is dropped, a failed read is no block. Real data only: the floor below hides the panel, nothing is padded.
// NET_CARDS_BRIDGES off: nothing is read, imported or drawn (the shape of lib/cards-bridge/home.ts).
import { unstable_cache } from 'next/cache';

import { getTeamIds } from '@/lib/editorial/accounts';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { RARITY_LABEL } from '@/lib/cards/rules';

import { cardsBridgesKpopOn } from './flags';

import type { Rarity } from '@/lib/cards/types';

/** Rarities of the feed: Holo, Era, Gold, Full Art. */
export const FEED_RARITIES: readonly string[] = ['R', 'SR', 'UR', 'L'];
/** The panel shows from this many pulls on, so a quiet week is no block. */
export const PULLS_MIN = 3;
export const PULLS_LIMIT = 8;

export interface Pull {
  readonly handle: string;
  readonly num: string;
  readonly rarity: Rarity;
  readonly label: string;
  readonly name: string;
  readonly group: string | null;
  readonly at: string;
}

const NUM = /^BV1-[0-9]{4,}$/;

/** The rows the function gave, checked once more: Holo and above only, a nickname, a card number, a date, no Team account. user_id never leaves. */
export function visiblePulls(raw: unknown, team: ReadonlySet<string>, limit: number = PULLS_LIMIT): Pull[] {
  if (!Array.isArray(raw)) return [];
  const out: Pull[] = [];
  for (const r of raw as Array<Record<string, unknown>>) {
    if (out.length >= limit) break;
    const user = typeof r?.user_id === 'string' ? r.user_id : '';
    const handle = typeof r?.handle === 'string' ? r.handle.trim() : '';
    const rarity = typeof r?.rarity === 'string' ? r.rarity : '';
    const num = typeof r?.num === 'string' ? r.num : '';
    const name = typeof r?.name === 'string' ? r.name.trim() : '';
    const at = typeof r?.at === 'string' ? r.at : '';
    if (!user || team.has(user)) continue;
    if (!handle || !name || !FEED_RARITIES.includes(rarity) || !NUM.test(num) || !Number.isFinite(Date.parse(at))) continue;
    const group = typeof r.group === 'string' && r.group.trim() ? r.group.trim() : null;
    out.push({ handle, num, rarity: rarity as Rarity, label: RARITY_LABEL[rarity as Rarity], name, group, at });
  }
  return out;
}

async function readPulls(): Promise<Pull[]> {
  const db = createServiceRoleClient();
  const { data, error } = await db.rpc('cards_pulls_recent', { p_limit: 40 });
  if (error) throw new Error(`cards_pulls_recent: ${error.message}`);
  // Fail closed: if the Team list cannot be read the feed does not show.
  const team = await getTeamIds();
  return visiblePulls(data, team);
}

const cachedPulls = unstable_cache(readPulls, ['cards-bridge:pulls:v1'], { revalidate: 60, tags: ['community'] });

/** The panel of the community rail, or null: switch off, too few pulls, any failure. */
export async function loadCardsPulls(now: number = Date.now()): Promise<React.ReactElement | null> {
  if (!cardsBridgesKpopOn()) return null;
  try {
    const pulls = await cachedPulls();
    if (pulls.length < PULLS_MIN) return null;
    const { pullsFeed } = await import('@/components/cards-bridge/pulls-feed');
    return pullsFeed(pulls, now);
  } catch (err) {
    console.error('[community] Cards pulls hidden:', (err as Error)?.message ?? err);
    return null;
  }
}

// Surprise me on the kpopquiz.org home (owner, 2026-10-31, CR-015): the hub's pool rules for K-pop (getKpopSurprisePool: the published,
// listable K-pop quizzes past the 1000 row cap, the 100 best by quality, cached one hour; it works with or without quizzes.site_id), as the
// picks of the hub's component. Each pick links to the quiz's own canonical page; there is no random URL, the draw runs in the browser on a click.

import { isNextInternalError } from '@/lib/error-handling';
import { getKpopSurprisePool } from '@/lib/site/hub/data/surprise-kpop';
import { pathOf } from '@/lib/site/hub/home-map';
import { generalKpopFallbackCover } from '@/lib/ux-v1/a0/general-kpop-cover';
import { groupPhotoUrl } from '@/lib/ux-v1/a0/group-photos';

import type { SurprisePick } from '@/components/hub/home/home-surprise';
import type { HubSurpriseCard } from '@/lib/site/hub/data/types';

/**
 * One quiz of the pool as a pick of the component: its page on this site, "Random pick from <group>". The picture of its group goes with
 * the pick (owner, 2026-11-04: the tile shows it in place of the initials): the one the site shows everywhere, groupPhotoUrl(slug) (the
 * photos of public/idols, else the Commons photo in Storage), and for General K-pop, which has no group photo, its fallback cover. A group
 * with neither gives a pick with no photo key at all: the tile keeps the initials. groups.logo_url is not used: it is broken for many groups.
 */
export function toKpopPick(c: HubSurpriseCard): SurprisePick {
  const photo = groupPhotoUrl(c.groupSlug) ?? generalKpopFallbackCover(c.groupSlug);
  return { id: c.id, tile: c.tile, title: c.title, href: pathOf(c.href, 'kpop'), site: 'kpop', pickLabel: `Random pick from ${c.group}`, ...(photo ? { photo } : {}) };
}

/** The picks of kpopquiz.org, best first; [] when it has none or the read fails (the block then leaves the page). K-pop quizzes only. */
export async function loadKpopSurprise(): Promise<SurprisePick[]> {
  try {
    const pool = await getKpopSurprisePool();
    return (pool ?? []).filter((c) => c.site === 'kpop').map(toKpopPick);
  } catch (err) {
    if (isNextInternalError(err)) throw err;
    console.error('[kpop home] surprise:', err instanceof Error ? err.message : err);
    return [];
  }
}

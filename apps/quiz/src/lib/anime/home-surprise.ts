// Run O1, lane O1: the pool of Surprise me on the OtakuQuiz home (owner, 2026-10-29 and 2026-10-30; TWINS row 1, code A8). The hub's pool
// rules on the anime site only: lib/site/hub/data/surprise.ts getSiteSurprisePool (the published, listable quizzes of the anime site, read
// through forSite with the site named and past the 1000 row cap, its 100 best by quality, cached one hour), as the picks of the hub's
// component (components/hub/home/home-surprise.tsx). Each link is the quiz page on this site with its base path (/anime/q/<slug>): the
// component draws a plain <a href>, which Next does not prefix.

import { COPY } from '@/copy/anime/o1';
import { isNextInternalError } from '@/lib/error-handling';
import { prefixBasePath } from '@/lib/site/base-path';
import { getSiteSurprisePool } from '@/lib/site/hub/data/surprise';
import { pathOf } from '@/lib/site/hub/home-map';

import { fill } from './copy';

import type { SurprisePick } from '@/components/hub/home/home-surprise';
import type { HubSurpriseCard } from '@/lib/site/hub/data/types';

/** One quiz of the pool as a pick of the component: its own page on this site, "Random pick from <series>". */
export function toAnimePick(c: HubSurpriseCard, basePath: string): SurprisePick {
  return {
    id: c.id,
    tile: c.tile,
    title: c.title,
    href: prefixBasePath(basePath, pathOf(c.href, 'anime')),
    site: 'anime',
    pickLabel: fill(COPY['home.surprise.pick'], { name: c.group }),
  };
}

/**
 * The picks of the anime site, best first; [] when it has none or the read fails (the block then leaves the page). Only anime quizzes:
 * the pool is read for the anime site, and a card of any other site is left out here too.
 */
export async function loadAnimeSurprise(basePath: string): Promise<SurprisePick[]> {
  try {
    const pool = await getSiteSurprisePool('anime');
    return (pool ?? []).filter((c) => c.site === 'anime').map((c) => toAnimePick(c, basePath));
  } catch (err) {
    if (isNextInternalError(err)) throw err;
    console.error('[anime home] surprise:', err instanceof Error ? err.message : err);
    return [];
  }
}

// Run O1, lot H2c: the data of "Top fans this week" (public stamps only, Team accounts left out), from getTopFans.
// Home v3 (2026-10-29): one board per site, the XP of the week on that site and the level of that site (getTopFans bySite). A site with no
// public fan has an empty board and its tab is left out; with both empty the board is left out and the passport takes the column.

import { getTopFans } from './data';
import { safeBlock } from './home-safe';

import type { HubTopFan } from './data';
import type { HomeFan, HomeFans } from './home-types';

const NONE: HomeFans = { kpop: [], anime: [] };

function toFan(f: HubTopFan): HomeFan {
  return { handle: f.handle, level: f.level };
}

export async function loadHomeTopFans(): Promise<HomeFans> {
  return safeBlock('top-fans', async () => {
    const top = await getTopFans();
    // A board cached before the boards per site existed has none: nothing is shown rather than the old mixed list under a site's tab.
    if (!top?.bySite) return NONE;
    return { kpop: top.bySite.kpop.map(toFan), anime: top.bySite.anime.map(toFan) };
  }, NONE);
}

// Run O1, lot H2c: the data of "Top fans this week" (the XP of the week on both sites; public stamps only, Team accounts left out),
// from getTopFans. An empty board is an empty list: the card disappears and the passport takes the row.

import { getTopFans } from './data';
import { safeBlock } from './home-safe';

import type { HomeFan } from './home-types';

export async function loadHomeTopFans(): Promise<readonly HomeFan[]> {
  return safeBlock('top-fans', async () => {
    const top = await getTopFans();
    return top ? top.fans.map((f) => ({ handle: f.handle, level: f.level, onKpop: f.kpop, onAnime: f.anime })) : [];
  }, []);
}

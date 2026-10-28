// Run O1, lot H2c: the pool of Surprise me: the 100 best quizzes of each site (getSurprise), and the quizzes the signed-in fan already
// played, which the draw leaves out. The draw itself (pickSurprise) runs in the browser. The fan's id is checked by the caller.

import { getSurprise } from './data';
import { pathOf } from './home-map';
import { safeBlock } from './home-safe';

import type { HomeSurprise } from './home-types';

export async function loadHomeSurprise(userId: string | null): Promise<HomeSurprise> {
  return safeBlock('surprise', async () => {
    const surprise = await getSurprise({ userId });
    if (!surprise) return { pool: [], playedIds: [] };
    return {
      pool: surprise.pool.map((c) => ({ id: c.id, site: c.site, tile: c.tile, title: c.title, path: pathOf(c.href, c.site) })),
      playedIds: surprise.playedIds,
    };
  }, { pool: [], playedIds: [] });
}

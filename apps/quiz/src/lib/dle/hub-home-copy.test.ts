// Run O1, lane SEO (2026-11-05): the home of the hub says only what has a page. The table "What you guess" is in the server HTML of an indexable page the day the Burrow opens (components/hub/home/home-seo.tsx);
// a row must not name a mode of a game that has no page yet (lib/dle/games.ts: the group and the song of Kpopdle are planned, not built).
import { describe, expect, it } from 'vitest';

import { ht } from '@/lib/site/hub/copy';

import { dleGame } from './games';

describe('the home of the hub says only what has a page', () => {
  it('the Kpopdle row of the table names the modes that are built, not the group or the song while they are not', () => {
    const row = ht('hp.seo.kpopdle').toLowerCase();
    expect(dleGame('kpopdle-idol').built).toBe(true);
    expect(row).toContain('idol');
    for (const [id, word] of [['kpopdle-group', 'group'], ['kpopdle-song', 'song']] as const) {
      if (!dleGame(id).built) expect(row, id).not.toContain(word);
    }
    expect(row).not.toMatch(/[\u2013\u2014]/);
  });
});

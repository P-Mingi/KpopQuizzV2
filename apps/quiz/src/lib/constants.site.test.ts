// Run O1, lot (c) part 2 (B3): getLevelInfo(xp, site?). The curve is the same on every site; only the title comes
// from the site's ladder; kpop (and no site at all) is today's result.
import { describe, expect, it } from 'vitest';

import { getLevelInfo, levelForXp } from './constants';
import { levelTitlesFor } from './level-titles';

const XPS = [-5, 0, 1, 99, 400, 3040, 19670, 56620, 56621, 151820, 389820, 1_000_000];

describe('getLevelInfo(xp, site)', () => {
  it('without a site, or on kpop, the result is the same object content for every xp', () => {
    for (const xp of XPS) {
      expect(getLevelInfo(xp, 'kpop')).toEqual(getLevelInfo(xp));
      expect(getLevelInfo(xp, undefined)).toEqual(getLevelInfo(xp));
    }
    expect(getLevelInfo(0)).toMatchObject({ level: 1, name: 'New Fan' });
    expect(getLevelInfo(56620)).toMatchObject({ level: 30, name: 'Legend' });
  });

  it('on anime the level, the progress and the thresholds are the same, only the name is anime ladder', () => {
    for (const xp of XPS) {
      const kpop = getLevelInfo(xp);
      const anime = getLevelInfo(xp, 'anime');
      expect({ ...anime, name: '' }).toEqual({ ...kpop, name: '' });
      const ladder = levelTitlesFor('anime');
      const at = Object.keys(ladder).map(Number).filter((t) => t <= anime.level).sort((a, b) => a - b).pop()!;
      expect(anime.name).toBe(ladder[at]!.en);
    }
    expect(getLevelInfo(0, 'anime').name).toBe('New Viewer');
    expect(getLevelInfo(3040, 'anime')).toMatchObject({ level: 10, name: 'Otaku' });
    expect(getLevelInfo(56620, 'anime').name).toBe('Legend');
  });

  it('on hub the one-title ladder gives "Member" at every level', () => {
    for (const xp of XPS) {
      expect(getLevelInfo(xp, 'hub').name).toBe('Member');
      expect(getLevelInfo(xp, 'hub').level).toBe(levelForXp(Math.max(0, xp)));
    }
  });
});

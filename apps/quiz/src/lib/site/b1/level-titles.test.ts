// Run O1, lane B1 (rpcs.md 3): levelTitlesFor reads the registry; kpop's ladder is today's LEVEL_TITLES.

import { describe, expect, it } from 'vitest';

import { LEVEL_TITLES, getTitleForLevel, levelTitlesFor } from '@/lib/level-titles';

import { REGISTRY } from '../registry';

describe('levelTitlesFor', () => {
  it('kpop: key for key the ladder getTitleForLevel reads', () => {
    expect(levelTitlesFor('kpop')).toEqual(LEVEL_TITLES);
    expect(getTitleForLevel(1).en).toBe('New Fan');
    expect(getTitleForLevel(30).en).toBe('Legend');
  });

  it('every site is the registry entry, on the same seven thresholds for the two worlds', () => {
    for (const id of ['kpop', 'anime', 'hub'] as const) expect(levelTitlesFor(id)).toBe(REGISTRY[id].levelTitles);
    const thresholds = (id: 'kpop' | 'anime'): string[] => Object.keys(levelTitlesFor(id));
    expect(thresholds('anime')).toEqual(thresholds('kpop'));
    expect(levelTitlesFor('anime')[10]?.en).toBe('Otaku');
  });
});

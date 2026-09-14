import { describe, it, expect } from 'vitest';

import {
  HUB_FILTERS, HUB_FILTER_LABEL, HUB_CARD_TAGS, cardMatchesFilter, cardsForFilter,
} from './hub-filters';

describe('games-hub filter tag map', () => {
  it('exposes the five filters with labels', () => {
    expect([...HUB_FILTERS]).toEqual(['all', 'solo', 'timed', 'versus', 'vote']);
    for (const f of HUB_FILTERS) expect(HUB_FILTER_LABEL[f]).toBeTruthy();
  });

  it('has exactly the eight hub cards', () => {
    expect(Object.keys(HUB_CARD_TAGS)).toHaveLength(8);
  });

  it('"all" reveals every card', () => {
    expect(cardsForFilter('all')).toHaveLength(8);
    for (const tag of Object.values(HUB_CARD_TAGS)) {
      expect(cardMatchesFilter(tag, 'all')).toBe(true);
    }
  });

  it('each filter reveals exactly its set (matching the artboard)', () => {
    expect(cardsForFilter('solo').sort()).toEqual(
      ['kpop-idle', 'match-up', 'name-them-all', 'sort-it', 'tier-lists', 'which-member'].sort(),
    );
    expect(cardsForFilter('timed').sort()).toEqual(['match-up', 'name-them-all', 'sort-it'].sort());
    expect(cardsForFilter('versus')).toEqual(['duel']);
    expect(cardsForFilter('vote')).toEqual(['this-or-that']);
  });

  it('matches only on whole whitespace-delimited tokens (mirrors the CSS ~= selector)', () => {
    expect(cardMatchesFilter('solo timed', 'timed')).toBe(true);
    expect(cardMatchesFilter('solo timed', 'solo')).toBe(true);
    expect(cardMatchesFilter('versus', 'vote')).toBe(false);
    // a substring is not a token: "vote" must not match inside another word
    expect(cardMatchesFilter('votez', 'vote')).toBe(false);
  });

  it('every non-all filter reveals at least one card (no dead chip)', () => {
    for (const f of HUB_FILTERS) {
      if (f === 'all') continue;
      expect(cardsForFilter(f).length).toBeGreaterThan(0);
    }
  });
});

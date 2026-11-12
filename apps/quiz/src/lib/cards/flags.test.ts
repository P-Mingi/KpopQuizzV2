import { describe, expect, it } from 'vitest';

import { O1_FLAGS } from '@/lib/site/registry';

import { adsPerDay, bonusPerDay, cardsAdsOn, cardsAdsPublicOn, cardsBridgesOn, cardsOpen } from './flags';

describe('the Cards switches', () => {
  it('are registered, off by default, and the public one carries the prefix', () => {
    const f = Object.fromEntries(O1_FLAGS.map((x) => [x.name, x]));
    for (const n of ['NET_CARDS', 'NET_CARDS_BRIDGES', 'NET_CARDS_ADS', 'NEXT_PUBLIC_NET_CARDS_ADS']) expect(f[n], n).toBeDefined();
    expect(f.NEXT_PUBLIC_NET_CARDS_ADS?.scope).toBe('public');
    expect(f.NET_CARDS?.scope).toBe('server');
  });
  it('everything is off with no environment, on every site', () => {
    for (const site of ['kpop', 'anime', 'hub'] as const) {
      const ctx = { site, env: {} };
      expect(cardsOpen(ctx)).toBe(false);
      expect(cardsBridgesOn(ctx)).toBe(false);
      expect(cardsAdsOn(ctx)).toBe(false);
      expect(cardsAdsPublicOn(ctx)).toBe(false);
    }
  });
  it('NET_CARDS opens the hub only (1 or true)', () => {
    expect(cardsOpen({ site: 'hub', env: { NET_CARDS: '1' } })).toBe(true);
    expect(cardsOpen({ site: 'hub', env: { NET_CARDS: 'true' } })).toBe(true);
    expect(cardsOpen({ site: 'hub', env: { NET_CARDS: '0' } })).toBe(false);
    expect(cardsOpen({ site: 'hub', env: { NET_CARDS: 'yes' } })).toBe(false);
    expect(cardsOpen({ site: 'kpop', env: { NET_CARDS: '1' } })).toBe(false);
    expect(cardsOpen({ site: 'anime', env: { NET_CARDS: '1' } })).toBe(false);
  });
  it('the bridges need NET_CARDS and NET_CARDS_BRIDGES, on kpop or hub', () => {
    const env = { NET_CARDS: '1', NET_CARDS_BRIDGES: '1' };
    expect(cardsBridgesOn({ site: 'kpop', env })).toBe(true);
    expect(cardsBridgesOn({ site: 'hub', env })).toBe(true);
    expect(cardsBridgesOn({ site: 'anime', env })).toBe(false);
    expect(cardsBridgesOn({ site: 'kpop', env: { NET_CARDS_BRIDGES: '1' } })).toBe(false);
    expect(cardsBridgesOn({ site: 'kpop', env: { NET_CARDS: '1' } })).toBe(false);
  });
  it('ads: hub only, never on kpop, and 0 a day turns them off', () => {
    const env = { NET_CARDS: '1', NET_CARDS_ADS: '1', NEXT_PUBLIC_NET_CARDS_ADS: '1' };
    expect(cardsAdsOn({ site: 'hub', env })).toBe(true);
    expect(cardsAdsPublicOn({ site: 'hub', env })).toBe(true);
    expect(cardsAdsOn({ site: 'kpop', env })).toBe(false);
    expect(cardsAdsPublicOn({ site: 'kpop', env })).toBe(false);
    expect(cardsAdsOn({ site: 'hub', env: { ...env, CARDS_ADS_PER_DAY: '0' } })).toBe(false);
    expect(cardsAdsOn({ site: 'hub', env: { NET_CARDS_ADS: '1' } })).toBe(false);
  });
  it('the settings default to 10 and 3 and ignore garbage', () => {
    expect(adsPerDay({ env: {} })).toBe(10);
    expect(bonusPerDay({ env: {} })).toBe(3);
    expect(adsPerDay({ env: { CARDS_ADS_PER_DAY: '4' } })).toBe(4);
    expect(bonusPerDay({ env: { CARDS_BONUS_PER_DAY: '5' } })).toBe(5);
    expect(adsPerDay({ env: { CARDS_ADS_PER_DAY: 'abc' } })).toBe(10);
    expect(adsPerDay({ env: { CARDS_ADS_PER_DAY: '-2' } })).toBe(10);
    expect(bonusPerDay({ env: { CARDS_BONUS_PER_DAY: '' } })).toBe(3);
    expect(bonusPerDay({ env: { CARDS_BONUS_PER_DAY: '99999' } })).toBe(3);
    expect(bonusPerDay({ env: { CARDS_BONUS_PER_DAY: '500' } })).toBe(20);
  });
});

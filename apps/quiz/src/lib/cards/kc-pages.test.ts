// KpopCards screens: the pure logic of the pages: addresses and the old /cards redirects, the pack looks, the idol finder, the week of the lobby box, the legacy adapter over the contract's mock.
import { describe, expect, it, vi } from 'vitest';

import { createMockApi, fixtureWorld } from '../kpopcards/mock-api';
import { fixtureCatalog } from './ui-fixture';
import { legacyApi } from '../kpopcards/legacy';
import { setKcApi } from '../kpopcards/registry';

import { CARDS_PATHS } from '../site/registry';
import { KC_ROUTE_PATTERNS, kcPath, oldCardsTarget } from './kc-paths';
import { findIdol, slugOf } from './kc-idol';
import { specOf } from './kc-open';
import { GOLD_C, THEMES, packLook } from './kc-themes';
import { whenLabel } from './kc-time';
import { weekOf } from './kc-views';

describe('addresses', () => {
  it('every page is under /kpopcards and the route map holds them and the old tree', () => {
    expect(kcPath.open('girls', 5)).toBe('/kpopcards/open/girls?packs=5');
    expect(kcPath.player('dalgom_daisy')).toBe('/kpopcards/u/dalgom_daisy');
    expect([...CARDS_PATHS]).toEqual([...KC_ROUTE_PATTERNS]);
    for (const p of ['/kpopcards', '/kpopcards/missions', '/kpopcards/ranking', '/kpopcards/u/{nickname}', '/kpopcards/odds', '/kpopcards/idol/{name}', '/cards/**']) expect(KC_ROUTE_PATTERNS).toContain(p);
  });
  it('an old /cards path goes to its new address, an unknown one to the lobby', () => {
    expect(oldCardsTarget([])).toBe('/kpopcards');
    expect(oldCardsTarget(['binder'])).toBe('/kpopcards/collection');
    expect(oldCardsTarget(['help'])).toBe('/kpopcards/help');
    expect(oldCardsTarget(['report'])).toBe('/kpopcards/report');
    expect(oldCardsTarget(['c', 'BV1-0042'])).toBe('/kpopcards/c/BV1-0042');
    expect(oldCardsTarget(['nope', 'x'])).toBe('/kpopcards');
  });
  it('the opening pages read their spec from the address', () => {
    expect(specOf({ segments: ['all'] })).toEqual({ kind: 'theme', theme: 'all', packs: 1 });
    expect(specOf({ segments: ['boys'], packs: '5' })).toEqual({ kind: 'theme', theme: 'boys', packs: 5 });
    expect(specOf({ segments: ['solo'], from: 'shards' })).toEqual({ kind: 'theme', theme: 'solo', packs: 1, from: 'shards' });
    expect(specOf({ segments: ['all'], demo: '1' })).toEqual({ kind: 'demo' });
    expect(specOf({ segments: ['daily'] })).toEqual({ kind: 'daily' });
    expect(specOf({ segments: ['focus', 'twice'] })).toBeNull();
    expect(specOf({ segments: ['nope'] })).toBeNull();
  });
});

describe('the pack looks (v6 values)', () => {
  it('four themes with the prototype colours, a golden pack, the pack of the day', () => {
    expect(THEMES.map((t) => t.title)).toEqual(['ALL IDOLS', 'GIRL GROUPS', 'BOY GROUPS', 'SOLOISTS']);
    expect(packLook({ theme: 'boys' }).c).toEqual(['#3D7BFF', '#7C5CFF', '#36D1C4']);
    expect(packLook({ theme: 'all', golden: true })).toMatchObject({ title: 'GOLDEN PACK', c: GOLD_C, golden: true });
    expect(packLook({ daily: { name: 'Twice', a: '#fff', c: '#000' } })).toMatchObject({ title: 'TWICE', path: 'daily' });
  });
});

describe('small helpers', () => {
  it('whenLabel: Today, Yesterday, then a date (Paris time)', () => {
    const now = Date.UTC(2026, 10, 13, 12, 0);
    expect(whenLabel(Date.UTC(2026, 10, 13, 9, 5), now)).toBe('Today, 10:05');
    expect(whenLabel(Date.UTC(2026, 10, 12, 9, 5), now)).toBe('Yesterday, 10:05');
    expect(whenLabel(Date.UTC(2026, 10, 4, 17, 10), now)).toBe('4 November 2026, 18:10');
  });
  it('the week of the box: days left, or tonight', () => {
    const w = { endsAt: '2026-11-16T00:00:00Z', items: [{ key: 'packs', label: 'Open 20 packs', value: 12, goal: 20 }], done: false, claimed: false, rewardPacks: 2, rewardShards: 25 };
    expect(weekOf(w, Date.parse('2026-11-13T12:00:00Z')).leftLabel).toBe('3 days left');
    expect(weekOf(w, Date.parse('2026-11-15T20:00:00Z')).leftLabel).toBe('Starts over tonight');
    expect(weekOf(w, 0).rewardLabel).toBe('+2 packs and 25 shards');
  });
  it('the idol of an address: by the slug of the stage name, with its editions', () => {
    expect(slugOf('Rosé')).toBe('rose');
    const cards = [
      { n: 1, entity: 'idol:a', kind: 'idol', rarity: 'U', name: 'Jennie', group: 'BLACKPINK' },
      { n: 2, entity: 'idol:a', kind: 'idol', rarity: 'C', name: 'Jennie', group: 'BLACKPINK' },
    ] as never;
    const i = findIdol({ cards }, 'jennie')!;
    expect(i.cards.map((c) => c.n)).toEqual([2, 1]);
    expect(findIdol({ cards }, 'nobody')).toBeNull();
  });
});

describe('the legacy interface over the contract (the seeded mock)', () => {
  it('state, one pack, favorite and recycle work through the adapter', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const mock = createMockApi({ world: fixtureWorld(fixtureCatalog()), example: true, nickname: 'mingi' });
    setKcApi(mock);
    const api = legacyApi(mock);
    const st = await api.state();
    expect(st && !('error' in st) && st.cap).toBe(5);
    const r = await api.open('stock');
    expect('error' in r).toBe(false);
    if (!('error' in r)) expect(r.pack.cards).toHaveLength(5);
    expect(await api.favorite(1, true)).toBeTypeOf('boolean');
    setKcApi(null);
  });
});

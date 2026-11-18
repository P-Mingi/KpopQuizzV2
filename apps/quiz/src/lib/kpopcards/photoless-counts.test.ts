// Bunnyverse Cards, lot LAUNCH-PREP lane PHOTOCHECK: owner decision 2026-11-18. A card the player owns that lost its photo (photo_id null, out of packs) keeps
// counting everywhere it counted: the number of cards, the level, the progress of the collection and of its group, the sets, the badges, the ranking. The same
// player reads the same numbers before and after the removal; a progress never goes over 100 %; a card out of packs that nobody owns counts for nobody.
import { describe, expect, it } from 'vitest';

import { buildFixtureCatalog } from '@/lib/cards/ui-fixture';
import { openResponseFrom } from './server';
import { fixtureWorld } from './mock-api';
import { almostState, badgesOf, collectionState, countWorld, emptyPlayer, lobbyState, missionSets, pctOf, playerPage, rankRows, totalOf } from './model';
import { levelOf } from './contract';

import type { PlayerData, World } from './model';

const NOW = Date.parse('2026-11-18T12:00:00Z');
const row = () => ({ copies: 1, fav: false, locked: false, seen: true, firstAt: NOW, lastAt: NOW, firstPackNo: null }) as unknown as PlayerData['owned'] extends Map<number, infer R> ? R : never;

function worldOf(): World {
  return fixtureWorld(buildFixtureCatalog());
}
/** What 119 (or any later removal) does: the cards leave `cards` and are listed apart, as the catalog payload lists them. */
function without(w: World, ns: readonly number[]): World {
  const gone = w.cards.filter((c) => ns.includes(c.n));
  return { ...w, cards: w.cards.filter((c) => !ns.includes(c.n)), retired: [...(w.retired ?? []), ...gone] };
}
function playerOf(ns: readonly number[]): PlayerData {
  const p = emptyPlayer(NOW, 'ada');
  for (const n of ns) p.owned.set(n, row());
  return p;
}
/** Everything a count reads, for one player in one world. */
function counts(w: World, p: PlayerData) {
  const lobby = lobbyState({ w, p, now: NOW, odds: false });
  const col = collectionState(w, p, { per: 120 });
  return {
    level: lobby.level,
    totals: col.totals,
    groups: col.groups,
    sets: missionSets(w, p),
    almost: almostState(w, p, 50),
    badges: badgesOf(w, new Set(p.owned.keys()), p.createdAt),
  };
}

describe('an owned card whose photo left counts exactly as before', () => {
  const w0 = worldOf();
  const groupCards = (g: World) => g.cards.filter((c) => c.kind === 'idol' || c.kind === 'group');
  // the player holds most of the cards of the first group of the catalog (so its set is open) and a Gold card
  const idols = groupCards(w0);
  const mine = [...new Set([...idols.slice(0, 14).map((c) => c.n), ...w0.cards.filter((c) => c.rarity === 'UR').slice(0, 1).map((c) => c.n)])];
  const gone = [mine[1]!, mine[5]!, mine[mine.length - 1]!];

  it('the number of cards, the level, the collection and group progress, the sets, the almost list and the badges do not move', () => {
    const p = playerOf(mine);
    const before = counts(w0, p);
    const w1 = without(w0, gone);
    const after = counts(w1, p);
    expect(before.level.cards).toBe(mine.length);
    expect(after.level).toEqual(before.level);
    expect(after.totals).toEqual(before.totals);
    expect(after.groups).toEqual(before.groups);
    expect(after.sets).toEqual(before.sets);
    expect(after.almost).toEqual(before.almost);
    expect(after.badges).toEqual(before.badges);
  });

  it('the pools, the odds and the packs still read the cards in packs only', () => {
    const w1 = without(w0, gone);
    expect(w1.cards.some((c) => gone.includes(c.n))).toBe(false);
    expect(countWorld(w1, playerOf(mine)).cards).toHaveLength(w0.cards.length);
    expect(countWorld(w1, playerOf([])).cards).toBe(w1.cards);
  });

  it('a card out of the packs that nobody owns counts for nobody: the totals of a player who does not own it lose it, his owned does not move', () => {
    const never = w0.cards.find((c) => !mine.includes(c.n) && c.kind === 'idol')!.n;
    const p = playerOf(mine);
    const before = counts(w0, p);
    const after = counts(without(w0, [never]), p);
    expect(after.totals.total).toBe(before.totals.total - 1);
    expect(after.totals.owned).toBe(before.totals.owned);
    expect(after.level).toEqual(before.level);
  });

  it('a progress never shows more than 100 %: a player who owns every card keeps 100 % when cards leave, and so do the sets', () => {
    const p = playerOf(w0.cards.map((c) => c.n));
    const w1 = without(w0, w0.cards.filter((c) => c.kind === 'idol').slice(0, 6).map((c) => c.n));
    const after = counts(w1, p);
    expect(after.totals.owned).toBe(after.totals.total);
    expect(after.totals.pct).toBe(100);
    for (const g of after.groups) expect(g.owned).toBeLessThanOrEqual(g.total);
    for (const s of after.sets) expect(s.owned).toBeLessThanOrEqual(s.total);
    expect(pctOf(120, 100)).toBe(100);
  });

  it('a group complete badge, First Gold and First Full Art stay earned when their card leaves; the 100 cards badge counts the cards out of packs', () => {
    const everyGold = w0.cards.filter((c) => c.rarity === 'UR' || c.rarity === 'L').map((c) => c.n);
    const p = playerOf(everyGold);
    const before = badgesOf(w0, new Set(p.owned.keys()), NOW);
    const after = badgesOf(without(w0, everyGold), new Set(p.owned.keys()), NOW);
    expect(after).toEqual(before);
    const hundred = new Set(Array.from({ length: 100 }, (_, i) => 1000 + i));
    expect(badgesOf({ ...w0, retired: [] }, hundred, NOW)).toContain('100 cards');
  });
});

describe('the level, the percentage and the ranking of the players read against their own total', () => {
  it('the ranking position and the percentage of a player do not change when one of his cards leaves; another player who never owned it is not moved', () => {
    const total = 200;
    // before: ada 120 cards, bea 119, cy 80 (all in packs). After the removal of one card ada owns: she is 119 in packs + 1 out of packs.
    const before = rankRows([
      { nickname: 'ada', owned: 120, showcase: [], badges: [], friend: false, me: true },
      { nickname: 'bea', owned: 119, showcase: [], badges: [], friend: true, me: false },
      { nickname: 'cy', owned: 80, showcase: [], badges: [], friend: false, me: false },
    ], total);
    const after = rankRows([
      { nickname: 'ada', owned: 120, retired: 1, showcase: [], badges: [], friend: false, me: true },
      { nickname: 'bea', owned: 119, showcase: [], badges: [], friend: true, me: false },
      { nickname: 'cy', owned: 80, showcase: [], badges: [], friend: false, me: false },
    ], total - 1);
    expect(after.map((r) => [r.pos, r.nickname, r.level, r.pct])).toEqual(before.map((r) => [r.pos, r.nickname, r.level, r.pct]).map(([pos, n, lv, pct]) => (n === 'bea' ? [pos, n, lv, pctOf(119, 199)] : n === 'cy' ? [pos, n, lv, pctOf(80, 199)] : [pos, n, lv, pct])));
    expect(after[0]!.level).toBe(levelOf(120));
  });
  it('a player page shows his total with his retired cards in it, never under his owned', () => {
    const page = playerPage({ nickname: 'ada', owned: 120, retired: 3, showcase: [], badges: [], friend: false, me: true }, 197, null);
    expect(page.total).toBe(200);
    expect(page.pct).toBe(60);
    expect(totalOf(197, undefined)).toBe(197);
    expect(page.owned).toBeLessThanOrEqual(page.total);
  });
});

describe('a pack opened by a player who owns cards out of packs reads his level the way the lobby does', () => {
  it('owned_before and owned_after (cards in packs, from cards_open) get his retired cards added, so no level-up is invented or lost', () => {
    const w = worldOf();
    const state = lobbyState({ w, p: playerOf([w.cards[0]!.n]), now: NOW, odds: false });
    const j = { replayed: false, packs: [], finished: [], owned_before: 99, owned_after: 100 };
    // 99 in packs + 5 retired = 104 before and 105 after: the same level, no level-up. Without them 99 to 100 would cross a level.
    expect(openResponseFrom(w, j, state, 5).summary.levelUp).toBeNull();
    expect(openResponseFrom(w, j, state, 0).summary.levelUp).not.toBeNull();
    const k = { ...j, owned_before: 104, owned_after: 105 };
    expect(openResponseFrom(w, k, state, 5).summary.levelUp).toMatchObject({ from: levelOf(109), to: levelOf(110) });
  });
});

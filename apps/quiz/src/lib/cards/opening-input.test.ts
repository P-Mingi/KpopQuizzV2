// KpopCards (agent C): the opening takes its cards and its words from the server's answer, here the seeded mock of the contract.
import { describe, expect, it } from 'vitest';

import { isApiError } from '../kpopcards/contract';
import { createMockApi, fixtureWorld } from '../kpopcards/mock-api';
import { fixtureCatalog } from './ui-fixture';

import { isBigEdition, openingInput, rarityOfEdition } from './opening-input';
import { spotlightIndex } from '../../components/cards/reveal-steps';

import type { OpenResponse } from '../kpopcards/contract';

const WORLD = fixtureWorld(fixtureCatalog());
const T0 = Date.parse('2026-11-13T10:00:00Z');
const key = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
async function open(seed: number, req: { packs?: 1 | 5; source?: 'stock' | 'daily' } = {}): Promise<OpenResponse> {
  const r = await createMockApi({ world: fixtureWorld(fixtureCatalog()), seed, now: () => T0 }).open({ key: key(seed), source: req.source ?? 'stock', ...(req.packs ? { packs: req.packs } : {}) });
  if (isApiError(r)) throw new Error(r.error);
  return r;
}

describe('openingInput', () => {
  it('one pack: its five cards in the server order, with the server flags and words', async () => {
    const r = await open(1);
    const i = openingInput(r);
    expect(i.packs).toBe(1);
    expect(i.cards).toHaveLength(5);
    expect(i.cards.map((c) => c.n)).toEqual(r.packs[0]!.cards.map((c) => c.n));
    expect(i.cards.map((c) => c.pity)).toEqual(r.packs[0]!.cards.map((c) => c.guarantee));
    expect(i.headline).toBe(r.summary.headline);
    expect(i.copiesShards).toBe(r.summary.copiesShards);
    expect(i.golden).toBe(r.packs[0]!.golden);
  });
  it('Open 5: 25 cards in the order the packs were opened, never golden as one pack, the golden packs counted by the server', async () => {
    const r = await open(2, { packs: 5 });
    const i = openingInput(r);
    expect(i.packs).toBe(5);
    expect(i.cards).toHaveLength(25);
    expect(i.golden).toBe(false);
    expect(i.goldenPacks).toBe(1);
    expect(i.cards.slice(5, 10).map((c) => c.n)).toEqual(r.packs[1]!.cards.map((c) => c.n));
  });
  it('the pack of the day carries its source and its group', async () => {
    const i = openingInput(await open(3, { source: 'daily' }));
    expect(i.source).toBe('daily');
    expect(i.theme).toBe('daily');
    expect(i.group).not.toBeNull();
  });
  it('an answer with no pack is refused, not shown', () => {
    expect(() => openingInput({ packs: [], summary: {} as never, replayed: false, state: {} as never })).toThrow();
  });
  it('maps editions to rarities, and Gold and Full Art are the big ones (the warning at the pack)', () => {
    expect((['std', 'stage', 'holo', 'era', 'gold', 'full'] as const).map(rarityOfEdition)).toEqual(['C', 'U', 'R', 'SR', 'UR', 'L']);
    expect((['std', 'stage', 'holo', 'era', 'gold', 'full'] as const).map(isBigEdition)).toEqual([false, false, false, false, true, true]);
  });
  it('the best card the screen would hold up is the one the server\'s editions rank first', async () => {
    const i = openingInput(await open(4));
    const k = spotlightIndex(i.cards.map((c) => rarityOfEdition(c.edition)));
    if (k !== null) {
      const order = ['std', 'stage', 'holo', 'era', 'gold', 'full'];
      expect(Math.max(...i.cards.map((c) => order.indexOf(c.edition)))).toBe(order.indexOf(i.cards[k]!.edition));
    }
  });
});

describe('the golden flag of the example player (prototype: 48 packs opened, the 49th is not golden, the 50th is)', () => {
  it('the mock agrees with the prototype: the next pack is not golden, "Golden pack in 2"', async () => {
    const a = createMockApi({ world: WORLD, seed: 7, now: () => T0 });
    const s = await a.state();
    if (isApiError(s)) throw new Error(s.error);
    expect(s.golden).toMatchObject({ next: false, packsUntil: 2, opened: 48 });
    const r = await a.open({ key: key(70), source: 'stock' });
    if (isApiError(r)) throw new Error(r.error);
    expect(r.packs[0]!.packNo).toBe(49);
    expect(r.packs[0]!.golden).toBe(false);
    expect(openingInput(r).golden).toBe(false);
  });
  it('the state that comes back WITH the answer already says the next pack is golden: the face of the pack just opened must come from its own flag', async () => {
    const a = createMockApi({ world: WORLD, seed: 8, now: () => T0 });
    const r = await a.open({ key: key(80), source: 'stock' });
    if (isApiError(r)) throw new Error(r.error);
    expect(r.state.golden.next).toBe(true);
    expect(r.packs[0]!.golden).toBe(false);
  });
});

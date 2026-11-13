// Bunnyverse Cards, lot 3 point C5: the demo pack of a signed-out visitor. Drawn in the browser from the catalog the page already holds, with
// the game's own rules (rules.ts drawPack) and an unbiased crypto.getRandomValues generator. Nothing here reads or writes the server, the
// database or the browser storage: the pack is shown once and forgotten.
import { drawPack } from './rules';

import type { PoolCard, Rng } from './types';

/** An integer in [0, maxExclusive) from crypto.getRandomValues, by rejection sampling so no value is likelier than another. */
export function cryptoRng(source: Pick<Crypto, 'getRandomValues'> = globalThis.crypto): Rng {
  return (maxExclusive: number): number => {
    if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 0x100000000) throw new RangeError('rng bound');
    const buf = new Uint32Array(1);
    const limit = 0x100000000 - (0x100000000 % maxExclusive);
    for (;;) {
      source.getRandomValues(buf);
      if (buf[0]! < limit) return buf[0]! % maxExclusive;
    }
  };
}

/** The five card numbers of a demo pack drawn from the page's catalog. Empty when the catalog holds no card. */
export function drawDemoPack(cards: readonly PoolCard[], rng: Rng = cryptoRng()): number[] {
  if (cards.length === 0) return [];
  return drawPack(cards.map((c) => ({ n: c.n, kind: c.kind, rarity: c.rarity, ...(c.entity ? { entity: c.entity } : {}) })), rng);
}

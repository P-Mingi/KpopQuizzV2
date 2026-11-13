// KpopCards: the pure pack draw of lots 3 to 5 (themes, golden pack, Gold guarantee, focus, missing half). No I/O: the rng is injected. The
// server gives it crypto.randomInt (server-rng.ts); the mock and the tests give a seeded one. It builds on lib/cards/rules.ts (the odds, the
// subject pick, the kind weights), so the rates a page shows (computeOdds) are the rates this draws.
import { PACK_SIZE, RARITIES, cardsOfRarity, drawOne, indexPool, rollFrom, tableOf } from '../cards/rules';

import type { DrawOpts } from '../cards/rules';
import type { PoolCard, Rarity, Rng } from '../cards/types';

export type PoolIndex = Map<string, PoolCard[]>;

export interface KcContext {
  /** The Gold guarantee fires in this pack: card 5 is Gold. */
  pity: boolean;
  /** A golden pack: card 5 is Holo or better. */
  golden: boolean;
  /** The card numbers the player owns now (a group edition of which he owns exactly one half gives him the other half). */
  owned?: ReadonlySet<number>;
  /** A focus pack: the group (cards_entities id) whose cards come as cards 2 and 4. */
  focus?: string | null;
}

export interface KcDrawn {
  cards: number[];
  /** True when card 5 was lifted by the golden rule (or forced by the guarantee inside a golden pack). */
  golden: boolean;
  /** True when card 5 is the one the Gold guarantee gave. */
  guarantee: boolean;
}

const RANK: Record<Rarity, number> = { C: 0, U: 1, R: 2, SR: 3, UR: 4, L: 5 };

/** The rarity of a golden pack's fifth card: the normal fifth-card roll, and anything under Holo becomes Holo (the lowest rarity of Holo or
 *  better that has a card, when the pool has no Holo). */
export function goldenRarity(byKey: PoolIndex, rng: Rng): Rarity {
  const table = tableOf(byKey, true);
  const r = rollFrom(table, rng);
  if (RANK[r] >= RANK.R) return r;
  const up = RARITIES.filter((x) => RANK[x] >= RANK.R && cardsOfRarity(byKey, x).length > 0);
  return (up[0] ?? r) as Rarity;
}

/** One pack of 5 card numbers. `theme` is the pool of the pack (a theme or one group); `all` the whole pool, used only when the theme pool has no Gold card to give. */
export function drawKcPack(theme: PoolIndex, all: PoolIndex, rng: Rng, ctx: KcContext): KcDrawn {
  const owned = ctx.owned ? new Set(ctx.owned) : undefined;
  const out: PoolCard[] = [];
  let golden = false;
  let guarantee = false;
  for (let i = 0; i < PACK_SIZE; i++) {
    const last = i === PACK_SIZE - 1;
    const opts: DrawOpts = {};
    if (owned) opts.owned = owned;
    if (ctx.focus && (i === 1 || i === 3)) opts.focus = ctx.focus;
    let pool = theme;
    if (last && ctx.pity && cardsOfRarity(all, 'UR').length > 0) {
      // The guarantee: Gold, from the pack's own pool when it has one, else from the whole pool (the promise wins).
      if (cardsOfRarity(theme, 'UR').length === 0) pool = all;
      opts.rarity = 'UR';
      guarantee = true;
      golden = ctx.golden;
    } else if (last && ctx.golden) {
      opts.rarity = goldenRarity(theme, rng);
      golden = true;
    }
    const card = drawOne(pool, rng, last, opts);
    owned?.add(card.n);
    out.push(card);
  }
  return { cards: out.map((c) => c.n), golden, guarantee };
}

export { indexPool };

/** The pool of a pack: the cards of a list that pass a filter, indexed. An empty result is the caller's refusal. */
export function poolOf(cards: readonly PoolCard[], keep: (c: PoolCard) => boolean): PoolIndex {
  return indexPool(cards.filter(keep));
}

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

/** What the server sends to cards_open for one pack: the plain five cards, a golden fifth card and a Gold fifth card. All three are drawn here
 *  with the rng; the database picks one of the fifth cards from the player's state under the wallet lock (110-core.sql). */
export interface KcPlan { c: number[]; g: number | null; u: number | null }

export function planKcPack(theme: PoolIndex, all: PoolIndex, rng: Rng, focus: string | null = null): KcPlan {
  const plain = drawKcPack(theme, all, rng, { pity: false, golden: false, focus });
  // Candidate for a golden pack: the fifth-card roll lifted to Holo or better.
  const golden = drawOne(theme, rng, true, { rarity: goldenRarity(theme, rng) });
  // Candidate for the guarantee: a Gold card of the pack's pool, else of the whole pool; none when no Gold card is in packs.
  const goldPool = cardsOfRarity(theme, 'UR').length > 0 ? theme : cardsOfRarity(all, 'UR').length > 0 ? all : null;
  const gold = goldPool ? drawOne(goldPool, rng, true, { rarity: 'UR' }) : null;
  return { c: plain.cards, g: golden.n, u: gold ? gold.n : null };
}

/** What cards_open keeps of a plan for a pack number and a guarantee state (the TypeScript twin of its choice, used by the simulation and the mock). */
export function resolvePlan(plan: KcPlan, golden: boolean, pity: boolean): { cards: number[]; golden: boolean; guarantee: boolean } {
  const cards = [...plan.c];
  if (pity && plan.u !== null) cards[4] = plan.u;
  else if (golden && plan.g !== null) cards[4] = plan.g;
  return { cards, golden, guarantee: pity && plan.u !== null };
}

/** The inputs of the duplicate bias for one pack (the TypeScript twin of cards_dup_pick in 126-dup-bias.sql, used by the dev mock). */
export interface DupBiasInput {
  /** The cards of the pack's pool (in packs, active, in the pack kind's pool): the bias candidates are the owned ones among them. */
  pool: readonly PoolCard[];
  /** Every card in packs: the redraw of a repeat may leave the pool only when the drawn card was itself out of it (the guarantee and the golden fallback). */
  universe?: readonly PoolCard[];
  /** The rarity of any card in packs (the drawn card may come from outside the pool: the guarantee promise). */
  rarityOf: (n: number) => Rarity;
  /** The card numbers the player owns before the pack. */
  owned: ReadonlySet<number>;
  /** Every card number of the same photo (all the parts), or an empty list for a whole card; only the parts in packs. */
  siblings: (n: number) => readonly number[];
  /** A focus pack: the group of the cards 2 and 4. */
  focus?: string | null;
  /** The chance of the bias, KC.DUP_BIAS. */
  bias: number;
  /** True when card 5 is the Gold guarantee or the golden fifth card: it never leans toward an owned card (it is still checked for a repeat). */
  fifthExempt: boolean;
  rng: Rng;
}

/**
 * The bias and the repeat check, card by card. (a) Unless exempt, with chance `bias` the card becomes a uniformly random card of the SAME rarity among
 * those the player owned BEFORE the pack that are in the pool, belong to the focus group for cards 2 and 4 when the group has a card of that rarity, are
 * not a part whose photo still has a part the player lacks (the missing part rule would turn it into a new card), and are not already in the pack.
 * (b) A card already in the pack is redrawn among the other cards of its rarity (same checks, none already in the pack); with none it stays.
 */
export function applyDupBias(cards: readonly number[], o: DupBiasInput): number[] {
  const now = new Set(o.owned);
  const out: number[] = [];
  const unit = 10000;
  const hit = Math.round(o.bias * unit);
  cards.forEach((card, k) => {
    let final = card;
    const rarity = o.rarityOf(card);
    const inFocus = (c: PoolCard): boolean => c.entity === o.focus || c.group === o.focus;
    const focusOn = !!o.focus && (k === 1 || k === 3);
    const focusOk = (list: readonly PoolCard[]): ((c: PoolCard) => boolean) => {
      const on = focusOn && list.some((c) => c.rarity === rarity && inFocus(c));
      return (c) => !on || inFocus(c);
    };
    let done = false;
    if (!(k === PACK_SIZE - 1 && o.fifthExempt) && o.rng(unit) < hit) {
      const ok = focusOk(o.pool);
      const cands = o.pool.filter((c) => c.rarity === rarity && o.owned.has(c.n) && !out.includes(c.n) && ok(c) && !o.siblings(c.n).some((m) => !now.has(m)));
      if (cands.length > 0) {
        final = (cands[o.rng(cands.length)] as PoolCard).n;
        done = true;
      }
    }
    if (!done && out.includes(final)) {
      const inPool = o.pool.some((c) => c.n === final);
      const list = inPool ? o.pool : o.universe ?? o.pool;
      const ok = focusOk(list);
      const cands = list.filter((c) => c.rarity === rarity && !out.includes(c.n) && ok(c));
      if (cands.length > 0) final = (cands[o.rng(cands.length)] as PoolCard).n;
    }
    now.add(final);
    out.push(final);
  });
  return out;
}

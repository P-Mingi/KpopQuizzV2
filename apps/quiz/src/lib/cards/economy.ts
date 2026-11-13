// Bunnyverse Cards, lot 3 (lane ECON): the pure rules the pages share for the economy: the timer cap (B12), the Ultra Rare guarantee (B10),
// crafting (C1), the wishlist (C4) and the focus pack (C4). No I/O. Every rarity word a player reads is RARITY_LABEL (never "Ultra Rare").
import { CRAFT_COST, RARITIES, RARITY_LABEL, PITY_UR } from './rules';

import type { Rarity, WalletState } from './types';
import type { SlimCard } from './ui-types';

/** The wishlist holds at most this many cards (the SQL twin is cards_wish). */
export const WISHLIST_MAX = 50;

/** True when the day's timer packs are all opened: the stack rests until Paris midnight whatever its size. */
export function timerResting(s: Pick<WalletState, 'timerLeft'>): boolean {
  return s.timerLeft !== undefined && s.timerLeft <= 0;
}

/** The packs the player can open from the stack now: never a pack he could not open (B12). */
export function openableStock(s: Pick<WalletState, 'stock' | 'timerLeft'>): number {
  return s.timerLeft === undefined ? s.stock : Math.max(0, Math.min(s.stock, s.timerLeft));
}

/** The line under the stack when the day's timer packs are used up, or null. */
export function restingLine(s: Pick<WalletState, 'timerLeft' | 'timerCap'>): string | null {
  if (!timerResting(s)) return null;
  const cap = s.timerCap !== undefined ? ` (${s.timerCap} a day)` : '';
  return `Today's free packs are all opened${cap}. The stack rests until midnight in Paris.`;
}

/** The note about the guarantee: how many packs until a Gold card is certain, or null while none is in packs. */
export function pityLine(pityLeft: number | null | undefined): string | null {
  if (pityLeft === null || pityLeft === undefined) return null;
  const gold = RARITY_LABEL.UR;
  if (pityLeft <= 1) return `Your next pack holds a ${gold} card for sure.`;
  return `A ${gold} card is certain within ${pityLeft} packs. A ${gold} or ${RARITY_LABEL.L} card starts the count again.`;
}

export interface CraftView {
  cost: number;
  /** null when the player can craft the card now, else the reason the button is disabled. */
  reason: string | null;
}

/** The "Craft for N shards" button of a MISSING card: its cost, and why it is disabled. */
export function craftView(rarity: Rarity, shards: number, owned: boolean): CraftView {
  const cost = CRAFT_COST[rarity];
  if (owned) return { cost, reason: 'You already have this card.' };
  if (shards < cost) return { cost, reason: `You need ${cost - shards} more shards (${cost} in all).` };
  return { cost, reason: null };
}

/** The groups a focus pack can be opened for: the groups that have a card in the catalog, by name. */
export function focusGroups(cards: readonly SlimCard[]): Array<{ id: string; name: string }> {
  const seen = new Map<string, string>();
  for (const c of cards) if (c.kind === 'group' && !seen.has(c.entity)) seen.set(c.entity, c.name);
  return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
}

/** The plain sentences of the odds page for the economy rules. `timerCap` is the server's CARDS_TIMER_PER_DAY or TIMER_PACKS_PER_DAY; `present` the
 *  rarities that have a card in packs (an Era or Full Art cost is told only once such a card exists). */
export function economySentences(timerCap: number, present: readonly Rarity[] = ['C', 'U', 'R', 'UR']): { pity: string; half: string; focus: string; timer: string; craft: string } {
  const gold = RARITY_LABEL.UR;
  return {
    pity: `After ${PITY_UR - 1} packs in a row without a ${gold} or a ${RARITY_LABEL.L} card, the last card of the next pack is ${gold}.`,
    half: 'If you own one half of a group card, drawing that group edition gives you the other half.',
    focus: 'Once a day you can pick a group for one pack: its first two cards come from that group (same odds for each rarity), the other three are drawn as usual.',
    timer: `The timer gives at most ${timerCap} packs a day, Paris time.`,
    craft: `A card you are missing can be crafted with shards: ${RARITIES.filter((r) => present.includes(r)).map((r) => `${RARITY_LABEL[r]} ${CRAFT_COST[r]}`).join(', ')}.`,
  };
}

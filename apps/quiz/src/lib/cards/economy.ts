// Bunnyverse Cards, lots 3 and 4 (lane ECON): the pure rules the pages share for the economy: the timer cap (A13), the Gold guarantee (A11),
// crafting (A14), the wishlist and the focus pack (A17), the main button (B4). No I/O. Every rarity word a player reads is RARITY_LABEL.
import { CRAFT_COST, PITY_UR, RARITIES, RARITY_LABEL, SHARD_PACK_COST, craftCost } from './rules';

import type { Rarity, WalletState } from './types';
import type { SlimCard } from './ui-types';

/** The wishlist holds at most this many cards (the SQL twin is cards_wish). */
export const WISHLIST_MAX = 50;

/** "14 of 40 timer packs today", or null for an older payload without the timer fields. */
export function timerLine(s: Pick<WalletState, 'timerUsed' | 'timerCap'>): string | null {
  if (s.timerUsed === undefined || s.timerCap === undefined) return null;
  return `${s.timerUsed} of ${s.timerCap} timer packs today`;
}

/** True when the day's timer refills are all used: the stack adds nothing until Paris midnight (the packs in it still open). */
export function timerResting(s: Pick<WalletState, 'timerLeft'>): boolean {
  return s.timerLeft !== undefined && s.timerLeft <= 0;
}

/** The line under the stack when the timer has added its share for the day, or null. */
export function restingLine(s: Pick<WalletState, 'timerLeft' | 'timerCap' | 'stock' | 'cap'>): string | null {
  if (!timerResting(s) || s.stock >= s.cap) return null;
  const cap = s.timerCap !== undefined ? ` (${s.timerCap} a day)` : '';
  return `The timer has added all its packs for today${cap}. The stack fills up again at midnight, Paris time.`;
}

/** The note about the guarantee: "Gold within N packs", or null while no Gold card is in packs. */
export function pityLine(pityLeft: number | null | undefined): string | null {
  if (pityLeft === null || pityLeft === undefined) return null;
  return `${RARITY_LABEL.UR} within ${pityLeft} ${pityLeft === 1 ? 'pack' : 'packs'}`;
}

/** The share of the way to the guaranteed Gold card, 0 to 100, for the small progress bar. */
export function pityProgress(pityLeft: number | null | undefined): number {
  if (pityLeft === null || pityLeft === undefined) return 0;
  return Math.max(0, Math.min(100, ((PITY_UR - pityLeft) / (PITY_UR - 1)) * 100));
}

export interface CraftView {
  /** null for a Full Art, which cannot be crafted. */
  cost: number | null;
  /** null when the player can craft the card now, else the reason the button is disabled. */
  reason: string | null;
}

/** The "Craft for N shards" button of a MISSING card: its cost, and why it is disabled. */
export function craftView(rarity: Rarity, shards: number, owned: boolean): CraftView {
  const cost = craftCost(rarity);
  if (cost === null) return { cost, reason: `A ${RARITY_LABEL[rarity]} card can't be crafted. It only comes from packs.` };
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

export type MainButtonKind = 'open' | 'shards' | 'ad' | 'wait';

export interface MainButton {
  kind: MainButtonKind;
  label: string;
  /** True only for the waiting state: nothing to press. */
  disabled: boolean;
}

export interface MainButtonInput {
  stock: number;
  shards: number;
  adsLeft: number;
  /** False when the ad layer is off or cannot play an ad now. */
  adsAvailable: boolean;
  adShards: number;
  /** Milliseconds until the next timer refill, null when none is coming today. */
  nextMs: number | null;
}

const clock = (ms: number): string => {
  const s = Math.ceil(Math.max(0, ms) / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Lot 4 B4: what the one big button says. A pack in the stack: open it. An empty stack: 50 shards, else a rewarded ad, else the timer. */
export function mainButton(i: MainButtonInput): MainButton {
  if (i.stock > 0) return { kind: 'open', label: 'Open a pack', disabled: false };
  if (i.shards >= SHARD_PACK_COST) return { kind: 'shards', label: `Open with ${SHARD_PACK_COST} shards`, disabled: false };
  if (i.adsAvailable && i.adsLeft > 0) return { kind: 'ad', label: 'Watch an ad, get 1 pack', disabled: false };
  if (i.nextMs === null) return { kind: 'wait', label: 'More packs at midnight', disabled: true };
  return { kind: 'wait', label: `Next pack in ${clock(i.nextMs)}`, disabled: true };
}

/** The plain sentences of the odds page for the economy rules. `timerCap` is the server's CARDS_TIMER_PER_DAY or TIMER_PACKS_PER_DAY;
 *  `present` the rarities that have a card in packs (a rarity's craft cost is told only once such a card exists). */
export function economySentences(
  timerCap: number, present: readonly Rarity[] = RARITIES, _adShards = 25,
): { pity: string; half: string; focus: string; timer: string; craft: string; ad: string } {
  const gold = RARITY_LABEL.UR;
  const craftable = RARITIES.filter((r) => present.includes(r) && CRAFT_COST[r] !== undefined);
  return {
    pity: `After ${PITY_UR - 1} packs in a row without a ${gold} or a ${RARITY_LABEL.L} card, the last card of the next pack is ${gold}.`,
    half: 'If you own one half of a group card, drawing that group edition gives you the other half.',
    focus: 'Once a day you can pick a group for one pack from your stack: its 2nd and 4th cards come from that group (same odds for each edition), the other three are drawn as usual.',
    timer: `The timer adds at most ${timerCap} packs a day, Paris time. A pack already in your stack always opens.`,
    craft: `A card you are missing can be crafted with shards: ${craftable.map((r) => `${RARITY_LABEL[r]} ${CRAFT_COST[r]}`).join(', ')}. ${RARITY_LABEL.L} cards can't be crafted.`,
    ad: 'A rewarded ad you choose to watch gives 1 pack, up to a few a day. Those packs cannot be traded or given.',
  };
}

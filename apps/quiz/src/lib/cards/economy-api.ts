// Bunnyverse Cards, lots 3 and 4 (lane ECON): the browser's calls for the economy: craft, wishlist, focus pack. Kept apart from ui-api.ts so
// the stand-in API of the fixture needs no change; the pages that use these refresh the wallet from GET /api/cards/state afterwards.
import { isApiError } from '../kpopcards/contract';
import { getKcApi, newKey } from '../kpopcards/registry';

import type { KpopCardsApi } from '../kpopcards/contract';
import type { FinishedSet } from './goals';
import type { OpenResult } from './types';

export type EconError = { error: string };

export const isEconError = <T extends object>(r: T | EconError): r is EconError => typeof r === 'object' && r !== null && 'error' in r;

// The calls go through the contract's API object (lib/kpopcards/registry.ts), the seeded mock in a development fixture and the fetch client otherwise.
const kc = (): KpopCardsApi | null => getKcApi();
const toErr = (e: { error: string }): EconError => ({ error: e.error });

export async function craftCard(n: number): Promise<{ card: { n: number; rarity: string; cost: number; finished?: FinishedSet[]; /** Lot 7: the pano_no this craft gave (it completed its photo's set). */ pano?: number } } | EconError> {
  const api = kc();
  if (!api) return { error: 'network' };
  const r = await api.craft({ key: newKey(), n });
  return isApiError(r) ? toErr(r) : { card: { n: r.n, rarity: '', cost: r.cost, finished: r.finished.map((f) => ({ id: f.id, kind: 'group' as const, name: f.name, packs: f.packs })), ...(r.pano ? { pano: r.pano.p } : {}) } };
}
export async function wishCard(n: number, on: boolean): Promise<{ on: boolean; count: number } | EconError> {
  const api = kc();
  if (!api) return { error: 'network' };
  const r = await api.wish({ n, on });
  return isApiError(r) ? toErr(r) : { on: r.on, count: r.count };
}
export async function openFocus(group: string): Promise<OpenResult | EconError> {
  const api = kc();
  if (!api) return { error: 'network' };
  const r = await api.open({ key: newKey(), source: 'focus', focus: group, packs: 1 });
  if (isApiError(r)) return toErr(r);
  const p = r.packs[0]!;
  return { pack: { id: p.id, cards: p.cards.map((c) => ({ n: c.n, isNew: c.isNew, completesPair: c.completesPair, ...(c.pano ? { pano: c.pano.p } : {}) })), newCount: p.newCount, packNo: p.packNo }, state: r.state };
}

/** What the player is told when the server refuses. */
export const ECON_ERRORS: Record<string, string> = {
  shards: 'Not enough shards.', owned: 'You already have this card.', card: 'This card is not in packs.', no_craft: "A Full Art card can't be crafted.",
  wish_limit: 'Your wishlist is full (50 cards). Remove one first.', empty: 'No pack left in your stack.', focus_used: 'Today’s focus pack is already opened.',
  daily_used: 'The pack of the day is already opened.', stack_short: 'You need 5 packs in your stack for Open 5.', server: 'Something went wrong. Try again.', ad_limit: 'No ads left today.',
  bad_request: 'Pick a group first.', network: 'The connection dropped. Try again.', failed: 'Something went wrong. Try again.', forbidden: 'This account cannot do that.',
};

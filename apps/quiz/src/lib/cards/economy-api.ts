// Bunnyverse Cards, lots 3 and 4 (lane ECON): the browser's calls for the economy: craft, wishlist, focus pack. Kept apart from ui-api.ts so
// the stand-in API of the fixture needs no change; the pages that use these refresh the wallet from GET /api/cards/state afterwards.
import { withBasePath } from '@/lib/site/base-path';

import type { OpenResult } from './types';

export type EconError = { error: string };

async function post<T>(path: string, body: unknown): Promise<T | EconError> {
  try {
    const res = await fetch(withBasePath(path), {
      method: 'POST', cache: 'no-store', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    if (res.status === 401) return { error: 'signin' };
    const j = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok || !j) return { error: j?.error ?? (res.status === 403 ? 'forbidden' : 'failed') };
    return j;
  } catch {
    return { error: 'network' };
  }
}

export const isEconError = <T extends object>(r: T | EconError): r is EconError => typeof r === 'object' && r !== null && 'error' in r;

export const craftCard = (n: number): Promise<{ card: { n: number; rarity: string; cost: number } } | EconError> => post('/api/cards/craft', { card_no: n });
export const wishCard = (n: number, on: boolean): Promise<{ on: boolean; count: number } | EconError> => post('/api/cards/wish', { card_no: n, on });
export const openFocus = (group: string): Promise<OpenResult | EconError> => post('/api/cards/open', { source: 'stock', focus: group });

/** What the player is told when the server refuses. */
export const ECON_ERRORS: Record<string, string> = {
  shards: 'Not enough shards.', owned: 'You already have this card.', card: 'This card is not in packs.', no_craft: "A Full Art card can't be crafted.",
  wish_limit: 'Your wishlist is full (50 cards). Remove one first.', empty: 'No pack left in your stack.', focus_used: 'Today’s focus pack is already opened.',
  bad_request: 'Pick a group first.', network: 'The connection dropped. Try again.', failed: 'Something went wrong. Try again.', forbidden: 'This account cannot do that.',
};

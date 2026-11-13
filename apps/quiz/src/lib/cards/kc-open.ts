// KpopCards: how an opening page asks the server for its pack: a theme pack, the pack of the day, a focus pack, a pack bought with shards, or the guest's
// demo pack. One place, so the opening page (OpeningMount) and agent A's contract (a theme and the daily source on POST /api/cards/open) meet here.
import { openFocus } from './economy-api';

import type { CardsApi } from './ui-api';
import type { ApiError } from './ui-api';
import type { OpenResult, OpenedCard } from './types';

export type OpenSpec =
  | { kind: 'theme'; theme: string; packs: 1 | 5; from?: 'shards' }
  | { kind: 'daily' }
  | { kind: 'focus'; group: string }
  | { kind: 'demo' };

/** The address of the opening page for a spec (the inverse of the route params). */
export function specOf(parts: { segments: readonly string[]; packs?: string | null; from?: string | null; demo?: string | null }): OpenSpec | null {
  const [a, b] = parts.segments;
  if (a === 'focus' && b) return { kind: 'focus', group: b };
  if (a === 'daily') return { kind: 'daily' };
  if (a === 'all' || a === 'girls' || a === 'boys' || a === 'solo') {
    if (parts.demo === '1') return { kind: 'demo' };
    return { kind: 'theme', theme: a, packs: parts.packs === '5' ? 5 : 1, ...(parts.from === 'shards' ? { from: 'shards' as const } : {}) };
  }
  return null;
}

export interface Opened { cards: OpenedCard[]; source: 'stock' | 'shards' | 'ad' | 'bonus'; last: OpenResult }

/** One pack for one spec. The theme and the daily source are sent once the contract carries them (api.open takes an options object then). */
export async function openOne(api: CardsApi, spec: OpenSpec, groupEntity: (slug: string) => string | null = (s) => s): Promise<OpenResult | ApiError | { error: string }> {
  if (spec.kind === 'focus') { const e = groupEntity(spec.group); return e ? openFocus(e) : { error: 'bad_request' }; }
  if (spec.kind === 'theme' && spec.from === 'shards') return api.open('shards');
  return api.open('stock');
}

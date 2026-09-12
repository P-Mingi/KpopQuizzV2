import { UNRANKED } from './defaults';

import type { Placements } from './types';

// "Where the fandom agrees" - the consensus of many public lists that rank the
// same subject. Pure math over the placements jsonb; the read layer runs it under
// unstable_cache on a cookie-free client (PERF doctrine), never a live per-request
// scan. Only actual placements count as a vote; an item left in the unranked tray
// of a list casts no vote from that list.

export interface ItemConsensus {
  itemId: string;
  /** The modal (most-common) tier label the fandom put this item on. */
  tier: string;
  /** modalCount / totalVotes, in [0,1]. */
  agreement: number;
  /** How many lists ranked this item at all. */
  votes: number;
  /** label -> count, for a distribution bar in the UI. */
  distribution: Record<string, number>;
}

/**
 * @param lists       placements of each public list for one (subject, kind).
 * @param tierOrder   canonical top-to-bottom labels (e.g. DEFAULT_TIERS labels),
 *                    used to break modal ties and to order the output.
 */
export function fandomAgrees(lists: Placements[], tierOrder: string[]): ItemConsensus[] {
  const orderIndex = new Map(tierOrder.map((label, i) => [label, i] as const));
  // itemId -> (tierLabel -> count)
  const tally = new Map<string, Map<string, number>>();

  for (const placements of lists) {
    for (const [bucket, ids] of Object.entries(placements)) {
      if (bucket === UNRANKED) continue;
      for (const id of ids) {
        let byTier = tally.get(id);
        if (!byTier) { byTier = new Map(); tally.set(id, byTier); }
        byTier.set(bucket, (byTier.get(bucket) ?? 0) + 1);
      }
    }
  }

  const rank = (label: string): number => orderIndex.get(label) ?? Number.MAX_SAFE_INTEGER;

  const out: ItemConsensus[] = [];
  for (const [itemId, byTier] of tally) {
    let votes = 0;
    let modalTier = '';
    let modalCount = -1;
    const distribution: Record<string, number> = {};
    for (const [label, count] of byTier) {
      votes += count;
      distribution[label] = count;
      // Higher count wins; on a tie the higher (earlier in tierOrder) tier wins.
      if (count > modalCount || (count === modalCount && rank(label) < rank(modalTier))) {
        modalCount = count;
        modalTier = label;
      }
    }
    out.push({ itemId, tier: modalTier, agreement: votes ? modalCount / votes : 0, votes, distribution });
  }

  // Order the board: by the modal tier top-to-bottom, then stronger agreement,
  // then more votes, then a stable id tiebreak.
  out.sort((a, b) =>
    rank(a.tier) - rank(b.tier) ||
    b.agreement - a.agreement ||
    b.votes - a.votes ||
    (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0),
  );
  return out;
}

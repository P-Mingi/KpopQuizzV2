import { UNRANKED } from './defaults';

import type { Placements, Tier, TierListItem } from './types';

// Placements <-> board state. The load-bearing invariant, enforced by
// normalizePlacements: every known item appears EXACTLY ONCE across the tier
// buckets plus the unranked tray, and no bucket holds an unknown or duplicate id.
// This is what keeps a card from vanishing or cloning when a board round-trips
// through the DB, is remixed, or has a tier renamed/removed.

/** All items start in the unranked tray. */
export function buildInitialPlacements(items: TierListItem[], tiers: Tier[]): Placements {
  const out: Placements = { [UNRANKED]: items.map((i) => i.id) };
  for (const t of tiers) out[t.label] = [];
  return out;
}

/**
 * Reconcile a raw placements object (from the DB, a remix, or after a tier edit)
 * against the current tiers + item set:
 *  - every tier label and the unranked key are present as arrays,
 *  - each known item id appears exactly once (first occurrence wins on any dupe),
 *  - unknown ids are dropped,
 *  - any known item not placed anywhere lands in unranked,
 *  - buckets for tiers that no longer exist are folded back into unranked.
 */
export function normalizePlacements(
  raw: Placements | null | undefined,
  tiers: Tier[],
  items: TierListItem[],
): Placements {
  const known = new Set(items.map((i) => i.id));
  const validBuckets = new Set<string>([UNRANKED, ...tiers.map((t) => t.label)]);
  const seen = new Set<string>();
  const out: Placements = { [UNRANKED]: [] };
  for (const t of tiers) out[t.label] = [];

  const source = raw ?? {};
  // First pass: keep items in their bucket if the bucket still exists.
  for (const [bucket, ids] of Object.entries(source)) {
    if (!Array.isArray(ids)) continue;
    const target = validBuckets.has(bucket) ? bucket : UNRANKED;
    for (const id of ids) {
      if (!known.has(id) || seen.has(id)) continue; // drop unknown / duplicate
      seen.add(id);
      out[target]!.push(id);
    }
  }
  // Second pass: any known item never placed goes to the tray.
  for (const item of items) {
    if (!seen.has(item.id)) out[UNRANKED]!.push(item.id);
  }
  return out;
}

/** True when every known item sits in exactly one bucket and nothing is stray. */
export function isValidPlacements(placements: Placements, tiers: Tier[], items: TierListItem[]): boolean {
  const known = new Set(items.map((i) => i.id));
  const validBuckets = new Set<string>([UNRANKED, ...tiers.map((t) => t.label)]);
  const seen = new Set<string>();
  for (const [bucket, ids] of Object.entries(placements)) {
    if (!validBuckets.has(bucket)) return false;
    for (const id of ids) {
      if (!known.has(id)) return false;
      if (seen.has(id)) return false;
      seen.add(id);
    }
  }
  return seen.size === known.size;
}

/** Count of items actually placed on a tier (i.e. not in the unranked tray). */
export function rankedCount(placements: Placements): number {
  let n = 0;
  for (const [bucket, ids] of Object.entries(placements)) {
    if (bucket === UNRANKED) continue;
    n += ids.length;
  }
  return n;
}

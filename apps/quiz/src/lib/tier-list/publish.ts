import { UNRANKED } from './defaults';

import type { Placements, Tier, Visibility } from './types';

// Pure publish-path helpers: the auth/visibility gate, the moderation gate, and a
// server-side board sanitiser. No DB, no next imports, so they are unit-testable
// and shared by the save route handler. The DB unique constraint on slug and the
// 146 RLS/constraints are the final guards; these enforce the invariants before a
// write is attempted so a bad board never reaches the table.

export const MAX_ITEMS = 500;      // a board past this is rejected as oversized
export const MAX_TIERS = 26;
export const MAX_TITLE = 120;

export interface BoardInput { title: string; tiers: Tier[]; placements: Placements; visibility: Visibility }
export interface SanitizedBoard { title: string; tiers: Tier[]; placements: Placements }
export type SanitizeResult = { ok: true; board: SanitizedBoard } | { ok: false; error: string };

const HEX = /^#[0-9a-fA-F]{3,8}$/;

/**
 * Validate + normalise a board coming from the client before it is written:
 * - title non-empty and within budget,
 * - tiers is a sane array of {label,color} (labels unique, colors hex), capped,
 * - placements buckets are known (a tier label or the unranked key), every id is
 *   a string, and each id appears EXACTLY ONCE across all buckets (first wins),
 * - the total item count is capped (oversized payload rejected).
 * Returns the cleaned board or a human error. This keeps the exactly-once
 * invariant at the persistence boundary even though the server has no item list.
 */
export function sanitizeBoard(input: BoardInput): SanitizeResult {
  const title = (input.title ?? '').trim();
  if (!title) return { ok: false, error: 'A title is required.' };
  if (title.length > MAX_TITLE) return { ok: false, error: 'Title is too long.' };

  if (!Array.isArray(input.tiers) || input.tiers.length === 0) return { ok: false, error: 'At least one tier is required.' };
  if (input.tiers.length > MAX_TIERS) return { ok: false, error: 'Too many tiers.' };

  const seenLabels = new Set<string>();
  const tiers: Tier[] = [];
  input.tiers.forEach((t, i) => {
    const label = typeof t?.label === 'string' ? t.label.trim().slice(0, 6) : '';
    const color = typeof t?.color === 'string' && HEX.test(t.color) ? t.color : '#9E998F';
    if (!label || seenLabels.has(label)) return;
    seenLabels.add(label);
    tiers.push({ label, color, ord: i });
  });
  if (tiers.length === 0) return { ok: false, error: 'Tiers are invalid.' };

  const valid = new Set<string>([UNRANKED, ...tiers.map((t) => t.label)]);
  const seenIds = new Set<string>();
  const placements: Placements = { [UNRANKED]: [] };
  for (const t of tiers) placements[t.label] = [];
  const src = input.placements && typeof input.placements === 'object' ? input.placements : {};
  for (const [bucket, ids] of Object.entries(src)) {
    if (!valid.has(bucket) || !Array.isArray(ids)) continue;
    for (const id of ids) {
      if (typeof id !== 'string' || !id || seenIds.has(id)) continue;
      seenIds.add(id);
      placements[bucket]!.push(id);
      if (seenIds.size > MAX_ITEMS) return { ok: false, error: 'This board has too many items.' };
    }
  }

  return { ok: true, board: { title, tiers, placements } };
}

/** The custom asset ids (`custom:<id>`) referenced anywhere on a board. */
export function customAssetIds(placements: Placements): string[] {
  const out = new Set<string>();
  for (const ids of Object.values(placements)) {
    for (const id of ids) if (id.startsWith('custom:')) out.add(id.slice('custom:'.length));
  }
  return [...out];
}

export type PublishGate = { ok: true } | { ok: false; status: number; error: string };

/**
 * The publish authorisation + moderation gate.
 * - A PUBLIC list requires a signed-in creator (146 constraint + creator RLS).
 * - A PUBLIC list may only use APPROVED custom assets; a private/unlisted list may
 *   use a pending asset immediately. `assetStatuses` maps assetId -> status for
 *   every custom asset the board references (missing = treated as not usable).
 */
export function publishGate(params: {
  visibility: Visibility;
  userId: string | null;
  referencedAssetIds: string[];
  assetStatuses: Record<string, 'pending' | 'approved' | 'rejected'>;
}): PublishGate {
  const { visibility, userId, referencedAssetIds, assetStatuses } = params;
  if (visibility === 'public' && !userId) {
    return { ok: false, status: 401, error: 'Sign in to publish a public tier list.' };
  }
  if (visibility === 'public') {
    for (const id of referencedAssetIds) {
      if (assetStatuses[id] !== 'approved') {
        return { ok: false, status: 409, error: 'A custom image on this list is still awaiting moderation.' };
      }
    }
  } else {
    for (const id of referencedAssetIds) {
      if (assetStatuses[id] === 'rejected') {
        return { ok: false, status: 409, error: 'A custom image on this list was rejected.' };
      }
    }
  }
  return { ok: true };
}

/**
 * Read-side ownership: may this viewer see this owned (private) row? A signed-in
 * creator owns their own rows (creator_id match). A logged-out guest owns a row
 * they created anonymously (creator_id null AND anon_id matches their cookie id).
 * Anything else is not the owner. Pure so the owner-view route can be unit-tested.
 */
export function canViewOwned(
  row: { creator_id: string | null; anon_id: string | null },
  viewer: { userId: string | null; anonId: string | null },
): boolean {
  if (viewer.userId && row.creator_id === viewer.userId) return true;
  if (!viewer.userId && viewer.anonId && row.creator_id === null && row.anon_id === viewer.anonId) return true;
  return false;
}

// Owner order, 2026-11-06: the photocard feature is not live and no visitor may learn it exists. These six badges
// were seeded for it (migration 145 for quest_collector_*, scripts/seed-collection-badges.mjs for pc_*). Their
// badge_definitions rows stay in the database until the owner-run SQL deletes them, and the code ships first, so every
// place that lists, counts, pins, picks or announces a badge drops them through this one list. Nothing awards them
// either (catalog.ts and award.ts no longer know them). Once the SQL has run the list is harmless and may stay as a
// guard against a re-seed.

export const HIDDEN_BADGE_IDS: readonly string[] = [
  'pc_first',
  'pc_collector',
  'pc_set',
  'quest_collector_1',
  'quest_collector_5',
  'quest_collector_25',
];

const HIDDEN = new Set<string>(HIDDEN_BADGE_IDS);

/** Is this badge one that must never be shown, counted, pinned or picked? */
export function isHiddenBadge(id: string | null | undefined): boolean {
  return typeof id === 'string' && HIDDEN.has(id);
}

/** Badge definitions (or any row with an id) without the hidden badges. */
export function withoutHiddenBadges<T extends { id: string }>(rows: readonly T[]): T[] {
  return rows.filter((r) => !HIDDEN.has(r.id));
}

/** Badge ids (earned, pinned, listed) without the hidden badges. */
export function withoutHiddenBadgeIds(ids: readonly string[]): string[] {
  return ids.filter((id) => !HIDDEN.has(id));
}

// Badge art + grouping (M1.15 final).
//
// badge_definitions.icon is the source of truth wherever we already hold the row
// (the profile BadgeGrid selects *). But PersonCard renders on static/ISR pages
// all over the site and only carries a pinned_badge_id, so joining
// badge_definitions per card would add a query to every list. This static map
// mirrors migrations 101/102/104 and lets the pinned slot draw the real art for
// free. Keep the two in sync when new badge art lands.

export const BADGE_ICONS: Record<string, string> = {
  first_steps: '/badges/first_quiz_played.png',
  quiz_maker: '/badges/first_quiz_created.png',
  perfect_score: '/badges/perfect_score.png',
  group_master: '/badges/group_mastered.png',
  founding_fan: '/badges/founding_fan.png',
  streak_7: '/badges/streak_7.png',
  streak_30: '/badges/streak_30.png',
  streak_100: '/badges/streak_100.png',
  creator_bronze: '/badges/creator_bronze.png',
  creator_silver: '/badges/creator_silver.png',
  creator_gold: '/badges/creator_gold.png',
};

/** Art path for a badge id, or null when that badge has no art yet. */
export function badgeIconFor(badgeId: string | null | undefined): string | null {
  if (!badgeId) return null;
  return BADGE_ICONS[badgeId] ?? null;
}

// Tiered families render as their own labelled row so the progression reads as a
// ladder instead of three unrelated tiles.
export interface BadgeTierGroup {
  key: string;
  label: string;
  ids: string[];
}

export const BADGE_TIER_GROUPS: BadgeTierGroup[] = [
  { key: 'streak', label: 'Streak', ids: ['streak_7', 'streak_30', 'streak_100'] },
  { key: 'creator', label: 'Creator', ids: ['creator_bronze', 'creator_silver', 'creator_gold'] },
];

const TIERED_IDS = new Set(BADGE_TIER_GROUPS.flatMap((g) => g.ids));

export function isTieredBadge(badgeId: string): boolean {
  return TIERED_IDS.has(badgeId);
}

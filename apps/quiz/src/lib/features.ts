/**
 * Feature flags for gating server-only reads of not-yet-migrated tables.
 *
 * COMMUNITY_FEATURES_ENABLED: set to 'true' after migration 047 has been run.
 * Until then, all community API routes return empty data instead of 500ing
 * on "table does not exist".
 */

export const COMMUNITY_FEATURES_ENABLED =
  process.env.COMMUNITY_FEATURES_ENABLED === 'true';

/**
 * Feature flags for gating server-only reads of community tables.
 *
 * COMMUNITY_FEATURES_ENABLED gated comments/reactions/notifications until
 * migration 047 created their tables. Those tables now exist in every
 * environment, so the gate defaults to ON; set COMMUNITY_FEATURES_ENABLED=false
 * to explicitly disable (e.g. for an environment where 047 has not run yet).
 */

export const COMMUNITY_FEATURES_ENABLED =
  process.env.COMMUNITY_FEATURES_ENABLED !== 'false';

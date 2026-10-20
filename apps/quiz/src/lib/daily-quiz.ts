// Run O1, lot (e) part 1 (K1): the one place that decides which RPC publishes the daily quiz of a site.
//
// kpop keeps today's call, ensure_daily_quiz(p_date) (010 turns it into the kpop wrapper of ensure_daily_quiz_v2, so the
// result is the same); any other site calls ensure_daily_quiz_v2(p_date, p_site). Server code only (service role client):
// both functions are service_role only.

import { SITE } from '@/lib/site/registry';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { SiteId } from '@/lib/site/types';

/**
 * Publishes the quiz of the day of `site` for `date` (YYYY-MM-DD), idempotent: returns the existing one or the bank row's
 * quiz, or null when nothing is scheduled. Same result shape as supabase-js `rpc`: `{ data, error }`.
 */
export function ensureDailyQuizRpc(db: SupabaseClient, date: string, site: SiteId = SITE.id) {
  return site === 'kpop'
    ? db.rpc('ensure_daily_quiz', { p_date: date })
    : db.rpc('ensure_daily_quiz_v2', { p_date: date, p_site: site });
}

// Run O1, lot (d), lane H1: the numbers the network privacy policy publishes about deletion and the hand-off log. The SQL holds the
// real values (docs/pending-migrations/multisite/016-passport-deletion.sql, 006-passport-handoff.sql); these constants are what the page
// prints, and policy.test.ts pins each one to the SQL text, so the page cannot say 7 days while the database says 5.

import { REGISTRY } from '@/lib/site/registry';
import { SITE_IDS } from '@/lib/site/types';

import type { SiteId } from '@/lib/site/types';

/** Days between "Delete my passport" and the real deletion (016: `run_after := now() + interval '7 days'`; G16, defaults V2-08). */
export const DELETION_GRACE_DAYS = 7;

/** What happens to the quizzes a member published when nothing else is asked (016: `keep_quizzes ... default true`): they are kept,
 *  credited to "deleted user". The member can ask for them to be removed too. */
export const KEEP_QUIZZES_DEFAULT = true;

/** Days the hand-off log (the two sites, the outcome, a hashed IP address, a browser family) is kept (006 passport_cleanup). */
export const HANDOFF_LOG_DAYS = 90;

/** The worlds a member can leave: every world site except kpop (apis.md 3.6). */
export function leavableSites(): readonly SiteId[] {
  return SITE_IDS.filter((id) => REGISTRY[id].kind === 'world' && id !== 'kpop');
}

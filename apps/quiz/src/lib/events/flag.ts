// Audit 04 section 4 (P1-6): the switch of the award-prep cron. AWARD_PREP is a server flag, OFF by default, kpopquiz.org only; the
// owner turns it on. Off: the route answers 200 { skipped: 'flag_off' } and reads and writes nothing. Read at call time on the server.

import { SITE_ID, flagOn } from '@/lib/site/registry';

import type { SiteId } from '@/lib/site/types';

export function awardPrepFrom(value: string | undefined, site: SiteId): boolean {
  return site === 'kpop' && flagOn(value);
}

export function awardPrepOn(): boolean {
  return awardPrepFrom(process.env.AWARD_PREP, SITE_ID);
}

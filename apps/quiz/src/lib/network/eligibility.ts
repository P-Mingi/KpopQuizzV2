// Run O1, lot (c), lane B6: who may be shown an interactive cross-site link (types.ts NetEligibilityFns; Q 2.3 and 2.4).
import { SITE_ID } from '@/lib/site/registry';

import { NET_CAPS } from './types';

import type { NetEligibilityFns } from './types';

export const eligibleFor: NetEligibilityFns['eligibleFor'] = (me, dst) => {
  if (!me || !me.suggestions) return false;
  if (dst === SITE_ID) return false;
  const choice = me.worlds[dst];
  if (choice === 'no') return false; // hidden beats a membership
  if (choice === 'yes') return true; // liked: no membership needed
  const stamp = me.sites.find((s) => s.id === dst);
  return stamp !== undefined && stamp.plays > 0;
};

export const canShow: NetEligibilityFns['canShow'] = (me, dst, id, caps, now = Date.now()) => {
  if (!eligibleFor(me, dst)) return false;
  const until = me?.dismissed[id];
  if (until !== undefined) {
    const t = Date.parse(until);
    if (Number.isFinite(t) && t > now) return false; // dismissals expire
  }
  return caps.dismissals < NET_CAPS.dismissalsOff
    && caps.pageShown < NET_CAPS.perPage
    && caps.today < NET_CAPS.perDay
    && caps.week < NET_CAPS.perWeek;
};

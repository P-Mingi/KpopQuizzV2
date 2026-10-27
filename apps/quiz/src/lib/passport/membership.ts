// Run O1, lot (c) part 2, lane B3: the stamp of a non-kpop site, made on the first write of a signed-in user there
// (rpcs.md 2: ensure_membership is idempotent and runs for auth.uid(), so it takes the user's own client, never the
// service role). On 'kpop' it does nothing at all: no call is made, the membership of kpop is made by the profile
// trigger, so every kpop request stays what it is today. Fail soft: a play or a like never fails for a stamp.

import type { SiteId } from '@/lib/site/types';
import type { JoinedVia } from './types';
import type { RpcClient } from './xp';

export async function ensureMembershipForWrite(
  client: RpcClient,
  site: SiteId,
  via: JoinedVia = 'play',
  viaCode: string | null = null,
): Promise<void> {
  if (site === 'kpop') return;
  try {
    await client.rpc('ensure_membership', { p_site: site, p_via: via, p_via_code: viaCode });
  } catch {
    // the next write repairs it
  }
}

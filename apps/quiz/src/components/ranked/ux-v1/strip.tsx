'use client';

import { cardState, tierDisplay } from '@/lib/ranked/view';

import { useRanked } from './controller';
import { TierStrip } from './tiers';

/** The "Tiers" strip with the player's tier lit once placed (rules only otherwise). */
export function RankedTiers(): React.ReactElement {
  const r = useRanked();
  const state = r ? cardState(r.card, r.status) : null;
  const current = state?.kind === 'placed' ? tierDisplay(state.me.score, state.me.legend).key : null;
  return <TierStrip current={current} />;
}

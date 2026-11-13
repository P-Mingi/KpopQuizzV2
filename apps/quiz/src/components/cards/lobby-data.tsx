'use client';

// KpopCards: gives the lobby the weekly list and the friends of its boxes. Today they come from the Missions and Ranking views of the contract
// (lib/cards/kc-goals-api.ts); until the contract's data arrives the two boxes show no rows rather than invented ones.
import { useKcGoals } from '@/lib/cards/kc-goals-client';

import { useCards } from './cards-provider';

import { LobbyView } from './lobby-view';

import type { AdsContext } from '@/lib/cards/ads';
import type { CatalogOdds } from '@/lib/cards/types';

export function LobbyData({ ads, odds }: { ads: AdsContext; odds: CatalogOdds | null }): React.ReactElement {
  const { catalog, now } = useCards();
  const g = useKcGoals((name) => catalog.sections.find((s) => s.name === name)?.color, now);
  return <LobbyView ads={ads} odds={odds} week={g.week} friends={g.friendsMini} setPacks={g.setPacks} />;
}

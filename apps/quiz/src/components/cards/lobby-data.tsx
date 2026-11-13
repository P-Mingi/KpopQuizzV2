// KpopCards: the lobby page body (kept as one import for the page).
import { LobbyView } from './lobby-view';

import type { AdsContext } from '@/lib/cards/ads';
import type { CatalogOdds } from '@/lib/cards/types';

export function LobbyData({ ads, odds }: { ads: AdsContext; odds: CatalogOdds | null }): React.ReactElement {
  return <LobbyView ads={ads} odds={odds} />;
}

// Bunnyverse Cards, lane BRIDGES: the KpopCards band of the hub home. Drawn only when the page was given `cards` (NET_CARDS and NET_CARDS_BRIDGES on
// the hub build, lib/cards-bridge/flags.ts cardsBridgesHubOn); otherwise the home is today's. Lane KCBANNER: the banner itself is the shared
// component of components/cards-bridge/cards-banner.tsx (also drawn on kpopquiz.org); this file only puts it in the band of the hub home.
import { CardsBanner, cardsFacts } from '@/components/cards-bridge/cards-banner';
import { CARDS_PATH } from '@/lib/cards-bridge/links';

export { cardsFacts };

export function HomeCards(): React.ReactElement {
  return (
    <div className="hub-h2-band hub-h2-wrap">
      <CardsBanner href={CARDS_PATH} />
    </div>
  );
}

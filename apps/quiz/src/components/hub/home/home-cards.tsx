// Bunnyverse Cards, lane BRIDGES: the KpopCards band of the hub home. Drawn only when the page was given `cards` (NET_CARDS and NET_CARDS_BRIDGES on
// the hub build, lib/cards-bridge/flags.ts cardsBridgesHubOn); otherwise the home is today's. The words come from the KpopCards page itself.
import { CARDS_PATH } from '@/lib/cards-bridge/links';

export function HomeCards(): React.ReactElement {
  return (
    <section id="kpopcards" aria-labelledby="kpopcards-h" className="hub-h2-band hub-h2-wrap" data-testid="home-cards">
      <div className="hub-h2-bhead">
        <div>
          <h2 id="kpopcards-h" className="hub-h2-h2">KpopCards</h2>
          <p className="hub-h2-body">Free K-pop photocards. A free pack every 10 minutes and six editions of every idol. No money, no market.</p>
        </div>
      </div>
      <a href={CARDS_PATH} className="hub-h2-cta hub-h2-btn">Open KpopCards</a>
    </section>
  );
}

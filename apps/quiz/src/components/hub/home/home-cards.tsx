// Bunnyverse Cards, lane BRIDGES: the KpopCards band of the hub home. Drawn only when the page was given `cards` (NET_CARDS and NET_CARDS_BRIDGES on
// the hub build, lib/cards-bridge/flags.ts cardsBridgesHubOn); otherwise the home is today's. The words come from the KpopCards page itself.
// Owner, 2026-11-22: "Make this a beautiful CTA". The band is a night panel in the colours of the KpopCards card back, with a fan of three
// cards (a Holo and a Gold edition behind the back with the rabbit) and one solid button. No photo of a person: the cards are foil and the
// back only. The numbers come from the rules (the timer period and the editions), never typed.
import Image from 'next/image';
import { CARDS_PATH } from '@/lib/cards-bridge/links';
import { PERIOD_S, RARITY_LABEL } from '@/lib/cards/rules';
import { ArrowIcon } from './home-icons';

const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/** The three facts of the KpopCards page, from the rules: the timer gives a pack every PERIOD_S, and every idol has one edition per rarity. */
export function cardsFacts(): readonly string[] {
  const minutes = Math.round(PERIOD_S / 60);
  const editions = Object.keys(RARITY_LABEL).length;
  return [
    `A free pack every ${minutes} minutes`,
    `${WORDS[editions] ?? String(editions)} editions of every idol`,
    'No money, no market',
  ];
}

export function HomeCards(): React.ReactElement {
  return (
    <section id="kpopcards" aria-labelledby="kpopcards-h" className="hub-h2-band hub-h2-wrap" data-testid="home-cards">
      <div className="hub-h2-kc">
        <div className="hub-h2-kc-copy">
          <h2 id="kpopcards-h" className="hub-h2-h2">KpopCards</h2>
          <p className="hub-h2-body">Free K-pop photocards.</p>
          <ul className="hub-h2-kc-facts">
            {cardsFacts().map((f) => <li key={f}>{f}</li>)}
          </ul>
          <a href={CARDS_PATH} className="hub-h2-cta hub-h2-cta-site hub-h2-btn">Open KpopCards<ArrowIcon /></a>
        </div>
        <div className="hub-h2-kc-fan" aria-hidden="true">
          <span className="hub-h2-kc-card hub-h2-kc-holo"><span className="hub-h2-kc-ed">{RARITY_LABEL.R}</span></span>
          <span className="hub-h2-kc-card hub-h2-kc-gold"><span className="hub-h2-kc-ed">{RARITY_LABEL.UR}</span></span>
          <span className="hub-h2-kc-card hub-h2-kc-back">
            <Image src="/mascot/mascot-default.png" alt="" width={96} height={96} className="hub-h2-kc-mk" />
            <span className="hub-h2-kc-bt">KPOPCARDS</span>
          </span>
        </div>
      </div>
    </section>
  );
}

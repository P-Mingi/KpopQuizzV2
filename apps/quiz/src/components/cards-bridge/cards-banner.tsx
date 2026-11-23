// Bunnyverse Cards, lane KCBANNER (lot LAUNCH-POLISH-2): the KpopCards banner, ONE component shared by the hub home (components/hub/home/home-cards.tsx
// wraps it in its band) and the kpopquiz.org home (lib/cards-bridge/home.ts). A change here shows on both sites. It carries its own styles
// (banner-styles.ts, scoped under #kpopcards) because the kpop build reads no sheet of styles/sites/. Owner, 2026-11-22: "Make this a beautiful CTA".
// The words come from the KpopCards page itself: the numbers come from the contract (the timer period) and the rules (the editions), never typed. No photo of a
// person: the cards are foil and the back with the rabbit only. The caller gives the button's href (the hub: /kpopcards; kpopquiz.org: the signed-in
// jump whose destination is bunnyverse.org/kpopcards).
import Image from 'next/image';

import { RARITY_LABEL } from '@/lib/cards/rules';
import { KC } from '@/lib/kpopcards/contract';

import { CARDS_BANNER_CSS } from './banner-styles';

const WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

/** The three facts of the KpopCards page: the minutes between two timer packs come from the contract (KC.PERIOD_MIN), the most editions an idol has from the rules (an idol or a group can have fewer: "up to"). */
export function cardsFacts(): readonly string[] {
  const minutes = KC.PERIOD_MIN;
  const editions = Object.keys(RARITY_LABEL).length;
  return [
    `A free pack every ${minutes} minutes`,
    `Up to ${(WORDS[editions] ?? String(editions)).toLowerCase()} editions per idol`,
    'No money, no market',
  ];
}

function Arrow(): React.ReactElement {
  return (
    <svg className="kcb-arrow" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function CardsBanner({ href }: { readonly href: string }): React.ReactElement {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CARDS_BANNER_CSS }} />
      <section id="kpopcards" aria-labelledby="kpopcards-h" data-testid="home-cards">
        <div className="kcb-copy">
          <h2 id="kpopcards-h" className="kcb-h">KpopCards</h2>
          <p className="kcb-sub">Free K-pop photocards.</p>
          <ul className="kcb-facts">
            {cardsFacts().map((f) => <li key={f}>{f}</li>)}
          </ul>
          <a href={href} className="kcb-btn">Open KpopCards<Arrow /></a>
        </div>
        <div className="kcb-fan" aria-hidden="true">
          <span className="kcb-card kcb-holo"><span className="kcb-ed">{RARITY_LABEL.R}</span></span>
          <span className="kcb-card kcb-gold"><span className="kcb-ed">{RARITY_LABEL.UR}</span></span>
          <span className="kcb-card kcb-back">
            <Image src="/mascot/mascot-default.png" alt="" width={96} height={96} className="kcb-mk" />
            <span className="kcb-bt">KPOPCARDS</span>
          </span>
        </div>
      </section>
    </>
  );
}

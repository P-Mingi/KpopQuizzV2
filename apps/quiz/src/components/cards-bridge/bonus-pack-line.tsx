'use client';

// Bunnyverse Cards, lane B, bridge 3: "+1 pack, open it on Bunnyverse", at the end of a quiz (kpopquiz.org) and after a Kpopdle win (hub).
// Shown only for a signed-in fan whose bonus allowance of the day is above 0 (contract section 1); a guest, a failed read or an allowance of 0
// shows nothing. It is a link: the pack is opened on bunnyverse.org/cards and nothing is granted from here.
import { bonusLine } from '@/lib/cards-bridge/copy';
import { CARDS_PATH, cardsHref } from '@/lib/cards-bridge/links';

import { useCardsMe } from './use-cards-me';

export function BonusPackLine(): React.ReactElement | null {
  const me = useCardsMe();
  const text = me?.signedIn && me.wallet ? bonusLine(me.wallet.bonusLeft) : null;
  if (!text) return null;
  return (
    <p className="cb-bonus" data-testid="cards-bonus">
      <a className="ux-lnk" href={cardsHref(CARDS_PATH)}>{text}</a>
    </p>
  );
}

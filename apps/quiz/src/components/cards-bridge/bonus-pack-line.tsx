'use client';

// Bunnyverse Cards, lane B, bridge 3: "+1 pack, open it on Bunnyverse", after a Kpopdle win (hub). Shown only once the server has recorded an
// earned bonus pack for the day and the allowance is still above 0 (review 1 finding 1); a guest, a failed call, nothing earned or an allowance
// of 0 shows nothing. It is a link: the pack is opened on bunnyverse.org/cards. The end of a kpopquiz.org quiz has no line: the quiz of the day's pack
// is recorded by the hub's server itself (115-quiz-of-day-bonus.sql, read when the lobby opens), so the browser reports nothing and ships no Cards code.
import { bonusLine } from '@/lib/cards-bridge/copy';
import { CARDS_PATH, cardsHref } from '@/lib/cards-bridge/links';

import { useCardsBonus } from './use-cards-bonus';

export function BonusPackLine(): React.ReactElement | null {
  const a = useCardsBonus();
  const text = a?.signedIn && (a.earned ?? 0) > 0 ? bonusLine(a.bonusLeft ?? 0) : null;
  if (!text) return null;
  return (
    <p className="cb-bonus" data-testid="cards-bonus">
      <a className="ux-lnk" href={cardsHref(CARDS_PATH)}>{text}</a>
    </p>
  );
}

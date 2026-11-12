'use client';

// Bunnyverse Cards, lane B, bridge 2: the grid of a group page. The server markup is what a guest sees (every card as a back); after hydration a
// signed-in fan gets the cards they own in colour and the rest as backs. The count follows.
import { groupCardsCount } from '@/lib/cards-bridge/copy';

import { useCardsMe } from './use-cards-me';

import type { GroupCard } from '@/lib/cards-bridge/group';

export function CardsGroupGrid({ cards }: { cards: readonly GroupCard[] }): React.ReactElement {
  const me = useCardsMe(true);
  const owned = me?.signedIn && me.owned ? new Set(me.owned) : null;
  const have = owned ? cards.filter((c) => owned.has(c.n)).length : null;
  return (
    <>
      <p data-testid="cards-group-count">{groupCardsCount(have, cards.length)}</p>
      <ul className="cb-grid">
        {cards.map((c) => {
          const mine = owned?.has(c.n) ?? false;
          return mine && c.photoUrl ? (
            <li key={c.n} className="cb-card" data-owned="1" title={`${c.name} ${c.num}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.photoUrl} alt={`${c.name}, card ${c.num}`} loading="lazy" width={84} height={118} />
            </li>
          ) : (
            <li key={c.n} className="cb-card is-missing" data-owned="0"><span>{c.num}</span></li>
          );
        })}
      </ul>
    </>
  );
}

// Bunnyverse Cards, lane B, bridge 2: "BLACKPINK cards", loaded only by lib/cards-bridge/group.ts with NET_CARDS_BRIDGES on. Server component: the
// catalog is public, so the page stays cacheable; the fan's own colour arrives in the grid island.
import { groupCardsTitle } from '@/lib/cards-bridge/copy';
import { readGroupCards } from '@/lib/cards-bridge/group';
import { BINDER_PATH, cardsHref, CREDITS_PATH } from '@/lib/cards-bridge/links';

import { CardsGroupGrid } from './cards-group-grid';
import { CARDS_BRIDGE_CSS } from './styles';

export async function cardsGroup(name: string, slug: string): Promise<React.ReactElement | null> {
  const cards = await readGroupCards(slug);
  if (cards.length === 0) return null;
  return (
    <section className="cb-group" aria-labelledby="cb-group-h" data-testid="cards-group">
      <style dangerouslySetInnerHTML={{ __html: CARDS_BRIDGE_CSS }} />
      <h2 id="cb-group-h">{groupCardsTitle(name)}</h2>
      <CardsGroupGrid cards={cards} />
      <div className="cb-links">
        <a className="ux-lnk" href={cardsHref(BINDER_PATH)}>Open your binder on Bunnyverse</a>
        <a className="ux-lnk" href={cardsHref(CREDITS_PATH)}>Photo credits</a>
      </div>
    </section>
  );
}

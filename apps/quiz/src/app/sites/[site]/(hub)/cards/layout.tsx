// Bunnyverse Cards, lane U: the layout of every Cards page of bunnyverse.org (the hub build). NET_CARDS off: a 404 like any unknown URL
// (this layout sits under (hub), which already answers 404 on the other builds). It reads the catalog once (lib/cards/ui-catalog.ts),
// hands the slim catalog to the provider that Packs, Binder and the card pages share, and draws the Cards bar and the footer.
import '@/styles/cards/cards-tokens.css';
import '@/styles/cards/cards-art.css';
import '@/styles/cards/cards-ui.css';

import { notFound } from 'next/navigation';

import { CardsBar } from '@/components/cards/cards-bar';
import { CardsProvider } from '@/components/cards/cards-provider';
import { CardsSprite } from '@/components/cards/card-art';
import { CardsFooter } from '@/components/cards/cards-footer';
import { loadCatalog } from '@/lib/cards/ui-catalog';
import { cardsFixtureOn, cardsOn } from '@/lib/cards/ui-flag';
import { buildSlim } from '@/lib/cards/ui-model';
import { UxPage } from '@/components/ux-v1/page';

export default async function CardsLayout({ children }: { children: React.ReactNode }): Promise<React.ReactElement> {
  if (!cardsOn()) notFound();
  const cat = await loadCatalog();
  return (
    <UxPage width="full" padded={false} className="bvc">
      <CardsSprite />
      {cat ? (
        <CardsProvider catalog={buildSlim(cat)} fixture={cardsFixtureOn()}>
          <div className="wrap"><CardsBar /></div>
          {children}
        </CardsProvider>
      ) : (
        <div className="wrap page"><p className="page-note" role="status">The cards are not available right now. Try again in a few minutes.</p></div>
      )}
      <div className="wrap"><CardsFooter /></div>
    </UxPage>
  );
}

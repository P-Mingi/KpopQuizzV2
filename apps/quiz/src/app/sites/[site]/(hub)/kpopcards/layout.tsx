// KpopCards (lots 3 to 5): the layout of every page of bunnyverse.org/kpopcards (the hub build). NET_CARDS off: a 404 like any unknown URL (this layout
// sits under (hub), which already answers 404 on the other builds). It reads the catalog once (lib/cards/ui-catalog.ts), hands the slim catalog to the
// provider the pages share, and draws the KpopCards top bar (the rabbit, five tabs, the bell, the avatar). The hub's own bar is hidden (shell "focus"):
// KpopCards is a site inside Bunnyverse with its own bar. Its root carries the card faces of components/cards/cards-font.ts (owner go 2026-11-12).
import '@/styles/cards/cards-tokens.css';
import '@/styles/cards/kpopcards.css';
import '@/styles/cards/cards-photo.css';

import { notFound } from 'next/navigation';

import { CardsProvider } from '@/components/cards/cards-provider';
import { CardsSprite } from '@/components/cards/card-art';
import { cardsFace, cardsMono } from '@/components/cards/cards-font';
import { KcShell } from '@/components/cards/kc-shell';
import { demoOn } from '@/lib/cards/demo';
import { loadCatalog } from '@/lib/cards/ui-catalog';
import { cardsFixtureOn, cardsOn } from '@/lib/cards/ui-flag';
import { buildSlim } from '@/lib/cards/ui-model';
import { UxPage } from '@/components/ux-v1/page';

export default async function KpopCardsLayout({ children }: { children: React.ReactNode }): Promise<React.ReactElement> {
  if (!cardsOn()) notFound();
  const cat = await loadCatalog();
  return (
    <UxPage width="full" padded={false} shell="focus" className={`bvc ${cardsFace.variable} ${cardsMono.variable}`}>
      <CardsSprite />
      {cat ? (
        <CardsProvider catalog={buildSlim(cat)} fixture={cardsFixtureOn()} demo={cardsFixtureOn() || demoOn()}>
          <KcShell>{children}</KcShell>
        </CardsProvider>
      ) : (
        <div className="wrap page">
          {/* The fallback is a page of its own, so it carries the one H1 the children would have given. */}
          <h1 className="h1">KpopCards</h1>
          <p className="page-note" role="status">The cards are not available right now. Try again in a few minutes.</p>
        </div>
      )}
    </UxPage>
  );
}

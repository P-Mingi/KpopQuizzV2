// Bunnyverse Cards, lane U: the one seam between the pages and the catalog. Server only.
// - fixture on (development server with CARDS_UI_FIXTURE=1): the test fixture of ui-fixture.ts.
// - otherwise: the catalog read by lane C's server helper. That helper has not landed in this branch yet, so the seam answers null
//   and the pages say the cards are not available, which is the honest answer on a build without the catalog. When lane C's
//   helper lands, it is called here and nowhere else (request in docs/o1/requests/CARDS-U.md).
import { cardsFixtureOn } from './ui-flag';

import type { UiCatalog } from './ui-types';

export async function loadCatalog(): Promise<UiCatalog | null> {
  if (cardsFixtureOn()) return (await import('./ui-fixture')).fixtureCatalog();
  return null;
}

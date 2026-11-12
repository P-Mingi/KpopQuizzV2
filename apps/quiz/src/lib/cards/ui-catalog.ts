// Bunnyverse Cards, lane U: the one seam between the pages and the catalog. Server only.
// - fixture on (development server with CARDS_UI_FIXTURE=1): the test fixture of ui-fixture.ts.
// - otherwise: lane C's cached catalog read (lib/cards/catalog.ts, the payload of GET /api/cards/catalog), mapped to the UI shapes;
//   a read that fails answers null and the pages say the cards are not available (fail closed, never an error page).
import { cardsFixtureOn } from './ui-flag';

import type { CatalogPayload } from './types';
import type { UiCatalog, UiPhoto } from './ui-types';

export function fromPayload(p: CatalogPayload): UiCatalog {
  return {
    odds: p.odds,
    entities: p.entities.map((e) => ({ id: e.id, kind: e.kind, name: e.name, group: e.group, debutYear: e.debutYear, sortKey: e.sortKey, lockReasons: e.lockReasons })),
    cards: p.cards.map((c) => {
      const i = c.image;
      const photo: UiPhoto | null = c.photo
        ? { ...c.photo, url: i?.url ?? null, url2x: i?.url2x ?? null, fileFocalX: i?.fileFocalX ?? null, fileFocalY: i?.fileFocalY ?? null, sourceUrl: i?.sourceUrl ?? null, focalX: i?.focalX ?? 50, focalY: i?.focalY ?? 30 }
        : null;
      return { n: c.n, num: c.num, entity: c.entity, kind: c.kind, rarity: c.rarity, edition: c.edition, name: c.name, group: c.group, debutYear: c.debutYear, photo };
    }),
  };
}

export async function loadCatalog(): Promise<UiCatalog | null> {
  if (process.env.NODE_ENV !== 'production' && cardsFixtureOn()) return (await import('./ui-fixture')).fixtureCatalog();
  try {
    const { loadCatalog: read } = await import('./catalog');
    return fromPayload(await read());
  } catch {
    return null;
  }
}

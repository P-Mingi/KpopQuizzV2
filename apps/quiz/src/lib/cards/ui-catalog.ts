// Bunnyverse Cards, lane U: the one seam between the pages and the catalog. Server only.
// - fixture on (development server with CARDS_UI_FIXTURE=1): the test fixture of ui-fixture.ts.
// - otherwise: lane C's cached catalog read (lib/cards/catalog.ts, the payload of GET /api/cards/catalog), mapped to the UI shapes;
//   a read that fails answers null and the pages say the cards are not available (fail closed, never an error page).
import { cardsFixtureOn } from './ui-flag';

import type { CatalogPayload } from './types';
import type { UiCatalog, UiPhoto } from './ui-types';

/** Extra fields lane C may add to a card's image (the file's focal point, the 2x file, the source photo); read when present. */
interface ImageExtras { url2x?: string | null; fileFocalX?: number | null; fileFocalY?: number | null; sourceUrl?: string | null }

export function fromPayload(p: CatalogPayload): UiCatalog {
  return {
    entities: p.entities.map((e) => ({ id: e.id, kind: e.kind, name: e.name, group: e.group, debutYear: e.debutYear, sortKey: e.sortKey, lockReasons: e.lockReasons })),
    cards: p.cards.map((c) => {
      const x = (c.image ?? {}) as Partial<NonNullable<typeof c.image>> & ImageExtras;
      const photo: UiPhoto | null = c.photo
        ? { ...c.photo, url: x.url ?? null, url2x: x.url2x ?? null, fileFocalX: x.fileFocalX ?? undefined, fileFocalY: x.fileFocalY ?? undefined, sourceUrl: x.sourceUrl ?? null, focalX: x.focalX ?? 50, focalY: x.focalY ?? 30 }
        : null;
      return { n: c.n, num: c.num, entity: c.entity, kind: c.kind, rarity: c.rarity, edition: c.edition, name: c.name, group: c.group, debutYear: c.debutYear, photo };
    }),
  };
}

export async function loadCatalog(): Promise<UiCatalog | null> {
  if (cardsFixtureOn()) return (await import('./ui-fixture')).fixtureCatalog();
  try {
    const { loadCatalog: read } = await import('./catalog');
    return fromPayload(await read());
  } catch {
    return null;
  }
}

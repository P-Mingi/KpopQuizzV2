// Bunnyverse Cards, lane U: the shapes the pages read, built on lane C's types (types.ts). The catalog API of lane C gives CatalogCard
// without the crop and the file of the photo, and does not name the entities' lock reasons: this file says what the pages need on
// top (all optional, so a CatalogCard from the API is still a UiCard). Requests to lane C: docs/o1/requests/CARDS-U.md.
import type { CatalogCard, LockReason, PhotoCredit, Rarity } from './types';

/** A photo credit plus what the card art needs: where the file is and where to centre the crop. */
export interface UiPhoto extends PhotoCredit {
  /** Path in the public `cards` bucket, set once the owner's script has uploaded the file. */
  storagePath?: string | null;
  /** object-position of the cover crop, percent. */
  focalX?: number;
  focalY?: number;
  /** A ready address of the picture (only the test fixture sets it, with a neutral placeholder). */
  src?: string | null;
  eventName?: string | null;
}

export type UiCard = Omit<CatalogCard, 'photo'> & { photo: UiPhoto | null };

export interface UiEntity {
  /** 'idol:<QID>', 'group:<QID>' or 'event:<slug>'. */
  id: string;
  kind: CatalogCard['kind'];
  name: string;
  /** Group name for an idol. */
  group: string | null;
  debutYear: number | null;
  sortKey: string;
  /** Why an edition is missing: {"SR":"one","L":"crop"}. */
  lockReasons: Partial<Record<Rarity, LockReason>>;
  /** 'Award show', 'Festival'... when the catalog knows it. */
  eventType?: string | null;
}

export interface UiCatalog {
  cards: UiCard[];
  entities: UiEntity[];
}

/** The card as the binder, the pack opening and the detail draw it. */
export interface SlimCard {
  n: number;
  num: string;
  entity: string;
  kind: CatalogCard['kind'];
  rarity: Rarity;
  edition: CatalogCard['edition'];
  name: string;
  group: string | null;
  debutYear: number | null;
  /** Picture address, null: the drawn placeholder figure. */
  img: string | null;
  fx: number;
  fy: number;
  /** Event type when known (events), for the meta line. */
  sub: string | null;
}

/** One pocket of the binder: a card, or an edition that cannot exist yet. */
export type BinderItem =
  | { i: number; sec: string; card: SlimCard; locked?: undefined }
  | { i: number; sec: string; locked: true; entity: string; name: string; group: string | null; rarity: Rarity; reason: LockReason | null; /** A card of the same entity the lock page hangs on. */ anchor: string | null };

export interface BinderSection {
  id: string;
  name: string;
  /** hsl() of the dot beside the name. */
  color: string;
  /** The card numbers of the section (for its owned/all count). */
  ns: number[];
}

export interface SlimCatalog {
  cards: SlimCard[];
  items: BinderItem[];
  sections: BinderSection[];
  /** Locked editions by entity, for the detail ladder: entity -> rarity -> reason. */
  locks: Record<string, Partial<Record<Rarity, LockReason | null>>>;
  /** The cards of each entity, by rarity, for the ladder of editions. */
  editions: Record<string, Partial<Record<Rarity, number>>>;
}

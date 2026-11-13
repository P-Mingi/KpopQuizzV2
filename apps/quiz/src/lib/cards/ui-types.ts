// Bunnyverse Cards, lane U: the shapes the pages read, built on lane C's types (types.ts). The catalog API of lane C gives CatalogCard
// without the crop and the file of the photo, and does not name the entities' lock reasons: this file says what the pages need on
// top (all optional, so a CatalogCard from the API is still a UiCard). Requests to lane C: docs/o1/requests/CARDS-U.md.
import type { CardPart, CatalogCard, CatalogOdds, LockReason, PhotoCredit, Rarity } from './types';

/**
 * A photo credit plus what the card art needs. Amendment 1: the card file is the WebP the owner's script cut at the focal point (1x 320x495,
 * 2x 640x989) in the public `cards` bucket; until a file exists for the CURRENT focal point, the page shows the source photo
 * (bucket `images/group-photos/<slug>.jpg`) cropped in CSS (object-fit: cover, object-position from the focal point).
 */
export interface UiPhoto extends PhotoCredit {
  /** The cropped WebP at 1x and 2x, null until uploaded. */
  url?: string | null;
  url2x?: string | null;
  /** The focal point the files were cut at; null: no file was cut, so the source photo is shown. */
  fileFocalX?: number | null | undefined;
  fileFocalY?: number | null | undefined;
  /** The source photo, uncropped. */
  sourceUrl?: string | null;
  /** The crop point of the card now, percent (object-position). */
  focalX?: number;
  focalY?: number;
  /** A ready address of the picture (only the test fixture sets it, with a neutral placeholder). */
  src?: string | null;
  eventName?: string | null;
}

/** The picture a card shows. */
export interface CardPicture {
  src: string;
  /** '<1x> 1x, <2x> 2x' for the cropped files. */
  srcSet: string | null;
  /** True for a cropped file (already 5.5:8.5), false for the source photo that CSS crops. */
  cut: boolean;
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
  /** Lot 2: the year a disbanded group disbanded. */
  endYear?: number | null;
  sortKey: string;
  /** Why an edition is missing: {"SR":"one","L":"crop"}. */
  lockReasons: Partial<Record<Rarity, LockReason>>;
  /** 'Award show', 'Festival'... when the catalog knows it. */
  eventType?: string | null;
}

export interface UiCatalog {
  /** The odds of the real catalog, computed by the server (rules.ts computeOdds); null when no card is in packs. */
  odds: CatalogOdds | null;
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
  /** Lot 2: the year a disbanded group disbanded (owner decision 2026-11-12: the card says it). */
  endYear?: number | null;
  /** The photo, null: the drawn placeholder figure. */
  img: CardPicture | null;
  fx: number;
  fy: number;
  /** Event type when known (events), for the meta line. */
  sub: string | null;
  /** Lot 2: 1 or 2 for the left or right half of a group photo (the pair's window is 11:8.5), 0 for a whole card. */
  part?: CardPart;
  /** Lot 2: the card number of the other half of the pair, null for a whole card or when the other half is not in packs. */
  pairN?: number | null;
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

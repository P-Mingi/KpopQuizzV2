// Bunnyverse Cards, lane U: the shapes the pages read, built on lane C's types (types.ts). The catalog API of lane C gives CatalogCard
// without the crop and the file of the photo, and does not name the entities' lock reasons: this file says what the pages need on
// top (all optional, so a CatalogCard from the API is still a UiCard). Requests to lane C: docs/o1/requests/CARDS-U.md.
import type { CardPart, CatalogCard, CatalogOdds, CatalogPanorama, Edition, GroupParts, LockReason, PhotoCredit, Rarity } from './types';

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
  /** Lot 6: true while the subject is age-locked (the boolean the API sends, never a date). The entity has no card. */
  locked?: true;
}

export interface UiCatalog {
  /** The odds of the real catalog, computed by the server (rules.ts computeOdds); null when no card is in packs. */
  odds: CatalogOdds | null;
  cards: UiCard[];
  entities: UiEntity[];
  /** Lot 7: the panoramas of the catalog (absent before file 118 and in older fixtures). */
  panoramas?: UiPanorama[];
  /** Cards out of packs, kept for the players who own them (owner decision 2026-11-18). Absent or empty: none. */
  retired?: UiCard[];
}

/** Lot 7: a panorama as the pages read it (the payload's shape: its picture is already resolved by lib/cards/catalog.ts). */
export type UiPanorama = CatalogPanorama;

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
  /** Lot 2: 1 or 2 for the left or right half of a group photo (the pair's window is 11:8.5), 0 for a whole card.
   *  Lot 7: 1 to 3, a photo in 3 cards has a 16.5:8.5 window. */
  part?: CardPart;
  /** Lot 2: the card number of the other half of the pair, null for a whole card or when the other half is not in packs. */
  pairN?: number | null;
  /** Lot 7: the number of cards of the photo (2 or 3), on a part. Absent reads as 2. */
  parts?: GroupParts;
  /** Lot 7: the card numbers of every part of the photo, part 1 first, on a part. */
  setNs?: number[];
  /** Lot 7: the pano_no of the panorama of the photo, on a part. */
  pano?: number;
  /** Lot 3 point A5: on a Full Art card, its rate as the page prints it ("0.3%"), from the odds; absent on the other editions. */
  rate?: string;
  /** Owner decision 2026-11-18: the card is out of packs and has no photo now. It is drawn as the "New photo coming" frame (its number, edition and name, no image), and it takes its photo back the day a new one arrives. */
  soon?: true;
}

/** One pocket of the binder: a card, or an edition that cannot exist yet. */
export type BinderItem =
  | {
      i: number; sec: string; card: SlimCard; locked?: undefined;
      /** Lot 7: the panorama pocket that hangs under the parts of its photo. Only on the LAST part of a set: the pocket is drawn in the row
       *  under the parts, and a filter or a page never takes it away from them. */
      pano?: SlimPano;
    }
  | {
      i: number; sec: string; locked: true; entity: string; name: string; group: string | null; rarity: Rarity; reason: LockReason | null;
      /** A card of the same entity the lock page hangs on. */ anchor: string | null;
      /** Lot 6: a pocket of an age-locked subject ("Carte à venir", no date, not a link). It is no edition: no rarity, no card, no count. */
      soon?: true;
    };

/** The picture of a panorama: its own file, else the parts' files side by side, else the source photo that CSS crops to the window. */
export interface PanoPicture {
  kind: 'file' | 'parts' | 'source';
  src: string;
  srcSet: string | null;
  /** The 1x files of the parts, left to right, for kind 'parts'. */
  parts: string[];
}

/** Lot 7: a panorama as the binder, the reveal and the large view draw it. It is no card: its own number (P-0001), never in a pack. */
export interface SlimPano {
  p: number;
  /** 'P-0001'. */
  num: string;
  entity: string;
  rarity: Rarity;
  edition: Edition;
  /** The group's name. */
  name: string;
  debutYear: number | null;
  endYear?: number | null;
  /** The cards of the photo (2 or 3). */
  parts: GroupParts;
  /** The card numbers of its parts, part 1 first. */
  cards: number[];
  img: PanoPicture | null;
  fx: number;
  fy: number;
  /** The credit line of the photo, as the cards print it. */
  credit: string | null;
}

export interface BinderSection {
  id: string;
  name: string;
  /** hsl() of the dot beside the name. */
  color: string;
  /** Lot 7: the Panoramas section (its own owned/total over `panos`, never over `ns`). */
  panos?: number[];
  /** The card numbers of the section (for its owned/all count). */
  ns: number[];
  /** Lot 6: a section that holds only age-locked pockets. It is not a group a player can open a pack for or pick in the lobby. */
  soon?: true;
}

export interface SlimCatalog {
  cards: SlimCard[];
  items: BinderItem[];
  sections: BinderSection[];
  /** Locked editions by entity, for the detail ladder: entity -> rarity -> reason. */
  locks: Record<string, Partial<Record<Rarity, LockReason | null>>>;
  /** The cards of each entity, by rarity, for the ladder of editions. */
  editions: Record<string, Partial<Record<Rarity, number>>>;
  /** Lot 7: every panorama of the catalog, in catalog order. Never counted in the cards' totals or in a group's completion. */
  panos: SlimPano[];
  /** Cards out of packs (owner decision 2026-11-18). Not in `cards`, `items` or the sections: the player's own are put into the binder by withOwnedRetired. */
  retired: SlimCard[];
}

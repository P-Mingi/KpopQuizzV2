// Bunnyverse Cards: shared types (lane C CORE owns this file; lanes U and B import it).
// Contract: docs/o1/briefs/CARDS-CONTRACT.md sections 2 and 3.

export type Rarity = 'C' | 'U' | 'R' | 'SR' | 'UR' | 'L';
export type Edition = 'std' | 'stage' | 'holo' | 'era' | 'gold' | 'full';
export type CardKind = 'idol' | 'group' | 'event';
export type PackSource = 'stock' | 'ad' | 'shards' | 'bonus';
export type PhotoSource = 'commons' | 'koreanet' | 'flickr' | 'dvids';
export type LockReason = 'one' | 'sameday' | 'newg' | 'hiatus' | 'crop';
export type PhotoStatus = 'auto' | 'pending' | 'approved' | 'rejected' | 'removed';

export interface PhotoCredit {
  id: number;
  /** The idol's photo number: 1, 2 or 3. */
  slot: number;
  author: string;
  authorUrl: string | null;
  licence: string;
  licenceUrl: string;
  source: PhotoSource;
  sourcePage: string;
  shareAlike: boolean;
  /** What was changed, e.g. 'cropped, frame and text added'. */
  modified: string;
}

/** The picture of a card: the public URL of the cropped WebP (null until the owner's script has uploaded it) and the crop. */
export interface CardImage {
  /** The 1x card file (320 x 495 WebP) when it was cut at the current focal point, else the source photo (crop it in CSS). */
  url: string | null;
  /** The 2x file (640 x 989), only with a matching 1x file. */
  url2x?: string | null;
  /** True when `url` is the uncropped source photo: show it with object-fit: cover and object-position from the focal point. */
  css?: boolean;
  /** The 5.5:8.5 crop is narrower than 640 px: no honest 2x. */
  small2x?: boolean;
  /** object-position of the cover crop, 0 to 100. */
  focalX: number;
  focalY: number;
  /** The focal point the published files were cut at (null when no file was published). The pages serve the files only while it equals focalX/focalY. */
  fileFocalX: number | null;
  fileFocalY: number | null;
  /** The public URL of the source photo (bucket images/group-photos/<slug>.jpg), null without a source_path. */
  sourceUrl: string | null;
}

export interface CatalogCard {
  /** card_no, the integer key. */
  n: number;
  /** The set number, 'BV1-0001'. */
  num: string;
  /** cards_entities.id: 'idol:<QID>', 'group:<QID>' or 'event:<slug>'. */
  entity: string;
  kind: CardKind;
  rarity: Rarity;
  edition: Edition;
  /** Stage name, group name or event name. */
  name: string;
  /** Group name for an idol card, null otherwise. */
  group: string | null;
  debutYear: number | null;
  photo: PhotoCredit | null;
  /** Added by lane C after the first commit; optional so older fixtures still type-check. */
  image?: CardImage | null;
}

/** An idol, a group or an event, with the reasons its missing editions are missing (LOCK_SENTENCES keys). */
export interface CatalogEntity {
  id: string;
  kind: CardKind;
  name: string;
  /** cards_entities.id of the group, for an idol. */
  groupId: string | null;
  group: string | null;
  debutYear: number | null;
  sortKey: string;
  /** {"SR":"one","L":"crop"}: why a missing edition is missing. */
  lockReasons: Partial<Record<Rarity, LockReason>>;
}

/** GET /api/cards/catalog. */
export interface CatalogPayload {
  generatedAt: string;
  odds: CatalogOdds | null;
  cards: CatalogCard[];
  entities: CatalogEntity[];
}

/** One line of the player's binder as the API returns it. */
export interface OwnedEntry {
  n: number;
  copies: number;
  fav: boolean;
  /** ISO time of the last pull. */
  at: string;
}

/** The wallet as the client sees it (GET /api/cards/state). Every value comes from the database. */
export interface WalletState {
  stock: number;
  cap: number;
  /** ISO time of the next refill, null when the stack is full. */
  nextAt: string | null;
  /** ISO time of the next 00:00 Europe/Paris. */
  midnightAt: string;
  adsLeft: number;
  adsEnabled: boolean;
  shards: number;
  bonusLeft: number;
  owned: OwnedEntry[];
  /** The odds of the real catalog (null while the catalog is empty). */
  odds?: CatalogOdds | null;
}

export interface OpenedCard {
  n: number;
  isNew: boolean;
}

export interface OpenResult {
  pack: { id: string; cards: OpenedCard[] };
  state: WalletState;
}

/** A stored wallet row (cards_wallets), times as ms since epoch, ISO string or Date. */
export interface WalletRow {
  stock: number;
  anchor: number | string | Date;
  parisDay: string;
  adsToday: number;
  bonusToday: number;
  shards?: number;
}

/** What walletAt returns: the row after the refill and the Paris midnight, never written. */
export interface WalletClock {
  stock: number;
  /** ms since epoch of the refill anchor. */
  anchor: number;
  parisDay: string;
  adsToday: number;
  bonusToday: number;
  /** ms since epoch of the next refill, null when the stack is full. */
  nextAt: number | null;
  /** ms since epoch of the next 00:00 Europe/Paris. */
  midnightAt: number;
}

/** The minimal pool entry the draw needs (a CatalogCard satisfies it). */
export interface PoolCard {
  n: number;
  kind: CardKind;
  rarity: Rarity;
}

/** An integer in [0, maxExclusive). The server passes crypto.randomInt; the tests pass a seeded generator. */
export type Rng = (maxExclusive: number) => number;

/** The odds of the real catalog (computeOdds in rules.ts), in percent: the plan's weights of the rarities with a card in packs, renormalised. */
export interface CatalogOdds {
  /** Rarities with at least one card in packs, in order. */
  available: Rarity[];
  /** The plan's weights in percent (C 60, U 24, R 10, SR 4.5, UR 1.2, L 0.3): the inputs of the calculation. */
  planWeights: Record<Rarity, number>;
  /** The sum of the plan's weights of the available rarities (95.2 with C, U, R and UR). */
  availableWeightTotal: number;
  /** Each card: percent per rarity, 0 for a rarity that is not in packs. */
  card: Record<Rarity, number>;
  /** The fifth card: a Common becomes an Uncommon. */
  fifth: Record<Rarity, number>;
  /** Kind weights in percent among the kinds that have a card of that rarity. */
  kinds: Record<Rarity, Partial<Record<CardKind, number>>>;
}

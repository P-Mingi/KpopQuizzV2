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

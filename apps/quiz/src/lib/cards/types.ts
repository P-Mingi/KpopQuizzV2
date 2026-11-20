// Bunnyverse Cards: shared types (lane C CORE owns this file; lanes U and B import it).
// Contract: docs/o1/briefs/CARDS-CONTRACT.md sections 2 and 3.
import type { FinishedSet } from './goals';

export type Rarity = 'C' | 'U' | 'R' | 'SR' | 'UR' | 'L';
export type Edition = 'std' | 'stage' | 'holo' | 'era' | 'gold' | 'full';
export type CardKind = 'idol' | 'group' | 'event';
export type PackSource = 'stock' | 'ad' | 'shards' | 'bonus' | 'reward';
export type PhotoSource = 'commons' | 'koreanet' | 'flickr' | 'dvids';
export type LockReason = 'one' | 'sameday' | 'newg' | 'hiatus' | 'crop' | 'photo' | 'size';
export type PhotoStatus = 'auto' | 'pending' | 'approved' | 'rejected' | 'removed';
/** Lot 2 (owner idea, 2026-11-12): what part of its photo a card shows. 0 the whole photo (a person's card), 1 the left half and 2 the
 *  right half of a group photo. A group gives a pair of cards per edition, with consecutive numbers (cards_catalog.part, file 102). */
export type CardPart = 0 | 1 | 2 | 3;
/** Lot 7 (owner, 2026-11-17): a group photo gives 2 cards (the 11:8.5 window, halves 1 and 2) or 3 cards (the 16.5:8.5 window, thirds 1 to
 *  3), consecutive numbers either way. Part 3 exists only on a photo in 3 cards. */
export type GroupParts = 2 | 3;

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
  /** Lot 2: 1 or 2 for a half of a group photo. The pair's window is 11:8.5 (two cards side by side), placed in the photo by the focal
   *  point; a half shows its side of that window. A cut half is the file <stem>-h<part>-1x.webp (and -2x). 0 or absent: the whole card.
   *  Lot 7: on a photo in 3 cards the window is 16.5:8.5 and a third is the file <stem>-t<part>-1x.webp (and -2x). */
  part?: CardPart;
  /** Lot 7: the number of cards of the photo (2 or 3), with `part`; absent on a whole card. */
  parts?: GroupParts;
}

/** Lot 7: the picture of a panorama, the whole window of the photo (11:8.5 for 2 cards, 16.5:8.5 for 3), shown in landscape. */
export interface PanoImage {
  /** The panorama file <stem>-p<parts>-1x.webp (320 x parts by 495) when the owner's script cut it at the current focal point and parts;
   *  else null (then `partUrls` or the source photo). */
  url: string | null;
  /** Its 2x file (640 x parts by 989), only when every part is at least 640 px wide in the original. */
  url2x: string | null;
  /** The 1x files of the parts, left to right, when they are cut but the panorama file is not: the page shows them side by side. */
  partUrls: string[] | null;
  /** The source photo to crop in CSS to the window (object-fit: cover, object-position from the focal point) when nothing is cut. */
  sourceUrl: string | null;
  focalX: number;
  focalY: number;
  /** True when a part is narrower than 640 px in the original (no honest 2x). */
  small2x: boolean;
}

/** Lot 7: one panorama of the catalog, P-0001 and up (cards_panoramas, file 118). It is never in a pack, never crafted, never recycled: a
 *  player gets it once, from the server, when the open or the craft that completes its photo's set (every part) commits. */
export interface CatalogPanorama {
  /** pano_no, the integer key. */
  p: number;
  /** 'P-0001'. */
  num: string;
  entity: string;
  rarity: Rarity;
  edition: Edition;
  /** The group's name. */
  name: string;
  parts: GroupParts;
  /** The card numbers of its parts, part 1 first. */
  cards: number[];
  photo: PhotoCredit | null;
  image: PanoImage | null;
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
  /** Lot 2: the year a disbanded group disbanded (cards_entities.end_year, file 102), null otherwise. Optional for older payloads. */
  endYear?: number | null;
  photo: PhotoCredit | null;
  /** Added by lane C after the first commit; optional so older fixtures still type-check. */
  image?: CardImage | null;
  /** Lot 2: 1 or 2 for a half of a group photo (see CardPart); 0 or absent for a whole card. */
  part?: CardPart;
  /** Lot 2: the card_no of the other half of the pair (same subject, same edition), null when it is not in packs. */
  pairN?: number | null;
  /** Lot 7: the number of cards of the photo (2 or 3), on a part; absent on a whole card. */
  parts?: GroupParts;
  /** Lot 7: the card numbers of every part of the photo, part 1 first (this card included), on a part; absent on a whole card. */
  setNs?: number[];
  /** Lot 7: the panorama of the photo (its pano_no), on a part; absent on a whole card. */
  pano?: number;
  /** Owner decision 2026-11-18: true on a card that is out of packs (no live photo now). It is in `CatalogPayload.retired`, never in `cards`; a player who owns it keeps it in the binder as the "New photo coming" frame. */
  retired?: true;
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
  /** Lot 2: the year a disbanded group disbanded, null otherwise. */
  endYear?: number | null;
  sortKey: string;
  /** {"SR":"one","L":"crop"}: why a missing edition is missing. */
  lockReasons: Partial<Record<Rarity, LockReason>>;
  /** Lot 6: true while the subject is age-locked (a minor, a group with a minor, a birth date not known): the binder shows a pocket with its
   *  name and "Carte à venir". A boolean ONLY: the month it opens is never sent to a browser (the admin reads it from cards_age_locks()). The
   *  entity has no card and is left out of every list but the binder. Absent when not locked. */
  locked?: true;
}

/** GET /api/cards/catalog. */
export interface CatalogPayload {
  generatedAt: string;
  odds: CatalogOdds | null;
  cards: CatalogCard[];
  entities: CatalogEntity[];
  /** Lot 7: the panoramas whose parts are in packs, by pano_no. Absent before file 118. */
  panoramas?: CatalogPanorama[];
  /** Cards out of packs (their photo left, rights or the photo check): the "New photo coming" cards of the players who own them. Never drawn, never counted, never in the odds. Absent when there is none. */
  retired?: CatalogCard[];
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
  /** Lot 3 A13: packs the timer may add a Paris day (TIMER_PACKS_PER_DAY, or CARDS_TIMER_PER_DAY). Optional for older payloads. */
  timerCap?: number;
  /** Lot 3 A13: packs the timer added since Paris midnight ("14 of 40 timer packs today"). */
  timerUsed?: number;
  /** Lot 3 A13: refills the timer may still add today. At 0 the stack adds nothing until Paris midnight; the packs in it still open. */
  timerLeft?: number;
  /** Lot 3 A11: packs left up to and including the one with a Gold card 5 for sure (1 = the next pack); null while no Gold card is in packs. */
  pityLeft?: number | null;
  /** Lot 3 A17: true once today's focus pack is opened. */
  focusUsed?: boolean;
  /** Lot 3 A17: the card numbers of the wishlist (missing cards only, at most WISHLIST_MAX). */
  wishlist?: number[];
  /** Lot 4 B4: the shards a rewarded ad gives (CARDS_AD_SHARDS, default AD_SHARDS_DEFAULT). */
  adShards?: number;
  /** Lot 4 B3: the last 10 packs, newest first. */
  recent?: RecentPack[];
  /** Lot 4 A15 (Goals): reward packs waiting, opened from the Goals tab (source 'reward'). Absent when none wait. */
  rewardPacks?: number;
  /** The odds of the real catalog (null while the catalog is empty). */
  odds?: CatalogOdds | null;
  /** Lot 7: the pano_no of every panorama the player holds. Absent before file 118. */
  panoramas?: number[];
}

/** Lot 4 B3: one line of the player's last packs. */
export interface RecentPack {
  /** ISO time the pack was opened. */
  at: string;
  /** The best edition among its five cards. */
  best: Edition;
  source: PackSource;
  /** The cards new to the player in that pack, null for a pack opened before the moment was recorded. */
  newCount: number | null;
}

export interface OpenedCard {
  n: number;
  isNew: boolean;
  /** Lot 3 A12: true when this new card is the other half of a group edition of which the player already owned one half. Lot 7: true when
   *  this new card is the last missing part of its photo (2 or 3 cards). */
  completesPair?: boolean;
  /** Lot 7: the pano_no of the panorama this card's photo gave the player (the set is complete), granted in the same transaction. */
  pano?: number;
}

export interface OpenResult {
  pack: {
    id: string; cards: OpenedCard[]; newCount?: number; packNo?: number; /** Lot 4 A15: the sets this pack completed (each pays its reward packs once). */ finished?: FinishedSet[];
    /** Lot 7: the panoramas this pack gave (pano_no), in the order of the cards that completed them. */ panoramas?: number[];
  };
  state: WalletState;
}

/** POST /api/cards/ad/grant (lot 4 B4): a rewarded ad gives shards, not a pack. */
export interface AdResult {
  gained: number;
  shards: number;
  state: WalletState;
}

/** POST /api/cards/ad/claim (launch polish): a rewarded ad that was viewed gives 1 pack, once per ticket, within the daily cap. `granted` false: the ticket was
 *  spent for nothing (reason 'daily_cap'), or this is a replay of an earlier answer. */
export interface AdClaimResult {
  granted: boolean;
  replayed: boolean;
  reason?: string;
  /** The stack after the claim, when a pack was given. */
  stock?: number;
}

/** A stored wallet row (cards_wallets), times as ms since epoch, ISO string or Date. */
export interface WalletRow {
  stock: number;
  anchor: number | string | Date;
  parisDay: string;
  adsToday: number;
  bonusToday: number;
  shards?: number;
  /** Lot 3 A13: the timer refills since Paris midnight (cards_wallets.timer_today). */
  timerToday?: number;
}

/** What walletAt returns: the row after the refill and the Paris midnight, never written. */
export interface WalletClock {
  stock: number;
  /** ms since epoch of the refill anchor. */
  anchor: number;
  parisDay: string;
  adsToday: number;
  bonusToday: number;
  /** Lot 3 A13: the timer refills since Paris midnight, after this sync. */
  timerToday: number;
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
  /** Lot 2: the subject (cards_entities.id). The draw picks a subject first, then one of its cards of the rolled rarity (the two halves of a
   *  group), so a group with a pair comes out as often as a subject with one card. Without it, every card is its own subject. */
  entity?: string;
  /** Lot 3 (C4): the group of the card's subject (cards_entities.group_id of an idol), so a focus pack finds a group's idols. */
  group?: string | null;
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
  /** The share of each rarity that goes to each kind, in percent: the plan's kind weights once the catalog has the plan's form, else each
   *  kind's share of the subjects (owner decision 2026-11-13: every subject the same chance). */
  kinds: Record<Rarity, Partial<Record<CardKind, number>>>;
  /** Lot 2: true when the plan's kind weights apply (rules.ts hasPlanForm). Optional for older payloads. */
  kindWeights?: boolean;
  /** Lot 2: the number of subjects per rarity and kind (a group with a pair counts once). Optional so older payloads still type-check. */
  subjects?: Record<Rarity, Partial<Record<CardKind, number>>>;
  /** Lot 2: the number of cards per rarity and kind (a group with a pair counts twice). */
  cards?: Record<Rarity, Partial<Record<CardKind, number>>>;
}

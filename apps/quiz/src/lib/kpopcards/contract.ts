// KpopCards (bunnyverse.org/kpopcards), lots 3 + 4 + 5: THE API CONTRACT. One file, types only (plus small constants and pure helpers every
// side needs): the request and the response of every endpoint under /api/cards/*, the error codes, the limits. The server (routes, SQL), the
// seeded mock (mock-api.ts) and the screens all read this file; the prototype docs/design/cards/kpopcards-prototype-v6.html wins where a
// text disagrees. The server decides everything (draws, the stack, the golden pack, the guarantee, the sets, the level, the ranking); a
// screen only shows what an answer says.
//
// Conventions
//  - Every route answers JSON with `cache-control: no-store`. A refusal is `{ error: ErrorCode, message?: string }` with the HTTP status of
//    ERROR_STATUS. 404 `not_found` is also what a closed build, NET_CARDS off or PRIVATE_LAUNCH gives (a closed URL looks like any unknown one).
//  - Every write is same-origin (Origin or Sec-Fetch-Site), refuses a Team account (403 editorial_account), is rate limited (429 rate_limited)
//    and, when it spends or gives anything (open, craft, recycle, claim, ad grant, friend redeem), carries an IDEMPOTENCY KEY: a UUID the
//    client makes once per user intention, sent as the `Idempotency-Key` header (the body field `key` is read when the header is absent).
//    The same key returns the same answer and never costs or gives twice (a retry or a double tap). The same key on another operation is
//    409 idem_conflict. A key is kept 24 hours.
//  - Times are ISO strings (UTC). Midnight, the pack of the day and the week are Europe/Paris. Rarities travel as `Edition` words (the one
//    name per rarity: Standard, Stage, Holo, Era, Gold, Full Art) AND as the code letters where the older types need them.
//  - Player text is English, no em dash or en dash.
import type { CardKind, Edition, OpenedCard as LegacyOpenedCard, OwnedEntry, PackSource, Rarity, RecentPack, WalletState } from '../cards/types';

export type { CardKind, Edition, OwnedEntry, Rarity, RecentPack };

/* ------------------------------------------------------------------ constants the screens may print */

export const KC = {
  /** The stack holds this many packs (was 5, then 10, then 7; the owner's rule of 2026-11-23 is 5 again). The SQL twin is 125-cap-5.sql. */
  STACK_CAP: 5,
  /** A pack from the timer every 10 minutes. */
  PERIOD_MIN: 10,
  /** At most this many timer packs a Paris day (the midnight top-up is not counted). */
  TIMER_PER_DAY: 40,
  /** After 29 packs in a row with no Gold and no Full Art, the 5th card of the 30th is Gold. */
  GOLD_BY_PACK: 30,
  /** Every 10th pack is golden: its 5th card is Holo or better. */
  GOLDEN_EVERY: 10,
  /** Open 5 opens five packs of the stack at once. */
  OPEN_MANY: 5,
  /** A pack bought with shards. */
  SHARD_PACK: 50,
  /** Kpopdle bonus packs a Paris day (CARDS_BONUS_PER_DAY, default 3), each earned by one won Kpopdle play. */
  BONUS_PER_DAY: 3,
  ADS_PER_DAY: 3,
  /** One level every 10 distinct cards. */
  CARDS_PER_LEVEL: 10,
  SHOWCASE: 3,
  FRIENDS_MAX: 100,
  CODE_TTL_HOURS: 24,
  WISHLIST_MAX: 50,
} as const;

/** The titles of the levels: the first level that wears each one (prototype LEVELS). */
export const LEVEL_TITLES: readonly { from: number; title: string }[] = [
  { from: 1, title: 'Rookie' },
  { from: 5, title: 'Trainee' },
  { from: 10, title: 'Idol' },
  { from: 20, title: 'Ace' },
  { from: 30, title: 'Legend' },
];

export const levelOf = (distinctCards: number): number => 1 + Math.floor(Math.max(0, distinctCards) / KC.CARDS_PER_LEVEL);
export function titleOf(level: number): string {
  let t = LEVEL_TITLES[0]!.title;
  for (const x of LEVEL_TITLES) if (level >= x.from) t = x.title;
  return t;
}

/* ------------------------------------------------------------------ errors */

export type ErrorCode =
  | 'bad_request' | 'unauthorized' | 'not_found' | 'origin' | 'editorial_account' | 'rate_limited' | 'server'
  | 'idem_conflict' | 'idem_missing'
  // packs
  | 'bonus' | 'empty' | 'stack_short' | 'shards' | 'daily_used' | 'focus_used' | 'focus' | 'pack' | 'source'
  // ads
  | 'ad_limit' | 'ticket'
  // collection
  | 'card' | 'owned' | 'no_craft' | 'wish_limit' | 'locked' | 'not_owned'
  // recycle
  | 'confirm_required' | 'nothing_to_recycle' | 'last_copy'
  // missions
  | 'set_unknown' | 'set_not_done' | 'already_claimed' | 'week_not_done'
  // friends and players
  | 'code_invalid' | 'code_expired' | 'code_used' | 'friend_limit' | 'self_friend' | 'not_friend' | 'no_nickname' | 'player_unknown'
  // idol
  | 'idol_unknown' | 'idol_locked'
  // prefs
  | 'pref';

export const ERROR_STATUS: Record<ErrorCode, number> = {
  bad_request: 400, unauthorized: 401, not_found: 404, origin: 403, editorial_account: 403, rate_limited: 429, server: 500,
  idem_conflict: 409, idem_missing: 400,
  bonus: 409, empty: 409, stack_short: 409, shards: 409, daily_used: 409, focus_used: 409, focus: 400, pack: 409, source: 400,
  ad_limit: 409, ticket: 409,
  card: 404, owned: 409, no_craft: 409, wish_limit: 409, locked: 409, not_owned: 409,
  confirm_required: 400, nothing_to_recycle: 409, last_copy: 409,
  set_unknown: 404, set_not_done: 409, already_claimed: 409, week_not_done: 409,
  code_invalid: 404, code_expired: 410, code_used: 409, friend_limit: 409, self_friend: 400, not_friend: 404, no_nickname: 409, player_unknown: 404,
  idol_unknown: 404, idol_locked: 403,
  pref: 400,
};

export interface ApiError { error: ErrorCode; message?: string }
export type ApiResult<T> = T | ApiError;
export const isApiError = (v: unknown): v is ApiError => typeof v === 'object' && v !== null && typeof (v as { error?: unknown }).error === 'string';

/* ------------------------------------------------------------------ shared small shapes */

/** The themes of "Choose your pack". The pack in the centre takes the colours of the choice. */
export type ThemeId = 'all' | 'girls' | 'boys' | 'solo';
export const THEME_IDS: readonly ThemeId[] = ['all', 'girls', 'boys', 'solo'];
export const THEME_NAMES: Record<ThemeId, string> = { all: 'All idols', girls: 'Girl groups', boys: 'Boy groups', solo: 'Soloists' };

/** What a pack was opened as. `theme` packs come from the stack (or shards); `daily` and `focus` have their own address. */
export type PackKind = ThemeId | 'daily' | 'focus';

/** A card as a list shows it. `n` is the card number everywhere; the catalog (GET /api/cards/catalog) gives names and pictures. */
export interface CardRef {
  n: number; num: string; name: string; edition: Edition; kind: CardKind; group: string | null;
  /** 1 to 3 for a part of a group photo (lot 7: a photo gives 2 or 3 cards), 0 or absent for a whole card. */
  part?: 0 | 1 | 2 | 3;
  /** Lot 7: the number of cards of the photo, with `part`. */
  parts?: 2 | 3;
}

/** Lot 7 (owner, 2026-11-17): a panorama, the whole landscape picture of a group photo, given once by the server when the player holds every
 *  part of that photo (2 or 3 cards). Its own numbers (P-0001), never in a pack, never crafted, never recycled; it stays if a part is recycled. */
export interface PanoRef {
  /** pano_no. */
  p: number;
  /** 'P-0001'. */
  num: string;
  /** The group's name. */
  name: string;
  /** The edition of its parts. */
  edition: Edition;
  parts: 2 | 3;
  /** The card numbers of its parts, part 1 first. */
  cards: number[];
}

/** Lot 7: a panorama of the binder's Panoramas section (its own completion). */
export interface PanoItem extends PanoRef {
  owned: boolean;
  /** The binder section of its group. */
  section: string;
  /** ISO time it was given, null while missing. */
  grantedAt: string | null;
}

export interface GroupRef { id: string; slug: string; name: string; kind: 'group' | 'solo' }

/* ------------------------------------------------------------------ the lobby: GET /api/cards/state */

export interface ThemeInfo { id: ThemeId; name: string; cards: number }

export interface LevelState {
  level: number;
  title: string;
  /** Distinct cards owned. */
  cards: number;
  /** Cards still to own for the next level (1 to 10). */
  toNext: number;
  /** 0 to 9: cards owned since the last level (the bar is progress * 10 percent). */
  progress: number;
  nextLevel: number;
  /** All titles, for the profile and the help. */
  titles: readonly { from: number; title: string }[];
}

export interface BellItem {
  id: 'stack_full' | 'daily' | 'golden' | 'set_ready' | 'week_ready' | 'friend' | 'still_there';
  /** The page to open: '/kpopcards', '/kpopcards/missions', '/kpopcards/ranking'. */
  href: string;
  title: string;
  text: string;
}

export interface DailyPack {
  group: GroupRef;
  /** True once today's pack of the day was opened (a new group at Paris midnight). */
  used: boolean;
  /** ISO time of the next Paris midnight. */
  endsAt: string;
}

export interface GoldenState {
  /** True when the NEXT pack is the golden one. */
  next: boolean;
  /** Packs until the next golden one, 1 to 10 (1 = the next pack). The chip says "Golden pack in N packs". */
  packsUntil: number;
  /** Packs the player has opened in all (any source); the golden pack is every 10th. */
  opened: number;
}

export interface GuaranteeState {
  /** Packs in a row with no Gold and no Full Art (0 to 29+). */
  streak: number;
  /** Packs left up to and including the one with a sure Gold (1 = the next pack); null while no Gold card is in packs. */
  left: number | null;
  /** The pack number at the latest, 30. */
  by: number;
}

export interface Prefs {
  sound: boolean;
  vibration: boolean;
  /** The theme of the pack in the centre. */
  theme: ThemeId;
  /** The group of the focus pack (cards_entities id), null when none was chosen yet. */
  focus: string | null;
}

export interface WeekMini {
  /** ISO date of the Paris Monday. */
  weekStart: string;
  endsAt: string;
  items: WeekItem[];
  done: boolean;
  claimed: boolean;
}

export interface LastPull {
  /** ISO time. */
  at: string;
  packNo: number;
  cards: { n: number; isNew: boolean }[];
}

/** GET /api/cards/state: everything the lobby, the top bar and the bell show. It extends the wallet of lots 1 to 4 (same field names). */
export interface LobbyState extends WalletState {
  /** The packs the stack holds now (stock) can pass `cap` (rewards): the dots show max(cap, stock). */
  cap: number;
  /** Timer packs left to earn today (timerLeft), and the "40 of 40 today" line comes from timerUsed and timerCap. */
  theme: ThemeId;
  themes: ThemeInfo[];
  daily: DailyPack;
  golden: GoldenState;
  guarantee: GuaranteeState;
  level: LevelState;
  prefs: Prefs;
  bell: BellItem[];
  week: WeekMini;
  /** Sets and the week ready to claim (the badge on the Missions tab). */
  claimable: number;
  /** Cards new to the player, not seen yet (the badge on Collection). */
  newCards: number;
  /** The last pack opened, for "Your last pull". */
  last: LastPull | null;
  /** Packs a player can buy: stock 0 and shards >= SHARD_PACK. The main button reads this. */
  canBuyPack: boolean;
  /** The "still there?" check (quiet): when due, the timer is paused until the player confirms. Nothing is ever taken. */
  stillThere: { due: boolean; since: string | null };
  /** The bridges to kpopquiz.org (the lobby box "On kpopquiz.org +1 pack each"). Kpopdle: a win decided in the database earns a pack (at most perDay a Paris day);
   *  the page that shows the win posts to ROUTES.bonusRecord so the server records it, and the pack is opened with source 'bonus'. Quiz of the day (integrator rule,
   *  115-quiz-of-day-bonus.sql): finishing it gives one pack, counted inside the same perDay (the cap does not move), once per Paris day; the database decides and the
   *  hub's server records it itself when it reads the lobby and before a bonus opening, so no browser report is needed. `done` is true once today's pack is earned;
   *  `enabled` follows the bridges flag. Kpopdle's earnedToday does not count the quiz's pack. */
  bridges: {
    kpopdle: { enabled: boolean; earnedToday: number; left: number; perDay: number };
    quizOfDay: { enabled: boolean; done: boolean };
  };
  /** The player's own nickname (profiles.username), null when none is set (ranking and friends need one). */
  nickname: string | null;
  /** Server clock at the answer, so a screen can correct its countdowns. */
  serverNow: string;
}

/* ------------------------------------------------------------------ open: POST /api/cards/open */

export interface OpenRequest {
  /** UUID, one per intention (Idempotency-Key header or this field). */
  key: string;
  /** 'stock' a pack of the stack (theme), 'daily' the pack of the day (free once a Paris day), 'focus' a focus pack from the stack,
   *  'shards' a pack bought with 50 shards, 'bonus' the pack a Kpopdle win earned (LobbyState.bridges.kpopdle.left > 0; not from the stack). */
  source: 'stock' | 'daily' | 'focus' | 'shards' | 'bonus';
  /** The theme, for 'stock', 'shards' and 'bonus'; default: the player's saved theme. */
  theme?: ThemeId;
  /** The group (cards_entities id 'group:...'), for 'focus'. */
  focus?: string;
  /** 1 or 5. 5 is only for 'stock' and needs five packs in the stack. */
  packs?: 1 | 5;
}

export interface OpenedCardV {
  n: number;
  edition: Edition;
  isNew: boolean;
  /** This new card is the other half of a group edition whose first half the player owned. */
  completesPair: boolean;
  /** This card is the golden pack's fifth card. */
  golden: boolean;
  /** This card is the one the Gold guarantee gave (the 30th pack). */
  guarantee: boolean;
  theme: PackKind;
  /** Lot 7: the panorama this card gave (it was the last missing part of its photo), granted in the same transaction as the pack. */
  pano?: PanoRef;
}

export interface OpenedPack {
  id: string;
  /** The player's pack number (every pack counts, whatever its source). */
  packNo: number;
  source: 'stock' | 'daily' | 'focus' | 'shards' | 'bonus';
  theme: PackKind;
  /** The group of a daily or focus pack. */
  group: GroupRef | null;
  /** A golden pack: its fifth card is Holo or better. */
  golden: boolean;
  /** The Gold guarantee fired in this pack. */
  guarantee: boolean;
  cards: OpenedCardV[];
  newCount: number;
  best: Edition;
  /** Lot 7: the panoramas this pack gave, in the order of the cards that completed them. */
  panoramas?: PanoRef[];
}

export interface FinishedSetV { id: string; name: string; packs: number }

export interface OpenSummary {
  newCards: number;
  copies: number;
  /** Shards the copies are worth if recycled (prototype: "3 copies, worth 7 shards"). */
  copiesShards: number;
  best: Edition;
  goldenPacks: number;
  guaranteePacks: number;
  /** The sets these packs finished: "You finished X. +1 pack waiting in Missions". */
  finished: FinishedSetV[];
  /** Set when the openings raised the level. */
  levelUp: { from: number; to: number; title: string } | null;
  /** "3 new cards for your collection" or "Only copies this time". */
  headline: string;
  /** Lot 7: every panorama these packs gave. */
  panoramas?: PanoRef[];
}

export interface OpenResponse {
  /** One pack, or five for Open 5 (in the order they were opened). */
  packs: OpenedPack[];
  summary: OpenSummary;
  /** True when this answer is the stored one of an earlier request with the same key (nothing was spent again). */
  replayed: boolean;
  state: LobbyState;
}

/* ------------------------------------------------------------------ collection: GET /api/cards/collection */

export interface CollectionQuery {
  /** A group or soloists section: its slug ('twice', 'soloists'); empty: every group. */
  group?: string;
  q?: string;
  kind?: 'all' | 'idol' | 'group';
  /** Edition filters (any of them). */
  rar?: Edition[];
  show?: 'all' | 'owned' | 'missing' | 'fav' | 'want';
  sort?: 'rarity' | 'number' | 'newest';
  /** 1-based page and page size (default 36, at most 120). */
  page?: number;
  per?: number;
}

export interface CollectionGroup extends GroupRef {
  total: number;
  owned: number;
  /** 0 to 100, one decimal. */
  pct: number;
  complete: boolean;
  /** Editions of the group not issued yet (locked pockets). */
  notIssued: number;
}

export type CollectionItem =
  | {
      type: 'card'; n: number; num: string; name: string; edition: Edition; kind: CardKind; group: string | null; section: string; part?: 0 | 1 | 2 | 3;
      /** Lot 7: the number of cards of the photo, on a part. */
      parts?: 2 | 3;
      /** Lot 7: the pano_no of the photo's panorama, on a part. */
      pano?: number;
      owned: boolean; copies: number;
      /** A missing card is a named silhouette: the page prints `name` and `edition` on the pocket. */
      silhouette: boolean;
      fav: boolean; wished: boolean; locked: boolean; isNew: boolean; pairN: number | null;
    }
  | { type: 'not_issued'; entity: string; name: string; edition: Edition; section: string; reason: string | null };

export interface CollectionState {
  groups: CollectionGroup[];
  items: CollectionItem[];
  page: number;
  pages: number;
  /** Items matching the filters, and the totals of the whole catalog. */
  matches: number;
  totals: { owned: number; total: number; pct: number; idols: { owned: number; total: number }; groups: { owned: number; total: number }; notIssued: number };
  /** Lot 7: the Panoramas section, with its own completion (never counted in `totals`). Absent before file 118. */
  panoramas?: { owned: number; total: number; pct: number; items: PanoItem[] };
}

/* ------------------------------------------------------------------ almost there: GET /api/cards/almost */

export interface AlmostItem {
  type: 'group' | 'idol';
  id: string;
  slug: string;
  name: string;
  owned: number;
  total: number;
  /** The first missing card. */
  next: CardRef;
  /** Cards missing (group: 1 to 4; idol: exactly 1). */
  missing: number;
  /** A finished group pays this many packs. */
  rewardPacks: number;
  /** Craft button: the cost of the missing card, null for a Full Art; `canAfford` once the shards cover it. */
  craft: { cost: number; canAfford: boolean } | null;
  wished: boolean;
}
export interface AlmostState { items: AlmostItem[] }

/* ------------------------------------------------------------------ missions: GET /api/cards/missions, POST /api/cards/missions/claim */

export interface MissionSet {
  /** 'group:<entity>', 'solo', 'holo', 'gold' or 'year:<yyyy>'. */
  id: string;
  name: string;
  type: 'Group' | 'Soloists' | 'Edition' | 'Debut';
  kind: 'group' | 'solo' | 'holo' | 'gold' | 'year';
  owned: number;
  total: number;
  done: boolean;
  claimed: boolean;
  /** Packs the set pays, once. */
  packs: number;
  /** Complete and not claimed yet: the button says "Claim +1 pack". */
  ready: boolean;
}

export interface WeekItem { key: 'packs' | 'dle' | 'newc'; label: string; value: number; goal: number; done: boolean }

export interface MissionsState {
  week: WeekMini & { rewardPacks: number; rewardShards: number };
  /** Ready first, then by progress. */
  sets: MissionSet[];
  setsDone: number;
  setsTotal: number;
  claimable: number;
}

export interface ClaimRequest {
  key: string;
  /** A set id, or 'week' for the week's reward. */
  target: string;
}
export interface ClaimResponse {
  target: string;
  packs: number;
  shards: number;
  replayed: boolean;
  missions: MissionsState;
  state: LobbyState;
}

/* ------------------------------------------------------------------ level: GET /api/cards/level */

export interface LevelPage { level: LevelState; pct: number; owned: number; total: number; badges: string[] }

/* ------------------------------------------------------------------ ranking, players, friends */

/** The ranking is by completion % ONLY (never by packs opened). Friends first: the default scope lists the player's friends and himself. */
export interface RankRow {
  pos: number;
  nickname: string;
  level: number;
  title: string;
  /** Completion, 0 to 100, one decimal. */
  pct: number;
  me: boolean;
  friend: boolean;
  /** Up to 3 starred cards (filled with the best owned cards when fewer are starred). */
  showcase: CardRef[];
  badges: string[];
}
export interface RankingState { scope: 'friends' | 'all'; rows: RankRow[]; me: RankRow | null }

export interface PlayerPage {
  nickname: string;
  level: number;
  title: string;
  pct: number;
  owned: number;
  total: number;
  showcase: CardRef[];
  badges: string[];
  me: boolean;
  friend: boolean;
  /** Only for the player himself and his friends: the cards he wants. Never a chat, never a message. */
  wishlist: CardRef[] | null;
}

export interface FriendRow { nickname: string; level: number; title: string; pct: number; wishlist: CardRef[] }
export interface FriendsState {
  friends: FriendRow[];
  /** The player's live one-time code, or null. A new code replaces the old one. */
  code: { code: string; expiresAt: string } | null;
  max: number;
}
export interface FriendCodeResponse { code: string; expiresAt: string }
export interface FriendRedeemRequest { key: string; code: string }
export interface FriendRedeemResponse { friend: FriendRow; friends: FriendsState }
export interface FriendRemoveRequest { nickname: string }

/* ------------------------------------------------------------------ idol pages: GET /api/cards/idol/<slug> */

export interface IdolQuiz { title: string; url: string }
export interface IdolPage {
  slug: string;
  name: string;
  kind: 'idol';
  group: GroupRef | null;
  debutYear: number | null;
  /** Unlocked by owning at least one card of the idol (or of the group, for a group page). A locked page says only the name and how to unlock. */
  unlocked: boolean;
  /** One entry per edition that exists, with what the player owns. Empty while locked. */
  editions: { edition: Edition; n: number; owned: boolean; copies: number }[];
  /** The idol's quizzes on kpopquiz.org (the group's quiz page, the Kpopdle). Empty while locked. */
  quizzes: IdolQuiz[];
}

/* ------------------------------------------------------------------ odds: GET /api/cards/odds */

export interface OddsRow { edition: Edition; rarity: Rarity; /** Percent of cards 1 to 4, 0 for an edition not in packs. */ cards1to4: number; /** Percent of card 5. */ card5: number; /** Percent of the golden pack's card 5 (Holo or better). */ golden5: number }
export interface OddsPack {
  id: PackKind | 'golden';
  name: string;
  /** Cards in the pool of this pack. */
  cards: number;
  rows: OddsRow[];
}
export interface OddsState {
  packs: OddsPack[];
  /** The guarantees, in plain sentences. */
  guarantees: { id: 'gold' | 'golden' | 'pair' | 'focus' | 'daily' | 'five'; text: string }[];
  generatedAt: string;
}

/* ------------------------------------------------------------------ prefs, locks, wishlist, favorites, seen */

/** GET /api/cards/card/{n}: "The moment" of the card view (lot 4 B3). */
export interface CardMoment {
  n: number;
  /** The event the free photo was taken at (cards_photos.event_name, event_date). null hides the line. `precision` says how much of the date is known. */
  event: { name: string; date: string | null; precision: 'day' | 'month' | 'year' | null } | null;
  /** The player's own history of the card, null while he does not own it: when it first came, in which of his packs, or crafted. */
  yours: { firstAt: string; packNo: number | null; how: 'pack' | 'craft' | 'demo'; copies: number } | null;
  /** The quiz page on kpopquiz.org of the idol, else of its group, when one exists (a kpopquiz.org groups row has that slug). null hides the link. */
  quiz: { title: string; url: string } | null;
}

/** POST /api/cards-bridge/bonus { source: 'kpopdle' } (sent by the Kpopdle win line; the server reads the wins itself): the bonus packs recorded for the Paris day. */
export interface BonusAnswer { signedIn: boolean; earned?: number; bonusLeft?: number }

export interface PrefsRequest { sound?: boolean; vibration?: boolean; theme?: ThemeId; focus?: string | null }
export interface PrefsResponse { prefs: Prefs }

export interface LockRequest { n: number; on: boolean }
export interface LockResponse { n: number; locked: boolean; locks: number }

export interface WishRequest { n: number; on: boolean }
export interface WishResponse { n: number; on: boolean; count: number }

export interface FavoriteRequest { n: number; on: boolean }
export interface FavoriteResponse { n: number; fav: boolean }

export interface SeenRequest { ns: number[] }
export interface SeenResponse { newCards: number }

/* ------------------------------------------------------------------ recycle, craft */

/** GET /api/cards/recycle: what a bulk recycle would do now. A locked card and a Gold or Full Art extra are never recycled in bulk, and one copy of every card stays. */
export interface RecyclePreview {
  extras: number;
  shards: number;
  /** Extras left out: locked cards, and Gold and Full Art extras. */
  skipped: { locked: number; goldAndFullArt: number };
  /** True when there is something to recycle. */
  canRecycle: boolean;
  /** The sentence the page asks the player to confirm. */
  confirm: string;
}
export interface RecycleRequest {
  key: string;
  /** Must be true: the server refuses 400 confirm_required otherwise. */
  confirm: boolean;
  /** Bulk (default) or one card: a single extra copy of any edition, never a locked card, never the last copy. */
  n?: number;
}
export interface RecycleResponse { recycled: number; shards: number; skipped: RecyclePreview['skipped']; replayed: boolean; state: LobbyState }

export interface CraftRequest { key: string; n: number }
export interface CraftResponse {
  n: number; cost: number; finished: FinishedSetV[]; replayed: boolean; state: LobbyState;
  /** Lot 7: the panorama this craft gave (the crafted card was the last missing part of its photo), null otherwise. */
  pano?: PanoRef | null;
}

/* ------------------------------------------------------------------ ads, demo, still there */

export interface AdTicketResponse { ticket: string }
export interface AdGrantRequest { key: string; ticket: string }
export interface AdGrantResponse { gained: number; shards: number; replayed: boolean; state: LobbyState }

export interface DemoDrawResponse { token: string; cards: LegacyOpenedCard[] }
export interface DemoClaimRequest { token: string; device: string }
export interface DemoClaimResponse { added: LegacyOpenedCard[]; state: LobbyState }

/** POST /api/cards/still-there: the quiet check. It never costs a pack: it only restarts a paused timer. */
export interface StillThereResponse { ok: true; state: LobbyState }

/* ------------------------------------------------------------------ help: GET /api/cards/help */

export interface HelpData {
  how: { title: string; text: string }[];
  faq: { q: string; a: string }[];
  /** The rules in numbers, so a page never types them. */
  rules: { stackCap: number; periodMinutes: number; timerPerDay: number; goldByPack: number; goldenEvery: number; shardPack: number; adsPerDay: number };
  reportRoles: { id: 'person' | 'photographer' | 'agency' | 'other'; label: string }[];
  creditsNote: string;
}

/* ------------------------------------------------------------------ the client interface and the routes */

/** The whole API as the screens call it. The real one is a fetch client; the seeded mock (mock-api.ts) implements it in memory. */
export interface KpopCardsApi {
  state(): Promise<ApiResult<LobbyState>>;
  open(req: OpenRequest): Promise<ApiResult<OpenResponse>>;
  collection(q?: CollectionQuery): Promise<ApiResult<CollectionState>>;
  almost(limit?: number): Promise<ApiResult<AlmostState>>;
  missions(): Promise<ApiResult<MissionsState>>;
  claim(req: ClaimRequest): Promise<ApiResult<ClaimResponse>>;
  level(): Promise<ApiResult<LevelPage>>;
  ranking(scope?: 'friends' | 'all'): Promise<ApiResult<RankingState>>;
  player(nickname: string): Promise<ApiResult<PlayerPage>>;
  friends(): Promise<ApiResult<FriendsState>>;
  friendCode(): Promise<ApiResult<FriendCodeResponse>>;
  friendRedeem(req: FriendRedeemRequest): Promise<ApiResult<FriendRedeemResponse>>;
  friendRemove(req: FriendRemoveRequest): Promise<ApiResult<FriendsState>>;
  idol(slug: string): Promise<ApiResult<IdolPage>>;
  odds(): Promise<ApiResult<OddsState>>;
  card(n: number): Promise<ApiResult<CardMoment>>;
  prefs(req: PrefsRequest): Promise<ApiResult<PrefsResponse>>;
  lock(req: LockRequest): Promise<ApiResult<LockResponse>>;
  wish(req: WishRequest): Promise<ApiResult<WishResponse>>;
  favorite(req: FavoriteRequest): Promise<ApiResult<FavoriteResponse>>;
  seen(req: SeenRequest): Promise<ApiResult<SeenResponse>>;
  recyclePreview(): Promise<ApiResult<RecyclePreview>>;
  recycle(req: RecycleRequest): Promise<ApiResult<RecycleResponse>>;
  craft(req: CraftRequest): Promise<ApiResult<CraftResponse>>;
  adTicket(): Promise<ApiResult<AdTicketResponse>>;
  adGrant(req: AdGrantRequest): Promise<ApiResult<AdGrantResponse>>;
  demoDraw(): Promise<ApiResult<DemoDrawResponse>>;
  demoClaim(req: DemoClaimRequest): Promise<ApiResult<DemoClaimResponse>>;
  stillThere(): Promise<ApiResult<StillThereResponse>>;
  help(): Promise<ApiResult<HelpData>>;
}

/** Method and path of each call (under the site's base path). `write` calls are same-origin, rate limited, and carry an idempotency key when `key` is true. */
export const ROUTES = {
  state: { method: 'GET', path: '/api/cards/state' },
  open: { method: 'POST', path: '/api/cards/open', write: true, key: true },
  collection: { method: 'GET', path: '/api/cards/collection' },
  almost: { method: 'GET', path: '/api/cards/almost' },
  missions: { method: 'GET', path: '/api/cards/missions' },
  claim: { method: 'POST', path: '/api/cards/missions/claim', write: true, key: true },
  level: { method: 'GET', path: '/api/cards/level' },
  ranking: { method: 'GET', path: '/api/cards/ranking' },
  player: { method: 'GET', path: '/api/cards/player/{nickname}' },
  friends: { method: 'GET', path: '/api/cards/friends' },
  friendCode: { method: 'POST', path: '/api/cards/friends/code', write: true },
  friendRedeem: { method: 'POST', path: '/api/cards/friends/redeem', write: true, key: true },
  friendRemove: { method: 'POST', path: '/api/cards/friends/remove', write: true },
  idol: { method: 'GET', path: '/api/cards/idol/{slug}' },
  odds: { method: 'GET', path: '/api/cards/odds' },
  card: { method: 'GET', path: '/api/cards/card/{n}' },
  prefs: { method: 'POST', path: '/api/cards/prefs', write: true },
  lock: { method: 'POST', path: '/api/cards/lock', write: true },
  wish: { method: 'POST', path: '/api/cards/wish', write: true },
  favorite: { method: 'POST', path: '/api/cards/favorite', write: true },
  seen: { method: 'POST', path: '/api/cards/seen', write: true },
  recyclePreview: { method: 'GET', path: '/api/cards/recycle' },
  recycle: { method: 'POST', path: '/api/cards/recycle', write: true, key: true },
  craft: { method: 'POST', path: '/api/cards/craft', write: true, key: true },
  adTicket: { method: 'POST', path: '/api/cards/ad/ticket', write: true },
  adGrant: { method: 'POST', path: '/api/cards/ad/grant', write: true, key: true },
  demoDraw: { method: 'POST', path: '/api/cards/demo', write: true },
  demoClaim: { method: 'POST', path: '/api/cards/demo/claim', write: true },
  stillThere: { method: 'POST', path: '/api/cards/still-there', write: true },
  help: { method: 'GET', path: '/api/cards/help' },
} as const satisfies Record<keyof KpopCardsApi, { method: 'GET' | 'POST'; path: string; write?: true; key?: true }>;

/** Page addresses the answers point at (the screens' routes). */
export const PAGES = {
  lobby: '/kpopcards',
  collection: '/kpopcards/collection',
  missions: '/kpopcards/missions',
  ranking: '/kpopcards/ranking',
  odds: '/kpopcards/odds',
  help: '/kpopcards/help',
  open: (p: PackKind): string => `/kpopcards/open/${p === 'focus' ? 'focus' : p}`,
  idol: (slug: string): string => `/kpopcards/idol/${slug}`,
  player: (nickname: string): string => `/kpopcards/u/${nickname}`,
} as const;

/** The legacy pack source of a stored pack (cards_packs.source). */
export type StoredSource = PackSource;

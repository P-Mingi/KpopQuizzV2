// Run O1 contract o1-contract-v1: the shared passport's names and shapes (docs/o1/contracts/cookies.md, apis.md
// sections 2 and 3, rpcs.md). Types and constants only. Nothing on the kpop path imports this module until B3, B4
// and B7 wire their code; their implementations satisfy the signature types below.
//
// Import it as '@/lib/passport/types'. '@/lib/passport' stays today's kpop module (lib/passport.ts, the K-pop
// Passport spine): a file wins over a folder in module resolution, so this folder never gets an index.ts
// (naming.md, F0 decision 63; contract.test.ts checks it).

import type { Profile } from '../db/types';
import type { TableRow } from '../db/contract.types';
import type { NetBridgeId, NetSiteChoice, NetSitesMenuMode } from '../network/types';
import type { PickIcon, SiteId } from '../site/types';

// ---------------------------------------------------------------------------------------------------------------
// 1. Memberships (schema.sql 003, 007; rpcs.md 2)
// ---------------------------------------------------------------------------------------------------------------

/** `world_memberships.joined_via` (schema.sql 003). `continue` and `seed` are reserved for P2 and P3a. */
export const JOINED_VIA = ['backfill', 'signup', 'jump', 'continue', 'seed', 'play'] as const;
export type JoinedVia = (typeof JOINED_VIA)[number];

/** A membership row as the contract types it. */
export type MembershipRow = TableRow<'public.world_memberships'>;

/** Keys `update_my_membership(p_site, p_patch)` accepts on every site (rpcs.md 2). */
export const MEMBERSHIP_PATCH_KEYS_ANY_SITE = ['show_elsewhere', 'auto_continue', 'notice_seen_at'] as const;

/** Keys it accepts on non-kpop sites only (the kpop presentation stays on profiles, P 7.3). */
export const MEMBERSHIP_PATCH_KEYS_NON_KPOP = [
  'bio', 'header_url', 'profile_theme', 'pinned_badge_id', 'display_name_override', 'avatar_override', 'tag_text',
  'since_year',
] as const;

type MembershipPatchKey = (typeof MEMBERSHIP_PATCH_KEYS_ANY_SITE)[number] | (typeof MEMBERSHIP_PATCH_KEYS_NON_KPOP)[number];

/** `p_patch` of `update_my_membership`: a key set to null clears a nullable column; any other key raises. */
export type MembershipPatch = Partial<Pick<MembershipRow, MembershipPatchKey>>;

/**
 * The JSON of `world_memberships.avatar_override` (F0 decision 64): each key replaces the profiles column of the
 * same name on that site only. An absent key keeps the profiles value.
 */
export interface MembershipAvatarOverride {
  readonly avatar_url?: string | null;
  readonly avatar_bg?: string;
  readonly avatar_text?: string;
}

/**
 * The projection of ANOTHER member's membership row (the world_memberships policy note of schema.sql 003): a server
 * reading someone else's row with the service role selects these columns and nothing else, and only when the row is
 * activated, not banned, and (off its own site) `show_elsewhere` is true. Shown on /u and the passport pages.
 */
export const MEMBER_PUBLIC_COLUMNS = [
  'site_id', 'joined_at', 'xp', 'quizzes_played', 'blindtests_played', 'games_played', 'quizzes_created',
  'plays_received', 'likes_received', 'follower_count', 'following_count', 'daily_streak', 'daily_streak_longest',
  'last_daily_date', 'bio', 'header_url', 'profile_theme', 'pinned_badge_id', 'display_name_override',
  'avatar_override', 'tag_text', 'since_year',
] as const;

/** Read for another member only to filter (never rendered, never sent to a browser). */
export const MEMBER_FILTER_COLUMNS = ['user_id', 'activated_at', 'show_elsewhere', 'banned_at'] as const;

/** Never read for another member: acquisition and private state (P 8.1). */
export const MEMBER_PRIVATE_COLUMNS = [
  'joined_via', 'via_code', 'first_play_at', 'auto_continue', 'notice_seen_at', 'last_seen_at',
] as const;

export type MemberPublic = Pick<MembershipRow, (typeof MEMBER_PUBLIC_COLUMNS)[number]>;

/**
 * How `profileForSite` maps a membership onto a profiles-shaped object, so the shared kpop components render a
 * non-kpop profile unchanged (rule 18; F0 decision 64). Key: the profiles field the shared components read; value:
 * the membership column that replaces it on a non-kpop site. A null membership value becomes the field's neutral
 * value (0 for a count, '' for `bio`, null otherwise) and never falls back to the kpop value (no K-pop text on
 * anime), except `display_name`, which falls back to `profiles.display_name`.
 */
export const PROFILE_FROM_MEMBERSHIP = {
  display_name: 'display_name_override',
  bio: 'bio',
  header_url: 'header_url',
  profile_theme: 'profile_theme',
  pinned_badge_id: 'pinned_badge_id',
  stan_since: 'since_year',
  bias: 'tag_text',
  xp: 'xp',
  total_quizzes_created: 'quizzes_created',
  total_plays_received: 'plays_received',
  total_likes_received: 'likes_received',
  follower_count: 'follower_count',
  following_count: 'following_count',
} as const satisfies Record<string, (typeof MEMBER_PUBLIC_COLUMNS)[number]>;

/** The profiles fields `profileForSite` reads (today's Profile plus the kpop identity columns it must blank). */
export type ProfileForSiteInput = Profile & {
  readonly bias?: string | null;
  readonly ult_groups?: unknown;
  readonly profile_theme?: string | null;
};

/** One row of `my_passport()` (rpcs.md 2): the viewer's own summary per membership. */
export interface MyPassportRow {
  readonly site_id: SiteId;
  readonly joined_at: string;
  readonly joined_via: JoinedVia;
  readonly via_code: string | null;
  readonly activated_at: string | null;
  readonly xp: number;
  readonly plays: number;
  readonly daily_streak: number;
  readonly quizzes_created: number;
  readonly show_elsewhere: boolean;
}

/** One row of `public_passport(p_username)`: a visible stamp of another member (fail closed: no stamp, no row). */
export interface PublicPassportRow {
  readonly username: string;
  readonly display_name: string | null;
  readonly avatar_url: string | null;
  readonly site_id: SiteId;
  readonly joined_at: string;
  readonly xp: number;
  readonly quizzes_created: number;
  readonly daily_streak: number;
  /** Only when the member turned "show my passport level" on, else null. */
  readonly passport_xp: number | null;
  readonly showcase_badges: readonly string[];
}

/**
 * `p_patch` of `set_passport_prefs` (rpcs.md 2). Top-level keys replace their column, except `worlds` and
 * `dismissed`, whose given keys merge into the stored object (a key set to null removes it). Any other key raises.
 */
export interface PassportPrefsPatch {
  readonly worlds?: Readonly<Partial<Record<SiteId, NetSiteChoice | null>>>;
  readonly show_passport_level?: boolean;
  /** At most 3 badge ids. */
  readonly showcase_badges?: readonly string[];
  readonly your_sites_menu?: NetSitesMenuMode;
  readonly crossover_suggestions?: boolean;
  readonly welcomed_sites?: readonly SiteId[];
  /** ISO "until" per link id, or null to forget the dismissal. */
  readonly dismissed?: Readonly<Partial<Record<NetBridgeId, string | null>>>;
}

export const PASSPORT_PREFS_PATCH_KEYS = [
  'worlds', 'show_passport_level', 'showcase_badges', 'your_sites_menu', 'crossover_suggestions', 'welcomed_sites',
  'dismissed',
] as const satisfies readonly (keyof PassportPrefsPatch)[];

// ---------------------------------------------------------------------------------------------------------------
// 2. The jump: ticket, transaction cookie, code (cookies.md 1 to 5; never extendable, BACKLOG 5.3)
// ---------------------------------------------------------------------------------------------------------------

/** `passport.handoff_events.outcome` (cookies.md 5); a new outcome is a CR (BACKLOG 5.2). */
export const HANDOFF_OUTCOMES = [
  'issued', 'redeemed', 'login_required', 'state_mismatch', 'pkce_fail', 'expired', 'replay', 'banned',
  'rate_limited', 'unconfirmed', 'deletion_pending', 'bad_ticket',
] as const;
export type HandoffOutcome = (typeof HANDOFF_OUTCOMES)[number];

/** What `passport_issue_code` returns: issued, or the refusal it logged. */
export type IssueOutcome = Extract<HandoffOutcome, 'issued' | 'unconfirmed' | 'banned' | 'deletion_pending' | 'rate_limited'>;

/** What `passport_redeem_code` returns in its `outcome` column. */
export type RedeemOutcome = Extract<HandoffOutcome, 'redeemed' | 'pkce_fail' | 'replay' | 'expired'>;

/** The JSON inside a ticket (cookies.md 1), keys in this order. */
export interface TicketPayload {
  readonly v: 1;
  readonly from: SiteId;
  readonly to: SiteId;
  readonly next: string;
  readonly exp: number;
}

/** The JSON inside the relying party's transaction cookie (cookies.md 2). */
export interface TxCookiePayload {
  readonly state: string;
  readonly verifier: string;
  readonly next: string;
  readonly from: SiteId;
  readonly via: string | null;
  readonly iat: number;
}

/** Lifetimes in seconds (cookies.md 1 to 3; P S6 for the fresh sign-in of a deletion). */
export const PASSPORT_SECONDS = {
  ticket: 600,
  txCookie: 300,
  code: 60,
  freshSignIn: 600,
} as const;

/** Bounds (cookies.md 1 and 3). The two rates were confirmed with G0; G15 may still move the numbers. */
export const PASSPORT_LIMITS = {
  nextMaxLength: 2048,
  codesPerUserHour: 30,
  codesPerIpHashHour: 60,
} as const;

/** The transaction cookie's name: `https` on every https request, `devHttp` only on http `*.localhost`. */
export const TX_COOKIE_NAMES = { https: '__Host-pp_tx', devHttp: 'pp_tx' } as const;

/** MAC labels (cookies.md 1 and 2; apis.md 3.3 for the revalidate signature). */
export const MAC_LABELS = { ticket: 'pp-ticket.v1.', tx: 'pp-tx.v1.', revalidate: 'pp-revalidate.v1.' } as const;

/** 32 random bytes in base64url: a code, a PKCE verifier, a PKCE challenge (cookies.md 2 and 3). */
export const B64U_32_RE = /^[A-Za-z0-9_-]{43}$/;
/** 16 random bytes in base64url: the state (cookies.md 2). */
export const B64U_16_RE = /^[A-Za-z0-9_-]{22}$/;
/** The stored code hash: lowercase hex SHA-256 (cookies.md 3). */
export const CODE_HASH_RE = /^[0-9a-f]{64}$/;

/** `prompt` of /auth/authorize: only 'none' in the run ('select' is reserved for P2 and answers 400). */
export type AuthorizePrompt = 'none';

// ---------------------------------------------------------------------------------------------------------------
// 3. HTTP bodies (apis.md 2 and 3)
// ---------------------------------------------------------------------------------------------------------------

/** Error body of every JSON route of apis.md: a stable code, never a message with personal data. */
export interface PassportApiError {
  readonly error: string;
}

/**
 * `POST /api/passport/redeem` request (apis.md 2.5): the code and state of the landing fragment, or the land page's
 * `login_required` error with the state (so the server clears the transaction cookie).
 */
export type RedeemRequest =
  | { readonly code: string; readonly state: string }
  | { readonly error: 'login_required'; readonly state: string };
/** 200 answer: the session is set on this site. */
export interface RedeemResponse {
  readonly next: string;
}
/** 400, 409 or 429 answer: no session; the land page still goes to `next`, signed out. */
export interface RedeemFailure extends PassportApiError {
  readonly next: string;
}

/** `POST /api/passport/after-signin` request and 200 response. */
export interface AfterSigninRequest {
  /** The path to go to after sign-in; checked with safeReturnTo. */
  readonly next: string;
  /** The tab's validated `via` (`fq.net.via`), or null. */
  readonly via: string | null;
}
export interface AfterSigninResponse {
  readonly next: string;
  /** True when the account has no profile yet: the client goes to onboarding with `returnTo = next`. */
  readonly needsUsername: boolean;
}

/** `POST /api/passport/revalidate` body; signed in the `x-passport-signature` header (apis.md 3.3). */
export interface RevalidateRequest {
  readonly username: string;
  readonly sites: readonly SiteId[];
}
export const REVALIDATE_HEADER = 'x-passport-signature';

/** `POST /api/passport/delete` (hub): request and 200 response. */
export interface DeleteRequest {
  readonly keepQuizzes: boolean;
  /** The member's `@username`, typed to confirm. */
  readonly confirm: string;
}
export interface DeleteResponse {
  /** ISO time after which the pipeline runs (now + the grace period of G16). */
  readonly runAfter: string;
}

/** `POST /api/passport/cancel` (hub) 200 response. */
export interface CancelResponse {
  readonly cancelled: boolean;
}

/** `POST /api/passport/leave` (hub): request and 200 response. */
export interface LeaveRequest {
  /** A world site other than kpop where the viewer is a member (apis.md 3.6). */
  readonly site: Exclude<SiteId, 'kpop' | 'hub'>;
  readonly keepQuizzes: boolean;
  readonly confirm: string;
}
export interface LeaveResponse {
  /** Rows removed or reassigned per table, as `passport_leave_world` returns them. */
  readonly counts: Readonly<Record<string, number>>;
}

// ---------------------------------------------------------------------------------------------------------------
// 4. Server modules and component props (BACKLOG 5.1 "Server module contracts"; rpcs.md 3)
// ---------------------------------------------------------------------------------------------------------------

/** The signatures of the passport's server modules. Implementations: `export const x: PassportServerFns['x'] = ...`. */
export interface PassportServerFns {
  /**
   * B3, `lib/passport/xp.ts`: on 'kpop' calls `award_xp(user, amount, reason)` exactly as today; on any other site
   * calls `award_world_xp(user, site, amount, reason)`. Service role. Resolves to the new xp, or null when the RPC
   * returned nothing. Every XP call site of the app goes through it (B5 switches them).
   */
  awardXpForSite(site: SiteId, user: string, amount: number, reason: string): Promise<number | null>;
  /**
   * B3, `lib/network/profile.ts`: a pure merge. On 'kpop' returns `profile` itself (same object). On another site
   * returns a copy where every key of PROFILE_FROM_MEMBERSHIP takes the membership value (rules above),
   * `avatar_override` keys replace their profiles fields, and `ult_groups` is []. A null membership yields the
   * neutral values (a member page of a non-member is a 404 before this is called).
   */
  profileForSite<P extends ProfileForSiteInput>(site: SiteId, profile: P, membership: MemberPublic | null): P;
  /**
   * B4, `lib/auth/return-to.ts`: today's checks unchanged, against the origin of `REGISTRY[site].url`; `site`
   * defaults to the build's site, so every kpop call of today keeps its answer. The second parameter stays the
   * fallback because today's test pins it (ratchet law; F0 decision 65).
   */
  safeReturnTo(raw: string | null | undefined, fallback?: string, site?: SiteId): string;
}

/**
 * The prop B3 adds to `PersonName` and `BiasTag` (components/ux-v1/person-name.tsx): the icon of the pick tag,
 * 'heart' by default (kpop unchanged), 'star' for the anime oshi (registry `vocabulary.favourites.pickIcon`).
 */
export interface PersonNameTagProps {
  readonly tagIcon?: PickIcon;
}

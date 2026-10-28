// Run O1 contract o1-contract-v1 (docs/o1/contracts/registry.md). The site registry types.
//
// Frozen by F0: every name and field below is listed in BACKLOG 5.1 ("Registry shape").
// Adding an optional field or a feature key is a change request (BACKLOG 5.2); renaming or
// retyping one is not allowed inside the run. Nothing on the kpop path imports this module
// until B1 wires it, so it cannot change a byte of kpopquiz.org.
//
// Naming traps (BACKLOG 0, invariant 5): the type is SiteId, the hub id is 'hub'.

import type { getLevelInfo } from '../constants';
import type { QuizCardData } from '../db/types';

/** The three sites of the network. Never extendable inside the run (BACKLOG 5.3). */
export type SiteId = 'kpop' | 'anime' | 'hub';

/** Every SiteId, in the network's display order (kpop, anime, hub). */
export const SITE_IDS: readonly SiteId[] = ['kpop', 'anime', 'hub'];

/** A world is a fan site with quizzes; the hub is fandomverse.org (network page and passport). */
export type SiteKind = 'world' | 'hub';

/** One letter per site, used by `via` codes (`^[kaf]\.[a-z]{2,8}$`) and NetBridgeId values. */
export type SiteLetter = 'k' | 'a' | 'f';

/** The network umbrella (naming.md: lib/network and the Net prefix). */
export interface NetworkConfig {
  readonly name: 'FandomVerse';
  readonly url: 'https://fandomverse.org';
}

export interface SiteBrand {
  /** Display name, as written in titles and JSON-LD (KpopQuiz, OtakuQuiz, FandomVerse). */
  readonly name: string;
  /** Short name for the web manifest and tight spaces. */
  readonly shortName: string;
  /** Mascot name, or null when the site has none yet. */
  readonly mascot: string | null;
  /** Site-relative path of the square logo used by the Organization JSON-LD. */
  readonly logo: string;
  /** Site-relative path of the primary favicon. */
  readonly favicon: string;
  /** Site-relative path of the default Open Graph image (or the OG route of a typographic template). */
  readonly ogTemplate: string;
}

export type PickIcon = 'heart' | 'star';

export interface SiteFavouritesVocabulary {
  /** Label of the favourite topic slot on the passport (kpop: the bias group). */
  readonly topicLabel: string;
  /** Label of the favourite pick slot (kpop: the bias, anime: the oshi). */
  readonly pickLabel: string;
  /** Icon of the pick tag: heart on kpop, star on anime (BACKLOG 8, row 16). */
  readonly pickIcon: PickIcon;
  /** Entity type stored in favourites.topic_entity_type (kpop 'group', anime 'series'). */
  readonly topicEntityType: string;
  /** Entity type stored in favourites.pick_entity_type (kpop 'idol', anime 'character'). */
  readonly pickEntityType: string;
}

export interface SiteVocabulary {
  readonly topic: string;
  readonly topicPlural: string;
  readonly member: string;
  readonly memberPlural: string;
  readonly fandom: string;
  readonly song: string;
  readonly favourites: SiteFavouritesVocabulary;
}

/**
 * The exact feature key list (BACKLOG 5.1). A new key is a CR and defaults to false on every
 * site that does not set it. kpop values describe today's site with the production flags on.
 */
export interface SiteFeatures {
  /** Quiz play pages (/q/{slug}). */
  readonly quizzes: boolean;
  /** Topic hubs: kpop group hubs, anime series hubs (/{slug}-quiz). */
  readonly topicHubs: boolean;
  /** Sourced trivia pages (/{slug}-trivia). */
  readonly trivia: boolean;
  /** Quiz creation (/create). */
  readonly create: boolean;
  /** Quiz of the day (/daily). */
  readonly dailyQuiz: boolean;
  /** Blind test (audio previews through the Deezer kit). */
  readonly blindTest: boolean;
  /** Daily blind test of kpop (daily_blindtests). */
  readonly dailyBlindTest: boolean;
  /** Opening of the day (anime, daily_openings). */
  readonly openingOfTheDay: boolean;
  /** Name them all. */
  readonly nameAll: boolean;
  /** Which member (kpop) or Which character (anime) are you. */
  readonly personality: boolean;
  /** This or that. */
  readonly thisOrThat: boolean;
  /** True or false landings. */
  readonly trueFalse: boolean;
  /** Image quizzes (off on anime: no character, poster, logo or cover image). */
  readonly imageQuiz: boolean;
  /** Fandom war (kpop only). */
  readonly fandomWar: boolean;
  /** MV pulse and the monthly data pages of kpop. */
  readonly mvPulse: boolean;
  /** "Now airing" banner (anime, only with a verified record). */
  readonly airingBanner: boolean;
  /** Spoiler system (anime). */
  readonly spoilers: boolean;
  /** Live rooms (/live, /join). Off on anime at launch (G0, confirmed by the owner 2026-10-16). */
  readonly live: boolean;
  /** Community threads and debates. */
  readonly community: boolean;
  /** Ranked blind test seasons. */
  readonly ranked: boolean;
  /** Challenge and duel links. */
  readonly challenges: boolean;
  /** Leaderboards (Team accounts never appear on them). */
  readonly leaderboards: boolean;
  /** News feed. */
  readonly news: boolean;
  /** Articles. */
  readonly articles: boolean;
  /** Data pages (/stats, /data). */
  readonly dataPages: boolean;
  /** Localized landings (/pt, /fr, /es, /id). */
  readonly localizedLandings: boolean;
  /** The Verse wiki. */
  readonly verse: boolean;
  /** Embeddable widget (/embed). */
  readonly embed: boolean;
  /** Passport pages of the hub (/passport, /u, /settings W4). */
  readonly passportPages: boolean;
  /** Optional network directory of the hub (/directory, noindex). */
  readonly directory: boolean;
}

export type FeatureKey = keyof SiteFeatures;

/**
 * A public route pattern of a non-kpop site (docs/o1/contracts/routes.md, "Pattern syntax"):
 *   '/'                 the home page
 *   '/series'           one exact path
 *   '/q/{slug}'         `{name}` is one segment of [^/]+ (it may carry a literal prefix or suffix:
 *                       '/{series}-quiz', '/which-{series}-character-are-you')
 *   '/admin/**'         `**` as the last segment: the path itself and anything below it
 */
export type RoutePattern = string;

export interface SiteRoutes {
  /**
   * kpop: 'route-allowlist' (today's lib/route-allowlist.ts decides, unchanged). Other sites:
   * the public patterns of the route map (routes.md). O lanes extend this list through a CR;
   * they never edit route-allowlist.ts.
   */
  readonly allow: 'route-allowlist' | readonly RoutePattern[];
}

export interface SiteOrganization {
  readonly name: string;
  readonly alternateName: string;
  /** Site-relative logo path (made absolute with the site url). */
  readonly logo: string;
  /** Contact mailbox, or null until the owner names one (emails are never renamed blindly). */
  readonly email: string | null;
}

export interface SiteSeo {
  /** Next.js title template, e.g. '%s | KpopQuiz'. */
  readonly titleTemplate: string;
  /** IndexNow key (a public value: it is served as /<key>.txt), or null until the site has one. */
  readonly indexNowKey: string | null;
  /** A topic hub below this many published quizzes is noindex,follow and out of the sitemap. */
  readonly minPublishedForIndexableHub: number;
  readonly organization: SiteOrganization;
  /** First heading line of the site's llms.txt. */
  readonly llmsTxt: { readonly title: string };
}

export interface SiteAudio {
  /** The only audio source of the network: Deezer previews, never stored, cached or proxied. */
  readonly source: 'deezer';
  /** Rule 9: the Deezer logo and the private-use notice on every audio surface. */
  readonly kit: 'required';
}

/**
 * Every theme token name styles/ux-v1/a0.css declares on its token blocks today (origin/main
 * 30e7091), without the `--ux-` prefix, in file order (docs/o1/contracts/tokens.md). Frozen and
 * never extendable inside the run (BACKLOG 5.3); contract.test.ts compares it with the file.
 * Component-scoped custom properties (`--ux-rc`, `--ux-rar-ink`, `--ux-th`) are not theme tokens.
 *
 * Tailwind scans every file of src (tailwind.config.ts `content`), comments included, and any
 * word that names a utility adds its rule to the kpop sheet. The card shadow token is the one
 * name that is also a utility here (`theme.boxShadow.card`), so it is written as a template
 * literal (same value, same literal type) that the scanner does not read as the utility. The
 * gate's parity found the extra rule on 25fa0a0 (CR-009, css-content); contract.test.ts proves
 * F0's files add no rule to the sheet.
 */
export const UX_TOKEN_NAMES = [
  'page', 'surface', 'surface-2', 'raised', 'paper', 'card-fill',
  'hair', 'line', 'line-2', 'edge', 'pink-line', 'input', 'ink', 'muted',
  'pink', 'pink-fill', 'pink-fill-h', 'pink-ink', 'pink-soft', 'pink-soft-ink',
  'ok', 'ok-soft', 'no', 'no-soft', 'warn', 'on-ok', 'knob-off',
  'nav-bg', 'tabbar-bg', 'photo-edge', `shadow-${'card'}`, 'shadow-ov', 'scrim', 'theme-band',
  'qotd-bg', 'qotd-edge', 'bt-bg', 'lav-soft', 'lav-ink', 'hl', 'bulb', 'bulb-fill',
  'acc-pink', 'acc-purple', 'acc-blue', 'acc-teal', 'acc-amber', 'acc-coral',
  'rar-common', 'rar-uncommon', 'rar-rare', 'rar-epic', 'rar-legendary',
  'ease', 'spring', 'wide', 'text', 'stage', 'gut', 'font',
  'lt-a', 'lt-b', 'lt-c', 'lt-d',
  'th-hits26', 'th-hits25', 'th-gen5', 'th-gen4', 'th-viral', 'th-kpdh', 'th-title', 'th-ink',
  'host-bg', 'good', 'good-soft',
] as const;

/**
 * The new theme token names of the run (BACKLOG 5.1; `--ux-on-ok` already exists). Only
 * `on-accent` is ever declared for kpop (B1, white, replacing the `#fff` literals); the others
 * are declared and read only by the per-site sheets of anime and hub (tokens.md).
 */
export const UX_NEW_TOKEN_NAMES = ['on-accent', 'on-no', 'accent2', 'font-display'] as const;

/** A frozen theme token name, without the `--ux-` prefix. */
export type UxTokenName = (typeof UX_TOKEN_NAMES)[number] | (typeof UX_NEW_TOKEN_NAMES)[number];

/**
 * A token a site's registry theme may carry a value for. `--ux-font-display` is derived from
 * `SiteTheme.fontDisplay`, so it is not a value key.
 */
export type ThemeTokenName = Exclude<UxTokenName, 'font-display'>;

export type ThemeTokens = Readonly<Partial<Record<ThemeTokenName, string>>>;

export interface SiteTheme {
  /** Token values of the light theme. */
  readonly light: ThemeTokens;
  /** Token values of the dark theme (explicit class and system dark share them). */
  readonly dark: ThemeTokens;
  /** Display font family name (`--ux-font-display`). */
  readonly fontDisplay: string;
}

export interface LevelTitle {
  readonly en: string;
  readonly kr?: string;
}

/** Fan level ladder: threshold level to title (the highest threshold at or below the level wins). */
export type LevelTitles = Readonly<Record<number, LevelTitle>>;

export type AuthProvider = 'google' | 'discord' | 'email';
export type SignOutMode = 'global' | 'local';

export interface SiteAuth {
  readonly providers: readonly AuthProvider[];
  /**
   * Env name of the Google Identity Services client id of this site's own Google project, or
   * null when the site signs in with Google through the Supabase OAuth redirect (kpop today).
   */
  readonly googleClientIdEnv: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID' | null;
  /** Where an email sign-in link lands: kpop keeps /auth/callback, the others use /auth/confirm. */
  readonly emailLanding: '/auth/callback' | '/auth/confirm';
  /** Sign-out scopes offered on this site ('global' = everywhere, 'local' = this site only). */
  readonly signOutModes: readonly SignOutMode[];
}

export interface SitePassport {
  /** P2 hook ("Continue as"), inert in the run: always empty, read by nothing yet. */
  readonly probeOrder: readonly SiteId[];
}

export interface SiteEditorial {
  /** Editorial publisher: items (debates, posts) a day. kpop 3 (lib/editorial/types.ts MAX_PER_DAY). */
  readonly dailyItemCap: number;
  /** Editorial publisher: quizzes a day (kind 'quiz' arrives with E1; kpop publishes none). */
  readonly quizDailyCap: number;
  /** Quiz of the day: at most this many from one topic in a calendar week. */
  readonly weeklyGroupLimit: number;
}

export interface SiteDaily {
  /** Mirror of sites.system_user_id: author of the daily quiz. null until set (anime: launch L02). */
  readonly systemUserId: string | null;
  /** Mirror of sites.fallback_group_slug: topic of a bank row without a group. */
  readonly fallbackGroupSlug: string | null;
}

export interface SiteCopy {
  /**
   * Copy key namespace of the site (docs/o1/contracts/copy-keys.md): keys are
   * `<namespace>.<lane>.<key>` and live in per-site, per-lane files, never in lib/i18n.
   */
  readonly namespace: SiteId;
}

/**
 * One site of the network: exactly the fields of BACKLOG 5.1 "Registry shape", in that order.
 * Placeholder values of the anime and hub entries are listed in registry.ts PLACEHOLDERS, not
 * here, so the shape stays the frozen one.
 */
export interface SiteConfig {
  readonly id: SiteId;
  readonly kind: SiteKind;
  /** Absolute origin without a trailing slash, e.g. 'https://kpopquiz.org'. */
  readonly url: string;
  /** Bare host name, e.g. 'kpopquiz.org'. */
  readonly domain: string;
  readonly letter: SiteLetter;
  readonly brand: SiteBrand;
  readonly vocabulary: SiteVocabulary;
  readonly features: SiteFeatures;
  readonly routes: SiteRoutes;
  readonly seo: SiteSeo;
  readonly audio: SiteAudio;
  readonly theme: SiteTheme;
  readonly levelTitles: LevelTitles;
  readonly auth: SiteAuth;
  readonly passport: SitePassport;
  readonly editorial: SiteEditorial;
  readonly daily: SiteDaily;
  readonly copy: SiteCopy;
}

/** What `getLevelInfo` returns today (lib/constants.ts); the per-site version keeps the shape. */
export type LevelInfo = ReturnType<typeof getLevelInfo>;

/** A query builder that can be filtered by site; Supabase's filter builders satisfy it (rpcs.md 3). */
export interface SiteFilterable<Q> {
  eq(column: 'site_id', value: SiteId): Q;
}

/**
 * The signatures of the site-aware server modules (BACKLOG 5.1 "Server module contracts"; rpcs.md 3 gives the
 * owner and module of each). An implementation is `export const forSite: SiteServerFns['forSite'] = ...`. Where a
 * `site` parameter is optional its default is the build's site (`SITE.id`), so every kpop call of today keeps its
 * answer on the kpop build.
 */
export interface SiteServerFns {
  /**
   * B2 (`lib/site/scope.ts`): `query.eq('site_id', site)`. On the kpop build only when SITE_SCOPE is on (else the
   * query itself); on anime and hub builds always (flags-env.md 3, fail closed).
   */
  forSite<Q extends SiteFilterable<Q>>(query: Q, site?: SiteId): Q;
  /** B2: a copy of `row` with `site_id` set, for every insert into a scoped table (an explicit value wins). */
  withSite<T extends object>(row: T, site?: SiteId): T & { readonly site_id: SiteId };
  /**
   * B1 (`lib/site/cron.ts`): null when the build's site is in `sites` (the cron runs), else a 200 JSON response
   * `{ skipped: true }` that the route returns at once (manifest.md, cron table).
   */
  cronForSite(sites: readonly SiteId[]): Response | null;
  /** B5: the quiz of the day of `site` (today's `getQuizOfTheDay()` for kpop, unchanged). */
  getQuizOfTheDay(site?: SiteId): Promise<QuizCardData | null>;
  /** The level ladder of `site` (`REGISTRY[site].levelTitles`): kpop's is today's ladder. */
  levelTitlesFor(site: SiteId): LevelTitles;
  /** Today's curve on every site (same levels for the same xp); only `name` comes from `levelTitlesFor(site)`. */
  getLevelInfo(xp: number, site?: SiteId): LevelInfo;
}

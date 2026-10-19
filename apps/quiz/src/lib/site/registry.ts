// Run O1 contract o1-contract-v1 (docs/o1/contracts/registry.md). The site registry.
//
// kpop carries today's literal values (url, domain, brand, title template, organization,
// IndexNow key, level ladder, theme tokens, editorial caps, daily system account); the unit
// test registry.test.ts compares each one with the module or file that holds it today, so
// a B1 swap of a literal for SITE.* renders the same bytes. The anime and hub entries are
// stubs: every value an owner gate or a later lane still has to set is listed in
// PLACEHOLDERS. Nothing on the kpop path imports this module until B1 wires it.
//
// Keep this module free of `@/` imports, next/* and Node built-ins: next.config.ts and the
// middleware (edge) read it through lib/site/routing.ts.

import { SITE_IDS } from './types';
import type { SiteConfig, SiteFeatures, SiteId, ThemeTokens, NetworkConfig } from './types';

/** The network umbrella (BACKLOG 5.1). */
export const NETWORK: NetworkConfig = { name: 'FanQuiz', url: 'https://fanquiz.org' };

const ALL_OFF: SiteFeatures = {
  quizzes: false, topicHubs: false, trivia: false, create: false, dailyQuiz: false,
  blindTest: false, dailyBlindTest: false, openingOfTheDay: false, nameAll: false,
  personality: false, thisOrThat: false, trueFalse: false, imageQuiz: false, fandomWar: false,
  mvPulse: false, airingBanner: false, spoilers: false, live: false, community: false,
  ranked: false, challenges: false, leaderboards: false, news: false, articles: false,
  dataPages: false, localizedLandings: false, verse: false, embed: false, passportPages: false,
  directory: false,
};

// styles/ux-v1/a0.css, html.ux-v1 (light) and html.ux-v1.dark (dark), as of origin/main 30e7091.
// The dark block does not redefine pink, pink-fill and pink-fill-h: the light values apply.
const KPOP_LIGHT: ThemeTokens = {
  page: '#FAF8F5', surface: '#F1EFEA', 'surface-2': '#EAE7E1', raised: '#FFFFFF',
  paper: '#FFFFFF', 'card-fill': '#FFFFFF',
  hair: '#ECE9E4', line: '#ECE8E3', 'line-2': '#F3F1EE', edge: '#E5E0DA', 'pink-line': '#F2CFDB',
  input: '#8C857C',
  ink: '#1F1B17', muted: '#6B655E',
  pink: '#E8457A', 'pink-fill': '#D13A6E', 'pink-fill-h': '#BE2F62', 'pink-ink': '#C43565',
  'pink-soft': '#FCE8EF', 'pink-soft-ink': '#B3305C',
  ok: '#257547', 'ok-soft': '#E9F4EC', no: '#B83A34', 'no-soft': '#FBECEA', warn: '#9A5B0F',
  'on-ok': '#FFFFFF',
  // New token (B1): replaces the literal `color: #fff` of .ux-btn-primary and .ux-brand-mk.
  'on-accent': '#FFFFFF',
};
const KPOP_DARK: ThemeTokens = {
  page: '#141312', surface: '#1C1B19', 'surface-2': '#232120', raised: '#1C1B19',
  paper: '#141312', 'card-fill': 'transparent',
  hair: '#2F2C29', line: '#2B2826', 'line-2': '#242220', edge: '#35312E', 'pink-line': '#4A2A37',
  input: '#6E6A64',
  ink: '#F3F0EB', muted: '#A8A198',
  'pink-ink': '#FF7AA5', 'pink-soft': '#3A2129', 'pink-soft-ink': '#FF9DBC',
  ok: '#4FC07F', 'ok-soft': '#16261C', no: '#FF7A70', 'no-soft': '#2E1917', warn: '#E3A24A',
  'on-ok': '#141312',
  'on-accent': '#FFFFFF',
};

const KPOP: SiteConfig = {
  id: 'kpop',
  kind: 'world',
  url: 'https://kpopquiz.org',
  domain: 'kpopquiz.org',
  letter: 'k',
  brand: {
    name: 'KpopQuiz',
    shortName: 'KpopQuiz',
    mascot: 'KpopQuiz bunny',
    logo: '/logo-512.png',
    favicon: '/favicon.svg',
    ogTemplate: '/og-default.png',
  },
  vocabulary: {
    topic: 'group', topicPlural: 'groups', member: 'member', memberPlural: 'members',
    fandom: 'fandom', song: 'song',
    favourites: {
      topicLabel: 'Bias group', pickLabel: 'Bias', pickIcon: 'heart',
      topicEntityType: 'group', pickEntityType: 'idol',
    },
  },
  // Today's site with the production flags (NEXT_PUBLIC_UX_V1=1, NEXT_PUBLIC_UX_V12=1).
  features: {
    ...ALL_OFF,
    quizzes: true, topicHubs: true, trivia: true, create: true, dailyQuiz: true,
    blindTest: true, dailyBlindTest: true, nameAll: true, personality: true, thisOrThat: true,
    trueFalse: true, imageQuiz: true, fandomWar: true, mvPulse: true, live: true,
    community: true, ranked: true, challenges: true, leaderboards: true, news: true,
    articles: true, dataPages: true, localizedLandings: true, verse: true, embed: true,
  },
  routes: { allow: 'route-allowlist' },
  seo: {
    titleTemplate: '%s | KpopQuiz',
    indexNowKey: '4b2f9a7ce8d1465fb0a3e6c95d47128a',
    // app/(site)/[slug]/group-quiz-page.tsx: a hub is noindex only when it has 0 quizzes.
    minPublishedForIndexableHub: 1,
    organization: {
      name: 'KpopQuiz',
      alternateName: 'kpopquiz.org',
      logo: '/logo-512.png',
      email: 'contact@kpopquiz.org',
    },
    llmsTxt: { title: 'kpopquiz.org' },
  },
  audio: { source: 'deezer', kit: 'required' },
  theme: { light: KPOP_LIGHT, dark: KPOP_DARK, fontDisplay: 'Inter' },
  // lib/level-titles.ts LEVEL_TITLES (B1 reads it through levelTitlesFor; the object stays).
  levelTitles: {
    1: { en: 'New Fan', kr: '뉴비' },
    3: { en: 'Casual Fan', kr: '캐주얼' },
    6: { en: 'Stan', kr: '덕후' },
    10: { en: 'Bias', kr: '최애' },
    15: { en: 'Ride-or-Die', kr: '찐팬' },
    21: { en: 'Superfan', kr: '슈퍼팬' },
    30: { en: 'Legend', kr: '레전드' },
  },
  auth: {
    providers: ['google', 'discord', 'email'],
    googleClientIdEnv: null,
    emailLanding: '/auth/callback',
    signOutModes: ['global'],
  },
  passport: { probeOrder: [] },
  editorial: { dailyItemCap: 3, quizDailyCap: 0, weeklyGroupLimit: 3 },
  // supabase/migrations/042_fix_ensure_daily_quiz.sql (G3's dump confirms the live values).
  daily: {
    systemUserId: '00000000-0000-0000-0000-000000000001',
    fallbackGroupSlug: 'general-kpop',
  },
  copy: { namespace: 'kpop' },
};

const ANIME: SiteConfig = {
  id: 'anime',
  kind: 'world',
  url: 'https://otakuquiz.org',
  domain: 'otakuquiz.org',
  letter: 'a',
  brand: {
    name: 'OtakuQuiz',
    shortName: 'OtakuQuiz',
    mascot: 'Fuki',
    logo: '/brand/anime/logo-512.png',
    favicon: '/brand/anime/favicon.svg',
    // The default OG image, as kpop's /og-default.png. Quiz and hub OG images are the twin routes
    // app/api/og/[slug] and app/api/og/group/[slug] reading the registry brand (TWINS rows 30, 30b).
    ogTemplate: '/brand/anime/og-default.png',
  },
  vocabulary: {
    topic: 'series', topicPlural: 'series', member: 'character', memberPlural: 'characters',
    fandom: 'fandom', song: 'opening',
    favourites: {
      topicLabel: 'Main series', pickLabel: 'Oshi', pickIcon: 'star',
      topicEntityType: 'series', pickEntityType: 'character',
    },
  },
  // BACKLOG lane O1: image quiz off, fandom war off, MV pulse off, airing banner on, live off
  // at launch (G0, confirmed by the owner 2026-10-16), Verse off. CR-001 (rule 18): leaderboards on (TWINS row 35, Team
  // accounts off every board); news, articles, data pages and ranked stay off (code F).
  features: {
    ...ALL_OFF,
    quizzes: true, topicHubs: true, trivia: true, create: true, dailyQuiz: true,
    blindTest: true, openingOfTheDay: true, nameAll: true, personality: true, thisOrThat: true,
    airingBanner: true, spoilers: true, community: true, challenges: true, leaderboards: true,
  },
  routes: {
    allow: [
      '/', '/series', '/{series}-quiz', '/anime-mix-quiz', '/{series}-trivia', '/q/{slug}',
      '/which-{series}-character-are-you', '/{series}-openings-quiz', '/blindtest/**',
      '/name-all/{series}/{set}', '/daily', '/opening-of-the-day',
      '/create/**', '/me', '/u/{username}', '/settings/**', '/login', '/onboarding/**',
      '/notifications', '/search', '/community/**', '/about', '/editorial-policy', '/privacy',
      '/terms', '/contact', '/admin/**',
      // CR-001 (rule 18): the twins of the browse, help and board pages (TWINS rows 31 to 36).
      '/quizzes', '/quizzes/popular-today', '/quizzes/popular-this-week', '/quizzes/popular-this-month',
      '/new', '/most-liked', '/trending', '/trivia', '/faq', '/leaderboard', '/dmca',
    ],
  },
  seo: {
    titleTemplate: '%s | OtakuQuiz',
    indexNowKey: null,
    minPublishedForIndexableHub: 3,
    organization: {
      name: 'OtakuQuiz',
      alternateName: 'otakuquiz.org',
      logo: '/brand/anime/logo-512.png',
      email: null,
    },
    llmsTxt: { title: 'otakuquiz.org' },
  },
  audio: { source: 'deezer', kit: 'required' },
  // Option A values arrive with O1 (D0 prototype, G5); until then the kpop values stand in.
  theme: { light: KPOP_LIGHT, dark: KPOP_DARK, fontDisplay: 'M PLUS Rounded 1c' },
  // The anime ladder of the v2 plan (section 3, validated: decision 9, confirmed by the owner
  // with G0 on 2026-10-16), on the kpop thresholds (rule 18: same seven steps, new words).
  levelTitles: {
    1: { en: 'New Viewer' },
    3: { en: 'Casual Watcher' },
    6: { en: 'Binge Watcher' },
    10: { en: 'Otaku' },
    15: { en: 'Ride-or-Die' },
    21: { en: 'Superfan' },
    30: { en: 'Legend' },
  },
  auth: {
    providers: ['google', 'email'],
    googleClientIdEnv: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    emailLanding: '/auth/confirm',
    signOutModes: ['global', 'local'],
  },
  passport: { probeOrder: [] },
  // G0 (confirmed by the owner 2026-10-16): 25 to 40 quizzes a day (top of the range as the cap),
  // at most 2 a week per series.
  editorial: { dailyItemCap: 3, quizDailyCap: 40, weeklyGroupLimit: 2 },
  daily: { systemUserId: null, fallbackGroupSlug: 'anime-mix' },
  copy: { namespace: 'anime' },
};

const HUB: SiteConfig = {
  id: 'hub',
  kind: 'hub',
  url: 'https://fanquiz.org',
  domain: 'fanquiz.org',
  letter: 'f',
  brand: {
    name: 'FanQuiz',
    shortName: 'FanQuiz',
    mascot: null,
    logo: '/brand/hub/logo-512.png',
    favicon: '/brand/hub/favicon.svg',
    ogTemplate: '/brand/hub/og-default.png',
  },
  vocabulary: {
    topic: 'site', topicPlural: 'sites', member: 'member', memberPlural: 'members',
    fandom: 'fandom', song: 'song',
    favourites: {
      topicLabel: 'Favourite site', pickLabel: 'Favourite', pickIcon: 'heart',
      topicEntityType: 'site', pickEntityType: 'site',
    },
  },
  features: { ...ALL_OFF, passportPages: true, directory: false },
  routes: {
    allow: ['/', '/privacy', '/passport', '/u/{username}', '/settings/**', '/login', '/directory'],
  },
  seo: {
    titleTemplate: '%s | FanQuiz',
    indexNowKey: null,
    minPublishedForIndexableHub: 0,
    organization: {
      name: 'FanQuiz',
      alternateName: 'fanquiz.org',
      logo: '/brand/hub/logo-512.png',
      email: null,
    },
    llmsTxt: { title: 'fanquiz.org' },
  },
  audio: { source: 'deezer', kit: 'required' },
  theme: { light: KPOP_LIGHT, dark: KPOP_DARK, fontDisplay: 'Inter' },
  // The passport level is private and shown only on /passport (P); placeholder ladder.
  levelTitles: { 1: { en: 'Member' } },
  auth: {
    providers: ['google', 'email'],
    googleClientIdEnv: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    emailLanding: '/auth/confirm',
    signOutModes: ['global', 'local'],
  },
  passport: { probeOrder: [] },
  editorial: { dailyItemCap: 0, quizDailyCap: 0, weeklyGroupLimit: 0 },
  daily: { systemUserId: null, fallbackGroupSlug: null },
  copy: { namespace: 'hub' },
};

/** Every site, by id. */
export const REGISTRY: Readonly<Record<SiteId, SiteConfig>> = { kpop: KPOP, anime: ANIME, hub: HUB };

/**
 * Values that are placeholders until an owner gate or a later lane sets them, as dotted paths
 * of SiteConfig. kpop has none: every kpop value is today's literal.
 */
export const PLACEHOLDERS: Readonly<Record<SiteId, readonly string[]>> = {
  kpop: [],
  anime: [
    'brand.logo (O1)', 'brand.favicon (O1)', 'brand.ogTemplate (O1)', 'brand.mascot (G18, Fuki placeholder)',
    'vocabulary.* text (O1)', 'seo.indexNowKey (O1)', 'seo.organization.email (owner)',
    'theme.light and theme.dark (O1, Option A after G5)', 'daily.systemUserId (launch L02)',
  ],
  hub: [
    'brand.logo (H1)', 'brand.favicon (H1)', 'brand.ogTemplate (H1)', 'vocabulary.* text (H1)',
    'seo.indexNowKey (H1)', 'seo.organization.email (owner)', 'theme.light and theme.dark (H1)',
    'levelTitles (H1)',
  ],
};

/** True when `v` is one of the three SiteId values. */
export function isSiteId(v: unknown): v is SiteId {
  return v === 'kpop' || v === 'anime' || v === 'hub';
}

export interface SiteEnv {
  readonly NEXT_PUBLIC_SITE_ID?: string | undefined;
  readonly SITE_ID?: string | undefined;
}

/**
 * The site of a build (flags-env.md): NEXT_PUBLIC_SITE_ID, else the server alias SITE_ID,
 * else kpop. An empty value counts as unset. An unknown value, or two values that disagree,
 * throws: a build must fail rather than serve the wrong site.
 */
export function resolveSiteId(env: SiteEnv): SiteId {
  const pub = env.NEXT_PUBLIC_SITE_ID?.trim() || '';
  const alias = env.SITE_ID?.trim() || '';
  if (pub && alias && pub !== alias) {
    throw new Error(`NEXT_PUBLIC_SITE_ID (${pub}) and SITE_ID (${alias}) disagree`);
  }
  const v = pub || alias || 'kpop';
  if (!isSiteId(v)) throw new Error(`unknown site id "${v}" (expected kpop, anime or hub)`);
  return v;
}

// `process.env.NEXT_PUBLIC_SITE_ID` is written out in full so Next inlines it in client code.
/** The site of this build. */
export const SITE_ID: SiteId = resolveSiteId({
  NEXT_PUBLIC_SITE_ID: process.env.NEXT_PUBLIC_SITE_ID,
  SITE_ID: process.env.SITE_ID,
});

/** The registry entry of this build. */
export const SITE: SiteConfig = REGISTRY[SITE_ID];

/** The registry entry of any site. */
export function siteConfig(id: SiteId): SiteConfig {
  return REGISTRY[id];
}

// ---------------------------------------------------------------------------------------------
// Flags, env names and secret names (docs/o1/contracts/flags-env.md). contract.test.ts compares
// these lists with the tables of flags-env.md, so the document and the code cannot drift.

/** Where a flag is read: inlined in client code at build (`public`) or read on the server. */
export type FlagScope = 'public' | 'server';

export interface O1Flag {
  readonly name: string;
  readonly scope: FlagScope;
  /** The lane that reads the flag. */
  readonly lane: string;
  /** Reserved flags gate nothing in the run (P2, P3a): reading them is a review finding. */
  readonly reserved: boolean;
}

/**
 * The run's flags (BACKLOG 5.1). Every one is off by default on every site. BACKLOG's NEXT_PUBLIC_NET_WELCOME is
 * not one of them: CR-002 and CR-006 were refused for O1 (owner, 2026-10-18, LEDGER D-027), nothing is reserved.
 */
export const O1_FLAGS: readonly O1Flag[] = [
  { name: 'SITE_SCOPE', scope: 'server', lane: 'B2', reserved: false },
  { name: 'NEXT_PUBLIC_NET_BEACON', scope: 'public', lane: 'B6', reserved: false },
  { name: 'NEXT_PUBLIC_NET_FOOTER', scope: 'public', lane: 'B6', reserved: false },
  { name: 'NEXT_PUBLIC_NET_MENU', scope: 'public', lane: 'B6', reserved: false },
  { name: 'NEXT_PUBLIC_NET_FACTS', scope: 'public', lane: 'X1', reserved: false },
  { name: 'PASSPORT_JUMP', scope: 'server', lane: 'B4', reserved: false },
  { name: 'PASSPORT_CONTINUE', scope: 'server', lane: 'B4', reserved: true },
  { name: 'PASSPORT_SEED', scope: 'server', lane: 'B4', reserved: true },
];

/** Existing switches the run never changes (BACKLOG 5.1 "untouched"). */
export const UNTOUCHED_FLAGS: readonly string[] = [
  'NEXT_PUBLIC_UX_V1', 'NEXT_PUBLIC_UX_V12', 'QOTD_ROTATION_FIX', 'NEXT_PUBLIC_KDRAMA',
];

/** Secret names of the run (BACKLOG 5.1). Values never enter the repo, a log or a report. */
export const O1_SECRET_NAMES: readonly string[] = [
  'PASSPORT_TICKET_SECRET', 'PASSPORT_REVALIDATE_SECRET', 'SEND_EMAIL_HOOK_SECRET',
  'RESEND_API_KEY', 'NET_IP_HASH_SALT', 'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
];

/**
 * The repo's flag convention: '1' or 'true' is on, anything else (unset, empty, '0', 'false')
 * is off. Pass the value, written out in full where it is read (`flagOn(process.env.NAME)`), so
 * Next inlines public flags in client code.
 */
export function flagOn(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

// ---------------------------------------------------------------------------------------------
// Browser origins outside production (flags-env.md "Origins"). `SiteConfig.url` is the
// canonical origin (SEO, JSON-LD, sitemaps, editorial links) on every deployment. Where a browser
// must actually go (jump redirects, the /auth/land target, signed-in cross-site links, the brand of an
// email link), code asks `netOrigin`, which honours NEXT_PUBLIC_NET_ORIGINS on dev servers and
// staging projects and ignores it on a production deployment.

export interface NetOriginEnv {
  readonly NEXT_PUBLIC_NET_ORIGINS?: string | undefined;
  readonly VERCEL_ENV?: string | undefined;
}

const ORIGIN_RE = /^(https?):\/\/([a-z0-9.-]+)(:[0-9]{1,5})?$/;

/**
 * Parses NEXT_PUBLIC_NET_ORIGINS: entries `<site>=<origin>` separated by commas or spaces, e.g.
 * `kpop=http://kpop.localhost:3000,anime=http://anime.localhost:3001`. An origin has no path and
 * no trailing slash; `http:` is allowed only for `localhost` and `*.localhost` hosts. Any
 * malformed entry throws (a misconfigured staging project fails loudly instead of sending a
 * browser to the wrong place). Returns the overrides only; a site without one keeps its url.
 */
export function parseNetOrigins(raw: string | undefined): Partial<Record<SiteId, string>> {
  const out: Partial<Record<SiteId, string>> = {};
  for (const entry of (raw ?? '').split(/[\s,]+/).filter(Boolean)) {
    const eq = entry.indexOf('=');
    const id = eq > 0 ? entry.slice(0, eq) : '';
    const origin = eq > 0 ? entry.slice(eq + 1) : '';
    if (!isSiteId(id)) throw new Error(`NEXT_PUBLIC_NET_ORIGINS: unknown site in "${entry}"`);
    if (out[id] !== undefined) throw new Error(`NEXT_PUBLIC_NET_ORIGINS: ${id} is listed twice`);
    const m = ORIGIN_RE.exec(origin);
    if (!m) throw new Error(`NEXT_PUBLIC_NET_ORIGINS: "${origin}" is not a bare origin`);
    const host = m[2]!;
    if (m[1] === 'http' && host !== 'localhost' && !host.endsWith('.localhost')) {
      throw new Error(`NEXT_PUBLIC_NET_ORIGINS: http is allowed only on localhost hosts ("${origin}")`);
    }
    out[id] = origin;
  }
  return out;
}

/**
 * Where a browser reaches `id` on this deployment: the NEXT_PUBLIC_NET_ORIGINS override outside
 * production, else the registry url. On VERCEL_ENV=production the override is ignored, so a
 * production deployment only ever redirects to the three production domains.
 */
export function netOrigin(id: SiteId, env: NetOriginEnv): string {
  if (env.VERCEL_ENV === 'production') return REGISTRY[id].url;
  return parseNetOrigins(env.NEXT_PUBLIC_NET_ORIGINS)[id] ?? REGISTRY[id].url;
}

/**
 * The site an origin belongs to on this deployment (the email hook's brand, the `client` check of
 * /auth/authorize): a registry url always matches; an override matches only outside production.
 * Unknown origins return null.
 */
export function siteForOrigin(origin: string, env: NetOriginEnv): SiteId | null {
  for (const id of SITE_IDS) if (REGISTRY[id].url === origin) return id;
  if (env.VERCEL_ENV === 'production') return null;
  const o = parseNetOrigins(env.NEXT_PUBLIC_NET_ORIGINS);
  for (const id of SITE_IDS) if (o[id] === origin) return id;
  return null;
}

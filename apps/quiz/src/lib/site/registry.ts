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
    ogTemplate: '/api/og/site',
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
  // at launch (G0 default), Verse off.
  features: {
    ...ALL_OFF,
    quizzes: true, topicHubs: true, trivia: true, create: true, dailyQuiz: true,
    blindTest: true, openingOfTheDay: true, nameAll: true, personality: true, thisOrThat: true,
    airingBanner: true, spoilers: true, community: true, challenges: true,
  },
  routes: {
    allow: [
      '/', '/series', '/{series}-quiz', '/anime-mix-quiz', '/{series}-trivia', '/q/{slug}',
      '/which-{series}-character-are-you', '/{series}-openings-quiz', '/blindtest/**',
      '/name-all/{series}/{set}', '/daily', '/opening-of-the-day',
      '/create/**', '/me', '/u/{username}', '/settings/**', '/login', '/onboarding/**',
      '/notifications', '/search', '/community/**', '/about', '/editorial-policy', '/privacy',
      '/terms', '/contact', '/admin/**',
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
  // Placeholder ladder until the owner approves the anime title ladder (G6).
  levelTitles: {
    1: { en: 'Newcomer' },
    3: { en: 'Viewer' },
    6: { en: 'Fan' },
    10: { en: 'Otaku' },
    15: { en: 'Veteran' },
    21: { en: 'Sensei' },
    30: { en: 'Legend' },
  },
  auth: {
    providers: ['google', 'email'],
    googleClientIdEnv: 'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
    emailLanding: '/auth/confirm',
    signOutModes: ['global', 'local'],
  },
  passport: { probeOrder: [] },
  // G0 defaults: 25 to 40 quizzes a day (top of the range as the cap), at most 2 a week per series.
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
    ogTemplate: '/api/og/site',
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
    'theme.light and theme.dark (O1, Option A after G5)', 'levelTitles (G6)',
    'editorial.quizDailyCap (G0)', 'daily.systemUserId (launch L03)',
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

// Run O1 contract o1-contract-v1 (docs/o1/contracts/registry.md). Public entry of lib/site.
// Import from '@/lib/site' in app code; next.config.ts and the middleware import
// './src/lib/site/routing' directly (no path alias there).

export type {
  AuthProvider, FeatureKey, LevelTitle, LevelTitles, NetworkConfig, PickIcon, RoutePattern,
  SignOutMode, SiteAudio, SiteAuth, SiteBrand, SiteConfig, SiteCopy, SiteDaily, SiteEditorial,
  SiteFavouritesVocabulary, SiteFeatures, SiteId, SiteKind, SiteLetter, SiteOrganization,
  SitePassport, SiteRoutes, SiteSeo, SiteTheme, SiteVocabulary, ThemeTokenName, ThemeTokens,
} from './types';
export { SITE_IDS } from './types';
export {
  NETWORK, PLACEHOLDERS, REGISTRY, SITE, SITE_ID, isSiteId, resolveSiteId, siteConfig,
} from './registry';
export type { SiteEnv } from './registry';
export {
  CATCH_ALL_PATTERN, KPOP_DATA_SAMPLES, KPOP_ONLY_SAMPLES, PER_SITE_ROOT_FILES, SESSION_PREFIXES_NON_KPOP,
  SHARED_PREFIXES, SITES_PREFIX, compileRoutePattern, internalPath, isKnownRouteFor,
  isServedSite, middlewareStep, redirectsFor, rewritesFor, siteStaticParams,
} from './routing';
export type { RouteFlags, SiteRewrite } from './routing';

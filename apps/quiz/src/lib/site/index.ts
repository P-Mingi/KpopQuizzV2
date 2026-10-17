// Run O1 contract o1-contract-v1 (docs/o1/contracts/registry.md). Public entry of lib/site.
// Import from '@/lib/site' in app code; next.config.ts and the middleware import
// './src/lib/site/routing' directly (no path alias there).

export type {
  AuthProvider, FeatureKey, LevelInfo, LevelTitle, LevelTitles, NetworkConfig, PickIcon, RoutePattern,
  SignOutMode, SiteAudio, SiteAuth, SiteBrand, SiteConfig, SiteCopy, SiteDaily, SiteEditorial,
  SiteFavouritesVocabulary, SiteFeatures, SiteFilterable, SiteId, SiteKind, SiteLetter, SiteOrganization,
  SitePassport, SiteRoutes, SiteSeo, SiteServerFns, SiteTheme, SiteVocabulary, ThemeTokenName, ThemeTokens,
  UxTokenName,
} from './types';
export { SITE_IDS, UX_NEW_TOKEN_NAMES, UX_TOKEN_NAMES } from './types';
export {
  NETWORK, O1_FLAGS, O1_SECRET_NAMES, PLACEHOLDERS, REGISTRY, SITE, SITE_ID, UNTOUCHED_FLAGS,
  flagOn, isSiteId, netOrigin, parseNetOrigins, resolveSiteId, siteConfig, siteForOrigin,
} from './registry';
export type { FlagScope, NetOriginEnv, O1Flag, SiteEnv } from './registry';
export {
  CATCH_ALL_PATTERN, KPOP_DATA_SAMPLES, KPOP_ONLY_SAMPLES, PER_SITE_ROOT_FILES, SESSION_PREFIXES_NON_KPOP,
  SHARED_PREFIXES, SITES_PREFIX, compileRoutePattern, internalPath, isKnownRouteFor,
  isServedSite, middlewareStep, redirectsFor, rewritesFor, siteStaticParams,
} from './routing';
export type { RouteFlags, SiteRedirect, SiteRewrite } from './routing';

// FandomVerse (docs/launch/o1/ARCHITECTURE-FANDOMVERSE.md, section 2): the base path of this build for a module that can reach a
// client bundle, which must not import lib/site/base-path.ts (that one is for server code). It is the constant Next inlines
// from next.config.ts `basePath` in every bundle: '' on the kpop and hub builds, where the minifier folds it away (today's
// code), '/anime' on the anime build. Unit tests run outside Next: there it is '' (the kpop answer).
//
// One module instead of the same line in every component, so two components that share a block of code do not also share
// the declaration (the twins check of Run O1 counts it). No import here: it adds nothing else to a client graph.

/** This build's base path: '' on kpop and the hub, '/anime' on the anime build. */
export const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

// Bunnyverse (docs/launch/o1/ARCHITECTURE-BUNNYVERSE.md, section 2): the base path of this build for a module that can reach a
// client bundle, which must not import lib/site/base-path.ts (that one is for server code). It is the constant Next inlines
// from next.config.ts `basePath` in every bundle: '' on the kpop and hub builds, where the minifier folds it away (today's
// code), '/anime' on the anime build. Unit tests run outside Next: there it is '' (the kpop answer).
//
// One module instead of the same line in every component, so two components that share a block of code do not also share
// the declaration (the twins check of Run O1 counts it). No import here: it adds nothing else to a client graph.

/** This build's base path: '' on kpop and the hub, '/anime' on the anime build. */
export const BASE_PATH = process.env.__NEXT_ROUTER_BASEPATH || '';

/**
 * The address a browser requests for a site path of this build, for a path that comes as data (a prop, a row, a constant):
 * the path itself on kpop and the hub; under '/anime' on the anime build. An absolute URL, a protocol-relative `//host`, a
 * data: or blob: URL, a relative path and a path already under the base path come back as they are (applying it twice
 * changes nothing); '/' becomes the base path. The answer of prefixBasePath(BASE_PATH, path) of lib/site/base-path.ts
 * (client-base-path.test.ts holds the two equal).
 */
export function withClientBase(path: string): string {
  if (!BASE_PATH || !path.startsWith('/') || path.startsWith('//')) return path;
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`) || path.startsWith(`${BASE_PATH}?`) || path.startsWith(`${BASE_PATH}#`)) return path;
  if (path === '/') return BASE_PATH;
  return path.startsWith('/?') || path.startsWith('/#') ? `${BASE_PATH}${path.slice(1)}` : `${BASE_PATH}${path}`;
}

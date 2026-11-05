// ADMIN-2 (owner, 2026-10-30; PLAN-ADMIN-2 section 2): the cache of the public sites after a write made from the hub. The admin runs on the hub
// build; revalidateTag there expires the hub's cache only, never kpopquiz.org's or bunnyverse.org/anime's. So each site has a revalidation
// route (app/api/site-revalidate/route.ts): POST, a shared secret read from ADMIN_REVALIDATE_SECRET, a closed list of tags. The admin calls
// it after every write that touches a public page.
//
// The address called is the registry url of the site (a constant of this repository), never a value from a request. The secret goes in an
// Authorization header, never in a URL or a log. A failed call never fails the write: the answer says `revalidated: false` and the public
// page catches up at its own revalidate interval.

/**
 * The tags a call may expire: the tags the public pages read through unstable_cache, nothing else. Each one is a tag that exists in the code.
 * The last three are the pictures: the list read of OtakuQuiz's images (lib/entity-images/constants.ts IMAGES_LIST_TAG), the verified pictures
 * of the credits pages and of the games, and the live banners, icons and stickers of bunnyverse.org (both lib/photos/public-read.ts). The tag of
 * ONE image (entity-image:<site>:<kind>:<slug>) is not on the list: nothing public reads it (the pages read the list).
 */
export const REVALIDATE_TAGS = [
  'quizzes', 'groups', 'creators', 'songs', 'editorial', 'personality', 'name-all', 'plays', 'entity-images:anime', 'entity-images-public', 'site-assets',
] as const;
export type RevalidateTag = (typeof REVALIDATE_TAGS)[number];

/** How many tags one call may carry (the whole list). */
export const REVALIDATE_MAX_TAGS = REVALIDATE_TAGS.length;

/** The path of the route on every build (under the basePath of the build: /anime/api/site-revalidate on OtakuQuiz). */
export const REVALIDATE_PATH = '/api/site-revalidate';

export function isRevalidateTag(v: unknown): v is RevalidateTag {
  return typeof v === 'string' && (REVALIDATE_TAGS as readonly string[]).includes(v);
}

/** The tags of a request body, de-duplicated, or null when anything is not on the list (the whole call is refused: no partial purge). */
export function parseRevalidateBody(body: unknown): RevalidateTag[] | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const { tags } = body as { tags?: unknown };
  if (!Array.isArray(tags) || tags.length === 0 || tags.length > REVALIDATE_MAX_TAGS) return null;
  if (!tags.every(isRevalidateTag)) return null;
  return [...new Set(tags)];
}

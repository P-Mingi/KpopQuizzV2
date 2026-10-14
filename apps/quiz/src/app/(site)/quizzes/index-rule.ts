// /quizzes indexability: which listing URLs may be indexed, and their canonical.
// Pure, no I/O: generateMetadata resolves the group and the result size and passes
// them in (both renders, flag on and off, share that generateMetadata).
//
// SEO (owner, 2026-10-13): facet crawl trap. Every filter of the listing (group,
// type, level, lang, sort, search) combines with every other and with ?page, an
// unbounded URL space. The rule:
//   - /quizzes and /quizzes?page=N (N within the result) are indexable, each with a
//     self canonical (page 2..N is its own listing page, never canonical to page 1).
//   - group is the one indexable facet, alone and with a real slug: it stays
//     indexable and canonicals to the group page /<slug>-quiz (the cannibalization
//     fix, unchanged), with or without ?page.
//   - any other facet (lang included: it was ignored here before), 2+ facets, an
//     unknown or repeated param, a ?page written any other way than 2, 3, ... or a
//     page past the last one: noindex,follow, canonical to the closest clean URL
//     (the group page, /quizzes?page=N, or /quizzes).
// A page past the end is not a 404: the v11 render shows page 1 and says so (an
// owner-approved P2 behavior, pinned by e2e/ux-v1/p2.spec.ts), so it is noindex with
// a canonical to the first page instead.

export type QuizzesSearchParams = Record<string, string | string[] | undefined>;

/** Every filter the listing reads (`level` is flag-on only; flag off it is still never indexable). */
export const QUIZZES_FACETS = ['group', 'type', 'level', 'lang', 'sort', 'search'] as const;

const KNOWN = new Set<string>([...QUIZZES_FACETS, 'page']);

export interface QuizzesUrl {
  /** facet params present (any value, even empty or invalid), in QUIZZES_FACETS order */
  facets: string[];
  /** params that make the URL a variant: unknown keys (utm_*, difficulty, ...) and repeated keys */
  extra: string[];
  /** the group slug when `group` is the only facet (the one facet that can be indexed) */
  soleGroup: string | null;
  /** the page the listing renders (the live rule: an integer >= 1, anything else is page 1) */
  page: number;
  /** ?page absent, or written the one clean way: 1, 2, 3 ... (no sign, no leading zero, no junk) */
  pageClean: boolean;
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** Read the parts of a /quizzes URL the index rule needs. */
export function readQuizzesUrl(sp: QuizzesSearchParams): QuizzesUrl {
  const keys = Object.keys(sp).filter((k) => sp[k] !== undefined);
  const facets = QUIZZES_FACETS.filter((k) => keys.includes(k));
  const extra = keys.filter((k) => !KNOWN.has(k) || (Array.isArray(sp[k]) && (sp[k] as string[]).length > 1));
  const rawPage = first(sp.page);
  // Same page rule as the live page and P2 (parsePage): an integer >= 1, else 1.
  const page = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1);
  const pageClean = rawPage === undefined || (/^[1-9]\d*$/.test(rawPage) && Number.isSafeInteger(Number(rawPage)));
  const soleGroup = facets.length === 1 && facets[0] === 'group' ? first(sp.group) ?? '' : null;
  return { facets, extra, soleGroup: soleGroup === '' ? null : soleGroup, page, pageClean };
}

/** Number of listing pages of a result of `total` quizzes (at least 1). */
export function quizzesLastPage(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}

/**
 * Does the rule need the result size? Only for a page past 1 of a view that could be
 * indexed (no facet, or the sole real group); every other variant is noindex anyway.
 */
export function quizzesNeedsLastPage(url: QuizzesUrl, validGroup: boolean): boolean {
  return url.page > 1 && (url.facets.length === 0 || (url.soleGroup !== null && validGroup));
}

export interface QuizzesIndexDecision {
  /** path of the canonical URL */
  canonical: string;
  /** false = robots noindex,follow */
  index: boolean;
}

/**
 * The index rule. `validGroup`: `soleGroup` is a real group slug. `lastPage`: the
 * number of pages of the clean view, null when unknown (not needed, or the read
 * failed: then a page is taken to be in range, as the page itself does).
 */
export function quizzesIndexRule(
  url: QuizzesUrl,
  ctx: { validGroup: boolean; lastPage: number | null },
): QuizzesIndexDecision {
  const groupView = url.soleGroup !== null && ctx.validGroup;
  const outOfRange = ctx.lastPage !== null && url.page > ctx.lastPage;
  const index = (url.facets.length === 0 || groupView) && url.extra.length === 0 && url.pageClean && !outOfRange;
  if (groupView) return { canonical: `/${url.soleGroup}-quiz`, index };
  const cleanPage = url.facets.length === 0 && !outOfRange ? url.page : 1;
  return { canonical: cleanPage > 1 ? `/quizzes?page=${cleanPage}` : '/quizzes', index };
}

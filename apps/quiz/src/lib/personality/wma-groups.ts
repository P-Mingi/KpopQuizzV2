// O1 audit 03 P2-2: the Which member are you groups that kpopquiz.org serves, in ONE place.
//
// The pretty URL /which-<group>-member-are-you is a next.config.ts rewrite for a fixed list (WMA_GROUPS there: the groups that had a profile
// set on 2026-10-02); any other group's pretty URL 301s to its hub. The sitemap and the links of the other pages, though, read the groups
// that have a profile set in the database. A group in the database and not in the rewrite list would be advertised at a URL that
// redirects. So the kpop reads of getWmaGroupSlugs() keep only the groups of this list, and wma-groups.test.ts fails when this list and
// the one in next.config.ts differ (and when the Name them all rewrite list differs from NAME_ALL_GROUPS).

export const WMA_GROUPS: readonly string[] = [
  'aespa', 'ateez', 'blackpink', 'bts', 'enhypen', 'g-i-dle', 'itzy', 'ive',
  'le-sserafim', 'newjeans', 'nmixx', 'seventeen', 'stray-kids', 'twice', 'txt',
];

/** The groups with a profile set whose pretty URL is served (the rest are not advertised). */
export function servedWmaSlugs(slugs: readonly string[]): string[] {
  return slugs.filter((s) => WMA_GROUPS.includes(s));
}

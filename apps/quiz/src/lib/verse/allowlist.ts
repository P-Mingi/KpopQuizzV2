// Verse ingestion property ALLOWLIST - the single source of truth.
//
// Living-persons policy is enforced at FETCH: only these Wikidata properties are
// ever requested, so personal-life data (spouse P26, unmarried partner P451,
// child P40, father P22, mother P25, sibling P3373, residence P551, number of
// children P1971) is never fetched and never stored. Any query builder in this
// codebase MUST source its property list from here. The standalone backfill
// scripts (scripts/verse/02-wikidata-backfill.mjs) mirror this list verbatim.
//
// Verify step greps for these constants to prove nothing off-allowlist is fetched.

export const WIKIDATA_GROUP_PROPS = {
  P571: 'inception_date',
  P264: 'record_label',
  P495: 'origin_country',
  P856: 'official_website',
} as const;

export const WIKIDATA_IDOL_PROPS = {
  P569: 'birth_date',
  P27: 'nationality',
  P1559: 'name_hangul',
} as const;

// Membership linkage only (enumerate members); carries no personal data.
export const WIKIDATA_LINKAGE_PROPS = ['P463', 'P527'] as const;

// Explicitly forbidden - never appear in any query. Listed so reviewers can
// assert their absence.
export const WIKIDATA_FORBIDDEN_PROPS = [
  'P26', 'P451', 'P40', 'P22', 'P25', 'P3373', 'P551', 'P1971',
] as const;

export const ALL_FETCHED_PROPS: string[] = [
  ...Object.keys(WIKIDATA_GROUP_PROPS),
  ...Object.keys(WIKIDATA_IDOL_PROPS),
  ...WIKIDATA_LINKAGE_PROPS,
];

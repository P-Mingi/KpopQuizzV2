// SEO Mission 2 (rulebook section 7): the entity links of a group, read from the versioned file
// scripts/fetch-wikidata-groups.mjs writes (src/data/wikidata-groups.json). A QID is never
// typed in code: a group that is not in the file simply gets no `about` entity.

import data from '@/data/wikidata-groups.json';

export interface WikidataGroup {
  qid: string;
  wikidata: string;
  wikipedia: string;
  official: string[];
  inception: string | null;
  recordLabels: Array<{ qid: string; label: string | null }>;
  members: Array<{ qid: string; label: string | null }>;
}

const GROUPS = (data as { groups: Record<string, WikidataGroup> }).groups;

export function wikidataGroup(slug: string): WikidataGroup | null {
  const g = GROUPS[slug];
  return g && /^Q\d+$/.test(g.qid) ? g : null;
}

/** The official site used in `sameAs`: the first https one Wikidata lists, or null. */
export function officialSite(g: WikidataGroup): string | null {
  return g.official.find((u) => u.startsWith('https://')) ?? null;
}

/** The MusicGroup entity of a hub's JSON-LD, or null when the group has no fetched item. */
export function musicGroupEntity(slug: string, name: string): Record<string, unknown> | null {
  const g = wikidataGroup(slug);
  if (!g) return null;
  const official = officialSite(g);
  return {
    '@type': 'MusicGroup',
    name,
    sameAs: [g.wikidata, g.wikipedia, ...(official ? [official] : [])],
  };
}

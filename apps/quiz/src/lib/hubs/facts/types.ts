// SEO Mission 2 (rulebook section 5; docs/seo/KPOP-SOURCES.md): the sourced facts a group hub
// shows in its "{Group} in 30 seconds" table. A fact renders only when it is stored with
// status 'verified' and its sources; a load-bearing fact (roster, debut date, label, fandom
// name) needs two agreeing sources, one of them official or Wikidata. A Wikidata source never
// carries a typed QID: it names the property and the page resolves the item from
// src/data/wikidata-groups.json, which scripts/fetch-wikidata-groups.mjs writes.

export type FactSourceKind = 'official' | 'wikidata' | 'wikipedia' | 'outlet';

export type FactSource =
  | { kind: 'wikidata'; label: string; /** The statement shown, e.g. P571 (inception). */ property: string }
  | { kind: 'official' | 'wikipedia' | 'outlet'; label: string; url: string };

export interface HubFactRow {
  key: 'members' | 'debut' | 'label' | 'fandom';
  label: string;
  value: string;
  status: 'verified' | 'draft';
  loadBearing: true;
  sources: FactSource[];
}

/** The generation row reads the group data (groups.generation), never a typed value. */
export interface GenerationSourcing {
  confidence: 'consensus' | 'attributed' | 'contested' | 'newest';
  sources: FactSource[];
}

export interface HubMember {
  stageName: string;
  /** Public role only (rulebook 6.1). */
  role: string;
  source: FactSource;
}

export interface HubFacts {
  slug: string;
  /** The day the sources were last checked (YYYY-MM-DD). */
  checkedAt: string;
  /** One self-contained sentence for the answer block, built only from verified rows. */
  summary: string;
  rows: HubFactRow[];
  generation: GenerationSourcing;
  members: HubMember[];
}

/** A source with its link resolved (what the page renders). */
export interface ResolvedSource { label: string; url: string; kind: FactSourceKind }

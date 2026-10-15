// SEO Mission 2, part E (owner, 2026-10-15): the sourced trivia store. One versioned JSON file
// per group (src/lib/trivia/sourced/<group slug>.json) holds question and answer items, each
// with its text, its answer, its sources (URL and type), who verified it, when, and a status.
// Only items with status "verified" render on an indexable page (rulebook section 5.5).
// Dependency-free so scripts and tests can import it.

/** The four banks of a sourced trivia page, in page order. */
export type TriviaLevel = 'easy' | 'medium' | 'hard' | 'records';

export const TRIVIA_LEVELS: readonly TriviaLevel[] = ['easy', 'medium', 'hard', 'records'];

/** A bank renders with this many verified items or more (min-gate: no thin, half-empty section). */
export const MIN_BANK = 3;

/**
 * Where a fact comes from (docs/seo/KPOP-SOURCES.md, level A plus charts):
 *   official      the group's, label's or organizer's own site or verified account
 *   wikidata      the Wikidata item
 *   musicbrainz   MusicBrainz
 *   wikipedia     English Wikipedia
 *   circle-chart  Circle Chart (formerly Gaon)
 *   billboard     billboard.com
 *   outlet        a bylined reputable outlet, for a dated event
 */
export type SourceType = 'official' | 'wikidata' | 'musicbrainz' | 'wikipedia' | 'circle-chart' | 'billboard' | 'outlet';

export const SOURCE_TYPES: readonly SourceType[] = ['official', 'wikidata', 'musicbrainz', 'wikipedia', 'circle-chart', 'billboard', 'outlet'];

/** verified: checked at its sources, renders. candidate: waiting for a check. rejected: kept as a record, never renders. */
export type FactStatus = 'verified' | 'candidate' | 'rejected';

export interface FactSource {
  url: string;
  type: SourceType;
  /** Shown as the link text next to the answer ("Billboard", "Wikipedia"). */
  publisher: string;
  /** The page title at the source, for whoever re-verifies. */
  title: string;
}

export interface SourcedFact {
  /** Stable id, unique across the file ("bts-easy-members"). */
  id: string;
  level: TriviaLevel;
  /** A real question that names its subject, so it stands alone when quoted. */
  question: string;
  /** The short answer. */
  answer: string;
  /** One or two full sentences with a named subject: the fact behind the answer. */
  text: string;
  sources: FactSource[];
  /** Roster, member count, debut date, label or fandom name: needs two agreeing sources, one official or Wikidata. */
  loadBearing: boolean;
  status: FactStatus;
  /** Who opened the sources ("Claude (sources opened 2026-10-15)"). The owner may add his name. */
  verifiedBy: string | null;
  /** ISO day of the check. */
  verifiedAt: string | null;
}

/**
 * The groups data a fact must agree with: the generation label and the member count the
 * site already shows for the group (groups.generation and the published Name them all
 * game), read by scripts/sourced-trivia-refs.mts, never typed.
 */
export interface GroupsDataSnapshot {
  name: string;
  /** groups.generation as stored ("3rd Gen"), or null. */
  generation: string | null;
  /** Members of the published Name them all game, or null when there is none. */
  memberCount: number | null;
  /** ISO day of the read. */
  readAt: string;
}

export interface SourcedTriviaFile {
  version: 1;
  /** Group slug: the page is /<group>-trivia. */
  group: string;
  /** ISO day the file was last reviewed (the page's "Reviewed" date and dateModified). */
  reviewed: string;
  /** The group's English Wikipedia article. */
  wikipedia: string;
  /** The group's official site, or null. */
  officialSite: string | null;
  /** Wikidata id linked from the Wikipedia article, written by scripts/sourced-trivia-refs.mts. */
  wikidata: string | null;
  /** Stage names of the current members, as the facts write them. */
  members: string[];
  groupsData: GroupsDataSnapshot;
  facts: SourcedFact[];
}

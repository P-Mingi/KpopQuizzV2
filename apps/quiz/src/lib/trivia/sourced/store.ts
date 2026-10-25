// SEO Mission 2, part E: the one reader of the sourced trivia files. A page, the sitemap, the
// /trivia hub and the trivia links all ask here, so they agree on which -trivia pages are
// built from sourced facts and on how many verified items each one shows.
//
// To add a group: write src/lib/trivia/sourced/<slug>.json (copy bts.json), run
// `npx tsx scripts/sourced-trivia-refs.mts --write` (Wikidata id and groups data, read, never
// typed), list the file in FILES below, and run `npm run check:fact-lint`.

import aespa from './aespa.json';
import babymonster from './babymonster.json';
import bts from './bts.json';
import cortis from './cortis.json';
import illit from './illit.json';
import ive from './ive.json';

import { MIN_BANK, SOURCE_TYPES, TRIVIA_LEVELS } from './types';

import type { FactSource, SourcedFact, SourcedTriviaFile, TriviaLevel } from './types';

/**
 * A sourced page needs this many verified items. Below it the group keeps its existing
 * trivia page (fun facts from fan-made quizzes), so a half-written file never empties a page.
 */
export const SOURCED_TRIVIA_MIN = 12;

const FILES: readonly unknown[] = [aespa, babymonster, bts, cortis, illit, ive];

const isStr = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

function parseSource(raw: unknown): FactSource | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (!isStr(s.url) || !isStr(s.publisher) || !isStr(s.title)) return null;
  if (!SOURCE_TYPES.includes(s.type as FactSource['type'])) return null;
  return { url: s.url, type: s.type as FactSource['type'], publisher: s.publisher, title: s.title };
}

function parseFact(raw: unknown): SourcedFact | null {
  if (!raw || typeof raw !== 'object') return null;
  const f = raw as Record<string, unknown>;
  if (!isStr(f.id) || !isStr(f.question) || !isStr(f.answer) || !isStr(f.text)) return null;
  if (!TRIVIA_LEVELS.includes(f.level as TriviaLevel)) return null;
  if (!['verified', 'candidate', 'rejected'].includes(f.status as string)) return null;
  const sources = (Array.isArray(f.sources) ? f.sources : []).map(parseSource);
  return {
    id: f.id,
    level: f.level as TriviaLevel,
    question: f.question,
    answer: f.answer,
    text: f.text,
    // A source that does not parse drops out; an item left with none cannot render.
    sources: sources.filter((s): s is FactSource => s !== null),
    loadBearing: f.loadBearing === true,
    status: f.status as SourcedFact['status'],
    verifiedBy: isStr(f.verifiedBy) ? f.verifiedBy : null,
    verifiedAt: isStr(f.verifiedAt) ? f.verifiedAt : null,
  };
}

/**
 * Read one file. Fail closed: a malformed item is dropped, a malformed file is null. It never
 * throws, so a bad edit cannot take a page down (the fact-lint test stops it before a merge).
 */
export function parseSourcedTriviaFile(raw: unknown): SourcedTriviaFile | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (d.version !== 1 || !isStr(d.group) || !isStr(d.reviewed) || !isStr(d.wikipedia)) return null;
  const gd = (d.groupsData ?? {}) as Record<string, unknown>;
  if (!isStr(gd.name) || !isStr(gd.readAt)) return null;
  const facts = (Array.isArray(d.facts) ? d.facts : []).map(parseFact).filter((f): f is SourcedFact => f !== null);
  return {
    version: 1,
    group: d.group,
    reviewed: d.reviewed,
    wikipedia: d.wikipedia,
    officialSite: isStr(d.officialSite) ? d.officialSite : null,
    wikidata: isStr(d.wikidata) && /^Q\d+$/.test(d.wikidata) ? d.wikidata : null,
    members: (Array.isArray(d.members) ? d.members : []).filter(isStr),
    groupsData: {
      name: gd.name,
      generation: isStr(gd.generation) ? gd.generation : null,
      memberCount: typeof gd.memberCount === 'number' && Number.isInteger(gd.memberCount) ? gd.memberCount : null,
      readAt: gd.readAt,
    },
    facts,
  };
}

const PARSED: readonly SourcedTriviaFile[] = FILES.map(parseSourcedTriviaFile).filter((f): f is SourcedTriviaFile => f !== null);

/** Every sourced trivia file that parses (all statuses), for the lint and scripts. */
export function allSourcedTriviaFiles(): readonly SourcedTriviaFile[] {
  return PARSED;
}

/** The items a page may show: verified, with a source, a checker and a date. */
export function verifiedFacts(file: SourcedTriviaFile): SourcedFact[] {
  return file.facts.filter((f) => f.status === 'verified' && f.sources.length > 0 && f.verifiedBy !== null && f.verifiedAt !== null);
}

/**
 * The items the page shows: verified, in a bank (level) that holds at least MIN_BANK of them.
 * The title, the description, the answer block, the JSON-LD, the /trivia hub and the sitemap
 * all count this same list.
 */
export function shownFacts(file: SourcedTriviaFile): SourcedFact[] {
  const verified = verifiedFacts(file);
  const banks = new Set(TRIVIA_LEVELS.filter((l) => verified.filter((f) => f.level === l).length >= MIN_BANK));
  return verified.filter((f) => banks.has(f.level));
}

/**
 * The sourced file that builds /<slug>-trivia, or null when the group has none or it shows
 * fewer than SOURCED_TRIVIA_MIN items (the group then keeps its existing page).
 */
export function getSourcedTrivia(slug: string): SourcedTriviaFile | null {
  const file = PARSED.find((f) => f.group === slug) ?? null;
  return file && shownFacts(file).length >= SOURCED_TRIVIA_MIN ? file : null;
}

/** Items shown on /<slug>-trivia when it is a sourced page, else 0. */
export function sourcedTriviaCount(slug: string): number {
  const file = getSourcedTrivia(slug);
  return file ? shownFacts(file).length : 0;
}

// SEO Mission 2, part E: the fact-lint (rulebook sections 5 and 15). Pure: it reads one sourced
// trivia file and returns every problem it finds, so the unit test (fact-lint.test.ts, run by
// `npm run check:fact-lint`) and any other job (a nightly gate, an admin view) apply the same
// rules. A file ships only with zero issues.
//
// What it checks, per item:
//   schema               id, level, a question ending in "?", an answer, a text ending in "."
//   duplicate-*          no two items with the same question, the same text or the same id
//   subjectless          no fragment without a subject ("He majored in dance."): the text
//                        starts with a capital and no pronoun, and the text and the question
//                        name the group or a member
//   member-count         a member count in the copy equals the groups data, and so does the roster
//                        (no count in the groups data: only a load-bearing item may state one)
//   generation           a generation in the copy equals the groups data (groups.generation)
//   source-*             at least one source, https, an allowed host for its type, never a fan
//                        database; a Wikidata link points at the id the script wrote
//   load-bearing         roster, member count, debut date, label, fandom: two sources on two
//                        hosts, one of them official or Wikidata
//   verification         a verified item says who checked it and when
//   dash                 no em or en dash anywhere in the file

import { normalizeFactKey } from '../fact-key';

import { SOURCE_TYPES, TRIVIA_LEVELS } from './types';

import type { FactSource, SourceType, SourcedTriviaFile } from './types';

export type LintCode =
  | 'schema'
  | 'duplicate-id'
  | 'duplicate-question'
  | 'duplicate-text'
  | 'subjectless'
  | 'member-count'
  | 'generation'
  | 'source-missing'
  | 'source-host'
  | 'source-banned'
  | 'load-bearing'
  | 'verification'
  | 'dash';

export interface LintIssue {
  code: LintCode;
  /** The item id, or the file's group slug for a file-level issue. */
  id: string;
  message: string;
}

/** Hosts allowed for each source type (docs/seo/KPOP-SOURCES.md). Subdomains of a listed host count. */
const HOSTS: Record<Exclude<SourceType, 'official'>, readonly string[]> = {
  wikidata: ['www.wikidata.org'],
  musicbrainz: ['musicbrainz.org'],
  wikipedia: ['en.wikipedia.org'],
  'circle-chart': ['circlechart.kr'],
  billboard: ['billboard.com'],
  // Bylined reputable outlets, for dated events and attributed debates only.
  outlet: [
    'koreajoongangdaily.joins.com', 'koreatimes.co.kr', 'koreaherald.com', 'yna.co.kr', 'nme.com',
    'rollingstone.com', 'variety.com', 'apnews.com', 'reuters.com', 'bbc.com', 'bbc.co.uk', 'time.com',
    'theguardian.com', 'nytimes.com',
  ],
};

/**
 * Official sites: a group's own site, its label's site, or the organizer of an event writing
 * about its own event (UNICEF on a UNICEF launch). Add a host here when a new group file needs it.
 */
export const OFFICIAL_HOSTS: readonly string[] = [
  'ibighit.com', 'bts-official.jp', 'weverse.io', 'hybecorp.com', 'unicef.org',
  'smentertainment.com', 'jype.com', 'ygfamily.com', 'starship-ent.com', 'belift.kr',
];

/** Fan databases: never a source (rulebook 5.3). */
const BANNED_HOSTS: readonly string[] = ['kprofiles.com', 'fandom.com', 'namu.wiki', 'dbkpop.com'];

const PRONOUN_START = /^(he|she|it|they|his|her|its|their|this|these|that|those|him|them)\b/i;
const DASHES = /[\u2013\u2014]/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, duo: 2, trio: 3, quartet: 4, quintet: 5, sextet: 6,
  septet: 7, octet: 8, nonet: 9,
};
const COUNT = '(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)';
/** "has seven members", "of 7 members", "all seven members", "a seven-member group", "a septet". */
const MEMBER_COUNT_RES: readonly RegExp[] = [
  new RegExp(`\\b(?:has|have|had|with|of|all|its|their)\\s+${COUNT}\\s+members\\b`, 'gi'),
  new RegExp(`\\b${COUNT}-member\\b`, 'gi'),
  // A collective noun after an article ("a septet", "the South Korean septet"), lowercase only:
  // "Best Pop Duo/Group Performance" is a Grammy category, not a member count.
  /\b(?:[Aa]n?|[Tt]he)\s+(?:[A-Za-z-]+\s+){0,3}?(duo|trio|quartet|quintet|sextet|septet|octet|nonet)\b/g,
];

const GEN_WORDS: Record<string, number> = { '1st': 1, '2nd': 2, '3rd': 3, '4th': 4, '5th': 5, '6th': 6, first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6 };
const GENERATION_RE = /\b(1st|2nd|3rd|4th|5th|6th|first|second|third|fourth|fifth|sixth)[\s-]+gen(?:eration)?\b/gi;

/** "3rd Gen" -> 3, anything else -> null. */
export function generationNumber(label: string | null): number | null {
  const m = /^(\d)(?:st|nd|rd|th)\s+gen/i.exec((label ?? '').trim());
  return m ? Number(m[1]) : null;
}

function countOf(token: string): number {
  const t = token.toLowerCase();
  return /^\d+$/.test(t) ? Number(t) : (NUMBER_WORDS[t] ?? Number.NaN);
}

/** Every member count the copy states. */
export function memberCountClaims(s: string): number[] {
  const out: number[] = [];
  for (const re of MEMBER_COUNT_RES) {
    for (const m of s.matchAll(re)) out.push(countOf(m[1]!));
  }
  return out;
}

/** Every generation number the copy states. */
export function generationClaims(s: string): number[] {
  return [...s.matchAll(GENERATION_RE)].map((m) => GEN_WORDS[m[1]!.toLowerCase()]!);
}

function hostOf(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

const onHost = (host: string, allowed: readonly string[]): boolean =>
  allowed.some((a) => host === a || host.endsWith(`.${a}`));

/** Lowercase letters and digits only: the key two questions are compared on. */
const questionKey = (q: string): string => q.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** The names a self-contained sentence may lean on: the group and its members. */
function subjectNames(file: SourcedTriviaFile): string[] {
  return [file.groupsData.name, ...file.members].filter((n) => n.trim().length > 0).map((n) => n.toLowerCase());
}

const namesOne = (s: string, names: string[]): boolean => {
  const low = s.toLowerCase();
  return names.some((n) => new RegExp(`(^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(low));
};

function lintSource(file: SourcedTriviaFile, src: FactSource, push: (code: LintCode, message: string) => void): void {
  if (!SOURCE_TYPES.includes(src.type)) push('schema', `unknown source type "${String(src.type)}"`);
  if (!src.publisher?.trim() || !src.title?.trim()) push('source-missing', `a source has no publisher or title (${src.url})`);
  const host = hostOf(src.url);
  if (!host) {
    push('source-missing', `source URL is not a valid https URL: ${src.url}`);
    return;
  }
  if (onHost(host, BANNED_HOSTS)) {
    push('source-banned', `${host} is a fan database, never a source`);
    return;
  }
  const allowed = src.type === 'official' ? OFFICIAL_HOSTS : HOSTS[src.type];
  if (allowed && !onHost(host, allowed)) push('source-host', `${host} is not an allowed host for a ${src.type} source`);
  if (src.type === 'wikidata') {
    const expected = file.wikidata ? `https://www.wikidata.org/wiki/${file.wikidata}` : null;
    if (!expected) push('source-host', 'a Wikidata source needs the file wikidata id, written by scripts/sourced-trivia-refs.mts');
    else if (src.url !== expected) push('source-host', `Wikidata source ${src.url} is not the group item ${expected}`);
  }
}

/** Every problem in one file. Empty means it may ship. */
export function lintTriviaFile(file: SourcedTriviaFile): LintIssue[] {
  const issues: LintIssue[] = [];
  const fileIssue = (code: LintCode, message: string): void => { issues.push({ code, id: file.group, message }); };

  if (DASHES.test(JSON.stringify(file))) fileIssue('dash', 'the file contains an em or en dash');
  if (!ISO_DAY.test(file.reviewed)) fileIssue('schema', 'reviewed is not an ISO day');
  if (!file.groupsData?.name?.trim()) fileIssue('schema', 'groupsData.name is missing');

  const expectedCount = file.groupsData?.memberCount ?? null;
  const expectedGen = generationNumber(file.groupsData?.generation ?? null);
  if (expectedCount !== null && file.members.length !== expectedCount) {
    fileIssue('member-count', `the file lists ${file.members.length} members, the groups data has ${expectedCount}`);
  }

  const names = subjectNames(file);
  const ids = new Set<string>();
  const questions = new Map<string, string>();
  const texts = new Map<string, string>();

  for (const item of file.facts) {
    const id = item.id || '(no id)';
    const push = (code: LintCode, message: string): void => { issues.push({ code, id, message }); };

    // schema
    if (!item.id?.trim()) push('schema', 'missing id');
    if (!TRIVIA_LEVELS.includes(item.level)) push('schema', `unknown level "${String(item.level)}"`);
    if (!item.question?.trim().endsWith('?')) push('schema', 'the question must end with "?"');
    if (!item.answer?.trim()) push('schema', 'missing answer');
    if ((item.answer ?? '').length > 80) push('schema', 'the answer is longer than 80 characters');
    if (!/[.]$/.test(item.text?.trim() ?? '')) push('schema', 'the text must be full sentences ending with "."');
    if (!['verified', 'candidate', 'rejected'].includes(item.status)) push('schema', `unknown status "${String(item.status)}"`);

    // duplicates
    if (ids.has(item.id)) push('duplicate-id', `id "${item.id}" is used twice`);
    ids.add(item.id);
    const qk = questionKey(item.question ?? '');
    if (questions.has(qk)) push('duplicate-question', `same question as ${questions.get(qk)}`);
    else questions.set(qk, id);
    for (const tk of new Set([normalizeFactKey(item.text ?? ''), questionKey(item.text ?? '')])) {
      if (texts.has(tk)) push('duplicate-text', `same fact as ${texts.get(tk)}`);
      else texts.set(tk, id);
    }

    // subjectless fragments
    const text = (item.text ?? '').trim();
    // A capital or a digit, or a name the group writes in lowercase ("aespa has four members").
    const namedStart = /^[A-Z0-9"]/.test(text) || names.some((n) => text.toLowerCase().startsWith(`${n} `));
    if (PRONOUN_START.test(text) || !namedStart) push('subjectless', `the text starts without a named subject: "${text.slice(0, 40)}"`);
    if (text.split(/\s+/).length < 6) push('subjectless', 'the text is under six words');
    if (!namesOne(text, names)) push('subjectless', 'the text names neither the group nor a member');
    if (PRONOUN_START.test((item.question ?? '').trim())) push('subjectless', 'the question starts with a pronoun');
    if (!namesOne(item.question ?? '', names)) push('subjectless', 'the question names neither the group nor a member');

    // consistency with the groups data
    const copy = `${item.question} ${item.answer} ${item.text}`;
    for (const n of memberCountClaims(copy)) {
      if (expectedCount !== null) {
        if (n !== expectedCount) push('member-count', `states ${n} members, the groups data has ${expectedCount}`);
      } else if (!item.loadBearing) {
        // The site shows no member count for this group yet: only a load-bearing item (two
        // sources, one official or Wikidata) may state one, and it must match the roster.
        push('member-count', `states ${n} members, the groups data has none: mark the item load-bearing`);
      } else if (n !== file.members.length) {
        push('member-count', `states ${n} members, the file roster has ${file.members.length}`);
      }
    }
    for (const g of generationClaims(copy)) {
      if (expectedGen === null) push('generation', `states generation ${g}, the groups data has no generation`);
      else if (g !== expectedGen) push('generation', `states generation ${g}, the groups data says ${file.groupsData.generation}`);
    }

    // sources
    const sources = Array.isArray(item.sources) ? item.sources : [];
    if (sources.length === 0) push('source-missing', 'no source');
    for (const src of sources) lintSource(file, src, push);
    if (item.loadBearing) {
      const hosts = new Set(sources.map((s) => hostOf(s.url)).filter(Boolean));
      const anchored = sources.some((s) => s.type === 'official' || s.type === 'wikidata');
      if (sources.length < 2 || hosts.size < 2) push('load-bearing', 'a load-bearing fact needs two sources on two hosts');
      if (!anchored) push('load-bearing', 'a load-bearing fact needs an official or Wikidata source');
    }

    // verification
    if (item.status === 'verified') {
      if (!item.verifiedBy?.trim()) push('verification', 'a verified item needs verifiedBy');
      if (!ISO_DAY.test(item.verifiedAt ?? '')) push('verification', 'a verified item needs verifiedAt (ISO day)');
      else if (file.reviewed && (item.verifiedAt as string) > file.reviewed) push('verification', 'verifiedAt is after the file reviewed date');
    }
  }
  return issues;
}

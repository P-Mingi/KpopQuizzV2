// SEO Mission 2, part E: the words of a sourced trivia page (/<group>-trivia built from the
// fact store), kept pure so the title, the description, the answer block, the headings and
// the JSON-LD come from the same values and a test can hold them to the rulebook
// (section 2: title within 60 characters with the suffix, description 120 to 160, one primary
// phrase; section 3: a 40 to 60 word answer block with a number and its date; section 7:
// JSON-LD equal to the visible text, no Flashcard).

import { fitTitle } from '@/lib/seo/title-fit';

import { MIN_BANK, TRIVIA_LEVELS } from './types';

import type { FactSource, SourcedFact, SourcedTriviaFile, TriviaLevel } from './types';

export const SITE_URL = 'https://kpopquiz.org';

/** "October 15, 2026" from an ISO day, read as a calendar day (no time zone shift). */
export function longDate(isoDay: string): string {
  const [y, m, d] = isoDay.split('-').map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1)).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export function sourcedTriviaTitle(name: string, count: number): string {
  return fitTitle(`${name} Trivia: ${count} Questions and Answers`, `${name} Trivia: ${count} Questions`, `${name} Trivia Questions`);
}

export function sourcedTriviaH1(name: string): string {
  return `${name} trivia questions and answers`;
}

export function sourcedTriviaDescription(name: string, count: number): string {
  return `${name} trivia questions and answers: ${count} questions from easy to hard, plus chart records, each with its source. Play them with friends or test yourself.`;
}

export interface LevelSection {
  level: TriviaLevel;
  /** Anchor id on the page. */
  id: string;
  title: string;
  /** The short label of the on-page menu. */
  short: string;
  intro: string;
  facts: SourcedFact[];
}

export function levelSections(name: string, facts: SourcedFact[]): LevelSection[] {
  const copy: Record<TriviaLevel, { title: string; short: string; intro: string }> = {
    easy: { title: `Easy ${name} trivia questions`, short: 'Easy', intro: `Warm-up questions about ${name} for new and casual fans.` },
    medium: { title: `Medium ${name} trivia questions`, short: 'Medium', intro: `Questions for fans who follow ${name} closely.` },
    hard: { title: `Hard ${name} trivia questions`, short: 'Hard', intro: `Deep cuts about ${name} for the most dedicated fans.` },
    records: { title: `${name} records and achievements`, short: 'Records', intro: `Chart records only, each one linked to the chart or source that reports it.` },
  };
  return TRIVIA_LEVELS.map((level) => ({ level, id: level, ...copy[level], facts: facts.filter((f) => f.level === level) }))
    .filter((s) => s.facts.length >= MIN_BANK);
}

/** The 40 to 60 word answer block: what the page is, one number with its date and denominator. */
export function sourcedTriviaAnswer(name: string, sections: LevelSection[], reviewed: string): string {
  const total = sections.reduce((n, s) => n + s.facts.length, 0);
  const of = (level: TriviaLevel): number => sections.find((s) => s.level === level)?.facts.length ?? 0;
  const levels = [
    of('easy') ? `${of('easy')} easy` : null,
    of('medium') ? `${of('medium')} medium` : null,
    of('hard') ? `${of('hard')} hard` : null,
  ].filter(Boolean) as string[];
  const split = levels.length > 1 ? `${levels.slice(0, -1).join(', ')} and ${levels[levels.length - 1]}` : (levels[0] ?? '');
  const records = of('records') ? `, plus ${of('records')} on chart records` : '';
  return `This page holds ${total} ${name} trivia questions with their answers: ${split}${records}. `
    + `Each answer links to its source, such as Billboard, Wikipedia or an official ${name} site. `
    + `All ${total} were checked against those sources on ${longDate(reviewed)}.`;
}

/** Every distinct source of the shown items, in first-use order. */
export function sourceList(facts: SourcedFact[]): FactSource[] {
  const seen = new Map<string, FactSource>();
  for (const f of facts) for (const s of f.sources) if (!seen.has(s.url)) seen.set(s.url, s);
  return [...seen.values()];
}

/** The MusicGroup sameAs: the Wikipedia article, the Wikidata item (script-written) and the official site. */
export function groupSameAs(file: SourcedTriviaFile): string[] {
  return [file.wikipedia, file.wikidata ? `https://www.wikidata.org/wiki/${file.wikidata}` : null, file.officialSite]
    .filter((u): u is string => typeof u === 'string' && u.length > 0);
}

/**
 * Quiz with Question and acceptedAnswer (rulebook section 7: semantics only, never
 * eduQuestionType Flashcard), about the MusicGroup with its sameAs. Every name and text here
 * is printed on the page: the H1, the answer block, each question and each answer.
 */
export function sourcedTriviaJsonLd(args: {
  name: string;
  slug: string;
  file: SourcedTriviaFile;
  sections: LevelSection[];
  answer: string;
}): Record<string, unknown> {
  const { name, slug, file, sections, answer } = args;
  const url = `${SITE_URL}/${slug}-trivia`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Quiz',
    name: sourcedTriviaH1(name),
    description: answer,
    url,
    inLanguage: 'en',
    dateModified: file.reviewed,
    about: { '@type': 'MusicGroup', name, sameAs: groupSameAs(file) },
    publisher: { '@type': 'Organization', name: 'KpopQuiz', url: SITE_URL },
    hasPart: sections.flatMap((s) => s.facts.map((f) => ({
      '@type': 'Question',
      name: f.question,
      url: `${url}#${f.id}`,
      acceptedAnswer: { '@type': 'Answer', text: f.answer, citation: f.sources.map((src) => src.url) },
    }))),
  };
}

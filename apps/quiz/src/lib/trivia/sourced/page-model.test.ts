import { describe, expect, it } from 'vitest';

import { TITLE_MAX } from '@/lib/seo/quiz-meta';

import {
  groupSameAs,
  levelSections,
  longDate,
  sourceList,
  sourcedTriviaAnswer,
  sourcedTriviaDescription,
  sourcedTriviaH1,
  sourcedTriviaJsonLd,
  sourcedTriviaTitle,
} from './page-model';
import { allSourcedTriviaFiles, getSourcedTrivia, shownFacts } from './store';

// SEO Mission 2, part E: the sourced trivia page against the rulebook (sections 2, 3 and 7),
// for every file the store serves today.

const words = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
const DASHES = /[\u2013\u2014]/;

describe('longDate', () => {
  it('prints the calendar day, whatever the time zone', () => {
    expect(longDate('2026-10-15')).toBe('October 15, 2026');
    expect(longDate('2026-01-01')).toBe('January 1, 2026');
  });
});

for (const file of allSourcedTriviaFiles().filter((f) => getSourcedTrivia(f.group))) {
  const name = file.groupsData.name;
  const facts = shownFacts(file);
  const sections = levelSections(name, facts);
  const count = facts.length;
  const answer = sourcedTriviaAnswer(name, sections, file.reviewed);

  describe(`/${file.group}-trivia`, () => {
    it('has a title within 60 characters with the suffix, and no cut word', () => {
      const title = sourcedTriviaTitle(name, count);
      expect(title.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(title.startsWith(`${name} Trivia`)).toBe(true);
    });

    it('shares one primary phrase across the title, the H1 and the description (120 to 160)', () => {
      const phrase = `${name} trivia`.toLowerCase();
      const description = sourcedTriviaDescription(name, count);
      expect(sourcedTriviaTitle(name, count).toLowerCase()).toContain(phrase);
      expect(sourcedTriviaH1(name).toLowerCase()).toContain(phrase);
      expect(description.toLowerCase()).toContain(phrase);
      expect(description.length).toBeGreaterThanOrEqual(120);
      expect(description.length).toBeLessThanOrEqual(160);
    });

    it('opens with a 40 to 60 word answer that carries the count and the review date', () => {
      expect(words(answer)).toBeGreaterThanOrEqual(40);
      expect(words(answer)).toBeLessThanOrEqual(60);
      expect(answer).toContain(String(count));
      expect(answer).toContain(longDate(file.reviewed));
    });

    it('counts the same items in every bank, the answer and the JSON-LD', () => {
      expect(sections.reduce((n, s) => n + s.facts.length, 0)).toBe(count);
      const ld = sourcedTriviaJsonLd({ name, slug: file.group, file, sections, answer });
      const parts = ld.hasPart as Array<{ name: string; acceptedAnswer: { text: string; citation: string[] } }>;
      expect(parts.length).toBe(count);
      // Every value is printed on the page: the H1, the answer block, each question and answer.
      expect(ld.name).toBe(sourcedTriviaH1(name));
      expect(ld.description).toBe(answer);
      expect(parts.map((p) => p.name)).toEqual(facts.map((f) => f.question));
      expect(parts.map((p) => p.acceptedAnswer.text)).toEqual(facts.map((f) => f.answer));
      expect(parts.every((p) => p.acceptedAnswer.citation.length > 0)).toBe(true);
    });

    it('uses Quiz semantics only: no Flashcard, no FAQPage', () => {
      const ld = JSON.stringify(sourcedTriviaJsonLd({ name, slug: file.group, file, sections, answer }));
      expect(ld).not.toContain('Flashcard');
      expect(ld).not.toContain('eduQuestionType');
      expect(ld).not.toContain('FAQPage');
    });

    it('grounds the MusicGroup with the Wikipedia article and the script-written Wikidata item', () => {
      const same = groupSameAs(file);
      expect(same).toContain(file.wikipedia);
      expect(same).toContain(`https://www.wikidata.org/wiki/${file.wikidata}`);
    });

    it('lists every source it shows, once, and writes no em or en dash', () => {
      const listed = sourceList(facts).map((s) => s.url);
      expect(new Set(listed).size).toBe(listed.length);
      for (const f of facts) for (const s of f.sources) expect(listed).toContain(s.url);
      const copy = [sourcedTriviaTitle(name, count), sourcedTriviaDescription(name, count), answer, ...sections.flatMap((s) => [s.title, s.intro])];
      expect(copy.filter((c) => DASHES.test(c))).toEqual([]);
    });

    it('names each bank with a plain label, records last', () => {
      expect(sections.map((s) => s.level)).toEqual(['easy', 'medium', 'hard', 'records'].filter((l) => sections.some((s) => s.level === l)));
      expect(sections.at(-1)?.title).toBe(`${name} records and achievements`);
    });
  });
}

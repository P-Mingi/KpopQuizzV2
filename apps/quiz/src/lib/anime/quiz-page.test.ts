import { describe, expect, it } from 'vitest';

import { buildInThisQuiz } from '@/lib/quiz/in-this-quiz';

import { quizSpoilerLevel } from './series-model';
import { maskTaggedQuestions, withoutTaggedQuestions } from './spoilers';
import { FIXTURE_SLUGS, hubFromFixture, readFixture } from './test-support';

import type { QuizWithGroup } from '@/lib/db/types';

// What the anime /q/{slug} page does with a quiz before it prints anything (A5): the questions behind an arc above 0 are
// dropped from the lists and masked in the sample, so their text reaches neither the HTML nor the JSON-LD.
describe.each(FIXTURE_SLUGS)('the quiz page of the %s fixture', (slug) => {
  const hub = hubFromFixture(slug);

  for (const quiz of readFixture(slug).quizzes) {
    it(`${quiz.slug}: computes its level on the server and prints no tagged question`, () => {
      const level = quizSpoilerLevel(hub, quiz.slug, quiz.questions);
      expect({ arc_ord: level.arcOrd, scope: level.scope }).toEqual(quiz.expected_level);

      const tagged = quiz.questions.filter((q) => (q.spoiler?.arc ?? 0) > 0).map((q) => q.question ?? '');
      const visible = withoutTaggedQuestions(quiz.questions);
      expect(visible).toHaveLength(quiz.questions.length - tagged.length);
      const jsonLdParts = visible.map((q) => ({ '@type': 'Question', name: q.question }));
      const sample = buildInThisQuiz({ ...quiz, group_name: hub.group.name, questions: maskTaggedQuestions(quiz.questions) } as unknown as QuizWithGroup);
      const printed = JSON.stringify([visible, jsonLdParts, sample]);
      for (const text of tagged) expect(printed).not.toContain(text);
      // the count stays the real one
      expect(sample?.topicsLine.startsWith(`${quiz.questions.length} `)).toBe(true);
    });
  }
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { checkQuizPayload } from '@/lib/editorial/quiz/payload';

// The two award quiz drafts the owner imports (docs/o1/reports/L1/titles/): they must pass the same check the import runs,
// and carry no fan-vote category, prediction, age, birth order or height question.

const DIR = resolve(__dirname, '../../../../../docs/o1/reports/L1/titles');
const FILES = ['mma2026-quiz-draft.json', 'mama-awards-quiz-draft.json'];

describe.each(FILES)('award quiz draft %s', (file) => {
  const drafts = JSON.parse(readFileSync(resolve(DIR, file), 'utf8')) as unknown[];

  it('is one draft that passes checkQuizPayload', () => {
    expect(drafts).toHaveLength(1);
    const r = checkQuizPayload(drafts[0]);
    expect(r.ok, r.ok ? '' : r.detail).toBe(true);
  });

  it('has no forbidden question and an evergreen slug', () => {
    const d = drafts[0] as { slug: string; questions: Array<{ question: string }> };
    expect(d.slug).toMatch(/^[a-z-]+$/);
    for (const q of d.questions) {
      expect(q.question).not.toMatch(/\b(age|oldest|youngest|tallest|height|will win|predict|fan vote|fans voted|netizen)\b/i);
    }
  });
});

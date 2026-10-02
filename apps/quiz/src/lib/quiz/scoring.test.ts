import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { quizRowAverage } from '@/components/profile/ux-v1/rows';
import { pickCatalogQotd } from '@/lib/quiz-bank-scheduling';
import { cardAverage } from '@/lib/ux-v1/p4/format';

import { avgScorePct, maxPointsPerQuestion, maxScore, runScoreLabel, runScorePct, scoreIsPerQuestion } from './scoring';
import { buildTeaser } from './teaser';

import type { QuizCardData, QuizType } from '@/lib/db/types';

// Every quiz type the app knows (lib/db/types.ts QuizType). A new type must be added
// here: the Record below fails to compile otherwise.
const ALL: Record<QuizType, true> = { multiple_choice: true, true_false: true, guess_from_clues: true, image: true, intruder: true };
const TYPES = Object.keys(ALL) as QuizType[];

describe('maxPointsPerQuestion / maxScore', () => {
  it.each([
    ['multiple_choice', 1],
    ['true_false', 1],
    ['image', 1],
    ['intruder', 1],
    ['guess_from_clues', 3],
    ['something_new', 1],
    [null, 1],
    [undefined, 1],
  ] as const)('%s gives %i point(s) per question', (type, points) => {
    expect(maxPointsPerQuestion(type)).toBe(points);
  });

  it.each([
    ['multiple_choice', 8, 8],
    ['guess_from_clues', 6, 18],
    ['guess_from_clues', 8, 24],
    ['true_false', 0, 0],
    ['guess_from_clues', -3, 0],
    ['image', null, 0],
    ['intruder', Number.NaN, 0],
    ['intruder', 7.9, 7],
  ] as const)('maxScore(%s, %s) = %i', (type, count, max) => {
    expect(maxScore(type, count)).toBe(max);
  });

  it('agrees with scoreIsPerQuestion: a per-question type is worth exactly 1 point', () => {
    for (const t of TYPES) {
      if (scoreIsPerQuestion(t)) expect(maxPointsPerQuestion(t)).toBe(1);
    }
    expect(scoreIsPerQuestion('guess_from_clues')).toBe(false);
  });
});

describe('avgScorePct', () => {
  it.each([
    // [type, sum, completions, questions, expected]
    ['multiple_choice', 400, 100, 8, 50],
    ['true_false', 720, 100, 10, 72],
    ['image', 30, 10, 3, 100],
    ['intruder', 0, 12, 5, 0],
    // The live bug: 6 questions, up to 18 points a run. 11.34 points on average was shown as 189%.
    ['guess_from_clues', 1134, 100, 6, 63],
    ['guess_from_clues', 1494, 100, 6, 83],
    ['guess_from_clues', 1800, 100, 6, 100],
    ['guess_from_clues', 400, 100, 8, 17],
  ] as const)('%s: sum %i over %i runs of %i questions = %i%%', (quiz_type, total_score_sum, total_completions, question_count, pct) => {
    expect(avgScorePct({ quiz_type, total_score_sum, total_completions, question_count })).toBe(pct);
  });

  it.each([
    [{ total_score_sum: 10, total_completions: 0, question_count: 5, quiz_type: 'multiple_choice' }],
    [{ total_score_sum: 10, total_completions: 4, question_count: 0, quiz_type: 'multiple_choice' }],
    [{ total_score_sum: 10, total_completions: null, question_count: 5, quiz_type: 'guess_from_clues' }],
    [{ total_score_sum: 10, total_completions: 4, question_count: undefined, quiz_type: 'guess_from_clues' }],
    [{ total_score_sum: 10, total_completions: -2, question_count: 5, quiz_type: 'image' }],
  ] as const)('returns null when there is nothing to average: %o', (q) => {
    expect(avgScorePct(q)).toBeNull();
  });

  it('never leaves 0..100, whatever is stored, for every quiz type', () => {
    const sums = [-50, 0, 1, 7, 99, 100, 1000, 1e9, Number.NaN, Number.POSITIVE_INFINITY];
    const completions = [1, 2, 3, 10, 999];
    const questions = [1, 2, 5, 6, 8, 10, 20];
    let checked = 0;
    for (const quiz_type of [...TYPES, 'unknown', null, undefined]) {
      for (const total_score_sum of sums) {
        for (const total_completions of completions) {
          for (const question_count of questions) {
            for (const precise of [false, true]) {
              const pct = avgScorePct({ quiz_type, total_score_sum, total_completions, question_count }, precise);
              expect(pct).not.toBeNull();
              expect(pct).toBeGreaterThanOrEqual(0);
              expect(pct).toBeLessThanOrEqual(100);
              checked += 1;
            }
          }
        }
      }
    }
    expect(checked).toBe(8 * 10 * 5 * 7 * 2);
  });

  it('a perfect average is exactly 100 for every quiz type', () => {
    for (const quiz_type of TYPES) {
      const question_count = 7;
      const total_completions = 13;
      const total_score_sum = maxScore(quiz_type, question_count) * total_completions;
      expect(avgScorePct({ quiz_type, total_score_sum, total_completions, question_count })).toBe(100);
    }
  });

  it('precise keeps the fraction, the default rounds', () => {
    const q = { quiz_type: 'multiple_choice', total_score_sum: 10, total_completions: 3, question_count: 8 } as const;
    expect(avgScorePct(q)).toBe(42);
    expect(avgScorePct(q, true)).toBeCloseTo(41.6667, 3);
  });

  it('for a 1-point type it is the old inline expression, unchanged', () => {
    for (const quiz_type of TYPES.filter((t) => t !== 'guess_from_clues')) {
      for (const [sum, n, qc] of [[400, 100, 8], [11, 3, 5], [5, 5, 10], [220, 40, 10]] as const) {
        expect(avgScorePct({ quiz_type, total_score_sum: sum, total_completions: n, question_count: qc })).toBe(Math.round((sum / n / qc) * 100));
        expect(avgScorePct({ quiz_type, total_score_sum: sum, total_completions: n, question_count: qc }, true)).toBeCloseTo((sum / n / qc) * 100, 9);
      }
    }
  });
});

describe('runScoreLabel / runScorePct', () => {
  it.each([
    [18, 6, 'guess_from_clues', '18/18', 100],
    [11, 6, 'guess_from_clues', '11/18', 61],
    [7, 8, 'multiple_choice', '7/8', 88],
    [0, 10, 'true_false', '0/10', 0],
    [5, 5, 'intruder', '5/5', 100],
    [3, 4, 'image', '3/4', 75],
    // A stored score above the maximum is shown capped, never "9/8".
    [9, 8, 'multiple_choice', '8/8', 100],
    [-2, 8, 'multiple_choice', '0/8', 0],
  ] as const)('%i points on %i questions (%s) reads %s, %i%%', (score, count, type, label, pct) => {
    expect(runScoreLabel(score, count, type)).toBe(label);
    expect(runScorePct(score, count, type)).toBe(pct);
  });

  it('without questions the label keeps the score and the percentage is null', () => {
    expect(runScoreLabel(4, 0, 'multiple_choice')).toBe('4/0');
    expect(runScorePct(4, 0, 'multiple_choice')).toBeNull();
  });
});

// "No page can show an average above 100%": every surface G1 owns goes through
// avgScorePct. Checked on the pure builders the cards use, for every quiz type and
// for sums far above what a run can score, then on the source: no inline average
// is left outside the files listed in docs/design/growth-v12/run/requests/G1.md.
describe('no surface shows an average above 100%', () => {
  const card = (quiz_type: QuizType, total_score_sum: number, total_completions: number, question_count: number): QuizCardData => ({
    id: 'q', title: 'Quiz', slug: 'quiz', quiz_type, difficulty: 'medium', language: 'en', play_count: 500,
    total_score_sum, total_completions, like_count: 0, question_count, created_at: '2026-01-01T00:00:00Z',
    first_question: 'Who is this?',
  } as unknown as QuizCardData);

  const CASES: Array<[number, number, number]> = [
    [1134, 100, 6], [1494, 100, 6], [1800, 100, 6], [99_999, 100, 6], [720, 100, 10], [3000, 100, 10], [5, 100, 8],
  ];

  it.each(TYPES)('%s: teaser, profile row and text card stay inside 0..100', (type) => {
    for (const [sum, n, qc] of CASES) {
      const q = card(type, sum, n, qc);
      const teaser = buildTeaser(q)?.avgPct ?? null;
      const row = quizRowAverage(q);
      const text = cardAverage(q);
      for (const v of [teaser, text, row === null ? null : Number.parseInt(row, 10)]) {
        if (v === null) continue;
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
      expect(teaser).toBe(avgScorePct(q));
      if (row !== null) expect(row).toBe(`${avgScorePct(q)}% average`);
    }
  });

  it('the live bug: a clue quiz at 11.34 points over 6 questions reads 63%, not 189%', () => {
    const q = card('guess_from_clues', 1134, 100, 6);
    expect(buildTeaser(q)?.avgPct).toBe(63);
    expect(quizRowAverage(q)).toBe('63% average');
    // The v11 text card still hides clue averages (the C4 gate of the page intro).
    expect(cardAverage(q)).toBeNull();
  });

  it('the quiz of the day pick scores a clue quiz on its real average', () => {
    const base = { group_id: 1, play_count: 100, like_count: 0, total_completions: 100, question_count: 6, report_count: 0, created_at: '2026-01-01T00:00:00Z' };
    // 9 points on average: 150% the old way (worst difficulty band), 50% of 18 for real (best band).
    const clue = pickCatalogQotd([{ ...base, id: 'clue', quiz_type: 'guess_from_clues', total_score_sum: 900 }], [], '2026-10-02');
    const same = pickCatalogQotd([{ ...base, id: 'mc', quiz_type: 'multiple_choice', total_score_sum: 300 }], [], '2026-10-02');
    expect(clue?.score).toBe(same?.score);
    const untyped = pickCatalogQotd([{ ...base, id: 'old', total_score_sum: 900 }], [], '2026-10-02');
    expect(untyped!.score).toBeLessThan(clue!.score);
  });

  it('no inline average is left in the app outside the files requested from their owners', () => {
    const src = fileURLToPath(new URL('../../', import.meta.url));
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name)) : /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [join(dir, e.name)] : [],
      );
    // points / completions / questions written by hand (comments excluded)
    const INLINE = /(total_score_sum|totalScoreSum|scoreSum)\b[^;\n]{0,80}\//;
    const offenders = walk(src)
      .filter((f) => readFileSync(f, 'utf8').split('\n').some((line) => !/^\s*(\/\/|\*|\/\*)/.test(line) && INLINE.test(line)))
      .map((f) => f.slice(src.length))
      .filter((f) => f !== 'lib/quiz/scoring.ts');
    // Not G1's files: each one is a request in run/requests/G1.md (S1 to S6). The list may only shrink.
    const REQUESTED = [
      'app/(site)/ux-v1/kit/page.tsx',
      'components/quiz/quiz-player.tsx',
      'lib/ux-v1/p1/format.ts',
      'lib/ux-v1/p2/filters.ts',
      'lib/ux-v1/p3/model.ts',
      'lib/ux-v1/p4/engine.ts',
    ];
    expect(offenders.filter((f) => !REQUESTED.includes(f))).toEqual([]);
  });
});

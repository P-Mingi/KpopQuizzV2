import { describe, expect, it } from 'vitest';

import { progressMarks } from '@/lib/ux-v1/p4/engine';

import { dailyShareText, marksLine, streakWords, timeToNextDaily } from './daily-ui';

import type { QuestionData } from '@/lib/ux-v1/p4/engine';

describe('timeToNextDaily', () => {
  it('counts down to UTC midnight', () => {
    expect(timeToNextDaily(new Date('2026-11-09T14:58:00Z'))).toBe('9h 2m');
    expect(timeToNextDaily(new Date('2026-11-09T23:18:00Z'))).toBe('42m');
  });
});

describe('dailyShareText (audit 01 P1-5): spoiler-free', () => {
  const questions = [
    { question: 'Which member is the main vocalist of Zebrafish?', options: ['Alphaxx', 'Betaxx', 'Gammaxx'], correct: 1 },
    { question: 'In what year did Qwertyband debut?', options: ['2011', '2012', '2013'], correct: 2 },
    { question: 'Unique clue sentence about Plumcake', options: ['Yes', 'No'], correct: 0 },
  ] as unknown as QuestionData[];
  const marks = progressMarks(questions, [1, 0, 0]);
  const text = dailyShareText({ brand: 'KpopQuiz', number: 142, score: 2, max: 3, marks, url: 'https://kpopquiz.org/daily?from=share' });

  it('has the number, the score, one mark per question and the link', () => {
    expect(text).toBe('KpopQuiz Daily #142 · 2/3\n●○●\nhttps://kpopquiz.org/daily?from=share');
    expect(marksLine(marks)).toHaveLength(3);
  });
  it('contains no question, option or answer string', () => {
    for (const q of questions) {
      expect(text).not.toContain(q.question as string);
      for (const o of q.options as string[]) expect(text).not.toContain(o);
    }
  });
  it('leaves the number out when the first day is unknown', () => {
    expect(dailyShareText({ brand: 'KpopQuiz', number: null, score: 1, max: 3, marks, url: 'u' }).split('\n')[0]).toBe('KpopQuiz Daily · 1/3');
  });
  it('streakWords', () => {
    expect(streakWords(0)).toBeNull();
    expect(streakWords(1)).toBe('Day 1 of your streak');
    expect(streakWords(4)).toBe('4-day streak');
  });
});

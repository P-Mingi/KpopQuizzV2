import { describe, expect, it } from 'vitest';

import { buildAnswerRows, displayAnswer, storedAnswerKey } from './answers';

import type { RawQuestion, StoredExplanation } from './answers';

const mc: RawQuestion = { question: 'Which year did BTS debut?', options: ['2012', '2013', '2014', '2015'], correct: 1, fun_fact: 'They debuted on June 13.' };
const tf: RawQuestion = { question: 'BTS debuted in 2013.', correct: true };
const tfOptions: RawQuestion = { question: 'TWICE has nine members.', options: ['True', 'False'], correct: false };
const intruder: RawQuestion = { question: 'Who is not in BLACKPINK?', options: [{ label: 'Jisoo', image_url: 'https://a/1.jpg' }, { label: 'Yuna', image_url: 'https://a/2.jpg' }, { label: 'Lisa', image_url: 'https://a/3.jpg' }, { label: 'Rose', image_url: 'https://a/4.jpg' }], correct: 1 };

const expl = (over: Partial<StoredExplanation> = {}): StoredExplanation => ({
  q_index: 0, question: 'Which year did BTS debut?', answer: '2013',
  explanation: 'BTS debuted on 13 June 2013 under Big Hit Entertainment with the single album 2 Cool 4 Skool.',
  source_url: 'https://en.wikipedia.org/wiki/BTS', ...over,
});

describe('storedAnswerKey: the rule of the explanation SQL guard', () => {
  it('a boolean answer is True or False, with or without options', () => {
    expect(storedAnswerKey(tf)).toBe('True');
    expect(storedAnswerKey(tfOptions)).toBe('False');
  });

  it('a numeric answer is the option text at that index', () => {
    expect(storedAnswerKey(mc)).toBe('2013');
  });

  it('a picture option or a missing option has no key', () => {
    expect(storedAnswerKey(intruder)).toBeNull();
    expect(storedAnswerKey({ question: 'x', options: ['a'], correct: 3 })).toBeNull();
    expect(storedAnswerKey({ question: 'x' })).toBeNull();
  });
});

describe('displayAnswer: the answer as the quiz shows it', () => {
  it('reads the option text, the True or False option, or the picture label', () => {
    expect(displayAnswer(mc)).toBe('2013');
    expect(displayAnswer(tf)).toBe('True');
    expect(displayAnswer(tfOptions)).toBe('False');
    expect(displayAnswer({ question: 'x', options: ['true', 'false'], correct: true })).toBe('true');
    expect(displayAnswer(intruder)).toBe('Yuna');
  });

  it('has no answer when the index points nowhere', () => {
    expect(displayAnswer({ question: 'x', options: ['a', 'b'], correct: 5 })).toBeNull();
    expect(displayAnswer({ question: 'x', options: ['a', 'b'], correct: 0.5 })).toBeNull();
  });
});

describe('buildAnswerRows: one explanation per question, never generated', () => {
  const qs = (...list: RawQuestion[]): Array<{ q: RawQuestion; qIndex: number }> => list.map((q, i) => ({ q, qIndex: i }));

  it('a verified explanation comes first, with its source', () => {
    const [row] = buildAnswerRows(qs(mc), [expl()]);
    expect(row).toEqual({ qIndex: 0, question: mc.question, answer: '2013', explanation: { kind: 'verified', text: expl().explanation, sourceUrl: 'https://en.wikipedia.org/wiki/BTS' } });
  });

  it('else the creator fun fact, else the answer alone', () => {
    const rows = buildAnswerRows(qs(mc, tf), []);
    expect(rows[0]?.explanation).toEqual({ kind: 'fun_fact', text: 'They debuted on June 13.' });
    expect(rows[1]).toEqual({ qIndex: 1, question: 'BTS debuted in 2013.', answer: 'True', explanation: null });
  });

  it('an edited question or an edited answer hides the verified explanation', () => {
    expect(buildAnswerRows(qs({ ...mc, question: 'Which year did BTS debut in Korea?' }), [expl()])[0]?.explanation?.kind).toBe('fun_fact');
    expect(buildAnswerRows(qs({ ...mc, options: ['2012', '2013 (June)', '2014', '2015'] }), [expl()])[0]?.explanation?.kind).toBe('fun_fact');
    expect(buildAnswerRows(qs({ ...mc, correct: 2 }), [expl()])[0]?.explanation?.kind).toBe('fun_fact');
  });

  it('a source that is not https is never linked', () => {
    expect(buildAnswerRows(qs(mc), [expl({ source_url: 'http://example.org' })])[0]?.explanation?.kind).toBe('fun_fact');
    expect(buildAnswerRows(qs(mc), [expl({ source_url: 'javascript:alert(1)' })])[0]?.explanation?.kind).toBe('fun_fact');
    expect(buildAnswerRows(qs(mc), [expl({ source_url: 'https://x.org/"><script>' })])[0]?.explanation?.kind).toBe('fun_fact');
  });

  it('matches on the index in quizzes.questions, not the position in a filtered list', () => {
    const rows = buildAnswerRows([{ q: mc, qIndex: 3 }], [expl({ q_index: 0 }), expl({ q_index: 3 })]);
    expect(rows[0]?.qIndex).toBe(3);
    expect(rows[0]?.explanation?.kind).toBe('verified');
    expect(buildAnswerRows([{ q: mc, qIndex: 2 }], [expl({ q_index: 0 })])[0]?.explanation?.kind).toBe('fun_fact');
  });

  it('a picture quiz shows the label but never a verified explanation', () => {
    const [row] = buildAnswerRows(qs(intruder), [expl({ question: intruder.question as string, answer: 'Yuna' })]);
    expect(row?.answer).toBe('Yuna');
    expect(row?.explanation).toBeNull();
  });

  it('leaves out a question without text or answer', () => {
    expect(buildAnswerRows(qs({ question: '   ', options: ['a'], correct: 0 }, { question: 'x', options: ['a'], correct: 4 }), [])).toEqual([]);
  });
});

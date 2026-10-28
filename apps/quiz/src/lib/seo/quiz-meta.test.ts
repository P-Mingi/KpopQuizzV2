import { describe, expect, it } from 'vitest';

import { clipWords, DESCRIPTION_MIN, NOTE_MIN, quizDescription, quizTitle, TITLE_MAX } from './quiz-meta';

// The title and description of every quiz page (owner, 2026-10-13: SEO). Real titles from
// the catalogue, including the ones the old middle-cut broke ("Can you guess the IV...rom 3 clues?").

describe('quiz page title', () => {
  it('a short title keeps the question count', () => {
    expect(quizTitle('Illit quiz', 10)).toBe('Illit quiz · 10 questions');
  });
  it('the count goes first, the title is never cut when it fits on its own', () => {
    expect(quizTitle('Can you guess the IVE song from 3 clues?', 5)).toBe('Can you guess the IVE song from 3 clues?');
  });
  it('a long title is cut on word boundaries and keeps its distinguishing end', () => {
    const t = quizTitle('Guess the common song of these legendary K-pop girl group artists (2)', 8);
    expect(t.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(t).toMatch(/^Guess the common song of these\b.*\.\.\. .*\(2\)$/);
    expect(t).not.toMatch(/\w\.\.\.\w/); // no cut inside a word
  });
  it('two long titles that differ only by their end stay different', () => {
    const a = quizTitle('Ultimate fourth generation K-pop quiz for real fans of the girl groups', 10);
    const b = quizTitle('Ultimate fourth generation K-pop quiz for real fans of the boy groups', 10);
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThanOrEqual(TITLE_MAX);
  });
  it('one question is singular; spaces are tidied', () => {
    expect(quizTitle('  BTS   quiz ', 1)).toBe('BTS quiz · 1 question');
  });
});

describe('quiz page description', () => {
  const base = { title: 'Ultimate BTS era quiz', difficulty: 'easy', questionCount: 8, groupName: 'BTS', creator: 'mina', plays: 2499, average: '51% average of 2,400 completed plays', creatorNote: null };
  it('built from real data, with "an" before a vowel, the average with its denominator', () => {
    expect(quizDescription(base)).toBe('Ultimate BTS era quiz: an easy 8-question K-pop quiz on BTS, made by mina. 2,499 fans have played it: 51% average of 2,400 completed plays. Can you beat them?');
  });
  it('without an average (under 30 completed plays) it says how many fans played', () => {
    expect(quizDescription({ ...base, average: null })).toBe('Ultimate BTS era quiz: an easy 8-question K-pop quiz on BTS, made by mina. Played by 2,499 fans. Can you beat them? Free to play, no sign-up.');
  });
  it('a new quiz never says "Played by 0 fans"', () => {
    const d = quizDescription({ ...base, difficulty: 'medium', plays: 0, average: null });
    expect(d).toContain('a medium 8-question');
    expect(d).toContain('be one of the first to play it');
    expect(d).not.toContain('0 fans');
  });
  it('a few-word creator note is not the description; a real one is', () => {
    expect(quizDescription({ ...base, creatorNote: 'easy quiz' })).toContain('made by mina');
    const note = 'A deep dive into every BTS era, from School Trilogy to Map of the Soul, with one question per album.';
    expect(note.length).toBeGreaterThanOrEqual(NOTE_MIN);
    expect(quizDescription({ ...base, creatorNote: note })).toBe(note);
  });
  it('never longer than the snippet; the call to action whole or absent', () => {
    const d = quizDescription({ ...base, title: 'The hardest fourth generation girl group and boy group lyrics and choreography deep cut quiz ever made' });
    expect(d.length).toBeLessThanOrEqual(158);
    expect(d).not.toMatch(/Can you beat\.\.\.$/); // the call to action is whole or absent
    expect(clipWords('one two three four', 12)).toBe('one two...');
  });
});

describe('quiz page description floor', () => {
  it('a short description gets a last line, never past the snippet', () => {
    const d = quizDescription({ title: 'IVE', difficulty: 'easy', questionCount: 5, groupName: 'IVE', creator: 'jo', plays: 0, average: null, creatorNote: null });
    expect(d.length).toBeGreaterThanOrEqual(DESCRIPTION_MIN);
    expect(d.length).toBeLessThanOrEqual(158);
    expect(d.endsWith('Free to play, no sign-up.')).toBe(true);
  });
});

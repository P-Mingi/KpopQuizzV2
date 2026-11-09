import { describe, expect, it } from 'vitest';

import { clipWords, collapsePunctuation, cutAtWord, NOTE_MIN, quizAuthorJsonLd, quizDescription, quizSeoTitle, quizTitle, TITLE_MAX } from './quiz-meta';

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
  const base = { title: 'Ultimate BTS era quiz', difficulty: 'easy', questionCount: 8, groupName: 'BTS', creator: 'mina', plays: 2499, creatorNote: null };
  it('built from real data; plays are plays, never fans (audit 04 P0-3), the creator is named as a fan creator', () => {
    expect(quizDescription(base)).toBe('Ultimate BTS era quiz: 8 easy questions on BTS by fan creator mina. Played 2,499 times. Free to play, no sign-up needed.');
  });
  it('one play is singular and the meta never carries the average or the word fans', () => {
    const d = quizDescription({ ...base, plays: 1 });
    expect(d).toContain('Played 1 time.');
    expect(quizDescription(base)).not.toMatch(/fans have played|Played by|fans\b|average/i);
  });
  it('a Team quiz is signed "the KpopQuiz Team", never the handle (audit 04 P0-2)', () => {
    const d = quizDescription({ ...base, creator: 'njeansstan', creatorIsTeam: true });
    expect(d).toContain('by the KpopQuiz Team.');
    expect(d).not.toContain('njeansstan');
    expect(quizDescription({ ...base, creator: 'njeansstan' })).toContain('by fan creator njeansstan.');
  });
  it('a new quiz never says "Played 0 times"', () => {
    const d = quizDescription({ ...base, difficulty: 'medium', plays: 0 });
    expect(d).toContain('8 medium questions');
    expect(d).toContain('be one of the first to play it');
    expect(d).not.toContain('0 times');
  });
  it('the real catalogue example of the audit: the creator words, the format, the group, the plays (150 characters)', () => {
    const d = quizDescription({ title: 'Think you are a real GLLIT?!!', difficulty: 'easy', questionCount: 3, groupName: 'ILLIT', creator: 'multistancookie', plays: 1784, creatorNote: null, quizType: 'intruder' });
    expect(d).toBe('Think you are a real GLLIT? 3 easy odd-one-out questions on ILLIT by fan creator multistancookie. Played 1,784 times. Free to play, no sign-up needed.');
    expect(d.length).toBeGreaterThanOrEqual(140);
    expect(d.length).toBeLessThanOrEqual(155);
  });
  it('a few-word creator note is not the description; a real one is', () => {
    expect(quizDescription({ ...base, creatorNote: 'easy quiz' })).toContain('by fan creator mina');
    const note = 'A deep dive into every BTS era, from School Trilogy to Map of the Soul, with one question per album.';
    expect(note.length).toBeGreaterThanOrEqual(NOTE_MIN);
    expect(quizDescription({ ...base, creatorNote: note })).toBe(note);
  });
  it('never longer than the snippet; the call to action whole or absent', () => {
    const d = quizDescription({ ...base, title: 'The hardest fourth generation girl group and boy group lyrics and choreography deep cut quiz ever made' });
    expect(d.length).toBeLessThanOrEqual(158);
    expect(d).not.toMatch(/Free to play\.\.\.$/); // the call to action is whole or absent
    expect(clipWords('one two three four', 12)).toBe('one two...');
  });
});

describe('quiz page description floor', () => {
  it('a short quiz still gets a closing line, never past the snippet', () => {
    const d = quizDescription({ title: 'IVE', difficulty: 'easy', questionCount: 5, groupName: 'IVE', creator: 'jo', plays: 0, creatorNote: null });
    expect(d.length).toBeLessThanOrEqual(155);
    expect(d.endsWith('no sign-up needed.') || d.endsWith('no sign-up.')).toBe(true);
  });
});

describe('quiz page SEO title (audit 04 P1-2)', () => {
  const T = (title: string, n: number, name: string, slug?: string): string => quizSeoTitle(title, n, { name, slug: slug ?? null });
  it('real catalogue titles: punctuation runs collapse, the group and "quiz" are added when missing', () => {
    expect(T('are u a real GLLIT?!!', 3, 'ILLIT', 'illit')).toBe('are u a real GLLIT? ILLIT quiz, 3 questions');
    expect(T('Are you a real coer??!!', 7, 'Cortis', 'cortis')).toBe('Are you a real coer? Cortis quiz, 7 questions');
    expect(T('How well do you know TXT?', 7, 'TXT', 'txt')).toBe('How well do you know TXT? 7-question quiz');
  });
  it('a title that already names the group and says quiz only gets the count, as before', () => {
    expect(T('Illit quiz', 10, 'ILLIT', 'illit')).toBe('Illit quiz · 10 questions');
    expect(T('BTS ARMY level test', 12, 'BTS', 'bts')).toBe('BTS ARMY level test · 12 questions');
  });
  it('a title with quiz but no group gets the group name', () => {
    expect(T('The hardest idol quiz', 10, 'IVE', 'ive')).toBe('The hardest idol quiz · IVE, 10 questions');
  });
  it('a title that names the group (or K-pop for General K-pop) and says quiz keeps its words: the real company quiz stays whole', () => {
    // The parity case: it was "K-pop company... to the label | KpopQuiz" with " · General K-pop" added; it must stay as the creator wrote it.
    expect(T('K-pop company quiz - match the group to the label', 10, 'General K-pop', 'general-kpop')).toBe('K-pop company quiz - match the group to the label');
    expect(T('K-pop generation quiz', 10, 'General K-pop', 'general-kpop')).toBe('K-pop generation quiz \u00b7 10 questions');
  });
  it('what is added is dropped, never made room for by shortening the creator words', () => {
    // 41 characters: " IVE quiz, 8 questions" does not fit, " IVE quiz" does (50 > 49 does not): the creator words stay whole either way.
    const t = T('Which idol belongs to which company today', 8, 'IVE', 'ive');
    expect(t.startsWith('Which idol belongs to which company today')).toBe(true);
    expect(t).not.toContain('...');
    expect(t.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(T('Find the 3rd gen intruder among 4th gen', 10, 'General K-pop', 'general-kpop')).toBe('Find the 3rd gen intruder among 4th gen');
  });
  it('only a creator title over TITLE_MAX is cut: at the last word that fits, at the end, no ellipsis, no dangling separator', () => {
    const t = T('Guess the common song of these legendary K-pop girl group artists (2)', 8, 'IVE', 'ive');
    expect(t).toBe('Guess the common song of these legendary K-pop');
    expect(t.length).toBeLessThanOrEqual(TITLE_MAX);
    expect(cutAtWord('Match the group - to the label of every company on earth', 22)).toBe('Match the group - to');
    expect(cutAtWord('Alpha beta, gamma: delta epsilon', 17)).toBe('Alpha beta');
    expect(cutAtWord('short', 49)).toBe('short');
  });
  it('no title is ever cut with an ellipsis or ends on a separator', () => {
    for (const title of ['Ultimate fourth generation K-pop quiz for real fans of the girl groups', 'The hardest fourth generation girl group and boy group lyrics and choreography deep cut quiz ever made', 'A very long title - with a dash - that goes on and on and on forever']) {
      const t = T(title, 10, 'TXT', 'txt');
      expect(t.length, t).toBeLessThanOrEqual(TITLE_MAX);
      expect(t).not.toContain('...');
      expect(t).not.toMatch(/[\s,;:.\-\u00b7(]$/);
    }
  });
  it('collapsePunctuation', () => {
    expect(collapsePunctuation('wow!!!  what??!!')).toBe('wow! what?');
    expect(collapsePunctuation('~~true~~ Gllits')).toBe('~true~ Gllits');
    expect(collapsePunctuation('Who is it ?')).toBe('Who is it?');
  });
});

describe('quiz JSON-LD author (audit 04 P0-2)', () => {
  it('a Team quiz is authored by the Team organization, a fan quiz by the fan', () => {
    expect(quizAuthorJsonLd('njeansstan', true)).toEqual({ '@type': 'Organization', name: 'KpopQuiz Team', url: 'https://kpopquiz.org/about' });
    expect(quizAuthorJsonLd('mina', false)).toEqual({ '@type': 'Person', name: 'mina', url: 'https://kpopquiz.org/u/mina' });
  });
});

import { describe, expect, it } from 'vitest';

import { buildQuizIntro, namesIn, yearSpan } from './quiz-about';

import type { GroupEntities } from './quiz-about';

const BTS: GroupEntities = {
  members: ['RM', 'Jin', 'Suga', 'J-Hope', 'Jimin', 'V', 'Jungkook'],
  songs: ['Dynamite', 'Butter', 'Spring Day', 'Fire', 'Life Goes On'],
  albums: ['Wings', 'BE', 'Map of the Soul: 7'],
};
const base = { groupName: 'BTS', quizType: 'multiple_choice', questionCount: 10, difficulty: 'easy', creator: 'mina' };

describe('namesIn: whole words, in order of first appearance', () => {
  it('finds members and songs the texts name, each once', () => {
    expect(namesIn('Who sang the high note in Spring Day, Jimin or Jungkook? Jimin did.', [...BTS.members, ...BTS.songs])).toEqual(['Spring Day', 'Jimin', 'Jungkook']);
  });

  it('short names match their case only; a one-letter name never matches', () => {
    expect(namesIn('Which member is the eldest, jin or Suga?', BTS.members)).toEqual(['Suga']);
    expect(namesIn('V sang it', BTS.members)).toEqual([]);
    expect(namesIn('jungkook and JIMIN', BTS.members)).toEqual(['Jungkook', 'Jimin']);
  });

  it('never matches inside a word', () => {
    expect(namesIn('Firework and Butterfly', BTS.songs)).toEqual([]);
  });
});

describe('yearSpan', () => {
  it('the first and last year cited, 1980 to 2039 only', () => {
    expect(yearSpan(['Debut in 2013?', 'Wings came out in 2016', 'Track 1979 or 2040'])).toEqual([2013, 2016]);
    expect(yearSpan(['No year here'])).toBeNull();
  });
});

describe('buildQuizIntro: what this quiz is about, from its own text', () => {
  it('members and songs', () => {
    const texts = ['Who sings the first verse of Dynamite?', 'Jin', 'Suga', 'RM', 'J-Hope', 'Which song came out in 2020, Butter or Dynamite?'];
    expect(buildQuizIntro({ ...base, texts, entities: BTS })).toBe('This easy 10-question multiple-choice BTS quiz by mina asks about Jin, Suga, RM and more and about songs such as Dynamite and Butter. Its questions cite 2020.');
  });

  it('songs only, with their albums', () => {
    const texts = ['Which album has Spring Day?', 'Wings', 'BE', 'Which song opens Life Goes On?'];
    expect(buildQuizIntro({ ...base, quizType: 'true_false', texts, entities: BTS })).toBe('This easy 10-question true or false BTS quiz by mina is about BTS songs such as Spring Day and Life Goes On and albums such as Wings and BE.');
  });

  it('members only, then a span of years', () => {
    const texts = ['Who joined first, Jimin or Jungkook?', 'Who enlisted in 2022?', 'Who released a solo album in 2023?'];
    expect(buildQuizIntro({ ...base, difficulty: 'hard', texts, entities: BTS })).toBe('This hard 10-question multiple-choice BTS quiz by mina asks about Jimin and Jungkook. Its questions run from 2022 to 2023.');
  });

  it("nothing found: today's sentence", () => {
    expect(buildQuizIntro({ ...base, texts: ['What is the fandom called?'], entities: BTS })).toBe('Test your BTS knowledge with this easy 10-question quiz by mina.');
    expect(buildQuizIntro({ ...base, texts: ['x'], entities: { members: [], songs: [], albums: [] } })).toBe('Test your BTS knowledge with this easy 10-question quiz by mina.');
  });

  it('never an em or en dash', () => {
    const out = buildQuizIntro({ ...base, texts: ['Map of the Soul: 7 and Fire'], entities: BTS });
    expect(out).not.toMatch(/[–—]/);
  });
});

describe('buildQuizIntro: a name equal to the group name is never cited', () => {
  it('the song "Stray Kids" is not a topic of a Stray Kids quiz', () => {
    const SKZ: GroupEntities = { members: ['Bang Chan', 'Changbin', 'Han'], songs: ['Stray Kids', 'MANIAC'], albums: [] };
    const out = buildQuizIntro({ ...base, groupName: 'Stray Kids', quizType: 'true_false', texts: ['Stray Kids has 8 members', '3RACHA consists of Bang Chan, Changbin, and Han'], entities: SKZ });
    expect(out).toBe('This easy 10-question true or false Stray Kids quiz by mina asks about Bang Chan, Changbin and Han.');
  });
});

describe('song titles: their case must match below 7 characters', () => {
  it('"Easy Crazy Hot Tour" names no song CRAZY; a quoted title still matches', () => {
    const LSF: GroupEntities = { members: ['Sakura', 'Chaewon'], songs: ['CRAZY', 'FEARLESS', 'ANTIFRAGILE'], albums: [] };
    const out = buildQuizIntro({ ...base, groupName: 'LE SSERAFIM', texts: ['What was the first tour?', 'Easy Crazy Hot Tour', 'Sakura and Chaewon were in which group?', 'Which song: Fearless or ANTIFRAGILE?'], entities: LSF });
    expect(out).toBe('This easy 10-question multiple-choice LE SSERAFIM quiz by mina asks about Sakura and Chaewon and about songs such as FEARLESS and ANTIFRAGILE.');
  });
});

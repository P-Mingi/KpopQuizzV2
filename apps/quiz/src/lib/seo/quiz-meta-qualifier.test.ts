import { describe, expect, it } from 'vitest';

import { isGenericGroupTitle, normalizeTitle, qualifiedQuizTitle, quizTitle, TITLE_MAX } from './quiz-meta';

// SEO Mission 2 (rulebook 1.5): only the hub /{group}-quiz is titled "{Group} Quiz". A fan quiz
// titled just "{group} quiz", "{group} test" or "quiz {group}" gets a qualifier from its own
// questions in its <title> and H1. Real titles and prompts from the catalogue (2026-10-15).

const ILLIT_PROMPTS = ['Who is the maknae (Youngest)?', 'Who is the Unnie (oldest)?', 'Who is known as the IT girl?', 'Where is Iroha from?', "What is ILLIT's most viewed MV?", 'Which agency is ILLIT under?'];

describe('isGenericGroupTitle', () => {
  it.each([
    ['ILLIT quiz', 'ILLIT', 'illit'],
    ['Illit quiz', 'ILLIT', 'illit'],
    ['NEWJEANS quiz', 'NewJeans', 'newjeans'],
    ['Kiiikiii quiz!', 'Kiiikiii', 'kiiikiii'],
    ['MONSTA X quiz', 'MONSTA X', 'monsta-x'],
    ['BTS test', 'BTS', 'bts'],
    ['Quiz BTS', 'BTS', 'bts'],
    ['stray kids quiz', 'Stray Kids', 'stray-kids'],
    ['(G)I-DLE quiz', '(G)I-DLE', 'gi-dle'],
  ])('%s is generic', (title, name, slug) => {
    expect(isGenericGroupTitle(title, name, slug)).toBe(true);
  });

  it.each([
    ['BTS quiz for real ARMY', 'BTS', 'bts'],
    ['How well do you know BTS members?', 'BTS', 'bts'],
    ['BTS ARMY level test', 'BTS', 'bts'],
    ['BLACKPINK quiz', 'BTS', 'bts'],
    ['K-pop quiz', 'BTS', 'bts'],
  ])('%s is not', (title, name, slug) => {
    expect(isGenericGroupTitle(title, name, slug)).toBe(false);
  });

  it('normalizes case, accents and punctuation', () => {
    expect(normalizeTitle('  Énhypen   Quiz!! ')).toBe('enhypen quiz');
  });
});

describe('qualifiedQuizTitle', () => {
  it('keeps any title that is not generic, word for word', () => {
    expect(qualifiedQuizTitle({ title: 'BTS Wings era deep dive', groupName: 'BTS', groupSlug: 'bts', quizType: 'multiple_choice', difficulty: 'medium', prompts: [] })).toBe('BTS Wings era deep dive');
  });

  it('qualifies a generic title with the topic of its questions, the group as the groups table writes it', () => {
    expect(qualifiedQuizTitle({ title: 'Illit quiz', groupName: 'ILLIT', groupSlug: 'illit', quizType: 'multiple_choice', difficulty: 'medium', prompts: ILLIT_PROMPTS })).toBe('ILLIT members quiz');
    expect(qualifiedQuizTitle({ title: 'NEWJEANS quiz', groupName: 'NewJeans', groupSlug: 'newjeans', quizType: 'multiple_choice', difficulty: 'medium', prompts: ['Who is the oldest?', 'Who is the youngest in newjeans', 'What was newjeans debut song?'] })).toBe('NewJeans members quiz');
  });

  it('names the two main topics of a mixed quiz (the real "ILLIT quiz", 12 questions)', () => {
    const prompts = ['Who is the maknae (Youngest)?', 'Who is the Unnie (oldest)?', 'Who is known as the IT girl?', 'Who was the fourth person chosen to debut in ILLIT on R U Next?', 'Who was born in May 11th, 2004?', 'What is the correct set of ILLIT members full names?', 'Where is Iroha from?', 'Who is not Korean?', "What is ILLIT's most viewed MV?", "Which song belongs to the 'Super Real Me' album?", 'Which song is a single release?', 'Which agency is ILLIT under?'];
    expect(qualifiedQuizTitle({ title: 'ILLIT quiz', groupName: 'ILLIT', groupSlug: 'illit', quizType: 'multiple_choice', difficulty: 'medium', prompts })).toBe('ILLIT members and songs quiz');
  });

  it('falls back to the format, then to the difficulty', () => {
    expect(qualifiedQuizTitle({ title: 'Cortis quiz', groupName: 'Cortis', groupSlug: 'cortis', quizType: 'true_false', difficulty: 'easy', prompts: ['Hybe made Cortis?'] })).toBe('Cortis true or false quiz');
    expect(qualifiedQuizTitle({ title: 'KATSEYE quiz', groupName: 'KATSEYE', groupSlug: 'katseye', quizType: 'guess_from_clues', difficulty: 'medium', prompts: [] })).toBe('KATSEYE guess from clues quiz');
    expect(qualifiedQuizTitle({ title: 'BTS quiz', groupName: 'BTS', groupSlug: 'bts', quizType: 'multiple_choice', difficulty: 'hard', prompts: ['Which agency?'] })).toBe('BTS hard trivia quiz');
    expect(qualifiedQuizTitle({ title: 'BTS quiz', groupName: 'BTS', groupSlug: 'bts', quizType: 'multiple_choice', difficulty: 'medium', prompts: ['Which agency?'] })).toBe('BTS fan trivia quiz');
  });

  it('never starts with "{Group} Quiz", the hub title', () => {
    const t = qualifiedQuizTitle({ title: 'BTS quiz', groupName: 'BTS', groupSlug: 'bts', quizType: 'multiple_choice', difficulty: 'medium', prompts: ['Which album came first?', 'Which song won?'] });
    expect(t.toLowerCase().startsWith('bts quiz')).toBe(false);
    expect(t).toBe('BTS songs quiz');
  });

  it('the qualified title still fits the page title with its question count', () => {
    const t = quizTitle(qualifiedQuizTitle({ title: 'ZEROBASEONE quiz', groupName: 'ZEROBASEONE', groupSlug: 'zerobaseone', quizType: 'multiple_choice', difficulty: 'easy', prompts: ['How many members are in Zerobaseone?', 'Who is the leader?', 'Who is the maknae (youngest) in Zerobaseone?'] }), 7);
    expect(t).toBe('ZEROBASEONE members quiz · 7 questions');
    expect(t.length).toBeLessThanOrEqual(TITLE_MAX);
  });
});

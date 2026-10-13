import { describe, expect, it, vi } from 'vitest';

// facts.ts and the trivia query module pull in the cached Supabase reader; only the
// pure buildOverriddenFacts and the gate constant are under test here.
vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn, revalidateTag: () => undefined }));
vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => { throw new Error('no DB in unit tests'); },
  createServiceRoleClient: () => { throw new Error('no DB in unit tests'); },
  createServerClient: async () => { throw new Error('no DB in unit tests'); },
}));

import { TRIVIA_MIN_FACTS } from '@/lib/db/queries/trivia';

import { buildOverriddenFacts } from './facts';

// The quality filter runs inside the fact build, BEFORE the TRIVIA_MIN_FACTS gate
// (owner, 2026-10-13: SEO), so the page gate and the sitemap gate count usable
// facts only. A slug with no overrides keeps these tests independent of the
// version-controlled override table.
const SLUG = 'unit-test-group-without-overrides';

const REAL = [
  'Karina is the leader of aespa and was born in 2000.',
  'aespa debuted on November 17, 2020, with the single Black Mamba.',
  'aespa performed at Coachella 2023 on the Sahara Stage.',
  'Winter is the main vocalist of aespa and was born in Yangsan.',
  'NingNing was born in Harbin, China, on October 23, 2002.',
  'Giselle grew up in Tokyo and speaks Korean, Japanese and English.',
  'The group name combines ae (avatar experience) with the English word aspect.',
  'Their fandom name is MY, a reference to the avatars calling the members.',
  'Next Level was a remake of a song from the Fast and Furious soundtrack.',
  'Savage was their first mini album and topped the Gaon Album Chart.',
  'aespa swept multiple Rookie of the Year awards in 2021.',
  'Armageddon was their first full-length studio album, released in May 2024.',
];

const JUNK = [
  'You are right it is yoonchae!',
  'idk what was going on in this vid 😂',
  'DOEUN❗️❗️❗️❗️❗️❗️❗️❗️❗️ DOE❗️❗️❗️ DOEDOE❗️❗️ GIRAFFE❗️❗️❗️',
  'Congrats, you finished the quiz',
  'eslinde jungkookun amma neyse',
];

function quiz(slug: string, facts: string[]): { title: string; slug: string; questions: unknown } {
  return {
    title: `Quiz ${slug}`,
    slug,
    questions: facts.map((fun_fact, i) => ({ question: `Question ${i + 1}?`, options: ['a', 'b', 'c', 'd'], correct: 0, fun_fact })),
  };
}

describe('buildOverriddenFacts quality filter', () => {
  it('drops junk fun facts and keeps every real one', () => {
    const facts = buildOverriddenFacts(SLUG, [quiz('q1', [...REAL.slice(0, 6), ...JUNK]), quiz('q2', REAL.slice(6))]);
    expect(facts.map((f) => f.fact)).toEqual(REAL);
    expect(facts.every((f) => f.sourceQuizSlug === 'q1' || f.sourceQuizSlug === 'q2')).toBe(true);
  });

  it('junk no longer counts toward the trivia page minimum', () => {
    const elevenReal = REAL.slice(0, TRIVIA_MIN_FACTS - 1);
    // Before the filter, 11 real + 5 junk lines (all over 20 chars) made 16 "facts".
    expect(elevenReal.length + JUNK.length).toBeGreaterThanOrEqual(TRIVIA_MIN_FACTS);
    const facts = buildOverriddenFacts(SLUG, [quiz('q1', [...elevenReal, ...JUNK])]);
    expect(facts).toHaveLength(TRIVIA_MIN_FACTS - 1);
    expect(facts.length >= TRIVIA_MIN_FACTS).toBe(false);
  });

  it('a group with enough real facts stays eligible whatever junk sits beside them', () => {
    const facts = buildOverriddenFacts(SLUG, [quiz('q1', [...JUNK, ...REAL, ...JUNK])]);
    expect(facts).toHaveLength(REAL.length);
    expect(facts.length >= TRIVIA_MIN_FACTS).toBe(true);
  });

  it('still dedupes real facts and never rewrites the text it keeps', () => {
    const twoLines = 'Paboracha is not an official sub unit.\nIt also means fools in Korean.';
    const facts = buildOverriddenFacts(SLUG, [quiz('q1', [`  ${REAL[0]}  `, REAL[0]!, twoLines])]);
    expect(facts.map((f) => f.fact)).toEqual([REAL[0], twoLines]);
  });
});

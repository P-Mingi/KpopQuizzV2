import { describe, expect, it } from 'vitest';

import { checkQuizPayload, quizRowFor } from './payload';
import { buildFandomTest, factProblems, fandomLevels } from './fandom-test';
import { MINA } from './test-fixtures';
import { parseResultLevels } from '@/lib/quiz/result-levels';

import type { FandomFact, FandomInput, Slot } from './fandom-test';

// Audit 04 P2-2: facts to a quiz draft with result levels; refuses what a Team quiz never asks.

const URL1 = 'https://en.wikipedia.org/wiki/Stray_Kids';
const URL2 = 'https://www.wikidata.org/wiki/Q42';
const SLOTS: Slot[] = ['roster', 'fandom', 'debut', 'title', 'album', 'year', 'title', 'chart', 'award', 'latest'];
const fact = (slot: Slot, i: number, over: Partial<FandomFact> = {}): FandomFact => ({
  slot, question: `Question number ${i} about the group?`, answer: `Right ${i}`, distractors: [`Wrong ${i}a`, `Wrong ${i}b`, `Wrong ${i}c`], source_url: i % 2 ? URL1 : URL2, ...over,
});
const input = (over: Partial<FandomInput> = {}): FandomInput => ({
  group_slug: 'stray-kids', group_name: 'Stray Kids', fandom: 'STAY', account: 'mina_team', minors: false,
  sources: [{ id: 'S1', title: 'Wikipedia, Stray Kids', url: URL1 }, { id: 'S2', title: 'Wikidata, Stray Kids', url: URL2 }],
  facts: SLOTS.map((s, i) => fact(s, i + 1)), ...over,
});

describe('buildFandomTest', () => {
  it('builds a draft that passes checkQuizPayload, named after the fandom, with five levels', () => {
    const r = buildFandomTest(input());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payload.title).toBe('STAY level test: are you a real STAY?');
    expect(r.payload.title.length).toBeLessThanOrEqual(49);
    expect(r.payload.slug).toBe('stay-level-test');
    expect(r.payload.questions).toHaveLength(10);
    expect(r.payload.difficulty).toBe('medium');
    expect(checkQuizPayload(r.payload).ok).toBe(true);
    expect(parseResultLevels({ result_levels: r.payload.result_levels })!.map((l) => l.name)).toEqual(['Trainee STAY', 'Rookie STAY', 'Dedicated STAY', 'Veteran STAY', 'Legendary STAY']);
    // The levels travel into the quiz settings of the published row.
    expect(quizRowFor(MINA, 1, r.payload).settings.result_levels).toHaveLength(5);
    expect(r.payload.notes).toContain('By the KpopQuiz Team');
    expect(JSON.stringify(r.payload)).not.toMatch(/we STAY|us STAY|our STAY/i);
  });
  it('is deterministic', () => {
    expect(buildFandomTest(input())).toEqual(buildFandomTest(input()));
  });
  it('refuses fewer than 10 facts and a wrong slot mix', () => {
    const few = buildFandomTest(input({ facts: input().facts.slice(0, 9) }));
    expect(few.ok).toBe(false);
    if (!few.ok) expect(few.errors.join(' ')).toContain('needs 10 verified facts');
    const mix = buildFandomTest(input({ facts: input().facts.map((f, i) => (i < 4 ? { ...f, slot: 'roster' as const } : f)) }));
    expect(mix.ok).toBe(false);
  });
  it('refuses a placeholder fandom name', () => {
    for (const fandom of ['Fan', 'Stray Kids', '']) expect(buildFandomTest(input({ fandom })).ok, fandom).toBe(false);
  });
  it.each([
    'Who is the oldest member of the group?', 'How old is the youngest member?', 'Who is the maknae of the group?', 'What is the height of the leader?',
    'Which member was born in 2003?', 'Who is the group leader dating?', 'Who is the best member of the group?', 'Which line of the lyrics comes first?',
  ])('refuses "%s"', (q) => {
    const r = buildFandomTest(input({ facts: input().facts.map((f, i) => (i === 0 ? { ...f, question: q } : f)) }));
    expect(r.ok).toBe(false);
  });
  it('with a member under 18 it also refuses per-member attribute questions', () => {
    const q = 'Which member is the main vocalist of the group?';
    const withMinor = buildFandomTest(input({ minors: true, facts: input().facts.map((f, i) => (i === 0 ? { ...f, question: q } : f)) }));
    const adults = buildFandomTest(input({ minors: false, facts: input().facts.map((f, i) => (i === 0 ? { ...f, question: q } : f)) }));
    expect(withMinor.ok).toBe(false);
    expect(adults.ok).toBe(true);
  });
  it('refuses two equal options and a wrong count of wrong answers', () => {
    expect(factProblems(fact('title', 1, { distractors: ['Same', 'same', 'Other'] }), false).length).toBeGreaterThan(0);
    expect(factProblems(fact('title', 1, { distractors: ['A', 'B'] }), false).join(' ')).toContain('exactly three');
  });
  it('a fact taken from the sourced file must be verified there, with the same answer, and a load-bearing one needs two sources', () => {
    const items = new Map([
      ['ok', { id: 'ok', status: 'verified', answer: 'Right 1', loadBearing: true, sources: [{ url: URL1, type: 'wikipedia' }, { url: URL2, type: 'wikidata' }] }],
      ['cand', { id: 'cand', status: 'candidate', answer: 'Right 2', loadBearing: false, sources: [] }],
      ['thin', { id: 'thin', status: 'verified', answer: 'Right 3', loadBearing: true, sources: [{ url: URL1, type: 'wikipedia' }] }],
      ['diff', { id: 'diff', status: 'verified', answer: 'Something else', loadBearing: false, sources: [] }],
    ]);
    const withId = (id: string, i: number) => input({ facts: input().facts.map((f, k) => (k === i ? { ...f, factId: id } : f)) });
    expect(buildFandomTest(withId('ok', 0), items).ok).toBe(true);
    for (const [id, i] of [['cand', 1], ['thin', 2], ['diff', 0], ['missing', 0]] as const) expect(buildFandomTest(withId(id, i), items).ok, id).toBe(false);
  });
  it('fandomLevels is a valid list', () => {
    expect(parseResultLevels({ result_levels: fandomLevels('ONCE') })).not.toBeNull();
  });
});

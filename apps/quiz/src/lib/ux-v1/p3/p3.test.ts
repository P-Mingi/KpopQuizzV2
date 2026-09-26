import { describe, expect, it } from 'vitest';

import { isMissingTable, parseGroupId } from './alerts';
import { mergeHubFaqs } from './faq';
import {
  averagePct,
  azBlocks,
  azKey,
  coarseAge,
  commentLine,
  debutYearOf,
  filterHubQuizzes,
  genLabel,
  groupCountLabel,
  hubEyebrow,
  hubFacts,
  initials,
  isHiddenGroup,
  letterId,
  matchGroups,
  mostPlayed,
  presentOptions,
  quizzesLabel,
  realFandomName,
  sortHubQuizzes,
} from './model';

import type { HubQuiz, IndexGroup } from './model';

// P3 unit tests: the groups index (A to Z, most played, filter), the hub view
// model (eyebrow, facts, the four sorts of the live feed, filters), the merged
// "Questions fans ask" list and the fail-soft helpers of the Notify me route.

const G = (name: string, quizzes: number, plays: number, slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')): IndexGroup =>
  ({ slug, name, quizzes, plays, photo: null });

describe('groups index', () => {
  it('initials follow the prototype (two words -> two initials, else two letters, catch-all K)', () => {
    expect(initials('General K-pop')).toBe('K');
    expect(initials('Red Velvet')).toBe('RV');
    expect(initials('Chungha')).toBe('CH');
    expect(initials('&TEAM')).toBe('TE');
    expect(initials('2NE1')).toBe('2N');
    expect(initials('(G)I-DLE')).toBe('GI');
  });

  it('hidden rows (zzz-*) are not groups', () => {
    expect(isHiddenGroup('zzz-quarantine-hidden')).toBe(true);
    expect(isHiddenGroup('bts')).toBe(false);
  });

  it('A to Z: "#" first, letters sorted, names case-insensitive, live anchor ids', () => {
    const blocks = azBlocks([G('aespa', 13, 1), G('ATEEZ', 20, 1), G('2NE1', 0, 0), G('(G)I-DLE', 8, 1), G('BTS', 27, 1)]);
    expect(blocks.map((b) => b.key)).toEqual(['#', 'A', 'B']);
    expect(blocks[0]!.id).toBe('letter-other');
    expect(blocks[1]!.id).toBe('letter-A');
    expect(blocks[0]!.groups.map((g) => g.name)).toEqual(['(G)I-DLE', '2NE1']);
    expect(blocks[1]!.groups.map((g) => g.name)).toEqual(['aespa', 'ATEEZ']);
    expect(azKey('iKON')).toBe('I');
    expect(letterId('#')).toBe('letter-other');
  });

  it('most played: plays of published quizzes, no catch-all, no group without a quiz', () => {
    const top = mostPlayed([
      G('General K-pop', 152, 16497, 'general-kpop'), G('BTS', 27, 8760), G('Stray Kids', 28, 6478),
      G('BLACKPINK', 24, 4904), G('Chungha', 0, 0), G('TWICE', 14, 2422),
    ], 3);
    expect(top.map((g) => g.name)).toEqual(['BTS', 'Stray Kids', 'BLACKPINK']);
  });

  it('filter is a case-insensitive substring; the count reads "N of M groups" while filtering', () => {
    const all = [G('NCT', 3, 1), G('NCT 127', 1, 1), G('NCT DREAM', 0, 0), G('BTS', 27, 1)];
    expect(matchGroups(all, 'nct').map((g) => g.name)).toEqual(['NCT', 'NCT 127', 'NCT DREAM']);
    expect(matchGroups(all, '  ')).toHaveLength(4);
    expect(groupCountLabel(4, 4)).toBe('4 groups');
    expect(groupCountLabel(3, 90)).toBe('3 of 90 groups');
    expect(quizzesLabel(1)).toBe('1 quiz');
    expect(quizzesLabel(1520)).toBe('1,520 quizzes');
  });
});

describe('hub view model', () => {
  it('eyebrow: real fandom, generation in sentence case, label; placeholders fall back', () => {
    expect(hubEyebrow({ fandom: 'BLINK', generation: '3rd Gen', label: 'YG Entertainment', quizzes: 24 })).toBe('BLINK · 3rd gen · YG Entertainment');
    expect(hubEyebrow({ fandom: 'Byulharang', generation: null, label: null, quizzes: 0 })).toBe('Byulharang');
    expect(hubEyebrow({ fandom: 'fan', generation: null, label: null, quizzes: 9 })).toBe('9 fan-made quizzes');
    expect(hubEyebrow({ fandom: 'fan', generation: null, label: null, quizzes: 1 })).toBe('1 fan-made quiz');
    expect(hubEyebrow({ fandom: '', generation: '5th Gen', label: null, quizzes: 0 })).toBe('No quiz yet');
    expect(realFandomName(' N/A ')).toBeNull();
    expect(genLabel('4th Gen')).toBe('4th gen');
  });

  it('facts: only what is known, in the prototype order', () => {
    expect(hubFacts({ members: 4, debutYear: 2016, quizzes: 24, songs: 18 })).toEqual([
      { value: '4', post: 'members' },
      { pre: 'Debut', value: '2016' },
      { value: '24', post: 'quizzes' },
      { value: '18', post: 'blindtest songs' },
    ]);
    expect(hubFacts({ members: null, debutYear: null, quizzes: 0, songs: 0 })).toEqual([]);
    expect(hubFacts({ members: 1, debutYear: null, quizzes: 1, songs: 1 }).map((f) => f.post)).toEqual(['member', 'quiz', 'blindtest song']);
    expect(debutYearOf('2018-10-24')).toBe(2018);
    expect(debutYearOf(null)).toBeNull();
  });

  const Q = (slug: string, o: Partial<HubQuiz> = {}): HubQuiz => ({
    slug, title: slug, quiz_type: 'multiple_choice', difficulty: 'medium', play_count: 0, like_count: 0,
    total_score_sum: 0, total_completions: 0, question_count: 10, created_at: '2026-01-01T00:00:00Z', ...o,
  });
  const list = [
    Q('a', { play_count: 50, like_count: 0, created_at: '2026-03-01T00:00:00Z', total_completions: 20, total_score_sum: 160 }),
    Q('b', { play_count: 90, like_count: 3, created_at: '2026-01-01T00:00:00Z', total_completions: 30, total_score_sum: 120, quiz_type: 'true_false' }),
    Q('c', { play_count: 10, like_count: 3, created_at: '2026-05-01T00:00:00Z', total_completions: 5, total_score_sum: 10, difficulty: 'hard' }),
    Q('d', { play_count: 90, like_count: 7, created_at: '2026-02-01T00:00:00Z', total_completions: 12, total_score_sum: 108, difficulty: 'easy' }),
  ];

  it('average score from the quiz totals, null before a finished play', () => {
    expect(averagePct(list[0]!)).toBe(80);
    expect(averagePct(Q('z'))).toBeNull();
  });

  it('the four sorts mirror the live group feed', () => {
    expect(sortHubQuizzes(list, 'popular').map((q) => q.slug)).toEqual(['d', 'b', 'a', 'c']);
    expect(sortHubQuizzes(list, 'newest').map((q) => q.slug)).toEqual(['c', 'a', 'd', 'b']);
    // liked quizzes only, most likes then most plays
    expect(sortHubQuizzes(list, 'most_liked').map((q) => q.slug)).toEqual(['d', 'b', 'c']);
    // 10+ completions only, lowest average first (b 40%, a 80%, d 90%)
    expect(sortHubQuizzes(list, 'hardest').map((q) => q.slug)).toEqual(['b', 'a', 'd']);
  });

  it('filters by type and level; only the options the group has are offered', () => {
    expect(filterHubQuizzes(list, { type: 'true_false', level: null }).map((q) => q.slug)).toEqual(['b']);
    expect(filterHubQuizzes(list, { type: null, level: 'hard' }).map((q) => q.slug)).toEqual(['c']);
    expect(filterHubQuizzes(list, { type: 'image', level: null })).toEqual([]);
    const o = presentOptions(list);
    expect(o.types.map((t) => t.label)).toEqual(['Classic', 'True/false']);
    expect(o.levels.map((l) => l.label)).toEqual(['Easy', 'Medium', 'Hard']);
  });

  it('comment rows: one clean line, coarse age', () => {
    expect(commentLine('  so   good\n\nquiz ')).toBe('so good quiz');
    expect(commentLine('x'.repeat(100), 20)).toBe(`${'x'.repeat(17)}...`);
    const now = Date.parse('2026-09-26T12:00:00Z');
    expect(coarseAge('2026-09-26T11:30:00Z', now)).toBe('just now');
    expect(coarseAge('2026-09-26T07:00:00Z', now)).toBe('5h');
    expect(coarseAge('2026-09-20T12:00:00Z', now)).toBe('6d');
    expect(coarseAge('2026-06-01T12:00:00Z', now)).toBe('3mo');
  });
});

describe('Questions fans ask (one list, today words)', () => {
  const faqs = [
    { q: 'How many BLACKPINK quizzes are there?', text: 'KpopQuiz has 29 free fan-made BLACKPINK quizzes covering members, songs, eras and more.', a: 'x1' },
    { q: 'How many members does BLACKPINK have?', text: 'BLACKPINK has 4 members.', a: 'x2' },
    { q: "What is BLACKPINK's fandom called?", text: "BLACKPINK's official fandom name is BLINK.", a: 'x3' },
    { q: 'Is there a BLACKPINK blind test?', text: 'Yes.', a: 'x4' },
    { q: 'Are the BLACKPINK quizzes free?', text: 'Yes.', a: 'x5' },
  ];
  const chunks = [
    { question: 'How many members does BLACKPINK have?', answer: 'BLACKPINK has 4 members.' },
    { question: 'When did BLACKPINK debut?', answer: 'BLACKPINK debuted in 2016.' },
    { question: "What is BLACKPINK's fandom called?", answer: "BLACKPINK's fandom is called BLINK." },
    { question: 'What generation is BLACKPINK?', answer: 'BLACKPINK is a 3rd Gen K-pop group.' },
    { question: 'Where is BLACKPINK from?', answer: 'BLACKPINK is from South Korea.' },
    { question: 'What label is BLACKPINK on?', answer: 'BLACKPINK is on YG Entertainment.' },
    { question: 'How many BLACKPINK songs can I play in the blind test?', answer: '14 BLACKPINK songs are playable in the kpopquiz.org blind test.' },
  ];

  it('dedupes on the question (the FAQ version wins, it is in the JSON-LD) and follows the prototype order', () => {
    const items = mergeHubFaqs(faqs, chunks);
    expect(items.map((i) => i.q)).toEqual([
      'How many members does BLACKPINK have?',
      'When did BLACKPINK debut?',
      "What is BLACKPINK's fandom called?",
      'What generation is BLACKPINK?',
      'Where is BLACKPINK from?',
      'What label is BLACKPINK on?',
      'How many BLACKPINK quizzes are there?',
      'How many BLACKPINK songs can I play in the blind test?',
      'Is there a BLACKPINK blind test?',
      'Are the BLACKPINK quizzes free?',
    ]);
    expect(items.find((i) => i.q.startsWith('How many members'))).toMatchObject({ a: 'x2', inJsonLd: true });
    expect(items.find((i) => i.q.includes('fandom'))).toMatchObject({ a: 'x3', inJsonLd: true });
    expect(items.find((i) => i.q.startsWith('When did'))).toMatchObject({ inJsonLd: false });
    // every JSON-LD question is visible
    for (const f of faqs) expect(items.some((i) => i.q === f.q)).toBe(true);
  });

  it('a question it does not know keeps its place at the end; no FAQ means the chunks alone', () => {
    const items = mergeHubFaqs([], [{ question: 'Something new?', answer: 'Yes.' }, ...chunks.slice(0, 2)]);
    expect(items.map((i) => i.q)).toEqual(['How many members does BLACKPINK have?', 'When did BLACKPINK debut?', 'Something new?']);
    expect(mergeHubFaqs([], [])).toEqual([]);
  });
});

describe('Notify me route helpers', () => {
  it('a missing table (pending migration) is recognised from Postgres or PostgREST', () => {
    expect(isMissingTable({ code: '42P01', message: 'relation "group_quiz_alerts" does not exist' })).toBe(true);
    expect(isMissingTable({ code: 'PGRST205', message: "Could not find the table 'public.group_quiz_alerts' in the schema cache" })).toBe(true);
    expect(isMissingTable({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isMissingTable(null)).toBe(false);
  });

  it('group ids are positive integers only', () => {
    expect(parseGroupId('12')).toBe(12);
    expect(parseGroupId(12)).toBe(12);
    expect(parseGroupId('12a')).toBeNull();
    expect(parseGroupId(-1)).toBeNull();
    expect(parseGroupId(1.5)).toBeNull();
    expect(parseGroupId(null)).toBeNull();
  });
});

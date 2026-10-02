import { describe, expect, it } from 'vitest';

import { BRIDGE_OUTCOMES, BRIDGE_QUESTIONS, BRIDGE_RESULT_KEY, BRIDGE_SLUGS } from './bridge';
import { AXIS_KEYS, AXIS_NEUTRAL, distance, nearestProfile, rankProfiles, resolveResult, scorePlayer, tallyScores, tallyWinner, validPicks } from './engine';
import { isGroupSlug, parseCounts, parseProfiles, parseQuestions, WMA_QUESTION_COUNT } from './parse';
import { listedRoles, publicRole } from './roles';
import { saveResult } from './save';
import { playerDescription, playerTraits } from './traits';
import { axisOptionIcon, buildDistribution, MIN_RESULTS_FOR_SHARES, shareOf, whichMemberPath } from './view';

import type { WmaData } from './data';
import type { Axes } from './engine';
import type { SaveStore } from './save';

// ---- fixtures: the stored rows, as read on 2026-10-02 (personality_questions, and the
// Stray Kids rows of personality_profiles). A snapshot of real data, not a sample. ------

const QUESTION_ROWS = [
  { ord: 1, question: 'Your role in the friend group?', options: [
    { text: 'The one who plans everything', weights: { care: 0, energy: 3 } },
    { text: 'The chaos that makes it fun', weights: { chaos: 5, energy: 5 } },
    { text: 'The quiet one who roasts everyone once an hour', weights: { heart: 5, energy: 0, spotlight: 5 } },
    { text: 'The baby everyone protects (and underestimates)', weights: { care: 5, chaos: 3 } },
  ] },
  { ord: 2, question: 'It is 2am on tour. Where are you?', options: [
    { text: 'Asleep hours ago, self-care is discipline', weights: { care: 3, chaos: 0 } },
    { text: 'In the studio, one more take', weights: { craft: 5, spotlight: 5 } },
    { text: 'Feral hotel-hallway content with the members', weights: { chaos: 5, energy: 5 } },
    { text: 'Baking, gaming, quietly recharging alone', weights: { heart: 0, energy: 0 } },
  ] },
  { ord: 3, question: 'Someone in the group is having a rough day. You:', options: [
    { text: 'Notice first, talk to them one-on-one', weights: { care: 0, heart: 0 } },
    { text: 'Make them laugh until they forget', weights: { chaos: 4, energy: 5 } },
    { text: 'Say nothing, sit next to them, share food', weights: { heart: 2, spotlight: 5 } },
    { text: 'Write them into your next lyric', weights: { craft: 5 } },
  ] },
  { ord: 4, question: 'First impression people get of you?', options: [
    { text: 'Intimidating, then it collapses in 5 minutes', weights: { chaos: 2, heart: 3 } },
    { text: 'Sunshine, immediately', weights: { heart: 0, energy: 5 } },
    { text: 'Mysterious main-character energy', weights: { energy: 2, spotlight: 0 } },
    { text: 'Polite and quiet (they have no idea yet)', weights: { chaos: 2, energy: 0 } },
  ] },
  { ord: 5, question: 'Pick a stage moment:', options: [
    { text: 'The killing part everyone screenshots', weights: { craft: 0, spotlight: 0 } },
    { text: 'The ad-lib nobody expected', weights: { chaos: 5, craft: 2 } },
    { text: 'The perfectly clean formation you drilled', weights: { care: 3, chaos: 0, craft: 0 } },
    { text: 'The self-produced track finally performed live', weights: { craft: 5 } },
  ] },
  { ord: 6, question: 'Group project (school edition). You are:', options: [
    { text: 'The leader who actually emails the teacher', weights: { care: 0, energy: 2 } },
    { text: 'The one who does it all at 3am and aces it', weights: { chaos: 3, craft: 4 } },
    { text: 'The morale officer contributing memes and one slide', weights: { chaos: 5, energy: 4 } },
    { text: 'The one who quietly fixes everyone else’s slides', weights: { care: 0, spotlight: 5 } },
  ] },
  { ord: 7, question: 'Your comfort activity?', options: [
    { text: 'Gym, physical, body busy means mind quiet', weights: { craft: 0, heart: 4 } },
    { text: 'Cooking or baking for people', weights: { care: 0, heart: 0 } },
    { text: 'Games, anime, one specific hyperfixation', weights: { chaos: 2, energy: 0 } },
    { text: 'Journaling, photos, making something', weights: { craft: 5, spotlight: 4 } },
  ] },
  { ord: 8, question: 'How do you argue?', options: [
    { text: 'Calm words, devastating accuracy', weights: { heart: 5, energy: 0 } },
    { text: 'I do not argue, I go quiet (scarier)', weights: { heart: 3, spotlight: 5 } },
    { text: 'Loud for 90 seconds then buying you food', weights: { heart: 0, energy: 5 } },
    { text: 'I win by making you laugh mid-sentence', weights: { chaos: 5 } },
  ] },
  { ord: 9, question: 'Pick a vibe (trust your first click):', options: [
    { text: 'Gold hour, film camera, quiet street', weights: { craft: 3, spotlight: 5 } },
    { text: 'Neon, 1am, convenience store run', weights: { chaos: 4, energy: 4 } },
    { text: 'Home, blankets, someone else cooked', weights: { care: 5, heart: 0 } },
    { text: 'Stage lights, ears ringing, alive', weights: { energy: 5, spotlight: 0 } },
  ] },
  { ord: 10, question: 'What do people thank you for most?', options: [
    { text: 'Being the reason it got done', weights: { care: 0, craft: 2 } },
    { text: 'Being the reason it was fun', weights: { chaos: 5, energy: 4 } },
    { text: 'Being the one who listened', weights: { heart: 0, spotlight: 3 } },
    { text: 'Being unapologetically yourself first', weights: { heart: 2, spotlight: 0 } },
  ] },
];

const SKZ_ROWS = [
  { member_name: 'Bang Chan', member_slug: 'bang-chan', ord: 0, axes: { care: 5, chaos: 30, craft: 80, heart: 25, energy: 55, spotlight: 55 } },
  { member_name: 'Lee Know', member_slug: 'lee-know', ord: 1, axes: { care: 40, chaos: 55, craft: 20, heart: 75, energy: 30, spotlight: 60 } },
  { member_name: 'Changbin', member_slug: 'changbin', ord: 2, axes: { care: 35, chaos: 65, craft: 75, heart: 35, energy: 80, spotlight: 40 } },
  { member_name: 'Hyunjin', member_slug: 'hyunjin', ord: 3, axes: { care: 45, chaos: 50, craft: 45, heart: 30, energy: 45, spotlight: 15 } },
  { member_name: 'Han', member_slug: 'han', ord: 4, axes: { care: 55, chaos: 80, craft: 75, heart: 30, energy: 60, spotlight: 45 } },
  { member_name: 'Felix', member_slug: 'felix', ord: 5, axes: { care: 40, chaos: 60, craft: 25, heart: 10, energy: 55, spotlight: 35 } },
  { member_name: 'Seungmin', member_slug: 'seungmin', ord: 6, axes: { care: 50, chaos: 45, craft: 30, heart: 80, energy: 35, spotlight: 50 } },
  { member_name: 'I.N', member_slug: 'i-n', ord: 7, axes: { care: 85, chaos: 50, craft: 15, heart: 40, energy: 45, spotlight: 45 } },
];

const QUESTIONS = parseQuestions(QUESTION_ROWS);
const PROFILES = parseProfiles(SKZ_ROWS);
const axes = (v: Partial<Axes>): Axes => ({ energy: 50, chaos: 50, care: 50, craft: 50, heart: 50, spotlight: 50, ...v });

// ---- reading the tables ---------------------------------------------------------------

describe('parse', () => {
  it('asks the first eight active questions in ord order', () => {
    expect(WMA_QUESTION_COUNT).toBe(8);
    expect(QUESTIONS).toHaveLength(8);
    expect(QUESTIONS[0]?.text).toBe('Your role in the friend group?');
    expect(QUESTIONS[7]?.text).toBe('How do you argue?');
    const shuffled = parseQuestions([...QUESTION_ROWS].reverse());
    expect(shuffled.map((q) => q.text)).toEqual(QUESTIONS.map((q) => q.text));
    for (const q of QUESTIONS) expect(q.options).toHaveLength(4);
  });

  it('gives no quiz when fewer valid questions than asked, and drops a malformed row', () => {
    expect(parseQuestions(QUESTION_ROWS.slice(0, 7))).toEqual([]);
    expect(parseQuestions(null)).toEqual([]);
    const broken = [...QUESTION_ROWS.slice(0, 8), { ord: 0, question: 'Broken', options: [{ text: 'a' }, { text: 'b', weights: { care: 1 } }] }];
    expect(parseQuestions(broken).map((q) => q.text)).not.toContain('Broken');
    expect(parseQuestions([{ ord: 1, question: '', options: [] }])).toEqual([]);
  });

  it('keeps a 0 weight (an anchor), and ignores unknown axes', () => {
    const q = parseQuestions([{ ord: 1, question: 'Q', options: [{ text: 'a', weights: { care: 0, luck: 9 } }, { text: 'b', weights: {} }] }], 1);
    expect(q[0]?.options[0]?.weights).toEqual({ care: 0 });
  });

  it('reads profiles in stored order and drops one without all six axes or out of range', () => {
    expect(PROFILES.map((p) => p.id)).toEqual(['bang-chan', 'lee-know', 'changbin', 'hyunjin', 'han', 'felix', 'seungmin', 'i-n']);
    expect(parseProfiles([{ member_name: 'X', member_slug: 'x', axes: { care: 1 } }])).toEqual([]);
    expect(parseProfiles([{ member_name: 'X', member_slug: 'x', axes: { ...SKZ_ROWS[0]!.axes, care: 140 } }])).toEqual([]);
    expect(parseProfiles([SKZ_ROWS[0], SKZ_ROWS[0]])).toHaveLength(1);
    expect(parseProfiles('nope')).toEqual([]);
  });

  it('reads the counts RPC and validates slugs', () => {
    expect(parseCounts([{ member_name: 'Felix', cnt: 59 }, { member_name: 'Han', cnt: '3' }, { member_name: 'Zero', cnt: 0 }, { cnt: 4 }])).toEqual({ Felix: 59, Han: 3 });
    expect(parseCounts(undefined)).toEqual({});
    expect(isGroupSlug('stray-kids')).toBe(true);
    expect(isGroupSlug('g-i-dle')).toBe(true);
    for (const bad of ['', '-x', 'A', 'a/b', 'a b', '../x', 7, null, 'x'.repeat(61)]) expect(isGroupSlug(bad)).toBe(false);
  });
});

// ---- the engine --------------------------------------------------------------------------

describe('engine: axes', () => {
  it('validates an answer sheet', () => {
    expect(validPicks([0, 1, 2, 3, 0, 1, 2, 3], QUESTIONS)).toBe(true);
    for (const bad of [[0, 1], [0, 1, 2, 3, 0, 1, 2, 4], [0, 1, 2, 3, 0, 1, 2, -1], [0, 1, 2, 3, 0, 1, 2, 1.5], 'x', null, [0, 1, 2, 3, 0, 1, 2, '3']]) {
      expect(validPicks(bad, QUESTIONS)).toBe(false);
    }
  });

  it('places the player: each named axis is the mean of its positions, 0 anchors count, a silent axis stays in the middle', () => {
    // hand computed for the sheet "first option, eight times"
    const p = scorePlayer(QUESTIONS, [0, 0, 0, 0, 0, 0, 0, 0]);
    expect(p.care).toBeCloseTo((0 + 60 + 0 + 0) / 4); // q1 care 0, q2 care 3, q3 care 0, q6 care 0
    expect(p.energy).toBeCloseTo((60 + 40 + 0) / 3); // q1 3, q6 2, q8 0
    expect(p.chaos).toBeCloseTo((0 + 40) / 2); // q2 0, q4 2
    expect(p.heart).toBeCloseTo((0 + 60 + 80 + 100) / 4); // q3 0, q4 3, q7 4, q8 5
    expect(p.craft).toBeCloseTo(0); // q5 0, q7 0
    expect(p.spotlight).toBeCloseTo(0); // q5 0
    // one question, an option that names nothing
    const silent = scorePlayer([{ text: 'Q', options: [{ text: 'a', weights: {} }] }], [0]);
    for (const k of AXIS_KEYS) expect(silent[k]).toBe(AXIS_NEUTRAL);
  });

  it('returns the nearest profile, deterministically, with ties in stored order', () => {
    const sheet = [2, 0, 0, 0, 0, 0, 0, 0];
    const a = nearestProfile(QUESTIONS, sheet, PROFILES);
    expect(a).toBe(nearestProfile(QUESTIONS, sheet, PROFILES));
    expect(PROFILES.map((p) => p.id)).toContain(a);
    const twins = [{ id: 'first', name: 'First', axes: axes({}) }, { id: 'second', name: 'Second', axes: axes({}) }];
    expect(rankProfiles(axes({}), twins).map((r) => r.id)).toEqual(['first', 'second']);
    expect(distance(axes({ care: 0 }), axes({ care: 30 }))).toBeCloseTo(30);
    expect(nearestProfile(QUESTIONS, [0], PROFILES)).toBeNull();
    expect(nearestProfile(QUESTIONS, sheet, [])).toBeNull();
  });

  it('every Stray Kids member can be reached with the eight questions, none above 30% of the sheets', () => {
    const n = QUESTIONS.length;
    const counts = new Map<string, number>();
    const total = 4 ** n;
    for (let x = 0; x < total; x++) {
      const picks: number[] = [];
      let v = x;
      for (let i = 0; i < n; i++) { picks.push(v & 3); v >>= 2; }
      const id = nearestProfile(QUESTIONS, picks, PROFILES) as string;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const p of PROFILES) {
      const share = (counts.get(p.id) ?? 0) / total;
      expect(share, p.name).toBeGreaterThan(0.02);
      expect(share, p.name).toBeLessThan(0.3);
    }
  });
});

describe('engine: tally (bridge quiz)', () => {
  it('has six questions of four answers, six outcomes with three songs each, and only known outcome keys', () => {
    expect(BRIDGE_QUESTIONS).toHaveLength(6);
    expect(BRIDGE_SLUGS).toEqual(['blackpink', 'twice', 'itzy', 'aespa', 'le-sserafim', 'illit']);
    for (const q of BRIDGE_QUESTIONS) {
      expect(q.options).toHaveLength(4);
      for (const o of q.options) for (const k of Object.keys(o.points)) expect(BRIDGE_SLUGS).toContain(k);
    }
    for (const o of BRIDGE_OUTCOMES) {
      expect(o.songs).toHaveLength(3);
      expect(o.traits).toHaveLength(3);
      expect(o.reason.length).toBeGreaterThan(40);
      for (const s of o.songs) { expect(s.year).toBeGreaterThanOrEqual(2015); expect(s.year).toBeLessThanOrEqual(2026); }
    }
  });

  it('gives the prototype result for the prototype sheet, and every group can be reached', () => {
    expect(tallyScores(BRIDGE_QUESTIONS, [0, 0, 3, 0, 0, 0], BRIDGE_SLUGS)).toEqual({ blackpink: 9, twice: 2, itzy: 0, aespa: 0, 'le-sserafim': 2, illit: 0 });
    expect(tallyWinner(BRIDGE_QUESTIONS, [0, 0, 3, 0, 0, 0], BRIDGE_SLUGS)).toBe('blackpink');
    const seen = new Set<string>();
    for (let x = 0; x < 4 ** 6; x++) {
      const picks: number[] = [];
      let v = x;
      for (let i = 0; i < 6; i++) { picks.push(v & 3); v >>= 2; }
      seen.add(tallyWinner(BRIDGE_QUESTIONS, picks, BRIDGE_SLUGS) as string);
    }
    expect([...seen].sort()).toEqual([...BRIDGE_SLUGS].sort());
  });

  it('breaks a tie by outcome order and refuses an invalid sheet', () => {
    const qs = [{ text: 'Q', options: [{ text: 'a', icon: 'star' as const, points: { x: 1, y: 1, ghost: 5 } }] }];
    expect(tallyWinner(qs, [0], ['x', 'y'])).toBe('x');
    expect(tallyWinner(qs, [0], ['y', 'x'])).toBe('y');
    expect(tallyScores(qs, [0], ['x', 'y'])).toEqual({ x: 1, y: 1 });
    expect(tallyWinner(BRIDGE_QUESTIONS, [0, 0, 3], BRIDGE_SLUGS)).toBeNull();
    expect(tallyWinner(BRIDGE_QUESTIONS, [0, 0, 3, 0, 0, 9], BRIDGE_SLUGS)).toBeNull();
  });

  it('resolveResult picks the matcher from the spec', () => {
    expect(resolveResult({ kind: 'tally', questions: BRIDGE_QUESTIONS, outcomes: BRIDGE_SLUGS }, [0, 0, 3, 0, 0, 0])).toBe('blackpink');
    const sheet = [1, 1, 1, 1, 1, 1, 1, 1];
    expect(resolveResult({ kind: 'axes', questions: QUESTIONS, profiles: PROFILES }, sheet)).toBe(nearestProfile(QUESTIONS, sheet, PROFILES));
  });
});

// ---- the words of a result ----------------------------------------------------------------

describe('result copy', () => {
  it('describes the player from the strongest axes: three distinct traits, two sentences starting with You', () => {
    const bangChan = PROFILES[0]!.axes; // care 5, craft 80, chaos 30 are the furthest from the middle
    expect(playerTraits(bangChan)).toEqual(['Caring', 'Creative', 'Soft-hearted']);
    expect(playerDescription(bangChan)).toBe('You look after people without being asked. You would rather make something than talk about it.');
    for (const p of PROFILES) {
      const t = playerTraits(p.axes);
      expect(new Set(t).size).toBe(3);
      const d = playerDescription(p.axes);
      expect(d.split('. ')).toHaveLength(2);
      expect(d.startsWith('You ')).toBe(true);
      // about the player only: no member name, no third person
      for (const m of PROFILES) expect(d).not.toContain(m.name);
      expect(/\b(he|she|his|her|him)\b/i.test(d)).toBe(false);
    }
  });

  it('is stable when every axis is in the middle', () => {
    expect(playerTraits(axes({}))).toEqual(['Outgoing', 'Playful', 'Easy to love']);
  });

  it('gives a public role to every listed member, and a plain line otherwise', () => {
    expect(publicRole('stray-kids', 'bang-chan', 'Stray Kids')).toBe('Leader and producer');
    expect(publicRole('stray-kids', 'nobody', 'Stray Kids')).toBe('Member of Stray Kids');
    expect(publicRole('unknown', 'x', 'Some Group')).toBe('Member of Some Group');
    for (const p of PROFILES) expect(publicRole('stray-kids', p.id, 'Stray Kids')).not.toMatch(/^Member of/);
    const roles = listedRoles();
    expect(roles.length).toBe(97);
    // roles only: position words, a unit, a production credit, oldest or youngest
    const allowed = /^(Leader|Captain|General leader|Main vocalist|Main dancer|Main rapper|Vocalist|Rapper|Dancer|Vocal team|Hip-hop team|Performance team)/;
    for (const r of roles) {
      expect(r.role, `${r.group}/${r.member}`).toMatch(allowed);
      expect(r.role.length).toBeLessThanOrEqual(40);
      expect(/[–—]/.test(r.role)).toBe(false);
    }
  });
});

// ---- shares ------------------------------------------------------------------------------

describe('distribution', () => {
  const outcomes = PROFILES.map((p) => ({ id: p.id, label: p.name, key: p.name }));

  it('is the real share of each outcome, members without a result at 0', () => {
    const d = buildDistribution({ 'Bang Chan': 18, Felix: 59, Hyunjin: 64, 'I.N': 15, 'Lee Know': 27, Seungmin: 12 }, outcomes);
    expect(d?.total).toBe(195);
    expect(d?.rows).toHaveLength(8);
    expect(shareOf(d ?? null, 'hyunjin')).toBe(33);
    expect(shareOf(d ?? null, 'han')).toBe(0);
    expect(d?.rows.reduce((s, r) => s + r.pct, 0)).toBeCloseTo(100);
    expect(shareOf(d ?? null, 'nobody')).toBeNull();
  });

  it('leaves out stored names that are not outcomes, from the rows and from the total', () => {
    const d = buildDistribution({ Felix: 30, [BRIDGE_RESULT_KEY]: 500, 'Old Member': 10 }, outcomes);
    expect(d?.total).toBe(30);
    expect(shareOf(d ?? null, 'felix')).toBe(100);
  });

  it('is hidden under the minimum, without counts, and never invents a number', () => {
    expect(MIN_RESULTS_FOR_SHARES).toBe(20);
    expect(buildDistribution({ Felix: 19 }, outcomes)).toBeNull();
    expect(buildDistribution({ Felix: 20 }, outcomes)?.total).toBe(20);
    expect(buildDistribution(null, outcomes)).toBeNull();
    expect(buildDistribution({}, outcomes)).toBeNull();
    expect(buildDistribution({ Felix: Number.NaN, Han: -4 }, outcomes, 0)).toBeNull();
    expect(shareOf(null, 'felix')).toBeNull();
  });
});

describe('view helpers', () => {
  it('builds the pretty URL and picks a decorative icon from the option weights', () => {
    expect(whichMemberPath('stray-kids')).toBe('/which-stray-kids-member-are-you');
    expect(axisOptionIcon({ chaos: 5, energy: 5 })).toBe('zap'); // first strongest axis in axis order
    expect(axisOptionIcon({ care: 0, energy: 3 })).toBe('shield');
    expect(axisOptionIcon({})).toBe('star');
  });
});

// ---- saving ------------------------------------------------------------------------------

function fakeStore(over: Partial<SaveStore> = {}): { store: SaveStore; inserts: Array<{ groupId: number; memberName: string }> } {
  const inserts: Array<{ groupId: number; memberName: string }> = [];
  const data: WmaData = { group: { id: 3, slug: 'stray-kids', name: 'Stray Kids', fandom: 'STAY' }, questions: QUESTIONS, profiles: PROFILES };
  const store: SaveStore = {
    wma: async (slug) => (slug === 'stray-kids' ? data : null),
    bridgeGroupId: async (slug) => ({ blackpink: 2, twice: 4, itzy: 17, aespa: 5, 'le-sserafim': 11 } as Record<string, number>)[slug] ?? null,
    insert: async (row) => { inserts.push(row); return 'saved'; },
    ...over,
  };
  return { store, inserts };
}
const allow = (): boolean => true;

describe('saveResult', () => {
  it('recomputes a member result from the sheet and stores the member name', async () => {
    const { store, inserts } = fakeStore();
    const sheet = [2, 0, 0, 0, 0, 0, 0, 0];
    const out = await saveResult({ body: { quiz: 'wma', group: 'stray-kids', picks: sheet, result: 'felix', member_name: 'Felix' }, store, allow });
    const id = nearestProfile(QUESTIONS, sheet, PROFILES);
    expect(out).toEqual({ http: 200, body: { saved: true, result: id, status: 'saved' } });
    expect(inserts).toEqual([{ groupId: 3, memberName: PROFILES.find((p) => p.id === id)?.name }]);
  });

  it('stores a bridge result under the group it names, with the fixed key', async () => {
    const { store, inserts } = fakeStore();
    const out = await saveResult({ body: { quiz: 'kpdh', picks: [0, 0, 3, 0, 0, 0] }, store, allow });
    expect(out.body).toEqual({ saved: true, result: 'blackpink', status: 'saved' });
    expect(inserts).toEqual([{ groupId: 2, memberName: BRIDGE_RESULT_KEY }]);
    expect(BRIDGE_RESULT_KEY.startsWith('@')).toBe(true); // can never be a member name
  });

  it('refuses a malformed request before touching the store', async () => {
    const { store, inserts } = fakeStore({ wma: async () => { throw new Error('must not be read'); } });
    for (const body of [null, 'x', {}, { quiz: 'nope', picks: [] }, { quiz: 'wma', picks: [0] }, { quiz: 'wma', group: '../x', picks: [0] }, { quiz: 'wma', group: 'stray-kids', picks: 'x' }, { quiz: 'kpdh', picks: Array(21).fill(0) }]) {
      const out = await saveResult({ body, store, allow });
      expect(out.http, JSON.stringify(body)).toBe(400);
      expect(out.body.saved).toBe(false);
    }
    expect(inserts).toEqual([]);
  });

  it('refuses a bad sheet, an unknown group, and a caller over the limit, without a write', async () => {
    const { store, inserts } = fakeStore();
    expect((await saveResult({ body: { quiz: 'wma', group: 'stray-kids', picks: [0, 1, 2] }, store, allow })).http).toBe(400);
    expect((await saveResult({ body: { quiz: 'wma', group: 'stray-kids', picks: [0, 1, 2, 3, 0, 1, 2, 7] }, store, allow })).http).toBe(400);
    expect((await saveResult({ body: { quiz: 'kpdh', picks: [0, 0, 0] }, store, allow })).http).toBe(400);
    expect((await saveResult({ body: { quiz: 'wma', group: 'riize', picks: [0, 0, 0, 0, 0, 0, 0, 0] }, store, allow })).http).toBe(404);
    expect((await saveResult({ body: { quiz: 'kpdh', picks: [0, 0, 3, 0, 0, 0] }, store, allow: () => false })).http).toBe(429);
    expect(inserts).toEqual([]);
  });

  it('fails soft: a repeat, a failed insert and a missing group answer 200 and saved false', async () => {
    const sheet = { quiz: 'kpdh', picks: [0, 0, 3, 0, 0, 0] };
    const again = await saveResult({ body: sheet, store: fakeStore({ insert: async () => 'already' }).store, allow });
    expect(again).toEqual({ http: 200, body: { saved: false, result: 'blackpink', status: 'already' } });
    const failed = await saveResult({ body: sheet, store: fakeStore({ insert: async () => 'failed' }).store, allow });
    expect(failed).toEqual({ http: 200, body: { saved: false, result: 'blackpink', status: 'failed' } });
    // ILLIT has no id in this store: the result is shown, nothing is written
    const { store, inserts } = fakeStore();
    const illit = await saveResult({ body: { quiz: 'kpdh', picks: [2, 2, 2, 3, 3, 1] }, store, allow });
    expect(illit).toEqual({ http: 200, body: { saved: false, result: 'illit', status: 'failed' } });
    expect(inserts).toEqual([]);
  });
});

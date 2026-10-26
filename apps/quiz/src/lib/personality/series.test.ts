// Run O1, lane PERS: Which character are you, the pure part (the band of a series' questions, the pretty URL, the profile rows, the
// words of a result). The data of Death Note in docs/anime/data/personality is read as the engine reads it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { AXIS_KEYS, nearestProfile, rankProfiles, scorePlayer } from './engine';
import { parseProfiles, parseQuestions } from './parse';
import { characterRoleLine, parseSeriesProfiles, profileText, QUESTION_BAND, questionBand, SERIES_MIN_PROFILES, whichCharacterPath, whichPath } from './series';
import { playerTraits } from './traits';
import { whichMemberPath } from './view';

const REPO = join(__dirname, '../../../../..');
const read = (rel: string): string => readFileSync(join(REPO, rel), 'utf8');

describe('questionBand', () => {
  it('gives eight questions the ord window of their group, and two groups never share an ord', () => {
    expect(questionBand(7)).toEqual({ from: 85, to: 96 });
    const a = questionBand(100); const b = questionBand(101);
    expect(a.to).toBeLessThan(b.from);
    // the ten kpop questions (ord 1 to 10) are below the band of every group id from 1
    expect(questionBand(1).from).toBeGreaterThan(10);
  });

  it('is the band the loader writes (ORD_BAND of scripts/anime/k1/personality-data.mjs) and the floor of the route (MIN_PROFILES)', () => {
    const loader = read('scripts/anime/k1/personality-data.mjs');
    expect(Number(/export const ORD_BAND = (\d+);/.exec(loader)?.[1])).toBe(QUESTION_BAND);
    expect(Number(/export const MIN_PROFILES = (\d+);/.exec(loader)?.[1])).toBe(SERIES_MIN_PROFILES);
  });
});

describe('paths', () => {
  it('the public URL says character on every build but kpop, and kpop keeps member', () => {
    expect(whichCharacterPath('death-note')).toBe('/which-death-note-character-are-you');
    expect(whichPath('anime', 'death-note')).toBe('/which-death-note-character-are-you');
    expect(whichPath('kpop', 'bts')).toBe(whichMemberPath('bts'));
    expect(whichMemberPath('bts')).toBe('/which-bts-member-are-you');
  });
});

const row = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  member_name: 'Light Yagami', member_slug: 'light-yagami', ord: 1,
  axes: { energy: 50, chaos: 0, care: 50, craft: 75, heart: 30, spotlight: 20 },
  trait_lines: ['You have a plan.', 'You are calm.'],
  characters: { role: 'main', affiliation: 'Yagami family' },
  ...over,
});

describe('parseSeriesProfiles', () => {
  it('keeps the axes of the kpop reader and adds the profile text, the role and the affiliation', () => {
    const [p] = parseSeriesProfiles([row()]);
    expect(p).toEqual({ ...parseProfiles([row()])[0], lines: ['You have a plan.', 'You are calm.'], role: 'main', affiliation: 'Yagami family' });
  });

  it('reads the embedded character as an object or a one item array, and a missing link as no role', () => {
    expect(parseSeriesProfiles([row({ characters: [{ role: 'supporting', affiliation: 'Shinigami' }] })])[0]).toMatchObject({ role: 'supporting', affiliation: 'Shinigami' });
    expect(parseSeriesProfiles([row({ characters: null })])[0]).toMatchObject({ role: null, affiliation: null });
    expect(parseSeriesProfiles([row({ characters: { role: 'main', affiliation: '  ' } })])[0]).toMatchObject({ affiliation: null });
  });

  it('drops a row without a profile text, without all six axes, a repeated slug and a malformed list', () => {
    expect(parseSeriesProfiles([row({ trait_lines: [] }), row({ trait_lines: ['  ', 3] })])).toEqual([]);
    expect(parseSeriesProfiles([row({ axes: { energy: 1 } })])).toEqual([]);
    expect(parseSeriesProfiles([row(), row({ member_name: 'Other' })])).toHaveLength(1);
    expect(parseSeriesProfiles(null)).toEqual([]);
    expect(parseSeriesProfiles([null, 4, 'x'])).toEqual([]);
  });

  it('keeps the stored order of the rows it is given', () => {
    const rows = parseSeriesProfiles([row({ member_slug: 'b', member_name: 'B' }), row({ member_slug: 'a', member_name: 'A' })]);
    expect(rows.map((p) => p.id)).toEqual(['b', 'a']);
  });
});

describe('the words of a result', () => {
  it('the role line is the series data, never an invention', () => {
    expect(characterRoleLine('main', 'Yagami family', 'Death Note')).toBe('Main character, Yagami family');
    expect(characterRoleLine('supporting', 'Shinigami', 'Death Note')).toBe('Supporting character, Shinigami');
    expect(characterRoleLine('main', null, 'Death Note')).toBe('Main character of Death Note');
    expect(characterRoleLine(null, null, 'Death Note')).toBe('Character of Death Note');
    expect(characterRoleLine('other', 'Club', 'Death Note')).toBe('Character, Club');
  });

  it('the result text is the profile lines in one paragraph', () => {
    expect(profileText({ lines: ['You plan.', 'You win.'] })).toBe('You plan. You win.');
  });
});

// ---- the Death Note file, read the way the page reads its rows ---------------------------------------------------------------

interface DataFile {
  group_slug: string;
  questions: Array<{ ord: number; question: string; options: Array<{ text: string; weights: Record<string, number> }> }>;
  profiles: Array<{ character_slug: string; traits: Record<string, number>; profile: string[]; ord: number }>;
}
const DN = JSON.parse(read('docs/anime/data/personality/death-note.json')) as DataFile;
const SERIES = JSON.parse(read('docs/anime/data/series/death-note.json')) as { characters: Array<{ slug: string; name: string; role: string; affiliation: string }> };

/** The rows personality_questions and personality_profiles would hold for the file, in the shape the page reads. */
const questionRows = DN.questions.map((q) => ({ ord: 1000 * QUESTION_BAND + q.ord, question: q.question, options: q.options }));
const profileRows = DN.profiles.map((p) => {
  const c = SERIES.characters.find((x) => x.slug === p.character_slug)!;
  return { member_name: c.name, member_slug: p.character_slug, axes: p.traits, trait_lines: p.profile, ord: p.ord, characters: { role: c.role, affiliation: c.affiliation } };
});

describe('the Death Note quiz as the page reads it', () => {
  const questions = parseQuestions(questionRows);
  const profiles = parseSeriesProfiles(profileRows);

  it('is eight questions of four answers and six profiles with a text, all of them read', () => {
    expect(questions).toHaveLength(8);
    expect(questions.every((q) => q.options.length === 4)).toBe(true);
    expect(profiles).toHaveLength(6);
    expect(profiles.every((p) => p.lines.length >= 2 && /^You\b/.test(p.lines[0]!))).toBe(true);
  });

  it('every character can be the result, none for more than 40 percent of the 65536 answer sheets', () => {
    const wins = new Map(profiles.map((p) => [p.id, 0]));
    const picks = new Array<number>(8).fill(0);
    const walk = (i: number): void => {
      if (i === 8) { const id = nearestProfile(questions, picks, profiles)!; wins.set(id, (wins.get(id) ?? 0) + 1); return; }
      for (let j = 0; j < 4; j += 1) { picks[i] = j; walk(i + 1); }
    };
    walk(0);
    for (const [id, n] of wins) {
      expect(n / 65536, id).toBeGreaterThan(0.03);
      expect(n / 65536, id).toBeLessThan(0.4);
    }
  });

  it('the answers say what they mean: the most caring answers give one of the two caring characters, the most outgoing give Matsuda', () => {
    // the answer of each question that names care or energy at the low end most strongly
    const pick = (axis: string, low: boolean): number[] => questions.map((q) => {
      let best = 0; let bestPull = -1;
      q.options.forEach((o, j) => {
        const w = (o.weights as Record<string, number | undefined>)[axis];
        const pull = typeof w === 'number' ? (low ? 5 - w : w) : -1;
        if (pull > bestPull) { bestPull = pull; best = j; }
      });
      return best;
    });
    expect(['soichiro-yagami', 'kanzo-mogi']).toContain(nearestProfile(questions, pick('care', true), profiles));
    expect(nearestProfile(questions, pick('energy', false), profiles)).toBe('touta-matsuda');
  });

  it('a result gives three distinct pills for the player and the nearest profile is stable', () => {
    for (const p of profiles) {
      const pills = playerTraits(p.axes);
      expect(new Set(pills).size).toBe(3);
      const rank = rankProfiles(p.axes, profiles);
      expect(rank[0]?.id).toBe(p.id);
      expect(rank[0]?.distance).toBe(0);
    }
    const player = scorePlayer(questions, [0, 0, 0, 0, 0, 0, 0, 0]);
    for (const k of AXIS_KEYS) expect(player[k]).toBeGreaterThanOrEqual(0);
  });

  it('no line of the profiles holds a dash, an emoji or the name of its character first', () => {
    for (const p of profiles) {
      for (const l of p.lines) {
        expect(l).not.toMatch(/[\u2013\u2014]|--/);
        expect(l).not.toMatch(/\p{Extended_Pictographic}/u);
        expect(l.startsWith(p.name)).toBe(false);
      }
    }
  });
});

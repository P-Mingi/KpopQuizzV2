import { describe, expect, it } from 'vitest';

import { answerBlock, forbiddenIn, formatDay, joinNames, membersSentence, metaDescription, MOST_COMMON_MIN, mostCommon, mostCommonText } from './page-copy';
import { getRoster } from './rosters';

// SEO Mission 2, part D: the words of a Which member are you page that carry a number or
// a fact. The min-gate (100 results), the forbidden words and the answer-block window.

const NAMES = ['aespa', 'ATEEZ', 'BLACKPINK', 'BTS', 'ENHYPEN', '(G)I-DLE', 'ITZY', 'IVE', 'LE SSERAFIM', 'NewJeans', 'NMIXX', 'SEVENTEEN', 'Stray Kids', 'TWICE', 'TXT'];
const words = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
const ASOF = '2026-10-15T09:30:00.000Z';
const outcomes = ['Bang Chan', 'Lee Know', 'Changbin', 'Hyunjin', 'Han', 'Felix', 'Seungmin', 'I.N'].map((name) => ({ name }));

describe('answer block', () => {
  it('is 40 to 60 words for every page, with or without the saved results', () => {
    for (const g of NAMES) {
      for (const saved of [null, { total: 211, asOf: ASOF }, { total: 12345, asOf: ASOF }]) {
        const a = answerBlock(g, 8, saved);
        expect(words(a), `${g} ${saved ? saved.total : 'none'}`).toBeGreaterThanOrEqual(40);
        expect(words(a)).toBeLessThanOrEqual(60);
        expect(a).toContain(`${g} member`);
        expect(forbiddenIn(a)).toEqual([]);
        expect(/[\u2013\u2014]/.test(a)).toBe(false);
      }
    }
  });
  it('prints the real number with its date, and no number when there is none', () => {
    expect(answerBlock('Stray Kids', 8, { total: 1211, asOf: ASOF })).toContain('As of October 15, 2026, fans have saved 1,211 results.');
    expect(answerBlock('BTS', 8, { total: 1, asOf: ASOF })).toContain('fans have saved 1 result.');
    expect(answerBlock('BTS', 8, { total: 0, asOf: ASOF })).not.toMatch(/saved/);
    expect(answerBlock('BTS', 8, null)).not.toMatch(/saved|As of/);
    expect(answerBlock('BTS', 8, { total: 5, asOf: 'not a date' })).not.toMatch(/saved/);
  });
});

describe('meta description', () => {
  it('holds the primary phrase once and is 120 to 160 characters on every page', () => {
    for (const g of NAMES) {
      const d = metaDescription(g, 8);
      expect(d.length, g).toBeGreaterThanOrEqual(120);
      expect(d.length, g).toBeLessThanOrEqual(160);
      expect(d.split(`Which ${g} member are you?`)).toHaveLength(2);
      expect(forbiddenIn(d)).toEqual([]);
    }
  });
});

describe('most common result: the min-gate', () => {
  const counts = (total: number): Record<string, number> => {
    // Felix leads, then Hyunjin, then Bang Chan, the rest share what is left.
    const out: Record<string, number> = { Felix: Math.floor(total * 0.3), Hyunjin: Math.floor(total * 0.2), 'Bang Chan': Math.floor(total * 0.15) };
    let left = total - out.Felix! - out.Hyunjin! - out['Bang Chan']!;
    for (const n of ['Lee Know', 'Changbin', 'Han', 'Seungmin', 'I.N']) { const v = Math.min(left, Math.floor(total * 0.07)); out[n] = v; left -= v; }
    out['I.N'] = (out['I.N'] ?? 0) + left;
    return out;
  };

  it('needs 100 saved results', () => {
    expect(MOST_COMMON_MIN).toBe(100);
    expect(mostCommon(counts(99), outcomes, ASOF, false)).toBeNull();
    const at = mostCommon(counts(100), outcomes, ASOF, false);
    expect(at).not.toBeNull();
    expect(at!.total).toBe(100);
  });

  it('counts only the current results (a stored name that is no longer a result is left out)', () => {
    expect(mostCommon({ ...counts(90), Woojin: 50 }, outcomes, ASOF, false)).toBeNull();
  });

  it('is hidden for a group with a member under 18, without counts, or without their date', () => {
    expect(mostCommon(counts(500), outcomes, ASOF, true)).toBeNull();
    expect(mostCommon(null, outcomes, ASOF, false)).toBeNull();
    expect(mostCommon(counts(500), outcomes, null, false)).toBeNull();
  });

  it('gives the top three only, biggest first, never a 0%', () => {
    const mc = mostCommon(counts(211), outcomes, ASOF, false)!;
    expect(mc.top.map((r) => r.name)).toEqual(['Felix', 'Hyunjin', 'Bang Chan']);
    expect(mc.leaders).toBe(1);
    for (const r of mc.top) expect(r.pct).toBeGreaterThan(0);
    const one = mostCommon({ Felix: 120 }, outcomes, ASOF, false)!;
    expect(one.top).toEqual([{ name: 'Felix', pct: 100 }]);
  });

  it('says so when results tie for first', () => {
    const mc = mostCommon({ Felix: 60, Han: 60, Seungmin: 30 }, outcomes, ASOF, false)!;
    expect(mc.leaders).toBe(2);
    const text = mostCommonText('Stray Kids', mc);
    expect(text[0]).toBe('Felix and Han are the most common results of this Stray Kids quiz, with 40% each of the 150 results saved up to October 15, 2026.');
    expect(text[1]).toBe('Next comes Seungmin (20%).');
  });

  it('prints n and the date, the answer first, and no claim about the members', () => {
    const text = mostCommonText('Stray Kids', mostCommon(counts(211), outcomes, ASOF, false)!);
    expect(text[0]).toMatch(/^Felix is the most common result of this Stray Kids quiz: \d+% of the 211 results saved up to October 15, 2026\.$/);
    expect(text[1]).toMatch(/^Next come Hyunjin \(\d+%\) and Bang Chan \(\d+%\)\.$/);
    expect(text.join(' ')).not.toMatch(/fans (think|prefer|love|like)|favou?rite|best member|least/i);
    expect(forbiddenIn(text.join(' '))).toEqual([]);
  });
});

describe('members sentence', () => {
  it('prints the count only when both sources agree on it', () => {
    const bts = getRoster('bts')!;
    expect(bts.countAgreed).toBe(true);
    expect(membersSentence('BTS', bts)).toBe(`BTS has ${bts.members.length} members: ${joinNames(bts.members.map((m) => m.name))}.`);
    const skz = getRoster('stray-kids')!;
    expect(skz.countAgreed).toBe(false);
    expect(membersSentence('Stray Kids', skz)).toMatch(/^The current Stray Kids members named by both Wikipedia and Wikidata are /);
    expect(membersSentence('Stray Kids', skz)).not.toMatch(/\d/);
  });
});

describe('helpers', () => {
  it('forbiddenIn finds the banned framing words', () => {
    expect(forbiddenIn('Their height and weight, dating news, a soulmate test, compatibility, born in 2008')).toEqual(['height', 'weight', 'dating', 'soulmate', 'compatibility', 'born']);
    expect(forbiddenIn('Leader, rapper. Answers lean toward Caring, Creative.')).toEqual([]);
  });
  it('joinNames and formatDay', () => {
    expect(joinNames(['A'])).toBe('A');
    expect(joinNames(['A', 'B'])).toBe('A and B');
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B and C');
    expect(formatDay('2026-10-15')).toBe('October 15, 2026');
    expect(formatDay(ASOF)).toBe('October 15, 2026');
    expect(formatDay('nope')).toBe('');
  });
});

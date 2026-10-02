import { describe, expect, it } from 'vitest';

import { TYPO_MIN_LENGTH, acceptedSpellings, letterCount, matchName, normalizeName, withinOneLetter } from './match';
import {
  ROUND_SECONDS, STATS_MIN_ROUNDS, checkRound, formatSeconds, legacyRows, parseRawStats, prettyPath, publicStats,
  resultHeadline, roundRows,
} from './round';
import { buildRoster } from './roster';
import { NAME_ALL_GROUPS, NAME_ALL_SPELLINGS, isNameAllGroup } from './spellings';
import { submitRound } from './submit';

import type { NameAllMember } from './match';
import type { NameAllSet } from './server';
import type { SubmitDeps } from './submit';

// Name them all (V12 G6). The rosters used here are built the way the page builds
// them (database display names + the spellings table); the display names are the
// table keys, which the read-only database check of the G6 report compares with
// production.

function rosterOf(slug: (typeof NAME_ALL_GROUPS)[number]): NameAllMember[] {
  return buildRoster(slug, Object.keys(NAME_ALL_SPELLINGS[slug]).map((name) => ({ name, name_romanized: null, name_hangul: null })));
}
const who = (input: string, slug: (typeof NAME_ALL_GROUPS)[number]): string | null => matchName(input, rosterOf(slug))?.member.name ?? null;

describe('normalizeName', () => {
  it.each([
    ['  Bang Chan ', 'bangchan'],
    ['I.N', 'in'],
    ['D.O.', 'do'],
    ['J-Hope', 'jhope'],
    ['S.Coups', 'scoups'],
    ['Ni-ki', 'niki'],
    ['Rosé', 'rose'],
    ["Ha'ni", 'hani'],
    ['The8', 'the8'],
    ['방찬', '방찬'],
    ['방 찬', '방찬'],
    ['ＦＥＬＩＸ', 'felix'],
    ['!!!', ''],
  ])('%s -> %s', (raw, out) => {
    expect(normalizeName(raw)).toBe(out);
  });

  it('keeps Hangul syllables composed, so one syllable is one letter', () => {
    expect(letterCount(normalizeName('휴닝카이'))).toBe(4);
    expect(normalizeName('한')).toBe('한'); // typed as jamo
  });
});

describe('withinOneLetter', () => {
  it.each([
    ['hyunjin', 'hyunjin', true],
    ['hyunjin', 'hyunjn', true], // one missing
    ['hyunjin', 'hyunjiin', true], // one added
    ['hyunjin', 'hyunjim', true], // one changed
    ['hyunjin', 'hyunjni', false], // two letters swapped is two changes
    ['hyunjin', 'hyujn', false],
    ['felix', 'felixx', true],
    ['felix', 'feliks', false], // one changed and one added
    ['felix', 'flx', false],
    ['', 'a', true],
    ['ab', 'ba', false],
  ])('%s / %s -> %s', (a, b, out) => {
    expect(withinOneLetter(a, b)).toBe(out);
    expect(withinOneLetter(b, a)).toBe(out);
  });
});

describe('matchName: accepted spellings', () => {
  it.each([
    // stage names, any case and punctuation
    ['bang chan', 'stray-kids', 'Bang Chan'],
    ['BANGCHAN', 'stray-kids', 'Bang Chan'],
    ['i.n', 'stray-kids', 'I.N'],
    ['in', 'stray-kids', 'I.N'],
    ['lee know', 'stray-kids', 'Lee Know'],
    ['jhope', 'bts', 'J-Hope'],
    ['j hope', 'bts', 'J-Hope'],
    ['v', 'bts', 'V'],
    ['do', 'exo', 'D.O.'],
    ['the 8', 'seventeen', 'The8'],
    ['s coups', 'seventeen', 'S.Coups'],
    ['Rosé', 'blackpink', 'Rose'],
    ['niki', 'enhypen', 'Ni-ki'],
    ['hueningkai', 'txt', 'Huening Kai'],
    // birth names, with and without the family name
    ['yongbok', 'stray-kids', 'Felix'],
    ['Han Jisung', 'stray-kids', 'Han'],
    ['minho', 'stray-kids', 'Lee Know'],
    ['kim taehyung', 'bts', 'V'],
    ['yoongi', 'bts', 'Suga'],
    ['park chaeyoung', 'blackpink', 'Rose'],
    ['son chaeyoung', 'twice', 'Chaeyoung'],
    ['yoo jimin', 'aespa', 'Karina'],
    ['jisoo', 'seventeen', 'Joshua'],
    ['chan', 'seventeen', 'Dino'],
    ['chan', 'stray-kids', 'Bang Chan'],
    ['kyungsoo', 'exo', 'D.O.'],
    ['choi minho', 'shinee', 'Minho'],
    // other romanizations
    ['jeongguk', 'bts', 'Jungkook'],
    ['jungyeon', 'twice', 'Jeongyeon'],
    ['juhyun', 'red-velvet', 'Irene'],
    // Hangul, stage and birth
    ['방찬', 'stray-kids', 'Bang Chan'],
    ['필릭스', 'stray-kids', 'Felix'],
    ['이용복', 'stray-kids', 'Felix'],
    ['아이엔', 'stray-kids', 'I.N'],
    ['뷔', 'bts', 'V'],
    ['김남준', 'bts', 'RM'],
    ['로제', 'blackpink', 'Rose'],
    ['카리나', 'aespa', 'Karina'],
    ['에스쿱스', 'seventeen', 'S.Coups'],
    ['휴닝카이', 'txt', 'Huening Kai'],
    ['키', 'shinee', 'Key'],
  ] as const)('%s in %s is %s', (input, slug, member) => {
    expect(who(input, slug)).toBe(member);
  });

  it('marks an exact spelling as exact', () => {
    expect(matchName('Felix', rosterOf('stray-kids'))?.kind).toBe('exact');
  });
});

describe('matchName: one-letter typos', () => {
  it.each([
    ['hyunjn', 'stray-kids', 'Hyunjin'],
    ['hyunjinn', 'stray-kids', 'Hyunjin'],
    ['felux', 'stray-kids', 'Felix'],
    ['changbim', 'stray-kids', 'Changbin'],
    ['seungmn', 'stray-kids', 'Seungmin'],
    ['jungkok', 'bts', 'Jungkook'],
    ['jenie', 'blackpink', 'Jennie'],
    ['wonyong', 'ive', 'Wonyoung'],
    ['chaeryong', 'itzy', 'Chaeryeong'],
    ['bangchn', 'stray-kids', 'Bang Chan'],
  ] as const)('%s in %s is %s', (input, slug, member) => {
    const hit = matchName(input, rosterOf(slug));
    expect(hit?.member.name).toBe(member);
    expect(hit?.kind).toBe('typo');
  });

  it.each([
    // names under 5 letters are exact only
    ['hann', 'stray-kids'],
    ['ha', 'stray-kids'],
    ['jim', 'bts'],
    ['sugaa', 'bts'],
    ['lisaa', 'blackpink'],
    ['lis', 'blackpink'],
    ['yuma', 'itzy'],
    ['joi', 'red-velvet'],
    ['kei', 'shinee'],
    ['x', 'bts'],
    // two letters off
    ['hynjn', 'stray-kids'],
    ['flx', 'stray-kids'],
    ['fel', 'stray-kids'],
    // nothing typed, or not a name
    ['', 'stray-kids'],
    ['   ', 'stray-kids'],
    ['...', 'stray-kids'],
    ['blackpink', 'stray-kids'],
    // a member of another group
    ['jungkook', 'stray-kids'],
    // Hangul of 4 syllables or fewer is exact only
    ['필릭', 'stray-kids'],
    ['휴닝카', 'txt'],
  ] as const)('%s in %s is not accepted', (input, slug) => {
    expect(who(input, slug)).toBeNull();
  });

  it(`the typo rule starts at ${TYPO_MIN_LENGTH} letters`, () => {
    const roster: NameAllMember[] = [{ name: 'Abcd', spellings: [] }, { name: 'Vwxyz', spellings: [] }];
    expect(matchName('abcx', roster)).toBeNull();
    expect(matchName('vwxyy', roster)?.member.name).toBe('Vwxyz');
  });

  it('an exact spelling of one member is never read as a typo of another', () => {
    const roster: NameAllMember[] = [{ name: 'Yujin', spellings: [] }, { name: 'Yunjin', spellings: [] }];
    expect(matchName('yujin', roster)).toMatchObject({ kind: 'exact', member: { name: 'Yujin' } });
    expect(matchName('yunjin', roster)).toMatchObject({ kind: 'exact', member: { name: 'Yunjin' } });
  });

  it('a typo that could be two members is refused', () => {
    const roster: NameAllMember[] = [{ name: 'Minjae', spellings: [] }, { name: 'Minjoe', spellings: [] }];
    expect(matchName('minjxe', roster)).toBeNull();
    expect(matchName('minja', roster)?.member.name).toBe('Minjae');
  });
});

describe('the spellings table', () => {
  it('has one table per listed group and nothing else', () => {
    expect(Object.keys(NAME_ALL_SPELLINGS).sort()).toEqual([...NAME_ALL_GROUPS].sort());
    expect(new Set(NAME_ALL_GROUPS).size).toBe(NAME_ALL_GROUPS.length);
    expect(isNameAllGroup('stray-kids')).toBe(true);
    expect(isNameAllGroup('nct')).toBe(false);
    expect(isNameAllGroup('constructor')).toBe(false);
  });

  it.each([...NAME_ALL_GROUPS])('%s: every spelling leads to its own member, exactly', (slug) => {
    const roster = rosterOf(slug);
    expect(roster.length).toBeGreaterThanOrEqual(2);
    const owner = new Map<string, string>();
    for (const m of roster) {
      const spellings = acceptedSpellings(m);
      expect(spellings.length, `${m.name} has spellings`).toBeGreaterThan(1);
      expect(spellings.some((s) => /[가-힣]/.test(s)), `${m.name} has a Hangul spelling`).toBe(true);
      for (const s of spellings) {
        expect(owner.get(s), `"${s}" is accepted for two members of ${slug}`).toBeUndefined();
        owner.set(s, m.name);
      }
    }
    for (const [s, name] of owner) expect(matchName(s, roster)).toMatchObject({ kind: 'exact', member: { name } });
  });

  it.each([...NAME_ALL_GROUPS])('%s: no spelling of 5+ letters is one letter away from another member', (slug) => {
    const rows = rosterOf(slug).map((m) => ({ name: m.name, spellings: acceptedSpellings(m) }));
    const clashes: string[] = [];
    for (const a of rows) for (const b of rows) {
      if (a.name >= b.name) continue;
      for (const x of a.spellings) for (const y of b.spellings) {
        if ((letterCount(x) >= TYPO_MIN_LENGTH || letterCount(y) >= TYPO_MIN_LENGTH) && withinOneLetter(x, y)) clashes.push(`${a.name}:${x} / ${b.name}:${y}`);
      }
    }
    expect(clashes).toEqual([]);
  });

  it('no em dash, en dash or emoji in the table', () => {
    const all = JSON.stringify(NAME_ALL_SPELLINGS);
    expect(/[–—]|\p{Extended_Pictographic}/u.test(all)).toBe(false);
  });
});

describe('buildRoster', () => {
  it('keeps the database order and adds the table spellings', () => {
    const roster = buildRoster('stray-kids', [
      { name: 'Bang Chan', name_romanized: null, name_hangul: 'Christopher Chahn Bahng' },
      { name: 'Lee Know', name_romanized: 'Lee Min-ho', name_hangul: null },
    ]);
    expect(roster.map((m) => m.name)).toEqual(['Bang Chan', 'Lee Know']);
    expect(roster[0]?.spellings).toContain('방찬');
    // name_hangul that is not Hangul is ignored
    expect(roster[0]?.spellings).not.toContain('Christopher Chahn Bahng');
    expect(matchName('lee minho', roster)?.member.name).toBe('Lee Know');
    expect(matchName('Lee Min-ho', roster)?.member.name).toBe('Lee Know');
  });

  it('accepts the Hangul stored in the database, never kana, Chinese or Thai', () => {
    const roster = buildRoster('twice', [
      { name: 'Nayeon', name_romanized: null, name_hangul: '임나연' },
      { name: 'Momo', name_romanized: null, name_hangul: 'モモ' },
      { name: 'Tzuyu', name_romanized: null, name_hangul: '周子瑜' },
    ]);
    expect(matchName('임나연', roster)?.member.name).toBe('Nayeon');
    expect(matchName('モモ', roster)).toBeNull();
    expect(matchName('周子瑜', roster)).toBeNull();
  });

  it('a member the table does not know is playable with the display name', () => {
    const roster = buildRoster('stray-kids', [{ name: 'Someone New', name_romanized: null, name_hangul: null }]);
    expect(roster).toEqual([{ name: 'Someone New', spellings: [] }]);
    expect(matchName('someone new', roster)?.member.name).toBe('Someone New');
  });

  it('a group outside the list gets no table spelling, duplicates and blanks are dropped', () => {
    const roster = buildRoster('nct', [
      { name: 'Mark', name_romanized: null, name_hangul: null },
      { name: 'Mark', name_romanized: null, name_hangul: null },
      { name: '  ', name_romanized: null, name_hangul: null },
    ]);
    expect(roster).toEqual([{ name: 'Mark', spellings: [] }]);
  });
});

describe('result copy', () => {
  it('formats the time', () => {
    expect(formatSeconds(0)).toBe('0:00');
    expect(formatSeconds(7)).toBe('0:07');
    expect(formatSeconds(42)).toBe('0:42');
    expect(formatSeconds(60)).toBe('1:00');
    expect(formatSeconds(-3)).toBe('0:00');
  });

  it('the headline follows the prototype', () => {
    expect(resultHeadline(8, 8)).toBe('All 8. Nice.');
    expect(resultHeadline(7, 8)).toBe('7 of 8. So close.');
    expect(resultHeadline(4, 8)).toBe('4 of 8. Not bad.');
    expect(resultHeadline(2, 8)).toBe('2 of 8. Warm-up round.');
    expect(resultHeadline(0, 8)).toBe('0 of 8. Warm-up round.');
  });

  it('the pretty path', () => {
    expect(prettyPath('stray-kids')).toBe('/stray-kids-name-all-members');
  });
});

describe('checkRound', () => {
  const roster = rosterOf('blackpink');
  it('accepts names of the roster in the order found', () => {
    expect(checkRound({ group: 'blackpink', found: ['Lisa', 'Jisoo'], seconds: 12.4, gaveUp: true }, roster)).toEqual({ ok: true, found: ['Lisa', 'Jisoo'], seconds: 12 });
    expect(checkRound({ found: [], seconds: 60 }, roster)).toEqual({ ok: true, found: [], seconds: 60 });
  });
  it.each([
    [null, 'bad_request'],
    ['x', 'bad_request'],
    [{ found: 'Lisa', seconds: 3 }, 'bad_request'],
    [{ found: ['Lisa'], seconds: '3' }, 'bad_request'],
    [{ found: ['Lisa'], seconds: -1 }, 'bad_request'],
    [{ found: ['Lisa'], seconds: ROUND_SECONDS + 1 }, 'bad_request'],
    [{ found: ['Lisa'], seconds: Number.NaN }, 'bad_request'],
    [{ found: ['Lisa', 'Lisa'], seconds: 5 }, 'bad_request'],
    [{ found: [1], seconds: 5 }, 'bad_request'],
    [{ found: ['Lisa', 'Jisoo', 'Rose', 'Jennie', 'Lisa'], seconds: 5 }, 'bad_request'],
    [{ found: ['Felix'], seconds: 5 }, 'unknown_member'],
    [{ found: ['lisa'], seconds: 5 }, 'unknown_member'],
  ])('%j -> %s', (body, reason) => {
    expect(checkRound(body, roster)).toEqual({ ok: false, reason });
  });
  it('refuses an empty roster', () => {
    expect(checkRound({ found: [], seconds: 3 }, [])).toEqual({ ok: false, reason: 'empty_roster' });
  });
});

describe('roundRows', () => {
  const roster = rosterOf('blackpink');
  const rows = roundRows({ groupId: 2, roundId: 'r-1', roster, found: ['Lisa', 'Jisoo'], seconds: 31 });
  it('one row per member of the roster, with the order found', () => {
    expect(rows).toEqual([
      { group_id: 2, member_name: 'Jisoo', found: true, round_id: 'r-1', found_order: 2, round_seconds: 31 },
      { group_id: 2, member_name: 'Jennie', found: false, round_id: 'r-1', found_order: null, round_seconds: 31 },
      { group_id: 2, member_name: 'Rose', found: false, round_id: 'r-1', found_order: null, round_seconds: 31 },
      { group_id: 2, member_name: 'Lisa', found: true, round_id: 'r-1', found_order: 1, round_seconds: 31 },
    ]);
  });
  it('the legacy shape is exactly the four columns of migration 126', () => {
    expect(legacyRows(rows).map((r) => Object.keys(r).sort())).toEqual(rows.map(() => ['found', 'group_id', 'member_name', 'round_id']));
  });
});

describe('publicStats: positive aggregates only', () => {
  const roster = rosterOf('blackpink');
  it('nothing under the minimum number of rounds', () => {
    expect(publicStats(null, roster)).toBeNull();
    expect(publicStats({ rounds: STATS_MIN_ROUNDS - 1, perfect_rounds: 20, firsts: [{ member_name: 'Lisa', n: 20 }] }, roster)).toBeNull();
  });
  it('the share of perfect rounds and the member named first most often', () => {
    expect(publicStats({ rounds: 40, perfect_rounds: 25, firsts: [{ member_name: 'Jennie', n: 9 }, { member_name: 'Lisa', n: 21 }, { member_name: 'Jisoo', n: 6 }] }, roster))
      .toEqual({ rounds: 40, perfectPct: 63, namedFirst: 'Lisa' });
  });
  it('a tie names nobody, zero perfect rounds prints no share', () => {
    expect(publicStats({ rounds: 40, perfect_rounds: 0, firsts: [{ member_name: 'Jennie', n: 9 }, { member_name: 'Lisa', n: 9 }] }, roster))
      .toEqual({ rounds: 40, perfectPct: null, namedFirst: null });
  });
  it('a name that is not in the roster any more is ignored', () => {
    expect(publicStats({ rounds: 40, perfect_rounds: 4, firsts: [{ member_name: 'Gone', n: 30 }, { member_name: 'Rose', n: 5 }] }, roster)?.namedFirst).toBe('Rose');
  });
  it('the published shape has no per-member miss figure', () => {
    const out = publicStats({ rounds: 40, perfect_rounds: 25, firsts: [{ member_name: 'Lisa', n: 21 }] }, roster);
    expect(Object.keys(out ?? {}).sort()).toEqual(['namedFirst', 'perfectPct', 'rounds']);
  });
  it('parseRawStats refuses anything that is not the aggregate', () => {
    expect(parseRawStats(null)).toBeNull();
    expect(parseRawStats({ rounds: 'x' })).toBeNull();
    expect(parseRawStats({ rounds: 3, perfect_rounds: 4 })).toBeNull();
    expect(parseRawStats({ rounds: 3, perfect_rounds: 1, firsts: [{ member_name: 'Lisa', n: 2 }, { member_name: 5, n: 1 }, { member_name: 'Rose', n: 0 }] }))
      .toEqual({ rounds: 3, perfect_rounds: 1, firsts: [{ member_name: 'Lisa', n: 2 }] });
    expect(parseRawStats({ rounds: 0, perfect_rounds: 0, firsts: null })).toEqual({ rounds: 0, perfect_rounds: 0, firsts: [] });
  });
});

describe('submitRound', () => {
  const ANON = '11111111-2222-4333-8444-555555555555';
  const set: NameAllSet = { group: { id: 2, slug: 'blackpink', name: 'BLACKPINK', fandom: 'BLINK' }, members: rosterOf('blackpink') };
  function deps(over: Partial<SubmitDeps> = {}): SubmitDeps & { saved: Array<{ found: readonly string[]; seconds: number; roundId: string }> } {
    const saved: Array<{ found: readonly string[]; seconds: number; roundId: string }> = [];
    return {
      saved,
      getSet: async (slug) => (slug === 'blackpink' ? set : null),
      save: async (o) => { saved.push({ found: o.found, seconds: o.seconds, roundId: o.roundId }); return 'saved'; },
      hit: () => true,
      newId: () => 'round-1',
      ...over,
    };
  }
  const body = { group: 'blackpink', found: ['Lisa', 'Rose'], seconds: 20, gaveUp: false };

  it('stores a valid round once, with a server-made round id', async () => {
    const d = deps();
    expect(await submitRound(body, ANON, d)).toEqual({ http: 200, body: { ok: true } });
    expect(d.saved).toEqual([{ found: ['Lisa', 'Rose'], seconds: 20, roundId: 'round-1' }]);
  });
  it('the legacy write counts as stored', async () => {
    expect((await submitRound(body, ANON, deps({ save: async () => 'saved_legacy' }))).http).toBe(200);
  });
  it.each([
    [null, 'no_browser_id', 400],
    ['not-a-uuid', 'no_browser_id', 400],
  ])('browser id %s -> %s', async (anon, error, http) => {
    const d = deps();
    expect(await submitRound(body, anon, d)).toEqual({ http, body: { ok: false, error } });
    expect(d.saved).toEqual([]);
  });
  it('over the burst limit: 429, nothing stored, the group is not even read', async () => {
    let read = 0;
    const d = deps({ hit: () => false, getSet: async () => { read += 1; return set; } });
    expect(await submitRound(body, ANON, d)).toEqual({ http: 429, body: { ok: false, error: 'rate_limited' } });
    expect(read).toBe(0);
    expect(d.saved).toEqual([]);
  });
  it.each([
    [{ ...body, group: 'nope' }, 'unknown_group', 404],
    [{ ...body, group: '../x' }, 'bad_request', 400],
    [{ ...body, group: 7 }, 'bad_request', 400],
    [{ ...body, found: ['Felix'] }, 'unknown_member', 400],
    [{ ...body, seconds: 61 }, 'bad_request', 400],
    [{ ...body, seconds: 0 }, 'bad_request', 400],
    [{ ...body, found: ['Lisa', 'Lisa'] }, 'bad_request', 400],
  ])('%j -> %s', async (b, error, http) => {
    const d = deps();
    expect(await submitRound(b, ANON, d)).toEqual({ http, body: { ok: false, error } });
    expect(d.saved).toEqual([]);
  });
  it('an empty round of zero seconds is a give up at once: stored', async () => {
    const d = deps();
    expect((await submitRound({ ...body, found: [], seconds: 0 }, ANON, d)).http).toBe(200);
    expect(d.saved).toHaveLength(1);
  });
  it('fails soft: a database error is a 503, never a throw', async () => {
    expect(await submitRound(body, ANON, deps({ save: async () => 'failed' }))).toEqual({ http: 503, body: { ok: false, error: 'failed' } });
    expect(await submitRound(body, ANON, deps({ getSet: async () => { throw new Error('down'); } }))).toEqual({ http: 503, body: { ok: false, error: 'failed' } });
  });
});

import { describe, expect, it, vi } from 'vitest';

import { getLevelInfo } from '@/lib/constants';

// data.ts pulls server modules (unstable_cache, the Supabase clients) at import
// time; its pure helpers are what is tested here, so those modules are stubbed.
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T): T => fn }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => { throw new Error('no db in unit tests'); } }));

const { creatorViews, mainFandomName, qotdNote, warMapFromRpc } = await import('./data');
const {
  MIN_BOARD, WAR_BOARD, WAR_VISIBLE, addedLine, avatarOf, deltaView, fandomLabel, followersLabel, levelLine, playsLabel,
  podiumOrder, quizzesLabel, rankText, realFandomName,
} = await import('./format');
const { rankFrom, weekStart } = await import('./standing');

import type { GroupFacts, PersonRow } from './data';

describe('fandom names (groups.fandom_name, 17.3 real data)', () => {
  it('treats the column default "fan" as unknown', () => {
    expect(realFandomName('fan')).toBeNull();
    expect(realFandomName('Fans')).toBeNull();
    expect(realFandomName('  ')).toBeNull();
    expect(realFandomName(null)).toBeNull();
    expect(realFandomName('STAY')).toBe('STAY');
  });

  it('fandom big, group small (ARMY / BTS); unknown fandom: group big, generation small', () => {
    expect(fandomLabel({ name: 'BTS', fandom_name: 'ARMY', generation: '3rd Gen' })).toEqual({ name: 'ARMY', sub: 'BTS' });
    expect(fandomLabel({ name: 'Cortis', fandom_name: 'fan', generation: null })).toEqual({ name: 'Cortis', sub: '' });
    expect(fandomLabel({ name: 'TWS', fandom_name: 'fan', generation: '5th Gen' })).toEqual({ name: 'TWS', sub: '5th Gen' });
    // a fandom named like its group is not repeated (hypothetical row)
    expect(fandomLabel({ name: 'ABC', fandom_name: 'abc', generation: '4th Gen' })).toEqual({ name: 'ABC', sub: '4th Gen' });
  });

  it('main fandom = ult_groups[0] with a real fandom name', () => {
    const facts = new Map<string, GroupFacts>([
      ['stray-kids', { slug: 'stray-kids', name: 'Stray Kids', fandom_name: 'STAY', generation: '4th Gen' }],
      ['cortis', { slug: 'cortis', name: 'Cortis', fandom_name: 'fan', generation: null }],
    ]);
    expect(mainFandomName(['stray-kids', 'bts'], facts)).toBe('STAY');
    expect(mainFandomName(['bts', 'stray-kids'], facts)).toBeNull(); // unknown slug: no invented name
    expect(mainFandomName(['cortis'], facts)).toBeNull();
    expect(mainFandomName([], facts)).toBeNull();
    expect(mainFandomName(null, facts)).toBeNull();
  });
});

describe('war map read (the live mapping, errors thrown instead of an empty board)', () => {
  const facts = new Map<string, GroupFacts>([['stray-kids', { slug: 'stray-kids', name: 'Stray Kids', fandom_name: 'STAY', generation: '4th Gen' }]]);
  const row = (slug: string, week: number, prev: number): Parameters<typeof warMapFromRpc>[0][number] => ({
    name: slug, slug, logo_url: null, display_color: '#000', plays_week: String(week), fans_week: '2', plays_prev: String(prev),
  });

  it('drops the general K-pop bucket, keeps the order, computes the live percent', () => {
    const out = warMapFromRpc([row('girls-generation', 370, 1), row('general-kpop', 300, 10), row('stray-kids', 294, 154), row('cortis', 177, 0)], 30, facts);
    expect(out.map((g) => g.slug)).toEqual(['girls-generation', 'stray-kids', 'cortis']);
    expect(out.map((g) => g.delta)).toEqual([36900, 91, null]);
    expect(out[1]).toMatchObject({ plays: 294, fans: 2, generation: '4th Gen' });
  });

  it('keeps `limit` real groups after the bucket is dropped', () => {
    const rows = [row('general-kpop', 999, 1), ...Array.from({ length: 5 }, (_, i) => row(`g${i}`, 100 - i, 50))];
    expect(warMapFromRpc(rows, 3, facts).map((g) => g.slug)).toEqual(['g0', 'g1', 'g2']);
  });
});

describe('weekly change (the live war map percent vs the 7 days before)', () => {
  it('signs, words and tones; never colour alone', () => {
    expect(deltaView(12)).toEqual({ text: '+12%', tone: 'up', label: 'up 12 percent since last week' });
    expect(deltaView(-29)).toEqual({ text: '-29%', tone: 'down', label: 'down 29 percent since last week' });
    expect(deltaView(0)).toEqual({ text: '0%', tone: 'flat', label: 'no change since last week' });
    expect(deltaView(null)).toEqual({ text: 'new', tone: 'new', label: 'new on the board this week' });
    expect(deltaView(36900).text).toBe('+36,900%');
  });
});

describe('boards', () => {
  it('podium order is #2, #1, #3 (prototype); fewer than 3 = no podium', () => {
    expect(podiumOrder(['a', 'b', 'c', 'd']).map((p) => `${p.rank}:${p.item}`)).toEqual(['2:b', '1:a', '3:c']);
    expect(podiumOrder(['a', 'b'])).toEqual([]);
  });

  it('keeps the live sizes and floors', () => {
    expect(MIN_BOARD).toBe(4); // FandomWarMap / HallOfFame MIN_BOARD
    expect(WAR_BOARD).toBe(30); // getFandomWarMap(30) on the live page
    expect(WAR_VISIBLE).toBe(10); // prototype: podium + rows 4 to 10
  });

  it('creator views offered only above the floor, in a fixed order', () => {
    const rows = (n: number): PersonRow[] => Array.from({ length: n }, (_, i) => ({
      rank: i + 1, username: `u${i}`, href: `/u/u${i}`, avatar: { src: null, bg: null, fg: null }, accent: null, font: null, bias: null, value: 10 - i, sub: '',
    }));
    expect(creatorViews({ all: rows(10), week: rows(3), rising: [] })).toEqual(['all']);
    expect(creatorViews({ all: rows(10), week: rows(4), rising: rows(5) })).toEqual(['all', 'week', 'rising']);
    expect(creatorViews({ all: [], week: [], rising: [] })).toEqual([]);
  });
});

describe('labels', () => {
  it('level line: fandom when known, else the level title', () => {
    const lv = getLevelInfo(14360);
    expect(levelLine(14360, null)).toBe(`Lv ${lv.level} · ${lv.name}`);
    expect(levelLine(640, 'STAY')).toBe(`Lv ${getLevelInfo(640).level} · STAY`);
    expect(levelLine(0, null)).toBe('Lv 1 · New Fan');
  });

  it('plurals and numbers', () => {
    expect(quizzesLabel(1)).toBe('1 quiz');
    expect(quizzesLabel(46)).toBe('46 quizzes');
    expect(playsLabel(1)).toBe('1 play');
    expect(playsLabel(9401)).toBe('9,401 plays');
    expect(followersLabel(1)).toBe('1 new follower');
    expect(followersLabel(12)).toBe('12 new followers');
    expect(addedLine(1240)).toBe('you added 1,240 points this week');
    expect(addedLine(1)).toBe('you added 1 point this week');
    expect(addedLine(0)).toBe('no points from you this week yet');
    expect(rankText(2)).toBe('#2');
    expect(rankText(1204)).toBe('#1,204');
    expect(rankText(null)).toBe('-');
  });

  it('quiz of the day note: a replay is called a replay (P1 2.5)', () => {
    expect(qotdNote('2026-09-26', '2026-09-26')).toBe('Quiz of the day');
    expect(qotdNote(null, '2026-09-26')).toBe('Quiz of the day');
    expect(qotdNote('2026-09-25', '2026-09-26')).toBe("Quiz of the day · replay of yesterday's pick");
    expect(qotdNote('2026-04-21', '2026-09-26')).toBe('Quiz of the day · replay of the April 21 pick');
  });
});

describe('avatars (the live PersonCard rules, neutral initials otherwise)', () => {
  it('photo, custom art, preset colour', () => {
    expect(avatarOf({ avatar_url: 'https://x/a.png', avatar_kind: 'photo', avatar_ref: null })).toEqual({ src: 'https://x/a.png', bg: null, fg: null });
    expect(avatarOf({ avatar_url: 'https://x/a.png', avatar_kind: 'custom', avatar_ref: 'https://x/c.png' }).src).toBe('https://x/c.png');
    expect(avatarOf({ avatar_url: null, avatar_kind: 'preset', avatar_ref: 'mint' })).toEqual({ src: null, bg: '#1D9E75', fg: '#FFFFFF' });
    expect(avatarOf({ avatar_url: null, avatar_kind: 'preset', avatar_ref: 'nope' })).toEqual({ src: null, bg: null, fg: null });
    expect(avatarOf({})).toEqual({ src: null, bg: null, fg: null });
  });
});

describe('standing helpers (read-only endpoint)', () => {
  it('rank = 1 + rows strictly above; ties share a rank', () => {
    expect(rankFrom(0)).toBe(1);
    expect(rankFrom(193)).toBe(194);
    expect(rankFrom(null)).toBeNull();
  });

  it('the war window is the last 7 days (get_fandom_war_map: now() - 7 days)', () => {
    expect(weekStart(new Date('2026-09-26T12:00:00Z'))).toBe('2026-09-19T12:00:00.000Z');
  });
});

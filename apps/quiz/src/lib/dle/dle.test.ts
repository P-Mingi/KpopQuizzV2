// Daily games (step 1): the pure modules of lib/dle (addresses, calendar, names, suggestions, share line).
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { REGISTRY } from '@/lib/site/registry';
import { isKnownRouteFor } from '@/lib/site/routing';

import {
  DAILY_PATH, DLE_GAMES, RESERVED_SERIES_SLUGS, addDays, bankDay, dlePath, formatCountdown, futurePaths, gameNumber, isPlayable,
  localePath, matchRank, normalizeName, secondsUntilReset, seriesPath, shareLine, shareText, spellHangul, suggest, utcDate,
} from './index';
import type { DleCell, DleGuess, DlePoolEntity, DleStatus } from './types';

const CASES = (JSON.parse(readFileSync(new URL('./fixtures/compare.json', import.meta.url), 'utf8')) as {
  cases: { name: string; expect: { status: DleStatus; arrow: 'up' | 'down' | null } }[];
}).cases;

describe('addresses of the Terrier (hub, English, French under /fr with the same words)', () => {
  it('the owner list: /daily, /kpopdle, /kpopdle/group, /kpopdle/song, /otakudle, /otakudle/{series}', () => {
    expect(DAILY_PATH).toBe('/daily');
    expect(DLE_GAMES.map((g) => g.path)).toEqual(['/kpopdle', '/kpopdle/group', '/kpopdle/song', '/otakudle']);
    expect(seriesPath('one-piece')).toBe('/otakudle/one-piece');
    expect(dlePath('kpopdle-song', 'fr')).toBe('/fr/kpopdle/song');
    expect(seriesPath('naruto', 'fr')).toBe('/fr/otakudle/naruto');
    expect(localePath(DAILY_PATH, 'fr')).toBe('/fr/daily');
    expect(localePath('/', 'fr')).toBe('/fr');
  });

  it('every path is lower-case English words; a reserved word or a bad slug is never a series page', () => {
    for (const p of futurePaths()) expect(p).toMatch(/^(\/fr)?\/[a-z]+(\/([a-z-]+|\{series\}))?$/);
    for (const w of RESERVED_SERIES_SLUGS) expect(seriesPath(w)).toBeNull();
    expect(seriesPath('One Piece')).toBeNull();
    expect(seriesPath('../x')).toBeNull();
  });

  it('XP and streak go to kpop or anime, never the hub', () => {
    for (const g of DLE_GAMES) expect(['kpop', 'anime']).toContain(g.universe);
  });

  it('no page exists yet: the hub does not route them, and the flag is off on every site', () => {
    for (const p of futurePaths().map((x) => x.replace('{series}', 'one-piece'))) {
      expect(isKnownRouteFor('hub', p, { v1: true, v12: true }), p).toBe(false);
    }
    for (const s of Object.values(REGISTRY)) expect(s.features.dailyGuess, s.id).toBe(false);
  });
});

describe('calendar', () => {
  const EPOCH = '2026-11-01';

  it('game number and bank day: day 366 plays bank day 1 as game 366', () => {
    expect(gameNumber(EPOCH, EPOCH)).toBe(1);
    expect(bankDay(EPOCH, EPOCH)).toBe(1);
    expect(bankDay(EPOCH, '2027-10-31')).toBe(365);
    expect(gameNumber(EPOCH, '2027-11-01')).toBe(366);
    expect(bankDay(EPOCH, '2027-11-01')).toBe(1);
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('the reset is 00:00 UTC; yesterday is playable until 03:00 UTC', () => {
    expect(utcDate(new Date('2026-11-05T23:59:59Z'))).toBe('2026-11-05');
    expect(utcDate(new Date('2026-11-06T00:00:00Z'))).toBe('2026-11-06');
    expect(isPlayable(EPOCH, new Date('2026-11-06T02:59:59Z'), '2026-11-05')).toBe(true);
    expect(isPlayable(EPOCH, new Date('2026-11-06T03:00:00Z'), '2026-11-05')).toBe(false);
    expect(isPlayable(EPOCH, new Date('2026-11-06T12:00:00Z'), '2026-11-07')).toBe(false);
    expect(isPlayable(EPOCH, new Date('2026-11-01T01:00:00Z'), '2026-10-31')).toBe(false);
  });

  it('countdown', () => {
    expect(secondsUntilReset(new Date('2026-11-05T23:59:59Z'))).toBe(1);
    expect(secondsUntilReset(new Date('2026-11-05T00:00:00Z'))).toBe(86_400);
    expect(formatCountdown(3 * 3600 + 5 * 60 + 9)).toBe('3:05:09');
    expect(formatCountdown(-4)).toBe('0:00:00');
  });
});

describe('names and suggestions', () => {
  const e = (id: string, name: string, search: string[] = []): DlePoolEntity => ({ id, name, search, attrs: {}, thumb: null });
  const POOL = [
    e('1', 'J-Hope', ['Jung Hoseok', '제이홉']), e('2', 'Jisoo', ['Kim Jisoo', '지수']), e('3', 'Rosé', ['Park Chaeyoung', '로제']),
    e('4', 'Jin', ['Kim Seokjin', '진']), e('5', 'Jihyo', ['Park Jihyo', '지효']), e('6', 'Jennie', ['Kim Jennie', '제니']),
    e('7', 'Jimin', ['Park Jimin', '지민']), e('8', 'Jungkook', ['Jeon Jungkook', '정국']), e('9', 'Joy', ['Park Sooyoung', '조이']),
    e('10', 'Jeongyeon', ['Yoo Jeongyeon', '정연']),
  ];

  it('no accent, case or punctuation', () => {
    expect(normalizeName('J-Hope')).toBe(normalizeName('jhope'));
    expect(normalizeName('Rosé')).toBe('rose');
    expect(normalizeName('  NCT 127 ')).toBe('nct127');
  });

  it('hangul is compared letter by letter: a syllable being typed already matches', () => {
    expect(spellHangul('지수')).toBe('ㅈㅣㅅㅜ');
    expect(matchRank(['지수'], 'ㅈ')).toBe(1);
    expect(matchRank(['지수'], '지')).toBe(1);
    expect(matchRank(['지수'], '짓')).toBe(1);
    expect(matchRank(['지수'], '지수')).toBe(0);
    expect(matchRank(['지수'], '수')).toBe(3);
  });

  it('order: exact, prefix, start of a word, anywhere; at most 8; guessed ones left out', () => {
    expect(suggest(POOL, 'jin').map((x) => x.id)[0]).toBe('4');
    expect(suggest(POOL, 'rose').map((x) => x.id)).toEqual(['3']);
    expect(suggest(POOL, 'chaeyoung').map((x) => x.id)).toEqual(['3']);
    expect(suggest(POOL, 'j')).toHaveLength(8);
    expect(suggest(POOL, 'jin', new Set(['4'])).map((x) => x.id)).not.toContain('4');
    expect(suggest(POOL, '')).toEqual([]);
    expect(suggest(POOL, '지').map((x) => x.id).sort()).toEqual(['2', '4', '5', '7']);
  });
});

describe('share line: the right columns of each guess, never a colour grid', () => {
  // A board of 8 columns built from the statuses of the shared comparator cases.
  const cells = (statuses: DleStatus[]): DleCell[] => statuses.map((status, i) => ({ key: `c${i}`, status, arrow: null }));
  const byName = (name: string): DleStatus => CASES.find((c) => c.name === name)!.expect.status;
  const guesses: DleGuess[] = [
    { id: 'a', result: cells(['single different', 'multi one in common', 'single equal', 'number near, target later', 'number far below', 'ordinal lower', 'multi same unit', 'guess value missing'].map(byName)) },
    { id: 'b', result: cells(Array(8).fill('correct') as DleStatus[]) },
  ];

  it('counts only "correct" cells', () => {
    expect(shareLine(guesses)).toBe('2/8 · 8/8');
  });

  it('the text: brand, number, game, outcome, counts, address; never the answer', () => {
    const t = shareText(DLE_GAMES[0]!, 12, guesses, true, 'https://bunnyverse.org/kpopdle', 'en');
    expect(t).toBe('Kpopdle #12 · Idol of the day · found in 2 guesses\n2/8 · 8/8\nhttps://bunnyverse.org/kpopdle');
    expect(shareText(DLE_GAMES[0]!, 12, guesses.slice(0, 1), false, 'https://bunnyverse.org/fr/kpopdle', 'fr')).toContain('Idol du jour · abandon');
    expect(t).not.toMatch(/[🟩🟨⬛]/u);
  });
});

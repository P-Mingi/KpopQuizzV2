import { describe, expect, it } from 'vitest';

import { LIVE_CODE_ALPHABET, LIVE_CODE_LENGTH, isRoomCode, newRoomCode, normalizeRoomCode, parseRoomCode } from './code';
import { LIVE_MAX_PLAYERS, LIVE_NICK_MAX, LIVE_ROOM_TTL_MS, liveTopic } from './constants';
import { checkNickname, cleanNickname, hasBannedTerm, nicknameInitial, uniqueNickname } from './nickname';
import { choiceCounts, rankPlayers, roundPoints, scoreRound, streakBonus } from './scoring';

import type { ScorePlayer } from './scoring';

describe('points (SYSTEM.md 5.5: 500 + 500 x (1 - t/T), rounded to 10)', () => {
  const T = 15_000;

  it.each([
    [0, 1000],
    [1, 1000],
    [150, 1000],      // 495 rounds to 500
    [1500, 950],
    [3000, 900],
    [7500, 750],
    [7499, 750],
    [10_000, 670],    // 166.7 rounds to 170
    [12_345, 590],    // 88.5 rounds to 90
    [14_999, 500],
    [15_000, 500],
  ])('an answer after %i ms of 15 s is worth %i', (ms, points) => {
    expect(roundPoints(ms, T)).toBe(points);
  });

  it('is always a multiple of 10 between 500 and 1000, and never rises with time', () => {
    for (const duration of [10_000, 15_000, 20_000]) {
      let last = 1000;
      for (let ms = 0; ms <= duration; ms += 37) {
        const p = roundPoints(ms, duration);
        expect(p % 10).toBe(0);
        expect(p).toBeGreaterThanOrEqual(500);
        expect(p).toBeLessThanOrEqual(1000);
        expect(p).toBeLessThanOrEqual(last);
        last = p;
      }
    }
  });

  it('clamps a time outside the round and survives a bad input', () => {
    expect(roundPoints(-500, T)).toBe(1000);
    expect(roundPoints(99_999, T)).toBe(500);
    expect(roundPoints(Number.NaN, T)).toBe(500);
    expect(roundPoints(1000, 0)).toBe(500);
  });

  it('the same answer time is worth the same share whatever the round length', () => {
    expect(roundPoints(5000, 10_000)).toBe(750);
    expect(roundPoints(10_000, 20_000)).toBe(750);
  });
});

describe('streak bonus (+100 from the 3rd right answer in a row, capped at +300)', () => {
  it.each([[0, 0], [1, 0], [2, 0], [3, 100], [4, 200], [5, 300], [6, 300], [20, 300]])('streak %i gives +%i', (streak, bonus) => {
    expect(streakBonus(streak)).toBe(bonus);
  });
});

describe('scoreRound', () => {
  const T = 15_000;
  const fresh = (id: string, over: Partial<ScorePlayer> = {}): ScorePlayer => ({ id, score: 0, streak: 0, correct: 0, answered: 0, totalMs: 0, ...over });

  it('right, wrong and no answer', () => {
    const out = scoreRound(
      [fresh('a'), fresh('b'), fresh('c')],
      [{ playerId: 'a', choice: 2, ms: 3000 }, { playerId: 'b', choice: 1, ms: 1000 }],
      2,
      T,
    );
    expect(out[0]).toMatchObject({ id: 'a', result: 'ok', gain: 900, bonus: 0, score: 900, streak: 1, correct: 1, answered: 1, totalMs: 3000 });
    expect(out[1]).toMatchObject({ id: 'b', result: 'no', gain: 0, score: 0, streak: 0, correct: 0, answered: 1, totalMs: 1000 });
    // No answer: nothing scored, and the whole round is charged for the tie break.
    expect(out[2]).toMatchObject({ id: 'c', result: 'none', gain: 0, score: 0, streak: 0, answered: 0, totalMs: T });
  });

  it('five right answers in a row: the bonus starts at the third and stops at +300', () => {
    let p = fresh('a');
    const gains: number[] = [];
    const bonuses: number[] = [];
    for (let round = 0; round < 6; round++) {
      const [next] = scoreRound([p], [{ playerId: 'a', choice: 0, ms: 15_000 }], 0, T);
      gains.push(next!.gain);
      bonuses.push(next!.bonus);
      p = next!;
    }
    expect(bonuses).toEqual([0, 0, 100, 200, 300, 300]);
    expect(gains).toEqual([500, 500, 600, 700, 800, 800]);
    expect(p.score).toBe(3900);
    expect(p.streak).toBe(6);
  });

  it('a wrong answer and a missed round both reset the streak', () => {
    const [wrong] = scoreRound([fresh('a', { streak: 4, score: 3000 })], [{ playerId: 'a', choice: 1, ms: 100 }], 0, T);
    expect(wrong).toMatchObject({ streak: 0, score: 3000, gain: 0, result: 'no' });
    const [none] = scoreRound([fresh('a', { streak: 4, score: 3000 })], [], 0, T);
    expect(none).toMatchObject({ streak: 0, score: 3000, gain: 0, result: 'none' });
    // The next right answer starts a new streak: no bonus.
    const [again] = scoreRound([{ ...wrong!, id: 'a' }], [{ playerId: 'a', choice: 0, ms: 0 }], 0, T);
    expect(again).toMatchObject({ streak: 1, gain: 1000, bonus: 0, score: 4000 });
  });

  it('only the first answer of a player counts, and an answer of nobody is ignored', () => {
    const out = scoreRound(
      [fresh('a')],
      [{ playerId: 'a', choice: 1, ms: 500 }, { playerId: 'a', choice: 0, ms: 600 }, { playerId: 'ghost', choice: 0, ms: 1 }],
      0,
      T,
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ result: 'no', gain: 0 });
  });

  it('does not change its input', () => {
    const players = [fresh('a')];
    scoreRound(players, [{ playerId: 'a', choice: 0, ms: 0 }], 0, T);
    expect(players[0]).toEqual(fresh('a'));
  });
});

describe('ranking and ties', () => {
  it('points first, then the lower total answer time, then who joined first', () => {
    const rows = [
      { id: 'slow', score: 1800, totalMs: 9000, joinedAt: 1 },
      { id: 'low', score: 900, totalMs: 100, joinedAt: 0 },
      { id: 'fast', score: 1800, totalMs: 4000, joinedAt: 5 },
      { id: 'late', score: 1800, totalMs: 4000, joinedAt: 9 },
    ];
    expect(rankPlayers(rows).map((r) => r.id)).toEqual(['fast', 'late', 'slow', 'low']);
  });

  it('reads ISO times, and the id settles a full tie the same way every time', () => {
    const rows = [
      { id: 'b', score: 0, totalMs: 0, joinedAt: '2026-10-02T10:00:00.000Z' },
      { id: 'a', score: 0, totalMs: 0, joinedAt: '2026-10-02T10:00:00.000Z' },
      { id: 'c', score: 0, totalMs: 0, joinedAt: '2026-10-02T09:59:59.000Z' },
    ];
    expect(rankPlayers(rows).map((r) => r.id)).toEqual(['c', 'a', 'b']);
    expect(rankPlayers([...rows].reverse()).map((r) => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('two players with the same points: the one who answered faster over the game is ahead', () => {
    // Both right twice; x took 2 s + 6 s, y took 4 s + 4 s: same total, so the join order decides.
    const T = 10_000;
    let x: ScorePlayer = { id: 'x', score: 0, streak: 0, correct: 0, answered: 0, totalMs: 0 };
    let y: ScorePlayer = { id: 'y', score: 0, streak: 0, correct: 0, answered: 0, totalMs: 0 };
    [x, y] = scoreRound([x, y], [{ playerId: 'x', choice: 0, ms: 2000 }, { playerId: 'y', choice: 0, ms: 4000 }], 0, T) as unknown as [ScorePlayer, ScorePlayer];
    [x, y] = scoreRound([x, y], [{ playerId: 'x', choice: 0, ms: 6000 }, { playerId: 'y', choice: 0, ms: 4000 }], 0, T) as unknown as [ScorePlayer, ScorePlayer];
    expect(x.score).toBe(900 + 700);
    expect(y.score).toBe(800 + 800);
    expect(x.totalMs).toBe(y.totalMs);
    expect(rankPlayers([{ ...y, joinedAt: 2 }, { ...x, joinedAt: 1 }]).map((r) => r.id)).toEqual(['x', 'y']);
    // One millisecond faster in total wins whatever the join order.
    expect(rankPlayers([{ ...y, totalMs: y.totalMs - 1, joinedAt: 2 }, { ...x, joinedAt: 1 }]).map((r) => r.id)).toEqual(['y', 'x']);
  });

  it('counts the picks of each answer', () => {
    expect(choiceCounts([{ choice: 0 }, { choice: 2 }, { choice: 2 }, { choice: 3 }, { choice: 7 }, { choice: -1 }])).toEqual([1, 0, 2, 1]);
  });
});

describe('room codes', () => {
  it('the alphabet has 32 symbols and none that reads like another', () => {
    expect(LIVE_CODE_ALPHABET).toHaveLength(32);
    expect(new Set(LIVE_CODE_ALPHABET).size).toBe(32);
    for (const c of ['I', 'O', '0', '1']) expect(LIVE_CODE_ALPHABET).not.toContain(c);
    expect(LIVE_CODE_ALPHABET).toMatch(/^[A-Z2-9]+$/);
  });

  it('a new code is six symbols of the alphabet', () => {
    for (let i = 0; i < 500; i++) {
      const code = newRoomCode();
      expect(code).toHaveLength(LIVE_CODE_LENGTH);
      expect(isRoomCode(code)).toBe(true);
    }
  });

  it('maps a byte to a symbol with its five low bits (no modulo bias)', () => {
    expect(newRoomCode(() => new Uint8Array([0, 1, 31, 32, 255, 64]))).toBe('AB9A9A');
    // Every symbol is reachable.
    const seen = new Set<string>();
    for (let b = 0; b < 32; b++) seen.add(newRoomCode(() => new Uint8Array(6).fill(b))[0] as string);
    expect(seen.size).toBe(32);
  });

  it('500 codes in a row are all different', () => {
    const codes = new Set(Array.from({ length: 500 }, () => newRoomCode()));
    expect(codes.size).toBe(500);
  });

  it('tidies what a person typed', () => {
    expect(normalizeRoomCode(' k7q2 px ')).toBe('K7Q2PX');
    expect(normalizeRoomCode('k7q-2px')).toBe('K7Q2PX');
    expect(parseRoomCode('k7q2px')).toBe('K7Q2PX');
    expect(parseRoomCode('K7Q2P')).toBeNull();        // five symbols
    expect(parseRoomCode('K7Q2PXX')).toBeNull();      // seven
    expect(parseRoomCode('K7Q2P0')).toBeNull();       // a zero
    expect(parseRoomCode('K7Q2PI')).toBeNull();       // an I
    expect(parseRoomCode('')).toBeNull();
    expect(parseRoomCode(null)).toBeNull();
    expect(parseRoomCode('../../x')).toBeNull();
  });

  it('constants of the mode', () => {
    expect(LIVE_MAX_PLAYERS).toBe(50);
    expect(LIVE_ROOM_TTL_MS).toBe(7_200_000);
    expect(liveTopic('abc')).toBe('live:abc');
  });
});

describe('nickname filter', () => {
  // A stand-in list: the real one is the site's moderation table. The words here are harmless on purpose.
  const TERMS = ['badword', 'bad phrase', 'ugh', 'sasaeng'];

  it('keeps an ordinary name as typed, tidied', () => {
    expect(checkNickname('  mingi  ')).toEqual({ ok: true, value: 'mingi' });
    expect(checkNickname('Stay   Forever', TERMS)).toEqual({ ok: true, value: 'Stay Forever' });
    expect(checkNickname('민기', TERMS)).toEqual({ ok: true, value: '민기' });
    expect(checkNickname('coer4ever', TERMS)).toEqual({ ok: true, value: 'coer4ever' });
  });

  it('drops markup and invisible characters', () => {
    expect(cleanNickname('<b>mingi</b>')).toBe('bmingi/b');
    expect(cleanNickname('min"gi\'s `x` \\ &amp;')).toBe('mingis x amp;');
    expect(cleanNickname('min\u200bgi\u202e')).toBe('mingi');
    expect(cleanNickname('a\nb\tc')).toBe('a b c');
    expect(cleanNickname(null)).toBe('');
  });

  it('refuses an empty name, a name of signs only and a name over 16 characters', () => {
    expect(checkNickname('')).toEqual({ ok: false, error: 'empty' });
    expect(checkNickname('   ')).toEqual({ ok: false, error: 'empty' });
    expect(checkNickname('!!!')).toEqual({ ok: false, error: 'empty' });
    expect(checkNickname('<>')).toEqual({ ok: false, error: 'empty' });
    expect(checkNickname('a'.repeat(LIVE_NICK_MAX))).toEqual({ ok: true, value: 'a'.repeat(16) });
    expect(checkNickname('a'.repeat(LIVE_NICK_MAX + 1))).toEqual({ ok: false, error: 'too_long' });
    // Counted in characters, not in UTF-16 units.
    expect(checkNickname('민'.repeat(16)).ok).toBe(true);
  });

  it('blocks a listed word, whole or hidden', () => {
    for (const name of ['badword', 'BadWord', 'xXbadwordXx', 'b.a.d.w.o.r.d', 'b a d w o r d', 'b4dw0rd', 'baaaadword', 'bad phrase', 'bad  phrase', 'sasaeng99', 'bádwörd']) {
      expect(checkNickname(name, TERMS), name).toEqual({ ok: false, error: 'blocked' });
    }
  });

  it('a short listed word only matches as a whole word', () => {
    expect(hasBannedTerm('ugh', TERMS)).toBe(true);
    expect(hasBannedTerm('so ugh', TERMS)).toBe(true);
    expect(hasBannedTerm('hugh', TERMS)).toBe(false);
    expect(hasBannedTerm('laughing', TERMS)).toBe(false);
  });

  it('an empty list and empty terms block nothing', () => {
    expect(hasBannedTerm('badword', [])).toBe(false);
    expect(hasBannedTerm('anything', ['', '   ', '!!!'])).toBe(false);
  });

  it('two players with the same name: the second gets a number', () => {
    expect(uniqueNickname('mingi', [])).toBe('mingi');
    expect(uniqueNickname('mingi', ['mingi'])).toBe('mingi 2');
    expect(uniqueNickname('Mingi', ['mingi'])).toBe('Mingi 2');
    expect(uniqueNickname('mingi', ['mingi', 'MINGI 2'])).toBe('mingi 3');
    expect(uniqueNickname('abcdefghijklmnop', ['abcdefghijklmnop'])).toBe('abcdefghijklmn 2');
    expect(uniqueNickname('abcdefghijklmnop', ['abcdefghijklmnop']).length).toBeLessThanOrEqual(LIVE_NICK_MAX);
  });

  it('the avatar letter', () => {
    expect(nicknameInitial('mingi')).toBe('M');
    expect(nicknameInitial(' 민기')).toBe('민');
    expect(nicknameInitial('')).toBe('?');
  });
});

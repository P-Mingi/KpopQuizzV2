import { describe, expect, it } from 'vitest';

import { bareUrl, hashtag, kitCaptions, kitKicker } from '@/components/share-kit/captions';

import { BOARD_RULES, CREATOR_TIERS, MIN_RISING_PLAYS, countPlays, monthStart, playerKey, quizCounts, rankCreators, risingByFandom } from './board';
import { monthLabelOf } from './data';
import { isShareCode, linkPlayerKey, readLinkPlays, recordLinkPlay } from './link-plays';

import type { PlayRow, QuizRow } from './board';
import type { SupabaseClient } from '@supabase/supabase-js';

const quiz = (id: string, creator: string | null, over: Partial<QuizRow> = {}): QuizRow => ({ id, creator_id: creator, group_id: 1, title: `Quiz ${id}`, slug: `quiz-${id}`, created_at: '2026-09-10T00:00:00Z', ...over });
let seq = 0;
const play = (quizId: string, who: { u?: string; a?: string }, at: string): PlayRow => ({ id: `p${seq += 1}`, quiz_id: quizId, player_id: who.u ?? null, anon_id: who.a ?? null, created_at: at });

const quizzes = new Map([quiz('q1', 'ann'), quiz('q2', 'ann'), quiz('q3', 'bob'), quiz('q4', 'team')].map((q) => [q.id, q]));
const NONE = new Set<string>();

describe('creators board: the three rules', () => {
  it('counts a player once per quiz per UTC day', () => {
    const plays = [
      play('q1', { u: 'x' }, '2026-10-01T10:00:00Z'),
      play('q1', { u: 'x' }, '2026-10-01T22:00:00Z'), // same player, quiz and day
      play('q1', { u: 'x' }, '2026-10-02T00:00:01Z'), // next day
      play('q2', { u: 'x' }, '2026-10-01T10:05:00Z'), // another quiz
      play('q1', { a: 'browser-1' }, '2026-10-01T11:00:00Z'),
      play('q1', { a: 'browser-1' }, '2026-10-01T12:00:00Z'),
    ];
    const c = countPlays(plays, quizzes, NONE);
    expect(c.byCreator.get('ann')).toBe(4);
    expect(c.byQuiz.get('q1')).toBe(3);
    expect(c.byQuiz.get('q2')).toBe(1);
  });

  it('never counts the creator playing their own quiz', () => {
    const c = countPlays([play('q1', { u: 'ann' }, '2026-10-01T10:00:00Z'), play('q3', { u: 'ann' }, '2026-10-01T10:00:00Z')], quizzes, NONE);
    expect(c.byCreator.get('ann')).toBeUndefined();
    expect(c.byCreator.get('bob')).toBe(1);
  });

  it('ignores a play of a quiz that is not in the published list', () => {
    const c = countPlays([play('flagged', { u: 'x' }, '2026-10-01T10:00:00Z')], quizzes, NONE);
    expect(c.byCreator.size).toBe(0);
  });

  it('leaves out editorial and banned creators', () => {
    const c = countPlays([play('q4', { u: 'x' }, '2026-10-01T10:00:00Z'), play('q3', { u: 'x' }, '2026-10-01T10:00:00Z')], quizzes, new Set(['team']));
    expect([...c.byCreator.keys()]).toEqual(['bob']);
  });

  it('counts a play without any identity once, and keeps the month window', () => {
    const plays = [
      play('q1', {}, '2026-09-30T23:59:59Z'),
      play('q1', {}, '2026-10-01T00:00:00Z'),
      play('q1', {}, '2026-10-01T00:00:00Z'),
    ];
    expect(countPlays(plays, quizzes, NONE).byCreator.get('ann')).toBe(3);
    expect(countPlays(plays, quizzes, NONE, '2026-10-01T00:00:00.000Z').byCreator.get('ann')).toBe(2);
    expect(playerKey({ id: 'p', player_id: 'u1', anon_id: 'a1' })).toBe('u:u1');
  });

  it('prints the rules it applies', () => {
    expect(BOARD_RULES).toHaveLength(3);
    expect(BOARD_RULES[0]).toContain('once per player per quiz per day');
    expect(CREATOR_TIERS.map((t) => t.plays)).toEqual([100, 1000, 10000]);
  });
});

describe('creators board: ranks, month, rising', () => {
  it('ranks by plays, ties share a rank, zero is not ranked', () => {
    const r = rankCreators(new Map([['a', 5], ['b', 9], ['c', 5], ['d', 0], ['e', 1]]));
    expect(r).toEqual([
      { id: 'b', plays: 9, rank: 1 },
      { id: 'a', plays: 5, rank: 2 },
      { id: 'c', plays: 5, rank: 2 },
      { id: 'e', plays: 1, rank: 4 },
    ]);
  });

  it('starts the month on the 1st, UTC', () => {
    expect(monthStart(new Date('2026-10-02T15:00:00Z'))).toBe('2026-10-01T00:00:00.000Z');
    expect(monthStart(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01T00:00:00.000Z');
    expect(monthLabelOf('2026-10-01T00:00:00.000Z')).toBe('October 2026');
  });

  it('counts published quizzes per creator', () => {
    expect(Object.fromEntries(quizCounts(quizzes.values()))).toEqual({ ann: 2, bob: 1, team: 1 });
  });

  it('rising: a first quiz published this month, one creator per group, floor applied', () => {
    const since = '2026-10-01T00:00:00.000Z';
    const list = [
      quiz('old', 'vet', { created_at: '2026-05-01T00:00:00Z', group_id: 1 }),
      quiz('vet-new', 'vet', { created_at: '2026-10-01T05:00:00Z', group_id: 1 }), // not a first quiz
      quiz('n1', 'new1', { created_at: '2026-10-01T06:00:00Z', group_id: 1 }),
      quiz('n2', 'new2', { created_at: '2026-10-01T07:00:00Z', group_id: 1 }),
      quiz('n3', 'new3', { created_at: '2026-10-02T07:00:00Z', group_id: 2 }),
      quiz('n4', 'new4', { created_at: '2026-10-02T08:00:00Z', group_id: 3 }),
      quiz('n5', 'team', { created_at: '2026-10-02T08:00:00Z', group_id: 4 }),
    ];
    const plays = new Map([['vet-new', 900], ['n1', 12], ['n2', 30], ['n3', 40], ['n4', MIN_RISING_PLAYS - 1], ['n5', 500]]);
    expect(risingByFandom(list, plays, since, new Set(['team']))).toEqual([
      { groupId: 2, creatorId: 'new3', quizId: 'n3', plays: 40 },
      { groupId: 1, creatorId: 'new2', quizId: 'n2', plays: 30 },
    ]);
  });
});

describe('share kit: captions', () => {
  const q = { title: 'Only real EYEKONS get 8/8', slug: 'only-real-eyekons-get-8-8', questions: 8, group: 'KATSEYE', fandom: 'EYEKON' };

  it('uses the fandom name, the group and the real question count', () => {
    const [x, short] = kitCaptions(q, 'https://kpopquiz.org/s/AbC123');
    expect(x!.text).toBe('Only real EYEKONS get 8/8. Calling all EYEKONs: try my new KATSEYE quiz. kpopquiz.org/s/AbC123 #KATSEYE #EYEKON');
    expect(short!.label).toBe('TikTok and Instagram');
    expect(short!.text).toBe('I made a KATSEYE quiz: Only real EYEKONS get 8/8. 8 questions. Link in bio.');
  });

  it('never invents a fandom, a group or a count', () => {
    const [x, short] = kitCaptions({ ...q, group: null, fandom: null, questions: 0 }, 'https://kpopquiz.org/q/x');
    expect(x!.text).toBe('Only real EYEKONS get 8/8. Calling all K-pop fans: try my new K-pop quiz. kpopquiz.org/q/x');
    expect(short!.text).toBe('I made a K-pop quiz: Only real EYEKONS get 8/8. Link in bio.');
    expect(kitCaptions({ ...q, fandom: null }, 'https://kpopquiz.org/q/x')[0]!.text).toContain('Calling all KATSEYE fans');
    expect(kitCaptions({ ...q, fandom: 'Bunnies' }, 'https://kpopquiz.org/q/x')[0]!.text).toContain('Calling all Bunnies:');
  });

  it('builds tags and the bare link', () => {
    expect(hashtag('Stray Kids')).toBe('#StrayKids');
    expect(hashtag('(G)I-DLE')).toBe('#GIDLE');
    expect(hashtag('  ')).toBeNull();
    expect(bareUrl('https://kpopquiz.org/q/abc/')).toBe('kpopquiz.org/q/abc');
    expect(kitKicker({ group: 'KATSEYE' })).toBe('KATSEYE quiz');
    expect(kitKicker({ group: null })).toBe('K-pop quiz');
  });

  it('has no dash that the site bans', () => {
    for (const c of kitCaptions(q, 'https://kpopquiz.org/s/x')) expect(c.text).not.toMatch(/[\u2013\u2014]/);
  });
});

// ---- plays from the creator's link: a fake store, nothing reaches a database ----

interface Call { table: string; op: string; args: unknown[] }

function fakeDb(opts: { link?: { share_code: string; quiz_id: string; user_id: string } | null; links?: string[]; count?: number | null; missing?: boolean }): { db: SupabaseClient; calls: Call[] } {
  const calls: Call[] = [];
  const missing = { error: { code: '42P01', message: 'relation "share_link_plays" does not exist' }, status: 404, count: null, data: null };
  const from = (table: string): unknown => {
    const chain: Record<string, unknown> = {};
    const result = (): unknown => {
      if (table === 'share_link_plays') return opts.missing ? missing : { error: null, status: 200, count: opts.count ?? 0, data: null };
      return { error: null, status: 200, data: (opts.links ?? []).map((share_code) => ({ share_code })) };
    };
    for (const m of ['select', 'eq', 'in', 'limit']) chain[m] = (...args: unknown[]) => { calls.push({ table, op: m, args }); return chain; };
    chain.maybeSingle = async () => ({ data: opts.link ?? null, error: null });
    chain.upsert = async (...args: unknown[]) => { calls.push({ table, op: 'upsert', args }); return opts.missing ? missing : { error: null, status: 201 }; };
    chain.then = (ok: (v: unknown) => unknown) => Promise.resolve(result()).then(ok);
    return chain;
  };
  return { db: { from } as unknown as SupabaseClient, calls };
}

describe('share kit: plays from the creator link', () => {
  const link = { share_code: 'AbC123xyz', quiz_id: 'quiz-1', user_id: 'creator' };
  const input = { code: 'AbC123xyz', quizId: 'quiz-1', playerId: 'fan', anonId: null, isTest: false };

  it('stores one hashed row for a fan who came through the link', async () => {
    const { db, calls } = fakeDb({ link });
    expect(await recordLinkPlay(db, input)).toBe('recorded');
    const up = calls.find((c) => c.op === 'upsert')!;
    expect(up.table).toBe('share_link_plays');
    expect(up.args[0]).toEqual({ share_code: 'AbC123xyz', quiz_id: 'quiz-1', player_key: linkPlayerKey('fan', null), is_test: false });
    expect(up.args[1]).toEqual({ onConflict: 'share_code,player_key,played_on', ignoreDuplicates: true });
    expect(JSON.stringify(up.args)).not.toContain('"fan"');
  });

  it('skips the creator, another quiz, an unknown code, a player without identity', async () => {
    expect(await recordLinkPlay(fakeDb({ link }).db, { ...input, playerId: 'creator' })).toBe('skipped');
    expect(await recordLinkPlay(fakeDb({ link }).db, { ...input, quizId: 'quiz-2' })).toBe('skipped');
    expect(await recordLinkPlay(fakeDb({ link: null }).db, input)).toBe('skipped');
    expect(await recordLinkPlay(fakeDb({ link }).db, { ...input, playerId: null, anonId: null })).toBe('skipped');
    expect(await recordLinkPlay(fakeDb({ link }).db, { ...input, code: 'no good!' })).toBe('skipped');
    expect(await recordLinkPlay(fakeDb({ link }).db, { ...input, code: null })).toBe('skipped');
  });

  it('fails soft while the table does not exist', async () => {
    expect(await recordLinkPlay(fakeDb({ link, missing: true }).db, input)).toBe('not_live');
    expect(await readLinkPlays(fakeDb({ links: ['AbC123xyz'], missing: true }).db, 'creator', 'quiz-1')).toBeNull();
  });

  it('reads a real count, and a real zero', async () => {
    expect(await readLinkPlays(fakeDb({ links: ['AbC123xyz'], count: 14 }).db, 'creator', 'quiz-1')).toBe(14);
    expect(await readLinkPlays(fakeDb({ links: [], count: 0 }).db, 'creator', 'quiz-1')).toBe(0);
  });

  it('validates codes and hashes the player', () => {
    expect(isShareCode('AbC_12-x')).toBe(true);
    expect(isShareCode('a b')).toBe(false);
    expect(isShareCode(12)).toBe(false);
    expect(linkPlayerKey('u1', 'a1')).toHaveLength(32);
    expect(linkPlayerKey('u1', 'a1')).not.toBe(linkPlayerKey(null, 'a1'));
    expect(linkPlayerKey(null, null)).toBeNull();
  });
});

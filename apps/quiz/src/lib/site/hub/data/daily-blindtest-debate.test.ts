import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => { process.env.NEXT_PUBLIC_SITE_ID = 'hub'; });
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => ({}), createServiceRoleClient: () => ({}) }));
vi.mock('@/lib/db/queries/quizzes', () => ({ getQuizOfTheDay: async () => null }));

import { BLINDTEST_CLIP_SECONDS, deezerPreview, readBlindtest } from './blindtest';
import { readDailyQuizzes, toDailyQuiz } from './daily';
import { readDebate } from './debate';
import { fakeDb, ORIGINS } from './test-support';

import type { QuizCardData } from '@/lib/db/types';

const NOW = new Date('2026-10-25T12:00:00Z');

const card = (over: Partial<QuizCardData> & { id: string; slug: string }): QuizCardData => ({
  title: 'T', quiz_type: 'multiple_choice', difficulty: 'easy', language: 'en', play_count: 0, total_score_sum: 0, total_completions: 0, like_count: 0,
  created_at: '2026-10-01T00:00:00Z', group_name: 'ZEROBASEONE', group_slug: 'zb1', display_color: '#000', text_color: '#fff', logo_url: null, fandom_name: 'x',
  creator_username: 'u', creator_avatar_url: null, creator_avatar_bg: '#000', creator_avatar_text: 'U', question_count: 10, cover_image_url: null, ...over,
}) as QuizCardData;

describe('the quizzes of the day', () => {
  it('shows each bank on its own site, canonical, with the real counts', async () => {
    const seen: string[] = [];
    const out = await readDailyQuizzes(ORIGINS, async (site) => {
      seen.push(site);
      return site === 'kpop' ? card({ id: 'k', slug: 'zb1-from-boys-planet', title: 'ZEROBASEONE: From Boys Planet to In Bloom' }) : card({ id: 'a', slug: 'frieren-basics', title: "Journey's Beginning: Frieren Basics", question_count: 12, difficulty: 'medium' });
    });
    expect(seen.sort()).toEqual(['anime', 'kpop']);
    expect(out?.kpop?.href).toBe('https://kpop.example/q/zb1-from-boys-planet');
    expect(out?.kpop?.meta).toBe('KpopQuiz · 10 questions · Easy');
    expect(out?.anime?.href).toBe('https://anime.example/q/frieren-basics');
    expect(out?.anime?.meta).toBe('OtakuQuiz · 12 questions · Medium');
    expect(out?.anime?.id).toBe('a');
  });

  it('keeps the other bank when one has no quiz, and disappears when both have none', async () => {
    const one = await readDailyQuizzes(ORIGINS, async (site) => (site === 'kpop' ? card({ id: 'k', slug: 's' }) : null));
    expect(one?.anime).toBeNull();
    expect(one?.kpop?.id).toBe('k');
    expect(await readDailyQuizzes(ORIGINS, async () => null)).toBeNull();
  });

  it('writes no question count it does not have', () => {
    expect(toDailyQuiz('kpop', card({ id: 'k', slug: 's', question_count: 0 }), ORIGINS).meta).toBe('KpopQuiz · Easy');
  });
});

describe('the daily blind test', () => {
  const songs = [
    { id: 's1', site_id: 'kpop', deezer_track_id: 111, preview_url: 'https://cdn.example/stored-s1.mp3', title: 'SECRET TITLE', artist_name: 'SECRET ARTIST', album_cover_big: 'https://img.example/cover.jpg', album_name: 'OST' },
  ];
  const ids = Array.from({ length: 10 }, (_, i) => `s${i + 1}`);

  it('gives the fresh preview link of the first song, the real count and the kpop link, and nothing that names the song', async () => {
    const db = fakeDb({ daily_blindtests: [{ date: '2026-10-25', song_ids: ids }], songs });
    const out = await readBlindtest(ORIGINS, NOW, { db: db as never, preview: async (id) => `https://cdn.example/fresh-${id}.mp3` });
    expect(out).toEqual({
      site: 'kpop',
      siteName: 'KpopQuiz',
      date: '2026-10-25',
      songCount: 10,
      clipSeconds: BLINDTEST_CLIP_SECONDS,
      previewUrl: 'https://cdn.example/fresh-111.mp3',
      path: '/blindtest?daily=true',
      href: 'https://kpop.example/blindtest?daily=true',
    });
    expect(BLINDTEST_CLIP_SECONDS).toBe(10);
    // audio only: no title, artist, album or cover in the answer, whatever the song is (a soundtrack included)
    const json = JSON.stringify(out);
    expect(json).not.toContain('SECRET');
    expect(json).not.toContain('cover');
    expect(json).not.toContain('OST');
    expect(Object.keys(out!).sort()).toEqual(['clipSeconds', 'date', 'href', 'path', 'previewUrl', 'site', 'siteName', 'songCount']);
    expect(db.rpcCalls).toEqual([]);
  });

  it('keeps the stored link when Deezer does not answer', async () => {
    const db = fakeDb({ daily_blindtests: [{ date: '2026-10-25', song_ids: ids }], songs });
    const out = await readBlindtest(ORIGINS, NOW, { db: db as never, preview: async () => null });
    expect(out?.previewUrl).toBe('https://cdn.example/stored-s1.mp3');
  });

  it('only reads: today, else yesterday, else null, and never calls ensure_daily_blindtest', async () => {
    const yesterday = fakeDb({ daily_blindtests: [{ date: '2026-10-24', song_ids: ids }], songs });
    const out = await readBlindtest(ORIGINS, NOW, { db: yesterday as never, preview: async () => null });
    expect(out?.date).toBe('2026-10-24');
    expect(out?.songCount).toBe(10);
    expect(yesterday.rpcCalls).toEqual([]);
    const today = fakeDb({ daily_blindtests: [{ date: '2026-10-25', song_ids: ids.slice(0, 5) }, { date: '2026-10-24', song_ids: ids }], songs });
    expect((await readBlindtest(ORIGINS, NOW, { db: today as never, preview: async () => null }))?.songCount).toBe(5);
    const none = fakeDb({ daily_blindtests: [{ date: '2026-10-22', song_ids: ids }], songs });
    expect(await readBlindtest(ORIGINS, NOW, { db: none as never, preview: async () => null })).toBeNull();
    expect(none.rpcCalls).toEqual([]);
    expect(none.calls.every((c) => c.table !== 'songs')).toBe(true);
  });

  it('is empty when the set has no song, and fails on a database error', async () => {
    const bad = fakeDb({ daily_blindtests: [], songs }, { failing: { daily_blindtests: 'boom' } });
    await expect(readBlindtest(ORIGINS, NOW, { db: bad as never, preview: async () => null })).rejects.toThrow('boom');
    const empty = fakeDb({ daily_blindtests: [{ date: '2026-10-25', song_ids: [] }], songs });
    expect(await readBlindtest(ORIGINS, NOW, { db: empty as never, preview: async () => null })).toBeNull();
  });

  it('reads a Deezer answer and survives a bad one', async () => {
    const ok = (async () => ({ json: async () => ({ preview: 'https://cdn.example/p.mp3' }) })) as unknown as typeof fetch;
    expect(await deezerPreview(1, ok)).toBe('https://cdn.example/p.mp3');
    const empty = (async () => ({ json: async () => ({ preview: '' }) })) as unknown as typeof fetch;
    expect(await deezerPreview(1, empty)).toBeNull();
    const down = (async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect(await deezerPreview(1, down)).toBeNull();
  });
});

describe('the debate of the day', () => {
  const tables = (date: string) => ({
    daily_debates: [{ date, question_id: 'dq1' }],
    debate_questions: [{ id: 'dq1', question: ' Best title track of 2025 so far? ', side_a: 'A side', side_b: 'B side' }],
    debate_votes: [{ id: 'v1', date }, { id: 'v2', date }, { id: 'v3', date: '2000-01-01' }],
  });

  it("reads today's debate with its vote count and links the K-pop community page", async () => {
    const db = fakeDb(tables('2026-10-25'));
    const out = await readDebate(ORIGINS, NOW, db as never);
    expect(out).toMatchObject({ site: 'kpop', date: '2026-10-25', question: 'Best title track of 2025 so far?', sideA: 'A side', sideB: 'B side', votes: 2, href: 'https://kpop.example/community' });
    // read only: the writing function of the K-pop home is never called
    expect(db.rpcCalls).toEqual([]);
  });

  it("accepts yesterday's debate until the cron has made today's, and nothing older", async () => {
    expect((await readDebate(ORIGINS, NOW, fakeDb(tables('2026-10-24')) as never))?.date).toBe('2026-10-24');
    expect(await readDebate(ORIGINS, NOW, fakeDb(tables('2026-10-23')) as never)).toBeNull();
    expect(await readDebate(ORIGINS, NOW, fakeDb(tables('2026-10-26')) as never)).toBeNull();
  });

  it('is null (the card disappears) without a question, and fails on a database error', async () => {
    expect(await readDebate(ORIGINS, NOW, fakeDb({ ...tables('2026-10-25'), debate_questions: [] }) as never)).toBeNull();
    await expect(readDebate(ORIGINS, NOW, fakeDb(tables('2026-10-25'), { failing: { daily_debates: 'timeout' } }) as never)).rejects.toThrow('timeout');
  });
});

// Run O1, lot (c) fix of the B3 review blockers 1 and 2 on the quiz play route: (1) the kpop badges perfect_score,
// hard_mode and viral_hit are granted only when the build is kpop; (2) the quiz must belong to the build's site, else
// 404 before record_play and any award, and on kpop with SITE_SCOPE off the queries and the response are today's.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Query = { table: string; filters: Array<[string, unknown]> };
const state = vi.hoisted(() => ({
  site: 'kpop',
  quizSite: 'kpop',
  difficulty: 'hard',
  playCount: 999,
  queries: [] as Array<{ table: string; filters: Array<[string, unknown]> }>,
  rpc: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  badges: [] as string[],
}));

function db() {
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'player-1' } } }) },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.rpc.push({ fn, args });
      if (fn === 'record_play') return { data: [{ play_id: 'play-1', percentile: 80 }], error: null };
      if (fn === 'award_xp' || fn === 'award_world_xp') return { data: 3040, error: null };
      return { data: null, error: null };
    },
    from(table: string) {
      const rec: Query = { table, filters: [] };
      state.queries.push(rec);
      const q: Record<string, unknown> = {};
      for (const m of ['select', 'gte', 'is', 'limit', 'update']) q[m] = () => q;
      q.eq = (col: string, val: unknown) => { rec.filters.push([col, val]); return q; };
      q.upsert = (row: { badge_id: string }) => { if (table === 'user_badges') state.badges.push(row.badge_id); return q; };
      // A quiz row carries its site: a site_id filter that names another site finds nothing (PGRST116, like postgrest).
      q.single = async () => {
        const site = rec.filters.find(([col]) => col === 'site_id');
        if (table === 'quizzes' && site && site[1] !== state.quizSite) return { data: null, error: { code: 'PGRST116' } };
        return { data: { id: 'quiz-1', difficulty: state.difficulty, creator_id: 'creator-1', play_count: state.playCount, title: 'Quiz' }, error: null };
      };
      q.then = (ok: (v: unknown) => unknown) => ok({ data: [], error: null, count: 10 });
      return q;
    },
  };
}

vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return state.site; } }));
vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => false }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => db(), createServiceRoleClient: () => db() }));
vi.mock('@/lib/notifications', () => ({ notifyMilestone: async () => {} }));
vi.mock('@/lib/badges/award', () => ({ checkTierBadges: async () => [] }));
vi.mock('@/lib/quiz/time-stats', () => ({ timeSample: () => null, recordTimeSample: async () => {} }));

import { POST } from './route';

// A perfect score on a hard quiz at 999 plays: all three kpop badges are due (perfect_score, hard_mode, viral_hit).
const play = () =>
  POST(
    new NextRequest('https://kpopquiz.org/api/quiz/quiz-1/play', { method: 'POST', body: JSON.stringify({ score: 10, total_questions: 10 }) }),
    { params: Promise.resolve({ id: 'quiz-1' }) },
  );
const quizQueries = () => state.queries.filter((q) => q.table === 'quizzes');
const savedScope = process.env.SITE_SCOPE;

beforeEach(() => {
  Object.assign(state, { site: 'kpop', quizSite: 'kpop', difficulty: 'hard', playCount: 999, queries: [], rpc: [], badges: [] });
  delete process.env.SITE_SCOPE;
});
afterEach(() => {
  if (savedScope === undefined) delete process.env.SITE_SCOPE;
  else process.env.SITE_SCOPE = savedScope;
});

describe('POST /api/quiz/[id]/play: kpop badges only on the kpop build', () => {
  it('a non-kpop build grants no kpop badge (still earns its own world XP)', async () => {
    state.site = 'anime';
    state.quizSite = 'anime';
    const res = await play();
    expect(res.status).toBe(200);
    expect(state.badges).toEqual([]);
    expect(state.queries.some((q) => q.table === 'user_badges')).toBe(false);
    expect(state.rpc.filter((c) => c.fn === 'award_world_xp').length).toBeGreaterThan(0);
    expect(state.rpc.some((c) => c.fn === 'award_xp')).toBe(false);
  });

  it('the kpop build still grants perfect_score, hard_mode and viral_hit', async () => {
    const res = await play();
    expect(res.status).toBe(200);
    expect(state.badges).toEqual(['perfect_score', 'hard_mode', 'viral_hit']);
  });
});

describe('POST /api/quiz/[id]/play: the quiz belongs to the build\'s site', () => {
  it('a quiz of another site answers 404 on a non-kpop build, before record_play, XP or badges', async () => {
    state.site = 'anime';
    state.quizSite = 'kpop';
    const res = await play();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Quiz not found' });
    expect(state.rpc).toEqual([]);
    expect(state.badges).toEqual([]);
    expect(state.queries.map((q) => q.table)).toEqual(['quizzes']);
    expect(quizQueries()[0]!.filters).toEqual([['id', 'quiz-1'], ['site_id', 'anime']]);
  });

  it('a quiz of another site answers 404 on the kpop build when SITE_SCOPE is on', async () => {
    process.env.SITE_SCOPE = '1';
    state.quizSite = 'anime';
    const res = await play();
    expect(res.status).toBe(404);
    expect(state.rpc).toEqual([]);
    expect(state.badges).toEqual([]);
    expect(quizQueries()[0]!.filters).toEqual([['id', 'quiz-1'], ['site_id', 'kpop']]);
  });

  it('a quiz of its own site plays on a non-kpop build', async () => {
    state.site = 'anime';
    state.quizSite = 'anime';
    const res = await play();
    expect(res.status).toBe(200);
    expect(state.rpc.map((c) => c.fn)).toContain('record_play');
  });

  it('kpop with SITE_SCOPE off is unchanged: no site_id filter, no extra query, same response', async () => {
    state.quizSite = 'anime'; // would 404 if the check ran: the flag is off, so it must not
    const res = await play();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ play_id: 'play-1', xp_earned: 30, new_xp: 3040 });
    expect(quizQueries()).toEqual([{ table: 'quizzes', filters: [['id', 'quiz-1']] }]);
    expect(state.queries.some((q) => q.filters.some(([col]) => col === 'site_id'))).toBe(false);
    // the creator earns no XP past 500 plays, so one award_xp only
    expect(state.rpc.map((c) => c.fn)).toEqual(['record_play', 'award_xp']);
  });
});

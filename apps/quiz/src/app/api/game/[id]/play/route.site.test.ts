// Run O1, lot (c) fix of the B3 review blocker 2 on the blind test game play route: the game must belong to the
// build's site, else the same 404 as an unknown game, before the game update, the game_plays insert and any XP. On
// kpop with SITE_SCOPE off the games query is today's (no site_id filter).
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Query = { table: string; op: string; filters: Array<[string, unknown]> };
const state = vi.hoisted(() => ({
  site: 'kpop',
  gameSite: 'kpop',
  queries: [] as Array<{ table: string; op: string; filters: Array<[string, unknown]> }>,
  rpc: [] as Array<{ fn: string; args: Record<string, unknown> }>,
}));

const GAME = {
  id: 'game-1', game_type: 'blind_test', play_count: 3, creator_id: 'creator-1', group_id: 1,
  content: {
    settings: { clip_duration: 10 },
    songs: [{ id: 's1', correct_index: 1, times_played: 0, times_correct: 0, avg_answer_time: 0 }],
  },
};

function db() {
  return {
    auth: { getUser: async () => ({ data: { user: { id: 'player-1' } } }) },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.rpc.push({ fn, args });
      return { data: 5, error: null };
    },
    from(table: string) {
      const rec: Query = { table, op: 'select', filters: [] };
      state.queries.push(rec);
      const q: Record<string, unknown> = {};
      q.select = () => q;
      q.update = () => { rec.op = 'update'; return q; };
      q.insert = () => { rec.op = 'insert'; return q; };
      q.eq = (col: string, val: unknown) => { rec.filters.push([col, val]); return q; };
      q.single = async () => {
        const site = rec.filters.find(([col]) => col === 'site_id');
        if (site && site[1] !== state.gameSite) return { data: null, error: { code: 'PGRST116' } };
        return { data: GAME, error: null };
      };
      q.maybeSingle = async () => ({ data: null, error: null });
      q.then = (ok: (v: unknown) => unknown) => ok({ data: null, error: null });
      return q;
    },
  };
}

vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return state.site; } }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => db(), createServiceRoleClient: () => db() }));

import { POST } from './route';

const play = () =>
  POST(
    new NextRequest('https://kpopquiz.org/api/game/game-1/play', { method: 'POST', body: JSON.stringify({ choices: { s1: { picked: 1, time: 3 } } }) }),
    { params: Promise.resolve({ id: 'game-1' }) },
  );
const writes = () => state.queries.filter((q) => q.op !== 'select').map((q) => `${q.op}:${q.table}`);
const savedScope = process.env.SITE_SCOPE;

beforeEach(() => {
  Object.assign(state, { site: 'kpop', gameSite: 'kpop', queries: [], rpc: [] });
  delete process.env.SITE_SCOPE;
});
afterEach(() => {
  if (savedScope === undefined) delete process.env.SITE_SCOPE;
  else process.env.SITE_SCOPE = savedScope;
});

describe('POST /api/game/[id]/play: the game belongs to the build\'s site', () => {
  it('a game of another site answers 404 on a non-kpop build, with no write and no XP', async () => {
    state.site = 'anime';
    state.gameSite = 'kpop';
    const res = await play();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Game not found' });
    expect(writes()).toEqual([]);
    expect(state.rpc).toEqual([]);
    expect(state.queries[0]!.filters).toEqual([['id', 'game-1'], ['status', 'published'], ['site_id', 'anime']]);
  });

  it('a game of another site answers 404 on the kpop build when SITE_SCOPE is on', async () => {
    process.env.SITE_SCOPE = '1';
    state.gameSite = 'anime';
    const res = await play();
    expect(res.status).toBe(404);
    expect(writes()).toEqual([]);
    expect(state.rpc).toEqual([]);
  });

  it('a game of its own site plays on a non-kpop build', async () => {
    state.site = 'anime';
    state.gameSite = 'anime';
    const res = await play();
    expect(res.status).toBe(200);
    expect(writes()).toEqual(['update:games', 'insert:game_plays']);
    expect(state.rpc.map((c) => c.fn)).toEqual(['ensure_membership', 'award_world_xp', 'award_world_xp']);
  });

  it('kpop with SITE_SCOPE off is unchanged: the games query has no site_id filter', async () => {
    state.gameSite = 'anime'; // would 404 if the filter ran: the flag is off, so it must not
    const res = await play();
    expect(res.status).toBe(200);
    expect(state.queries[0]).toEqual({ table: 'games', op: 'select', filters: [['id', 'game-1'], ['status', 'published']] });
    expect(state.rpc.map((c) => c.fn)).toEqual(['award_xp', 'award_xp']);
  });
});

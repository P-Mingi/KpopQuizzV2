// Run O1, lot (c) part 2 (B3): the badge engine per site. kpop keeps its queries (the scoped reads go through
// forSite, a no-op with SITE_SCOPE off); another site counts its own activity and grants only the badges that site
// defines (badge_definitions rows with site_id = site and id = <site>_<family id>).
import { afterEach, describe, expect, it } from 'vitest';

import { checkTierBadges, computeMetrics, grantEarnedTiers } from './award';

import type { SupabaseClient } from '@supabase/supabase-js';

interface Query { table: string; select?: unknown; filters: Array<[string, unknown]>; op: string; arg?: unknown }

function fake(data: Record<string, unknown>) {
  const queries: Query[] = [];
  const db = {
    from(table: string) {
      const q: Query = { table, filters: [], op: 'select' };
      queries.push(q);
      const b: Record<string, unknown> = {};
      b.select = (cols: unknown) => { q.select = cols; return b; };
      for (const m of ['eq', 'in', 'lte', 'gt', 'not']) b[m] = (k: string, v: unknown) => { q.filters.push([`${m}:${k}`, v]); return b; };
      b.upsert = (arg: unknown) => { q.op = 'upsert'; q.arg = arg; return Promise.resolve({ data: null, error: null }); };
      b.maybeSingle = async () => ({ data: data[table] ?? null, error: null });
      b.then = (ok: (v: unknown) => unknown) => ok({ data: data[table] ?? [], error: null, count: 0 });
      return b;
    },
  };
  return { db: db as unknown as SupabaseClient, queries };
}

afterEach(() => { delete process.env.SITE_SCOPE; });

describe('computeMetrics', () => {
  it('kpop: reads profiles and the kpop tables as before, and scopes nothing while SITE_SCOPE is off', async () => {
    const { db, queries } = fake({ profiles: { quizzes_played: 0, blindtests_played: 3, daily_streak_longest: 4, total_quizzes_created: 2, total_plays_received: 7, created_at: '2025-01-01T00:00:00Z' } });
    const m = await computeMetrics(db, 'u1', 'kpop');
    expect(m).toMatchObject({ blindtests_played: 3, daily_streak_longest: 4, quizzes_created: 2, plays_received: 7 });
    const tables = queries.map((q) => q.table);
    expect(tables).toContain('profiles');
    expect(tables).toContain('verse_pages');
    expect(tables).not.toContain('world_memberships');
    const essays = queries.find((q) => q.table === 'verse_essays')!;
    expect(essays.filters.map(([k]) => k)).toEqual(['eq:author', 'eq:status']);
  });

  it('kpop with SITE_SCOPE on: the scoped table gets site_id = kpop, nothing else changes', async () => {
    process.env.SITE_SCOPE = '1';
    const { db, queries } = fake({});
    await computeMetrics(db, 'u1', 'kpop');
    const essays = queries.find((q) => q.table === 'verse_essays')!;
    expect(essays.filters[0]).toEqual(['eq:site_id', 'kpop']);
  });

  it('anime: the member\'s world counters and the plays of anime quizzes only; no kpop table is read', async () => {
    const { db, queries } = fake({
      world_memberships: { blindtests_played: 6, daily_streak_longest: 8, quizzes_created: 1, plays_received: 120, joined_at: '2020-01-01T00:00:00Z' },
      plays: [{ score: 10, total_questions: 10 }, { score: 5, total_questions: 10 }, { score: 3, total_questions: 3 }],
    });
    const m = await computeMetrics(db, 'u1', 'anime');
    expect(m).toMatchObject({
      blindtests_played: 6, daily_streak_longest: 8, quizzes_created: 1, plays_received: 120, quizzes_played: 3, perfect_scores: 2,
      wiki_pages: 0, debate_votes: 0, essays_published: 0, spaces_joined: 0, photocard_sets: 0, dual_citizen: 0, personality_plays: 0,
    });
    expect(m.account_age_years).toBeGreaterThanOrEqual(5);
    expect(queries.map((q) => q.table).sort()).toEqual(['plays', 'world_memberships']);
    const wm = queries.find((q) => q.table === 'world_memberships')!;
    expect(wm.filters).toEqual([['eq:user_id', 'u1'], ['eq:site_id', 'anime']]);
    const plays = queries.find((q) => q.table === 'plays')!;
    expect(plays.filters).toEqual([['eq:player_id', 'u1'], ['eq:quizzes.site_id', 'anime']]);
  });

  it('anime with no membership yet: all zero', async () => {
    const { db } = fake({ plays: [] });
    const m = await computeMetrics(db, 'u1', 'anime');
    expect(Object.values(m).every((v) => v === 0)).toBe(true);
  });
});

describe('grantEarnedTiers', () => {
  const metrics = { quizzes_played: 60, perfect_scores: 1 } as Record<string, number>;
  const all = (extra: Record<string, number>) => ({
    quizzes_played: 0, perfect_scores: 0, blindtests_played: 0, personality_plays: 0, daily_streak_longest: 0, debate_votes: 0,
    quizzes_created: 0, plays_received: 0, distinct_groups_played: 0, wiki_pages: 0, sourced_overrides: 0, essays_published: 0,
    photocard_sets: 0, nest_depth: 0, era_stories: 0, contrib_streak: 0, first_fan: 0, founding_curator: 0, dual_citizen: 0,
    spaces_joined: 0, account_age_years: 0, completionist: 0, ...extra,
  }) as Parameters<typeof grantEarnedTiers>[2];

  it('kpop grants the family ids as before', async () => {
    const { db, queries } = fake({ user_badges: [] });
    const fresh = await grantEarnedTiers(db, 'u1', all(metrics), 'kpop');
    expect(fresh).toEqual(expect.arrayContaining(['marathoner_10', 'marathoner_50', 'perfectionist_1']));
    expect(queries.some((q) => q.table === 'badge_definitions')).toBe(false);
    expect(queries.find((q) => q.op === 'upsert')!.arg).toEqual(fresh.map((badge_id) => ({ user_id: 'u1', badge_id })));
  });

  it('anime grants only the badges the anime site defines, under the <site>_ prefix', async () => {
    const { db, queries } = fake({
      badge_definitions: [{ id: 'anime_marathoner_10' }],
      user_badges: [],
    });
    const fresh = await grantEarnedTiers(db, 'u1', all(metrics), 'anime');
    expect(fresh).toEqual(['anime_marathoner_10']);
    expect(queries.find((q) => q.op === 'upsert')!.arg).toEqual([{ user_id: 'u1', badge_id: 'anime_marathoner_10' }]);
    const defs = queries.find((q) => q.table === 'badge_definitions')!;
    expect(defs.filters[0]).toEqual(['eq:site_id', 'anime']);
    expect(defs.filters[1]![0]).toBe('in:id');
  });

  it('anime grants nothing while the site defines no badge (launch defines them), and skips ones already held', async () => {
    const none = fake({ badge_definitions: [], user_badges: [] });
    expect(await grantEarnedTiers(none.db, 'u1', all(metrics), 'anime')).toEqual([]);
    expect(none.queries.some((q) => q.op === 'upsert')).toBe(false);
    const held = fake({ badge_definitions: [{ id: 'anime_marathoner_10' }], user_badges: [{ badge_id: 'anime_marathoner_10' }] });
    expect(await grantEarnedTiers(held.db, 'u1', all(metrics), 'anime')).toEqual([]);
  });

  it('nothing earned: no definition lookup at all', async () => {
    const { db, queries } = fake({});
    expect(await grantEarnedTiers(db, 'u1', all({}), 'anime')).toEqual([]);
    expect(queries).toEqual([]);
  });
});

describe('checkTierBadges', () => {
  it('passes the site to both steps', async () => {
    const { db, queries } = fake({ plays: [], badge_definitions: [], user_badges: [] });
    expect(await checkTierBadges(db, 'u1', 'anime')).toEqual([]);
    expect(queries.some((q) => q.table === 'world_memberships')).toBe(true);
    expect(queries.some((q) => q.table === 'profiles')).toBe(false);
  });
});

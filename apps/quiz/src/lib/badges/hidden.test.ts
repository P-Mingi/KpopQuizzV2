// Run O1, lane nophotocards (owner order, 2026-11-06): the six photocard badges are never shown, counted, pinned,
// picked or awarded. One list (hidden.ts), and every surface that lists badges goes through it.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BadgeGrid } from '@/components/ui/badge-grid';
import { BADGE_TIER_GROUPS, badgeCategory, badgeRarity } from '@/lib/badges';
import { badgeGlyph, hasBadgeGlyph } from '@/lib/ux-v1/a0/badge-art';
import { badgeTiles, pinnedTiles } from '@/lib/ux-v1/p10/passport-model';
import { badgeShown } from '@/lib/ux-v1/p8/verse-gate';

import { checkTierBadges, computeMetrics, grantEarnedTiers } from './award';
import { BADGE_FAMILIES, CATALOG_CATEGORY, NEW_BADGE_TIERS, expandFamilies, tierMetaFor, type BadgeMetric } from './catalog';
import { HIDDEN_BADGE_IDS, isHiddenBadge, withoutHiddenBadgeIds, withoutHiddenBadges } from './hidden';

import type { BadgeDefinition } from '@/lib/db/types';
import type { SupabaseClient } from '@supabase/supabase-js';

const SIX = ['pc_first', 'pc_collector', 'pc_set', 'quest_collector_1', 'quest_collector_5', 'quest_collector_25'];

describe('the hide list', () => {
  it('holds exactly the six photocard badges', () => {
    expect([...HIDDEN_BADGE_IDS].sort()).toEqual([...SIX].sort());
    for (const id of SIX) expect(isHiddenBadge(id), id).toBe(true);
  });

  it('hides nothing else (every other catalog badge, legacy badge and empty id passes)', () => {
    for (const t of NEW_BADGE_TIERS) expect(isHiddenBadge(t.id), t.id).toBe(false);
    for (const id of ['first_steps', 'quiz_maker', 'perfect_score', 'hard_mode', 'streak_7', 'creator_gold', 'group_master', 'founding_fan', 'completionist', 'essayist_1']) {
      expect(isHiddenBadge(id), id).toBe(false);
    }
    expect(isHiddenBadge(null)).toBe(false);
    expect(isHiddenBadge(undefined)).toBe(false);
    expect(isHiddenBadge('')).toBe(false);
    // an anime badge id is never one of the six
    expect(isHiddenBadge('anime_pc_first')).toBe(false);
  });

  it('filters definitions and ids, keeping order', () => {
    const defs = [{ id: 'first_steps' }, { id: 'pc_first' }, { id: 'quest_collector_5' }, { id: 'streak_7' }, { id: 'pc_set' }];
    expect(withoutHiddenBadges(defs).map((d) => d.id)).toEqual(['first_steps', 'streak_7']);
    expect(withoutHiddenBadgeIds(['pc_collector', 'perfect_score', 'quest_collector_1'])).toEqual(['perfect_score']);
    expect(withoutHiddenBadges([])).toEqual([]);
  });
});

describe('the catalog no longer knows the photocard family', () => {
  it('has no quest_collector family, no photocard metric and no hidden id among its tiers', () => {
    expect(BADGE_FAMILIES.some((f) => f.key === 'quest_collector')).toBe(false);
    expect(BADGE_FAMILIES.some((f) => (f.metric as string) === 'photocard_sets')).toBe(false);
    const ids = expandFamilies().map((t) => t.id);
    for (const id of SIX) expect(ids, id).not.toContain(id);
    for (const id of SIX) expect(CATALOG_CATEGORY[id], id).toBeUndefined();
    for (const id of SIX) expect(tierMetaFor(id), id).toBeNull();
    for (const g of BADGE_TIER_GROUPS) for (const id of g.ids) expect(isHiddenBadge(id), id).toBe(false);
  });

  it('no text of the catalog speaks of photocards', () => {
    const text = JSON.stringify(BADGE_FAMILIES).toLowerCase();
    expect(text).not.toContain('photocard');
    expect(text).not.toContain('collector');
  });

  it('the legacy maps no longer carry the three pc_ badges', () => {
    // Not in the art map (the star fallback), not in the rarity ladder, not in the Verse category.
    for (const id of ['pc_first', 'pc_collector', 'pc_set', 'quest_collector_1']) {
      expect(hasBadgeGlyph(id), id).toBe(false);
      expect(badgeGlyph(id), id).toBe(badgeGlyph('unknown_badge'));
      expect(badgeRarity(id), id).toBe('common');
      expect(badgeCategory(id), id).toBe('play');
    }
  });
});

describe('nothing awards them', () => {
  function recordingDb(): { db: SupabaseClient; tables: string[]; upserts: unknown[] } {
    const tables: string[] = [];
    const upserts: unknown[] = [];
    const db = {
      from(table: string) {
        tables.push(table);
        const b: Record<string, unknown> = {};
        for (const m of ['select', 'eq', 'in', 'lte', 'gt', 'gte', 'not', 'neq', 'order', 'limit']) b[m] = () => b;
        b.upsert = (arg: unknown) => { upserts.push(arg); return Promise.resolve({ data: null, error: null }); };
        b.maybeSingle = async () => ({ data: null, error: null });
        b.then = (ok: (v: unknown) => unknown) => ok({ data: [], error: null, count: 0 });
        return b;
      },
    };
    return { db: db as unknown as SupabaseClient, tables, upserts };
  }

  it('computeMetrics (kpop) reads no photocard table and returns no photocard metric', async () => {
    const { db, tables } = recordingDb();
    const m = await computeMetrics(db, 'u1', 'kpop');
    expect(tables.length).toBeGreaterThan(5);
    expect(tables).not.toContain('photocards');
    expect(tables).not.toContain('photocard_collection');
    expect(Object.keys(m)).not.toContain('photocard_sets');
  });

  it('grantEarnedTiers never grants a hidden badge, whatever the metrics say', async () => {
    const { db, upserts } = recordingDb();
    const huge = Object.fromEntries(
      (['quizzes_played', 'perfect_scores', 'blindtests_played', 'personality_plays', 'daily_streak_longest', 'debate_votes', 'quizzes_created', 'plays_received', 'distinct_groups_played', 'wiki_pages', 'sourced_overrides', 'essays_published', 'nest_depth', 'era_stories', 'contrib_streak', 'first_fan', 'founding_curator', 'dual_citizen', 'spaces_joined', 'account_age_years', 'completionist'] satisfies BadgeMetric[]).map((k) => [k, 1_000_000]),
    ) as Record<BadgeMetric, number>;
    const fresh = await grantEarnedTiers(db, 'u1', huge, 'kpop');
    expect(fresh.length).toBeGreaterThan(20);
    for (const id of SIX) expect(fresh, id).not.toContain(id);
    expect(JSON.stringify(upserts)).not.toMatch(/pc_|quest_collector/);
  });

  it('checkTierBadges (the play route entry point) never upserts a hidden badge', async () => {
    const { db, upserts } = recordingDb();
    await checkTierBadges(db, 'u1', 'kpop');
    expect(JSON.stringify(upserts)).not.toMatch(/pc_|quest_collector/);
  });
});

describe('the surfaces drop them', () => {
  const defs: BadgeDefinition[] = [
    { id: 'first_steps', name: 'First steps', description: 'Play your first quiz.', sort_order: 1 },
    { id: 'pc_first', name: 'Zeta Card One', description: 'Hidden one.', sort_order: 30 },
    { id: 'pc_collector', name: 'Zeta Card Two', description: 'Hidden two.', sort_order: 31 },
    { id: 'quest_collector_1', name: 'Zeta Card Three', description: 'Hidden three.', sort_order: 140 },
    { id: 'quest_collector_25', name: 'Zeta Card Four', description: 'Hidden four.', sort_order: 142 },
    { id: 'streak_7', name: 'Week streak', description: 'Seven days.', sort_order: 5 },
  ] as unknown as BadgeDefinition[];

  it('the passport tiles list, count and pin only visible badges', () => {
    const tiles = badgeTiles(defs, ['first_steps', 'pc_first', 'quest_collector_1']);
    expect(tiles.map((t) => t.id)).toEqual(['first_steps', 'streak_7']);
    expect(tiles.filter((t) => t.earned).map((t) => t.id)).toEqual(['first_steps']);
    // pinning a hidden badge pins nothing
    expect(pinnedTiles(tiles, 'pc_first').map((t) => t.id)).toEqual(['first_steps']);
  });

  it('the Badge watch (Verse open or not) never shows them', () => {
    for (const open of [true, false]) {
      for (const id of SIX) expect(badgeShown(id, open), `${id} ${open}`).toBe(false);
    }
    expect(badgeShown('streak_7', true)).toBe(true);
    expect(badgeShown('streak_7', false)).toBe(true);
  });

  it('the badge grid renders none of the six, earned or locked, and no word of them', () => {
    const html = renderToStaticMarkup(createElement(BadgeGrid, { allBadges: defs, earnedBadgeIds: ['first_steps', 'pc_first', 'quest_collector_1'] }));
    expect(html).toContain('First steps');
    expect(html).toContain('Week streak');
    expect(html).not.toContain('Zeta Card');
    expect(html).not.toContain('Hidden one');
  });
});

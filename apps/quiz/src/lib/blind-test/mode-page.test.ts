import { beforeEach, describe, expect, it, vi } from 'vitest';

// blindtestPageRenders: the answer of /blindtest/<segment> (renders, 404, or cannot tell)
// that the legacy /blind-test handler trusts before a 301. The flags and the reads are fakes:
// no request leaves the test.

const state = vi.hoisted(() => ({
  v1: true,
  v12: true, // also true at import, so STATIC_MODES holds the themed modes as in production
  db: true,
  groups: [] as Array<{ slug: string; name: string; songs: number }>,
  groupsFail: false,
  themed: {} as Record<string, boolean>,
  themedFail: false,
}));

vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => { throw new Error('no database in this test'); },
  createServiceRoleClient: () => { throw new Error('no database in this test'); },
  createServerClient: async () => { throw new Error('no database in this test'); },
}));
vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => state.v12, uxV12From: () => state.v12 }));
vi.mock('@/lib/ux-v1', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  get UX_V1() { return state.v1; },
}));
vi.mock('@/lib/ux-v1/p6/hub-data', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  hasDbEnv: () => state.db,
  getPlayableGroups: async () => {
    if (state.groupsFail) throw new Error('db down');
    return state.groups;
  },
}));
vi.mock('@/lib/blind-test-playlists', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  isThemedModePlayable: async (id: string) => {
    if (state.themedFail) throw new Error('db down');
    return state.themed[id] ?? true;
  },
}));

import { THEMED_MODE_IDS } from '@/lib/blind-test-modes';
import { isThemePage } from '@/lib/growth/bt-themes';

import { blindtestPageRenders, hiddenTheme, playableGroup } from './mode-page';

const THEME = THEMED_MODE_IDS.find((id) => isThemePage(id))!;

describe('blindtestPageRenders (production flags on)', () => {
  beforeEach(() => {
    state.v1 = true;
    state.v12 = true;
    state.db = true;
    state.groups = [{ slug: 'bts', name: 'BTS', songs: 40 }, { slug: 'rose', name: 'ROSE', songs: 12 }];
    state.groupsFail = false;
    state.themed = {};
    state.themedFail = false;
  });

  it('a group page renders only for a playable group', async () => {
    expect(await blindtestPageRenders('group-bts')).toBe(true);
    expect(await blindtestPageRenders('group-rose')).toBe(true);
    expect(await blindtestPageRenders('group-the-boyz')).toBe(false);
    expect(await blindtestPageRenders('group-')).toBe(false);
  });

  it('a failed group read cannot tell (the page would show its fallback)', async () => {
    state.groupsFail = true;
    expect(await blindtestPageRenders('group-bts')).toBeNull();
    expect(await playableGroup('group-bts')).toEqual({ group: null, list: null });
  });

  it('a legacy mode renders, an unknown segment does not', async () => {
    expect(await blindtestPageRenders('2nd-gen')).toBe(true);
    expect(await blindtestPageRenders('kpop-legends')).toBe(true);
    expect(await blindtestPageRenders('bts')).toBe(false);
    expect(await blindtestPageRenders('nonexistent')).toBe(false);
  });

  it('a themed mode renders only above its floor; a failed count cannot tell, the page fails closed', async () => {
    expect(THEME).toBeTruthy();
    expect(await blindtestPageRenders(THEME)).toBe(true);
    state.themed[THEME] = false;
    expect(await blindtestPageRenders(THEME)).toBe(false);
    state.themedFail = true;
    expect(await blindtestPageRenders(THEME)).toBeNull();
    expect(await hiddenTheme(THEME)).toBe(true);
  });

  it('the static pages under /blindtest', async () => {
    expect(await blindtestPageRenders('leaderboard')).toBe(true);
    expect(await blindtestPageRenders('ranked')).toBe(true);
    state.v1 = false;
    expect(await blindtestPageRenders('ranked')).toBe(false);
  });
});

describe('blindtestPageRenders without the V12 read', () => {
  beforeEach(() => {
    state.groupsFail = true; // any read would fail: none must happen
  });

  it('flags off: the v11 group page renders for any group slug, as the page does', async () => {
    state.v12 = false;
    state.db = true;
    expect(await blindtestPageRenders('group-the-boyz')).toBe(true);
    expect(await hiddenTheme(THEME)).toBe(false);
  });

  it('flags on but no database env: the page renders its fallback', async () => {
    state.v12 = true;
    state.db = false;
    expect(await blindtestPageRenders('group-bts')).toBe(true);
  });
});

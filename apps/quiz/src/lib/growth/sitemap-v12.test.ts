// V12 follow-up (requests G6 R2, G5 R2, G3 R5).
//
// 1. v12GrowthPaths(): the pure list.
// 2. app/sitemap.ts itself, run in the three flag states with every read mocked to the
//    same fixed rows. What it proves: with a flag off the sitemap is the same set of
//    URLs in both off states, it holds none of the V12 URLs and the Which member read
//    is never made; with both flags on the only URLs added are the V12 ones.
//    What it does NOT prove: the real rows (the dev server runs in reports/G3.md do).
// 3. The links G3's pages point at other agents' routes (R5): the route file exists.

import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { prettyPath } from '@/lib/name-all/round';
import { NAME_ALL_GROUPS } from '@/lib/name-all/spellings';
import { BRIDGE_PATH } from '@/lib/personality/bridge';

import { v12GrowthPaths } from './sitemap-v12';

const SITE = 'https://kpopquiz.org';
const WMA_SLUGS = ['aespa', 'bts', 'g-i-dle', 'stray-kids'];

const calls = vi.hoisted(() => ({ wma: 0, wmaResult: [] as string[] }));

// One chainable, awaitable query builder: every method returns it, awaiting it gives
// the fixed rows of its table.
vi.mock('@/lib/supabase/server', () => {
  const ROWS: Record<string, unknown[]> = {
    quizzes: [
      { slug: 'bts-basics', updated_at: '2026-09-01T00:00:00Z', group_id: 1, questions: [], title: 'BTS basics', question_count: 10, play_count: 5, like_count: 1 },
      { slug: 'twice-basics', updated_at: '2026-08-01T00:00:00Z', group_id: 2, questions: [], title: 'TWICE basics', question_count: 10, play_count: 3, like_count: 0 },
    ],
    groups: [{ id: 1, slug: 'bts', quiz_count: 1 }, { id: 2, slug: 'twice', quiz_count: 1 }],
    pulse_reports: [{ month: '2026-08', updated_at: '2026-09-02T00:00:00Z' }],
  };
  const builder = (table: string): unknown => {
    const p: unknown = new Proxy(() => undefined, {
      get(_t, prop) {
        if (prop === 'then') return (ok: (v: unknown) => unknown) => Promise.resolve({ data: ROWS[table] ?? [], error: null }).then(ok);
        return () => p;
      },
    });
    return p;
  };
  const client = () => ({ from: (table: string) => builder(table) });
  return { createPublicReadClient: client, createServiceRoleClient: client };
});

vi.mock('@/lib/blind-test-playlists', async () => {
  const { STATIC_MODES } = await import('@/lib/blind-test-modes');
  return {
    getAdvertisablePlaylists: async () => ({ groups: [{ slug: 'bts' }, { slug: 'twice' }] }),
    getPlayableStaticModes: async () => STATIC_MODES,
  };
});

vi.mock('@/lib/personality/data', () => ({
  getWmaGroupSlugs: async () => { calls.wma += 1; return calls.wmaResult; },
}));

async function urls(v1: string, v12: string): Promise<string[]> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_UX_V1', v1);
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12);
  const mod = await import('@/app/sitemap');
  return (await mod.default()).map((e) => e.url);
}

const isV12Growth = (u: string): boolean =>
  u.endsWith('-name-all-members') || /\/which-[^/]+-member-are-you$/.test(u) || u.endsWith(BRIDGE_PATH)
  || u.includes('/name-all/') || u.includes('/personality/');

describe('v12GrowthPaths', () => {
  it('17 Name them all pages, the bridge quiz, one Which member page per slug', () => {
    const paths = v12GrowthPaths(WMA_SLUGS);
    expect(paths).toHaveLength(17 + 1 + 4);
    for (const g of NAME_ALL_GROUPS) expect(paths).toContain(`/${g}-name-all-members`);
    expect(paths).toContain('/kpop-demon-hunters-quiz');
    expect(paths).toContain('/which-stray-kids-member-are-you');
    expect(paths).toContain('/which-g-i-dle-member-are-you');
  });

  it('a failed Which member read ([]) drops those entries and nothing else', () => {
    const paths = v12GrowthPaths([]);
    expect(paths).toEqual([...NAME_ALL_GROUPS.map((g) => prettyPath(g)), BRIDGE_PATH]);
  });

  it('never an internal route, never a duplicate, never a slug that is not a path segment', () => {
    const paths = v12GrowthPaths(['bts', 'bts', 'a/b', '', '../x', 'Twice', 'x?y']);
    expect(paths.filter((p) => p.startsWith('/which-'))).toEqual(['/which-bts-member-are-you']);
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) {
      expect(p.startsWith('/name-all/')).toBe(false);
      expect(p.startsWith('/personality/')).toBe(false);
      expect(p.startsWith('/pt/')).toBe(false);
    }
  });
});

describe('app/sitemap.ts in the three flag states', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it('a flag off: the same set of URLs in both off states, no V12 URL, no Which member read', async () => {
    calls.wma = 0;
    calls.wmaResult = WMA_SLUGS;
    const bothOff = await urls('', '');
    const v11Only = await urls('1', '');
    const v12WithoutV11 = await urls('', '1');
    expect(calls.wma).toBe(0);
    expect(bothOff.length).toBeGreaterThan(60);
    expect(v11Only).toEqual(bothOff);
    expect(v12WithoutV11).toEqual(bothOff);
    expect(bothOff.filter(isV12Growth)).toEqual([]);
    expect(bothOff.filter((u) => u.includes('guess-the-kpop-song'))).toEqual([]);
    // the fixed rows are there, so the comparison is not between two empty lists
    expect(bothOff).toContain(`${SITE}/bts-quiz`);
    expect(bothOff).toContain(`${SITE}/q/bts-basics`);
    expect(bothOff).toContain(`${SITE}/blindtest/group-twice`);
  });

  it('both flags on: every flag-off URL is still there, in the same order, and only V12 URLs are added', async () => {
    calls.wmaResult = WMA_SLUGS;
    const off = await urls('1', '');
    calls.wma = 0;
    const on = await urls('1', '1');
    expect(calls.wma).toBe(1);

    const offSet = new Set(off);
    expect(on.filter((u) => offSet.has(u))).toEqual(off);

    const added = on.filter((u) => !offSet.has(u));
    const growth = added.filter(isV12Growth);
    expect(growth.sort()).toEqual(v12GrowthPaths(WMA_SLUGS).map((p) => `${SITE}${p}`).sort());
    // what else the flag adds was there before this follow-up: themed modes, landings
    const rest = added.filter((u) => !isV12Growth(u));
    for (const u of rest) expect(u).toMatch(/\/blindtest\/[a-z0-9-]+$|\/guess-the-kpop-song$|\/fr\/blind-test-kpop$|\/es\/adivina-la-cancion-kpop$|\/id\/tebak-lagu-kpop$/);
    expect(new Set(on).size).toBe(on.length);
  });

  it('both flags on, the Which member read fails: the other V12 URLs stay, the sitemap does not fail', async () => {
    calls.wmaResult = [];
    const on = await urls('1', '1');
    expect(on.filter((u) => u.includes('/which-'))).toEqual([]);
    expect(on.filter((u) => u.endsWith('-name-all-members'))).toHaveLength(17);
    expect(on).toContain(`${SITE}${BRIDGE_PATH}`);
  });

  it('the new entries carry no invented lastmod', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
    vi.stubEnv('NEXT_PUBLIC_UX_V12', '1');
    calls.wmaResult = WMA_SLUGS;
    const entries = await (await import('@/app/sitemap')).default();
    const growth = entries.filter((e) => isV12Growth(e.url));
    expect(growth).toHaveLength(22);
    for (const e of growth) {
      expect(e.lastModified).toBeUndefined();
      expect(e.changeFrequency).toBe('monthly');
      expect(e.priority).toBe(0.6);
    }
  });
});

describe('G3 R5: the routes G3 pages link to', () => {
  const SRC = path.resolve(__dirname, '../..');
  const read = (rel: string): string => fs.readFileSync(path.join(SRC, rel), 'utf8');

  it('the bridge card links to the route G5 built', () => {
    expect(read('components/blindtest/ux-v1/theme-page.tsx')).toContain(`href="${BRIDGE_PATH}"`);
    expect(fs.existsSync(path.join(SRC, `app/(site)${BRIDGE_PATH}/page.tsx`))).toBe(true);
  });

  it('the live links still point at /live and /join (G4 owns those routes)', () => {
    expect(read('components/blindtest/ux-v1/hub-v12.tsx')).toContain('href="/live"');
    expect(read('components/blindtest/ux-v1/hub-v12.tsx')).toContain('href="/join"');
    expect(read('components/blindtest/ux-v1/landing.tsx')).toContain('href="/live"');
    expect(read('components/blindtest/ux-v1/theme-page.tsx')).toContain('href="/live"');
  });
});

// O1 audit 03 P2-2: one list of the groups with a served Which member are you page; the sitemap, the links and next.config agree.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { NAME_ALL_GROUPS } from '@/lib/name-all/spellings';
import { groupPages } from '@/lib/growth/bt-group';
import { v12GrowthPaths } from '@/lib/growth/sitemap-v12';

import { WMA_GROUPS, servedWmaSlugs } from './wma-groups';

const NEXT_CONFIG = readFileSync(fileURLToPath(new URL('../../../next.config.ts', import.meta.url)), 'utf8');

describe('the Which member are you groups', () => {
  it('are the same in next.config.ts (the rewrite) and in lib/personality/wma-groups.ts', () => {
    const block = /const WMA_GROUPS = \[([\s\S]*?)\];/.exec(NEXT_CONFIG)?.[1] ?? '';
    const inConfig = [...block.matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]!);
    expect(inConfig.length).toBeGreaterThan(0);
    expect([...inConfig].sort()).toEqual([...WMA_GROUPS].sort());
  });

  it('drop a group with a profile set whose pretty URL is not served, keep the others in order', () => {
    expect(servedWmaSlugs(['bts', 'not-in-the-rewrite', 'twice'])).toEqual(['bts', 'twice']);
    expect(servedWmaSlugs([])).toEqual([]);
  });

  it('the sitemap URLs of Which member are you are exactly the served groups', () => {
    const paths = v12GrowthPaths([...WMA_GROUPS, 'extra-group']).filter((p) => /^\/which-.+-member-are-you$/.test(p));
    expect(paths.sort()).toEqual([...WMA_GROUPS].map((s) => `/which-${s}-member-are-you`).sort());
  });

  it('a blind test group page links to Which member only for a served group', () => {
    expect(groupPages('bts', 'BTS', [...WMA_GROUPS, 'extra-group']).map((p) => p.href)).toContain('/which-bts-member-are-you');
    expect(groupPages('extra-group', 'Extra', [...WMA_GROUPS, 'extra-group']).map((p) => p.href)).not.toContain('/which-extra-group-member-are-you');
  });

  it('the Name them all pretty URLs of next.config.ts are the NAME_ALL_GROUPS', () => {
    const alt = /source: '\/:group\(([^)]+)\)-name-all-members'/.exec(NEXT_CONFIG)?.[1] ?? '';
    const inConfig = alt.split('|');
    expect(inConfig.length).toBeGreaterThan(0);
    expect([...inConfig].sort()).toEqual([...(NAME_ALL_GROUPS as readonly string[])].sort());
  });
});

// O1 audit 03 P1-6: the rule 1.3 gate is fed by the triage of the 2026-11-09 Performance export (zero-click pages only).
import { describe, expect, it } from 'vitest';

import { DEMAND_DEMOTED, demandRobots, isDemoted, isDemotedPath, variantOfPath } from './demand-gate';
import { prettyPath } from '@/lib/name-all/round';
import { whichMemberPath } from '@/lib/personality/view';

describe('demand gate', () => {
  it('demotes exactly the variant pages with no click and under 300 impressions in the 2026-11-09 export', () => {
    expect(Object.fromEntries(Object.entries(DEMAND_DEMOTED).map(([k, v]) => [k, v.length]))).toEqual({ 'bt-group': 26, 'name-all': 4, 'which-member': 6 });
    for (const [template, slugs] of Object.entries(DEMAND_DEMOTED)) {
      expect(new Set(slugs).size, template).toBe(slugs.length);
      for (const s of slugs) expect(isDemoted(template as 'bt-group', s), `${template} ${s}`).toBe(true);
    }
    expect(demandRobots('bt-group', 'twice')).toEqual({ robots: { index: false, follow: true } });
    expect(isDemotedPath('/blindtest/group-twice')).toBe(true);
    // A group not listed keeps today's head and its sitemap entry.
    expect(isDemoted('bt-group', 'blackpink')).toBe(false);
    expect(demandRobots('name-all', 'bts')).toEqual({});
    expect(isDemotedPath('/blindtest/group-blackpink')).toBe(false);
  });

  it('reads a variant page from its public path, with the helpers the sitemap uses', () => {
    expect(variantOfPath('/blindtest/group-stray-kids')).toEqual({ template: 'bt-group', slug: 'stray-kids' });
    expect(variantOfPath(prettyPath('bts'))).toEqual({ template: 'name-all', slug: 'bts' });
    expect(variantOfPath(whichMemberPath('twice'))).toEqual({ template: 'which-member', slug: 'twice' });
    expect(variantOfPath('/q/some-quiz')).toBeNull();
    expect(variantOfPath('/blindtest/classic')).toBeNull();
    expect(variantOfPath('/bts-quiz')).toBeNull();
  });
});

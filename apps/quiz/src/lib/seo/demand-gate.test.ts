// O1 audit 03 P1-6: the rule 1.3 gate is ready and EMPTY until the owner approves a triage.
import { describe, expect, it } from 'vitest';

import { DEMAND_DEMOTED, demandRobots, isDemoted, isDemotedPath, variantOfPath } from './demand-gate';
import { prettyPath } from '@/lib/name-all/round';
import { whichMemberPath } from '@/lib/personality/view';

describe('demand gate', () => {
  it('demotes nothing today: every head and the sitemap stay as they are', () => {
    expect(DEMAND_DEMOTED).toEqual({ 'bt-group': [], 'name-all': [], 'which-member': [] });
    expect(isDemoted('bt-group', 'twice')).toBe(false);
    expect(demandRobots('name-all', 'bts')).toEqual({});
    expect(isDemotedPath('/blindtest/group-twice')).toBe(false);
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

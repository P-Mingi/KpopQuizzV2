// Run O1, lane L1: the Fan Card is a share image; its two domain lines read the registry, so a card made on anime or hub says
// fandomverse.org/anime or fandomverse.org in its pixels, and kpop's card keeps kpopquiz.org (the registry value of kpop).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { siteAddress } from '@/lib/site/brand';
import { REGISTRY } from '@/lib/site/registry';

describe('Fan Card domain line', () => {
  const src = readFileSync(fileURLToPath(new URL('./[username]/route.tsx', import.meta.url)), 'utf8');

  it('has no literal kpopquiz.org: both lines are built from the registry address (siteAddress: the url without its scheme)', () => {
    expect(src).not.toMatch(/kpopquiz/i);
    expect(src).toContain("import { siteAddress } from '@/lib/site/brand';");
    expect(src).toContain('{siteAddress()}');
    expect(src).toContain('{`${siteAddress()}/u/${profile.username}`}');
  });

  it('kpop\'s domain, the value both lines had, is the registry value', () => {
    expect(REGISTRY.kpop.domain).toBe('kpopquiz.org');
    expect(REGISTRY.anime.domain).toBe('fandomverse.org');
    expect(REGISTRY.hub.domain).toBe('fandomverse.org');
    expect(siteAddress(REGISTRY.kpop)).toBe('kpopquiz.org');
    expect(siteAddress(REGISTRY.anime)).toBe('fandomverse.org/anime');
    expect(siteAddress(REGISTRY.hub)).toBe('fandomverse.org');
  });
});

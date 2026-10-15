import { describe, expect, it } from 'vitest';

import robots from '@/app/robots';

// SEO (owner, 2026-10-14): rulebook 9.7, the search and answer crawlers stay allowed.
// OAI-SearchBot (ChatGPT search) has its own group, with exactly the rules of *.

const rules = (() => {
  const r = robots().rules;
  return Array.isArray(r) ? r : [r];
})();
const groupOf = (ua: string) => rules.find((r) => (Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]).includes(ua));

describe('robots.txt', () => {
  it('OAI-SearchBot has an explicit group with the same rules as *', () => {
    const star = groupOf('*');
    const oai = groupOf('OAI-SearchBot');
    expect(star).toBeDefined();
    expect(oai).toBeDefined();
    expect(oai!.allow).toEqual(star!.allow);
    expect(oai!.disallow).toEqual(star!.disallow);
  });

  it('no group disallows the whole site', () => {
    for (const r of rules) {
      const disallow = r.disallow === undefined ? [] : Array.isArray(r.disallow) ? r.disallow : [r.disallow];
      expect(disallow, String(r.userAgent)).not.toContain('/');
    }
  });
});
